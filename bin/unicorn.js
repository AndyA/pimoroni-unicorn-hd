"use strict";

const { UnicornHD, UnicornHDCanvas } = require("..");

class PolyWobble {
  constructor(opt) {
    this.opt = Object.assign(
      { colour: "red", points: 3, width: 16, height: 16, speed: 0.1 },
      opt || {}
    );

    this.points = [];
    for (let i = 0; i < this.opt.points; i++)
      this.points.push({
        x: Math.random() * this.opt.width,
        y: Math.random() * this.opt.height,
        dx: (Math.random() * 2 - 1) * this.opt.speed,
        dy: (Math.random() * 2 - 1) * this.opt.speed
      });
  }

  update() {
    for (const pt of this.points) {
      const nx = pt.x + pt.dx;
      const ny = pt.y + pt.dy;
      if (nx < 0 || nx >= this.opt.width) pt.dx = -pt.dx;
      if (ny < 0 || ny >= this.opt.height) pt.dy = -pt.dy;
      pt.x += pt.dx;
      pt.y += pt.dy;
    }
  }

  draw(ctx) {
    ctx.save();

    ctx.lineJoin = "round";
    ctx.strokeStyle = this.opt.colour;

    ctx.beginPath();

    for (const [i, { x, y }] of this.points.entries())
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

    ctx.closePath();

    ctx.stroke();
    ctx.restore();
  }
}

function makeCanvas() {
  const u = new UnicornHDCanvas();
  const shapes = [];

  shapes.push(
    new PolyWobble({ colour: "red" }),
    new PolyWobble({ colour: "green" }),
    new PolyWobble({ colour: "blue" })
  );

  const redraw = () => {
    const cvs = u.canvas;
    const ctx = cvs.getContext("2d");

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (const s of shapes) {
      s.update();
      s.draw(ctx);
    }
  };

  return { u, redraw, rate: 1000 / 25 };
}

function makeUnicorn() {
  const u = new UnicornHD();

  const perimeter = x => {
    if (x < u.width) return [x, 0];
    x -= u.width;
    if (x < u.height - 1) return [u.width - 1, x + 1];
    x -= u.height - 1;
    if (x < u.width - 1) return [u.width - 2 - x, u.height - 1];
    x -= u.width - 1;
    if (x < u.height - 2) return [0, u.height - 2 - x];
  };

  let phase = 0;

  const nextPos = () => {
    const p = perimeter(phase++);
    if (p) return p;
    phase = 0;
    return perimeter(phase);
  };

  const redraw = () => {
    u.clear();
    const [x0, y0] = nextPos();
    const [x1, y1] = [u.width - x0, u.height - y0];
    u.line(x0, y0, x1, y1, [255, 0, 0]);
  };
  return { u, redraw, rate: 250 };
}

(async () => {
  try {
    //    const { u, redraw, rate } = makeCanvas();
    const { u, redraw, rate } = makeUnicorn();

    u.on("frame", redraw)
      .on("dropped", () => console.log("Dropped frame!"))
      .on("error", e => {
        throw e;
      });

    // 25 FPS
    u.start(rate);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
