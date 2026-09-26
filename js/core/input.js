/* Input: floating virtual joystick for touch/mouse drag + WASD/arrow keys.
 * Twin-stick aim (Settings, as on a gamepad): a finger on the left half moves, a finger on the right
 * half aims the main weapon; let go and it aims itself at the nearest foe again. On a computer R toggles mouse aim. */
(function (DH) {
  'use strict';
  const keys = {};
  const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
  const aimStick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };
  const mouse = { x: 0, y: 0, seen: false };
  const setting = (k) => DH.save && DH.save.data && DH.save.data.settings[k];
  const RADIUS = 56;
  let enabled = false, surface = null;

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') DH.events.emit('pauseKey');
    if (e.code === 'KeyI' && !e.repeat) DH.events.emit('bagKey');
    if (e.code === 'KeyF' && !e.repeat && enabled) DH.input.toggleFullscreen();
    if (e.code === 'KeyR' && enabled && DH.save) { const st = DH.save.data.settings; st.mouseAim = !st.mouseAim; DH.save.persist(); DH.events.emit('run:warning', t(st.mouseAim ? 'hud.aimMouse' : 'hud.aimAuto')); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; stick.active = false; aimStick.active = false; });
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; } });

  function start(k, e) {
    k.active = true; k.id = e.pointerId; k.touch = e.pointerType !== 'mouse'; // a mouse drag still steers, but only a finger gets a drawn stick
    k.ox = k.x = e.clientX; k.oy = k.y = e.clientY;
    k.dx = k.dy = 0;
    try { surface.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function down(e) {
    if (!enabled) return;
    if (setting('twinStick') && e.pointerType !== 'mouse' && e.clientX > window.innerWidth / 2) { if (!aimStick.active) start(aimStick, e); return; }
    if (!stick.active) start(stick, e);
  }
  function drag(k, e) {
    k.x = e.clientX; k.y = e.clientY;
    let dx = k.x - k.ox, dy = k.y - k.oy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { // drag the origin along so direction changes feel instant
      k.ox = k.x - dx / d * RADIUS; k.oy = k.y - dy / d * RADIUS;
      dx = k.x - k.ox; dy = k.y - k.oy;
    }
    k.dx = dx / RADIUS; k.dy = dy / RADIUS;
  }
  function move(e) {
    if (stick.active && e.pointerId === stick.id) drag(stick, e);
    else if (aimStick.active && e.pointerId === aimStick.id) drag(aimStick, e);
  }
  function up(e) {
    for (const k of [stick, aimStick]) if (e.pointerId === k.id) { k.active = false; k.id = null; k.dx = k.dy = 0; }
  }

  DH.input = {
    attach(el) {
      surface = el;
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    },
    enable(v) { enabled = v; if (!v) for (const k of [stick, aimStick]) { k.active = false; k.dx = k.dy = 0; } },
    stick, aimStick,
    /** Manual aim for the main weapon (a unit vector), or null for auto-aim: the right stick, else the mouse when mouse aim is on. */
    aim() {
      if (aimStick.active) { const d = Math.hypot(aimStick.dx, aimStick.dy); return d > 0.3 ? { x: aimStick.dx / d, y: aimStick.dy / d } : null; }
      if (setting('mouseAim') && mouse.seen) { const dx = mouse.x - window.innerWidth / 2, dy = mouse.y - window.innerHeight / 2, d = Math.hypot(dx, dy); return d > 8 ? { x: dx / d, y: dy / d } : null; }
      return null;
    },
    RADIUS,
    /** A computer (mouse and keyboard) rather than a phone or tablet: no drawn sticks, a full-screen button, key hints. */
    desktop: !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) && !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') && !(window.matchMedia && matchMedia('(pointer: coarse)').matches),
    fullscreenAvailable() { const d = document.documentElement; return !(DH.platform && DH.platform.native) && !!(d.requestFullscreen || d.webkitRequestFullscreen); },
    isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    toggleFullscreen() {
      if (!this.fullscreenAvailable()) return;
      const d = document.documentElement;
      try {
        if (this.isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => {}); }
      } catch (err) { /* the browser refused */ }
    },
    /** Returns movement vector with length <= 1 */
    axis() {
      let x = 0, y = 0;
      if (keys.KeyA || keys.ArrowLeft) x -= 1;
      if (keys.KeyD || keys.ArrowRight) x += 1;
      if (keys.KeyW || keys.ArrowUp) y -= 1;
      if (keys.KeyS || keys.ArrowDown) y += 1;
      if (x || y) { const d = Math.hypot(x, y); return { x: x / d, y: y / d }; }
      if (stick.active) {
        const d = Math.hypot(stick.dx, stick.dy);
        if (d < 0.12) return { x: 0, y: 0 };
        const m = Math.min(1, d);
        return { x: stick.dx / d * m, y: stick.dy / d * m };
      }
      return { x: 0, y: 0 };
    },
  };
})(window.DH);
