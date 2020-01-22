"use strict";

const MW = require("mixwith");

const SimpleBitmapCore = MW.Mixin(
  superclass =>
    class extends superclass {
      constructor(...args) {
        super(...args);
        this.clear();
        this.rotation = 0;
      }

      clear() {
        this.buf = [...Array(this.width * this.height * this.channels).fill(0)];
      }

      get rotation() {
        return this._rotate;
      }

      set rotation(r) {
        this._rotate = Math.floor(r % 4);
      }

      _mapXY(x, y) {
        switch (this._rotate) {
          case 0:
            return [x, y];
          case 1:
            return [this.width - 1 - y, x];
          case 2:
            return [this.width - 1 - x, this.height - 1 - y];
          case 3:
            return [y, this.height - 1 - x];
        }
      }

      get rotatedWidth() {
        return this._rotate & 1 ? this.height : this.width;
      }

      get rotatedHeight() {
        return this._rotate & 1 ? this.width : this.height;
      }

      drawDot(xx, yy, col) {
        if (col.length !== this.channels)
          throw new Error(`Colour must have ${this.channels} channels`);
        const [x, y] = this._mapXY(xx, yy);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return this;
        const offset = (x + y * this.width) * this.channels;
        this.buf.splice(offset, this.channels, ...col);
      }

      getDot(xx, yy) {
        const [x, y] = this._mapXY(xx, yy);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
          throw new Error(`${x}, ${y} is outside screen`);
        const offset = (x + y * this.width) * this.channels;
        return this.buf.slice(offset, offset + this.channels);
      }
    }
);

module.exports = SimpleBitmapCore;
