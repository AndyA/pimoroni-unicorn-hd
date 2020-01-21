"use strict";

const { UnicornHD } = require("..");

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
        dx: (Math.random() * 2 - 1) * 0.1,
        dy: (Math.random() * 2 - 1) * 0.1
      });

    const redraw = () => {
      for (const pt of p) update(u, pt);

      const cvs = u.canvas;
      const ctx = cvs.getContext("2d");

      ctx.save();

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      //      ctx.antialias = "none";

      ctx.strokeStyle = "green";

      ctx.beginPath();

      const lp = p[p.length - 1];
      ctx.moveTo(lp.x, lp.y);
      for (const pt of p) ctx.lineTo(pt.x, pt.y);

      ctx.stroke();
      ctx.restore();
    };

    u.on("frame", redraw)
      .on("dropped", () => console.log("Dropped frame!"))
      .on("error", e => {
        throw e;
      });

    redraw();
    u.start(1000 / 25);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
