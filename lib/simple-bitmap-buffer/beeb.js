"use strict";

const MW = require("mixwith");

function stringChars(str) {
  const chars = [];
  for (let i = 0; i < str.length; i++) chars.push(str.charCodeAt(i));
  return chars;
}

const SimpleBitmapBeeb = MW.Mixin(
  superclass =>
    class extends superclass {
      constructor(...args) {
        super(...args);
        this._cdef = Object.assign({}, require("./beeb-charset.js"));
      }

      drawCharacter(x, y, code, fg, bg = null) {
        if (!this._cdef[code]) return [0, 0];
        const { width, height, cdef } = this._cdef[code];
        if (
          x + width - 1 >= 0 &&
          x < this.rotatedWidth &&
          y + height - 1 >= 0 &&
          y < this.rotatedHeight
        ) {
          const mask = 1 << width;
          for (const rowBits of cdef) {
            for (let xx = 0; xx < width; xx++) {
              const dot = rowBits & (mask >> xx);
              if (dot) this.drawDot(x + xx, y, fg);
              else if (bg) this.drawDot(x + xx, y, bg);
            }
            y++;
          }
        }
        return { width, height };
      }

      measureText(str) {
        const cdefs = stringChars(str)
          .map(c => this._cdef[c])
          .filter(Boolean);

        return {
          width: cdefs.map(c => c.width).reduce((acc, val) => acc + val),
          height: Math.max(...cdefs.map(c => c.height))
        };
      }

      drawText(x, y, str, fg, bg = null) {
        let h = 0;
        for (const cc of stringChars(str)) {
          const { width, height } = this.drawCharacter(x, y, cc, fg, bg);
          x += width;
          h = Math.max(h, height);
        }
        return { width: x, height: h };
      }
    }
);

module.exports = SimpleBitmapBeeb;
