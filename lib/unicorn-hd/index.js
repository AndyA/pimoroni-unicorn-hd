"use strict";

const EventEmitter = require("events");
const MW = require("mixwith");
const SPI = require("pi-spi");
const { createCanvas } = require("canvas");
const SimpleBitmapCore = require("../simple-bitmap-buffer");
const SimpleBitmapBeeb = require("../simple-bitmap-buffer/beeb");

function decaySeries(decay) {
  let prev = 0;
  let scale = 1;
  return next => {
    prev = prev * decay + next;
    scale = scale * decay + 1;
    return prev / scale;
  };
}

class UnicornHDBase extends EventEmitter {
  constructor(opt) {
    super();
    this.opt = Object.assign(
      { dev: "/dev/spidev0.0", sof: 0x72, persist: 0 },
      opt || {}
    );
    this.spi = SPI.initialize(this.opt.dev);
    this.dropped = 0;

    if (this.opt.persist)
      this.pixelFilters = Array(this.width * this.height * this.channels)
        .fill(0)
        .map(() => decaySeries(this.opt.persist));
  }

  get width() {
    return 16;
  }

  get height() {
    return 16;
  }

  get channels() {
    return 3;
  }

  async showPixels(pixels) {
    const pf = this.pixelFilters;
    if (pf) pixels = pixels.map((x, i) => pf[i](x));
    const buf = Buffer.from([this.opt.sof, ...pixels]);
    return new Promise((resolve, reject) => {
      this.spi.write(buf, (err, res) => (err ? reject(err) : resolve(res)));
    });
  }

  start(rate) {
    if (this._timer) this.stop();

    let inShow = false;

    this._timer = setInterval(() => {
      if (inShow) {
        this.dropped++;
        this.emit("dropped");
      } else {
        inShow = true;
        this.show()
          .then(() => this.emit("frame"))
          .catch(e => this.emit("error", e))
          .finally(() => (inShow = false));
      }
    }, rate);

    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      delete this._timer;
    }
    return this;
  }
}

class UnicornHD extends MW.mix(UnicornHDBase).with(
  SimpleBitmapCore,
  SimpleBitmapBeeb
) {
  async show() {
    return this.showPixels(this.buf);
  }
}

class UnicornHDCanvas extends UnicornHDBase {
  get canvas() {
    return (this._canvas =
      this._canvas || createCanvas(this.width, this.height));
  }

  async show() {
    // async call doesn't seem to work...
    const buf = this.canvas.toBuffer("raw");

    const bl = buf.length;
    const out = [];

    for (let off = 0; off < bl; off += 4) {
      const w = buf.readInt32LE(off);
      out.push((w >> 16) & 0xff, (w >> 8) & 0xff, (w >> 0) & 0xff);
    }

    return this.showPixels(out);
  }
}

module.exports = { UnicornHD, UnicornHDCanvas };
