"use strict";

const EventEmitter = require("events");
const SPI = require("pi-spi");
const { createCanvas } = require("canvas");

const DEV = "/dev/spidev0.0";
const SOF = 0x72;
const WIDTH = 16;
const HEIGHT = 16;

if (0) {
  const spi = SPI.initialize("/dev/spidev0.0");
  const pat = [SOF];

  for (let i = 0; i < 16 * 16 * 3; i++)
    pat.push(Math.floor(Math.random() * 255));

  const buf = Buffer.from(pat);
  spi.transfer(buf, buf.length, (err, res) => {
    if (err) throw err;
    console.log(res);
  });
}

class UnicornHD extends EventEmitter {
  constructor() {
    super();
    this.spi = SPI.initialize(DEV);
    this.canvas = createCanvas(this.width, this.height);
    this.dropped = 0;
  }

  get width() {
    return WIDTH;
  }

  get height() {
    return HEIGHT;
  }

  async showRaw(buf) {
    return new Promise((resolve, reject) => {
      this.spi.write(buf, (err, res) => (err ? reject(err) : resolve(res)));
    });
  }

  async show() {
    const buf = this.canvas.toBuffer("raw");

    const bl = buf.length;
    const out = [SOF];

    for (let off = 0; off < bl; off += 4) {
      const w = buf.readInt32LE(off);
      out.push((w >> 16) & 0xff, (w >> 8) & 0xff, (w >> 0) & 0xff);
    }

    await this.showRaw(Buffer.from(out));
  }

  start(rate) {
    if (this._timer) this.stop();
    let showing = false;
    this._timer = setInterval(() => {
      if (showing) {
        this.dropped++;
        this.emit("dropped");
      } else {
        showing = true;
        this.show().finally(() => {
          showing = false;
          this.emit("frame");
        });
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

function update(u, pt) {
  const nx = pt.x + pt.dx;
  const ny = pt.y + pt.dy;
  if (nx < 0 || nx >= u.width) pt.dx = -pt.dx;
  if (ny < 0 || ny >= u.width) pt.dy = -pt.dy;
  pt.x += pt.dx;
  pt.y += pt.dy;
}

(async () => {
  try {
    const u = new UnicornHD();
    const p = [];

    for (let i = 0; i < 3; i++)
      p.push({
        x: Math.random() * u.width,
        y: Math.random() * u.height,
        dx: Math.random() * 2 - 1,
        dy: Math.random() * 2 - 1
      });

    const redraw = () => {
      for (const pt of p) update(u, pt);

      const cvs = u.canvas;
      const ctx = cvs.getContext("2d");

      ctx.save();

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      //      ctx.antialias = "none";
      //      ctx.fillStyle = "red";
      //      ctx.fillRect(0, 0, cvs.width, cvs.height);

      ctx.strokeStyle = "green";

      ctx.beginPath();

      const lp = p[p.length - 1];
      ctx.moveTo(lp.x, lp.y);
      for (const pt of p) ctx.lineTo(pt.x, pt.y);

      ctx.stroke();
      ctx.restore();
    };
    u.on("frame", redraw);
    redraw();
    //    u.start(100);
    u.start(1000 / 25);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();