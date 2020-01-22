"use strict";

const EventEmitter = require("events");
const SPI = require("pi-spi");
const { createCanvas } = require("canvas");

class UnicornHDBase extends EventEmitter {
  constructor(opt) {
    super();
    this.opt = Object.assign({ dev: "/dev/spidev0.0", sof: 0x72 }, opt || {});
    this.spi = SPI.initialize(this.opt.dev);
    this.dropped = 0;
  }

  get width() {
    return 16;
  }

  get height() {
    return 16;
  }

  async showRaw(buf) {
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

class UnicornHD extends UnicornHDBase {
  constructor(opt) {
    super(opt);
    this.clear();
  }

  async show() {
    return this.showRaw(Buffer.from(this.buf));
  }

  clear() {
    this.buf = [this.opt.sof, ...Array(this.width * this.height * 3).fill(0)];
  }

  set(x, y, col) {
    if (col.length !== 3) throw new Error("Colour must be [r, g, b]");
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return this;
    const offset = 1 + (x + y * this.width) * 3;
    this.buf.splice(offset, 3, ...col);
  }

  line(x0, y0, x1, y1, col, inclast = true, incfirst = true) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var acc, s, l;

    if (Math.abs(dx) > Math.abs(dy)) {
      /* closer to horizontal */
      if (dx < 0) return this.line(x1, y1, x0, y0, col, inclast, incfirst);

      if (dy < 0) {
        s = -1;
        dy = -dy;
      } else {
        s = 1;
      }

      acc = (dx + dy) >> 1;
      l = dx;

      const bump = () => {
        acc -= dy;
        if (acc <= 0) {
          acc += dx;
          y0 += s;
        }
      };

      if (!incfirst) {
        l--;
        bump();
      }

      if (!inclast) l--;

      while (l-- >= 0) {
        this.set(x0++, y0, col);
        bump();
      }
    } else {
      /* closer to vertical */
      if (dy < 0) return this.line(x1, y1, x0, y0, col, inclast, incfirst);

      if (dx < 0) {
        s = -1;
        dx = -dx;
      } else {
        s = 1;
      }

      acc = (dx + dy) >> 1;
      l = dy;

      const bump = () => {
        acc -= dx;
        if (acc <= 0) {
          acc += dy;
          x0 += s;
        }
      };

      if (!incfirst) {
        l--;
        bump();
      }

      if (!inclast) l--;

      while (l-- >= 0) {
        this.set(x0, y0++, col);
        bump();
      }
    }
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
    const out = [this.opt.sof];

    for (let off = 0; off < bl; off += 4) {
      const w = buf.readInt32LE(off);
      out.push((w >> 16) & 0xff, (w >> 8) & 0xff, (w >> 0) & 0xff);
    }

    return this.showRaw(Buffer.from(out));
  }
}

module.exports = { UnicornHD, UnicornHDCanvas };
