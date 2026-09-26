/* Display canvas. The world is ~270 units on the short side. It is drawn into a low-res buffer at
 * DH.gfx.CPX pixels per world unit and scaled up with nearest neighbour, so everything stays crisp pixel art. */
(function (DH) {
  'use strict';
  const view = {
    canvas: null, ctx: null, buf: null, bctx: null, dark: null, dctx: null,
    w: 0, h: 0, S: 1, scale: 1, cw: 0, ch: 0, dpr: 1, px: 2,
    init(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.buf = document.createElement('canvas'); this.bctx = this.buf.getContext('2d');
      this.dark = document.createElement('canvas'); this.dctx = this.dark.getContext('2d');
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
      this.resize();
    },
    /** Snap a world coordinate to the buffer pixel grid. */
    snap(v) { return Math.round(v * view.px) / view.px; },
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const cw = Math.floor(window.innerWidth * dpr), ch = Math.floor(window.innerHeight * dpr);
      this.dpr = dpr; this.cw = cw; this.ch = ch;
      this.px = DH.gfx.CPX;
      // prefer an integer upscale of the buffer when it is close; otherwise a fractional nearest-neighbour one
      const k = Math.min(cw, ch) / (270 * this.px), ki = Math.max(1, Math.round(k));
      this.S = this.px * (Math.abs(k - ki) / k < 0.2 ? ki : Math.max(0.75, k));
      this.scale = this.S;
      this.w = Math.ceil(cw / this.S); this.h = Math.ceil(ch / this.S);
      this.canvas.width = cw; this.canvas.height = ch;
      this.buf.width = Math.ceil(this.w * this.px); this.buf.height = Math.ceil(this.h * this.px);
      this.dark.width = this.w; this.dark.height = this.h;
      this.ctx.imageSmoothingEnabled = false; this.bctx.imageSmoothingEnabled = false;
      this.vignette = null;
      DH.events.emit('resize');
    },
    /** Context + transform for world drawing (world units, origin top-left of view). */
    begin() {
      const g = this.bctx; g.setTransform(this.px, 0, 0, this.px, 0, 0); g.imageSmoothingEnabled = false; return g;
    },
    /** Finish world drawing: blit the buffer and reset the transform for screen-space overlays. */
    end() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.buf, 0, 0, this.w * this.S, this.h * this.S);
      return ctx;
    },
    getVignette() {
      if (this.vignette) return this.vignette;
      const c = document.createElement('canvas'); c.width = this.cw; c.height = this.ch;
      const g = c.getContext('2d'), r = Math.hypot(this.cw, this.ch) / 2;
      const grd = g.createRadialGradient(this.cw / 2, this.ch / 2, r * 0.45, this.cw / 2, this.ch / 2, r);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.65)');
      g.fillStyle = grd; g.fillRect(0, 0, this.cw, this.ch);
      this.vignette = c;
      return c;
    },
  };
  DH.view = view;
})(window.DH);
