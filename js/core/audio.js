/* Synthesized audio in a dark, gothic style: everything is generated with WebAudio, so the game ships
 * without audio files. Sound design: heavy low impacts, metallic clinks and clangs, tolling bells,
 * breathy noise, all played through a long, dark "stone hall" reverb. Music is a slow ambient
 * score in A harmonic minor: drone, wind, choir pads, plucked strings and bells, with war drums
 * and a low string ostinato in battle. Swap in recorded assets later by replacing SFX entries
 * with AudioBuffer playback. */
(function (DH) {
  'use strict';
  let ctx = null, master = null, sfxBus = null, musicBus = null, reverb = null;
  const last = {};
  let musicState = null;
  const settings = { sfx: 0.8, music: 0.5 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /** Dark hall impulse: short pre-delay, early reflections, then a tail that loses its highs as it decays. */
  function hallImpulse(seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(2, len, sr), pre = Math.floor(sr * 0.022);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let y = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre), a = 0.55 - 0.5 * k; // one-pole lowpass closing over time
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * Math.pow(1 - k, 3.2) * 1.6;
      }
      for (let r = 0; r < 6; r++) { const at = pre + Math.floor(sr * rnd(0.004, 0.06)); d[at] += (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.6); }
    }
    return buf;
  }

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.95; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.knee.value = 12;
    comp.connect(master);
    // no chiptune sparkle: effects are darkened before the mix
    const dark = ctx.createBiquadFilter(); dark.type = 'lowpass'; dark.frequency.value = 5200; dark.Q.value = 0.5; dark.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx; sfxBus.connect(dark);
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music * 0.6; musicBus.connect(comp);
    reverb = ctx.createConvolver(); reverb.buffer = hallImpulse(3.4);
    const rv = ctx.createGain(); rv.gain.value = 0.42; reverb.connect(rv); rv.connect(comp);
    return true;
  }

  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /** Oscillator voice. o: {type, f, f2, t, vol, attack, delay, dest, filter, ff, ff2, q, rev, vib, vibRate, detune} */
  function tone(o) {
    const t0 = ctx.currentTime + (o.delay || 0), end = t0 + o.t;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), end);
    if (o.detune) osc.detune.value = o.detune;
    let lfo = null;
    if (o.vib) { lfo = ctx.createOscillator(); lfo.frequency.value = o.vibRate || 5; const lg = ctx.createGain(); lg.gain.value = o.vib; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(end + 0.1); }
    const g = ctx.createGain(), at = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + at);
    if (o.hold) g.gain.setValueAtTime(o.vol || 0.2, t0 + at + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    let node = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.setValueAtTime(o.ff || 1200, t0);
      if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, end);
      f.Q.value = o.q || 1; osc.connect(f); node = f;
    }
    node.connect(g); g.connect(o.dest || sfxBus);
    if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev === true ? 1 : o.rev; g.connect(s); s.connect(reverb); }
    osc.start(t0); osc.stop(end + 0.05);
  }
  /** Filtered noise. o: {t, vol, filter, ff, ff2, q, attack, delay, dest, rev} */
  function burst(o) {
    const t0 = ctx.currentTime + (o.delay || 0), end = t0 + o.t;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.ff || 1800, t0);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, end);
    f.Q.value = o.q || 0.7;
    const g = ctx.createGain();
    if (o.attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + o.attack); }
    else g.gain.setValueAtTime(o.vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    if (o.rev) { const s = ctx.createGain(); s.gain.value = o.rev === true ? 1 : o.rev; g.connect(s); s.connect(reverb); }
    src.start(t0, Math.random() * 1.2); src.stop(end + 0.05);
  }
  /** Inharmonic metal (clinks, clangs, bells). ratios of a struck plate / bell. */
  const BELL = [0.5, 1, 1.19, 1.56, 2, 2.51, 2.66, 3.01, 4.1];
  const PLATE = [1, 2.32, 4.25, 6.63];
  function metal(f, t, vol, ratios, o) {
    o = o || {};
    ratios.forEach((r, i) => tone({ type: 'sine', f: f * r, t: t * (1 - i / (ratios.length * 1.6)), vol: vol / (1 + i * 0.55), attack: 0.002, delay: o.delay, dest: o.dest, rev: o.rev }));
  }
  /** Low body impact: pitched thump plus muffled noise. */
  function thud(f, t, vol, o) {
    o = o || {};
    tone({ type: 'sine', f, f2: f * 0.4, t, vol, delay: o.delay, dest: o.dest, rev: o.rev });
    burst({ t: t * 0.7, ff: o.ff || 500, ff2: 90, vol: vol * 0.8, delay: o.delay, dest: o.dest, rev: o.rev });
  }

  const SFX = {
    hit() { burst({ t: 0.08, ff: 900, ff2: 160, vol: 0.2 }); tone({ type: 'sine', f: 140, f2: 60, t: 0.08, vol: 0.14 }); },
    kill() {
      burst({ t: 0.18, filter: 'bandpass', ff: 520, ff2: 160, q: 1.4, vol: 0.28 }); tone({ type: 'sine', f: 95, f2: 38, t: 0.16, vol: 0.18 });
      if (Math.random() < 0.4) burst({ t: 0.03, filter: 'highpass', ff: 2200, vol: 0.12, delay: 0.02 }); // bone crack
    },
    xp() { const f = [440, 523, 587, 659, 784][Math.random() * 5 | 0]; tone({ type: 'sine', f, t: 0.22, vol: 0.035, rev: 0.4 }); tone({ type: 'sine', f: f * 2.76, t: 0.08, vol: 0.01 }); },
    coin() { const f = rnd(1050, 1250); metal(f, 0.28, 0.05, PLATE); metal(f * 1.06, 0.2, 0.035, PLATE, { delay: 0.05 }); },
    levelup() {
      // a dark choir swell: A minor add9 rising out of the dark, then a bell
      [57, 60, 64, 69, 71].forEach((n, i) => { const f = midi(n); tone({ type: 'sawtooth', f, t: 1.8, vol: 0.05, attack: 0.5, filter: 'lowpass', ff: 400, ff2: 2400, q: 2, rev: true, delay: i * 0.03, detune: (i % 2 ? 6 : -6) }); });
      metal(220, 2.4, 0.08, BELL, { rev: true, delay: 0.35 });
    },
    hurt() { tone({ type: 'sawtooth', f: 170, f2: 85, t: 0.28, vol: 0.2, filter: 'bandpass', ff: 520, q: 3 }); burst({ t: 0.18, ff: 700, ff2: 120, vol: 0.22 }); },
    swing() { burst({ t: 0.22, filter: 'bandpass', ff: 380, ff2: 1100, q: 1.6, vol: 0.2, attack: 0.05 }); },
    bow() { tone({ type: 'triangle', f: 196, f2: 98, t: 0.16, vol: 0.14 }); burst({ t: 0.12, filter: 'bandpass', ff: 1400, ff2: 500, q: 2, vol: 0.08 }); },
    fire() { burst({ t: 0.4, ff: 900, ff2: 180, vol: 0.22, attack: 0.04 }); for (let i = 0; i < 3; i++) burst({ t: 0.02, filter: 'highpass', ff: 1800, vol: 0.05, delay: rnd(0.02, 0.3) }); },
    thunder() { // a crack overhead, then the long roll of thunder
      burst({ t: 0.25, filter: 'highpass', ff: 1400, ff2: 500, vol: 0.12 });
      burst({ t: 2.8, ff: 420, ff2: 45, vol: 0.32, attack: 0.08, rev: 0.9, delay: 0.1 }); tone({ type: 'sine', f: 52, f2: 30, t: 2.2, vol: 0.2, attack: 0.1, delay: 0.1 });
    },
    rumble() { burst({ t: 1.8, ff: 180, ff2: 50, vol: 0.26, attack: 0.35, rev: 0.6 }); tone({ type: 'sine', f: 40, f2: 32, t: 1.6, vol: 0.16, attack: 0.3, vib: 3, vibRate: 9 }); },
    gust() { burst({ t: 2.2, filter: 'bandpass', ff: 380, ff2: 900, q: 0.8, vol: 0.09, attack: 0.8 }); },
    gun() { // a black-powder shot: a sharp crack and a rolling report
      burst({ t: 0.05, filter: 'highpass', ff: 2200, vol: 0.2 }); burst({ t: 0.5, ff: 1400, ff2: 90, vol: 0.3, rev: 0.5, delay: 0.01 }); tone({ type: 'sine', f: 110, f2: 40, t: 0.3, vol: 0.2 });
    },
    boom() { burst({ t: 0.9, ff: 900, ff2: 40, vol: 0.4, rev: 0.7 }); tone({ type: 'sine', f: 70, f2: 24, t: 0.8, vol: 0.34 }); },
    zap() { tone({ type: 'sawtooth', f: 900, f2: 110, t: 0.22, vol: 0.09, filter: 'lowpass', ff: 2400 }); for (let i = 0; i < 4; i++) burst({ t: 0.03, filter: 'bandpass', ff: rnd(1500, 3000), q: 3, vol: 0.12, delay: i * 0.035 }); },
    frost() { burst({ t: 0.18, filter: 'highpass', ff: 2600, vol: 0.12 }); metal(rnd(700, 900), 0.6, 0.03, PLATE, { rev: true }); },
    throw() { burst({ t: 0.14, filter: 'bandpass', ff: 700, ff2: 300, q: 1.8, vol: 0.14, attack: 0.03 }); },
    glass() { // clay urn shattering
      burst({ t: 0.16, filter: 'bandpass', ff: 1100, ff2: 400, q: 1.2, vol: 0.2 });
      for (let i = 0; i < 4; i++) burst({ t: 0.025, filter: 'bandpass', ff: rnd(1200, 2600), q: 4, vol: 0.08, delay: rnd(0.02, 0.18) });
    },
    chest() { // heavy lid creak, latch, dark chime
      tone({ type: 'sawtooth', f: 70, f2: 95, t: 0.5, vol: 0.08, filter: 'bandpass', ff: 320, q: 6, vib: 9, vibRate: 23 });
      thud(90, 0.25, 0.22, { delay: 0.45 });
      metal(330, 1.8, 0.07, BELL, { rev: true, delay: 0.5 });
    },
    click() { burst({ t: 0.04, filter: 'bandpass', ff: 900, q: 2, vol: 0.12 }); tone({ type: 'sine', f: 260, f2: 170, t: 0.05, vol: 0.06 }); },
    buy() { metal(1150, 0.3, 0.05, PLATE); metal(1010, 0.3, 0.05, PLATE, { delay: 0.07 }); thud(120, 0.15, 0.12, { delay: 0.1 }); },
    error() { thud(110, 0.14, 0.16); thud(82, 0.2, 0.16, { delay: 0.12 }); },
    roar() {
      tone({ type: 'sawtooth', f: 78, f2: 42, t: 1.5, vol: 0.28, attack: 0.08, filter: 'bandpass', ff: 420, q: 2.5, vib: 6, vibRate: 11, rev: 0.8 });
      tone({ type: 'sawtooth', f: 117, f2: 60, t: 1.2, vol: 0.12, attack: 0.1, filter: 'lowpass', ff: 700, vib: 8, vibRate: 7 });
      burst({ t: 1.3, ff: 600, ff2: 120, vol: 0.28, attack: 0.08, rev: 0.8 });
    },
    victory() { // minor turning to major (Picardy third), then bells
      const ch = (ns, d, len) => ns.forEach((n, i) => tone({ type: 'sawtooth', f: midi(n), t: len, vol: 0.045, attack: 0.4, filter: 'lowpass', ff: 1400, q: 1.5, rev: true, delay: d, detune: (i % 2 ? 5 : -5) }));
      ch([45, 57, 60, 64], 0, 1.4); ch([41, 57, 60, 65], 1.0, 1.4); ch([45, 57, 61, 64, 69], 2.0, 3);
      metal(220, 3.5, 0.08, BELL, { rev: true, delay: 2.0 }); metal(330, 3, 0.05, BELL, { rev: true, delay: 2.4 });
    },
    defeat() { // slow funeral toll
      [0, 1.4, 2.8].forEach((d, i) => metal(i === 2 ? 98 : 110, 4, 0.1, BELL, { rev: true, delay: d }));
      tone({ type: 'sawtooth', f: midi(33), t: 4.5, vol: 0.06, attack: 1, filter: 'lowpass', ff: 300, rev: true });
    },
    heal() { [69, 72, 76].forEach((n, i) => tone({ type: 'sine', f: midi(n), t: 0.9, vol: 0.05, attack: 0.15, rev: true, delay: i * 0.08 })); burst({ t: 0.6, filter: 'bandpass', ff: 2400, q: 2, vol: 0.03, attack: 0.2 }); },
    block() { metal(rnd(380, 460), 0.5, 0.1, PLATE, { rev: 0.5 }); burst({ t: 0.05, filter: 'highpass', ff: 1500, vol: 0.12 }); },
    reward() { metal(440, 1.6, 0.07, BELL, { rev: true }); metal(660, 1.4, 0.05, BELL, { rev: true, delay: 0.18 }); },
  };
  const MIN_GAP = { block: 0.08, hit: 0.05, xp: 0.04, kill: 0.06, coin: 0.06, swing: 0.07, bow: 0.05, fire: 0.1, throw: 0.07, zap: 0.1, glass: 0.08, boom: 0.1, gun: 0.08, roar: 0.4 };

  /* ---------------- Music ---------------- */
  // A harmonic minor. Chords: Am - F - Dm - E (the raised G# gives the old, gothic cadence).
  const SCALE = [0, 2, 3, 5, 7, 8, 11];
  const CHORDS = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
  const BASS = [33, 29, 26, 28];
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /** Formant "choir" voice: detuned saws through two vowel formants (roughly 'ah'). */
  function choir(n, start, len, vol, dest) {
    const t0 = ctx.currentTime + start, end = t0 + len;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + len * 0.35); g.gain.setValueAtTime(vol, end - len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, end);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 7;
    const mixG = ctx.createGain(); mixG.gain.value = 1;
    f1.connect(mixG); f2.connect(mixG); mixG.connect(g); g.connect(dest); const s = ctx.createGain(); s.gain.value = 0.9; g.connect(s); s.connect(reverb);
    [-9, 0, 8].forEach((dt) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = dt;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rnd(4.5, 5.5); const lg = ctx.createGain(); lg.gain.value = 3; lfo.connect(lg); lg.connect(o.detune);
      o.connect(f1); o.connect(f2); o.start(t0); o.stop(end + 0.1); lfo.start(t0); lfo.stop(end + 0.1);
    });
  }
  /** Plucked string: bright saw whose lowpass closes quickly. */
  function pluck(n, start, vol, dest) {
    tone({ type: 'sawtooth', f: midi(n), t: 1.6, vol, attack: 0.004, filter: 'lowpass', ff: 2600, ff2: 260, q: 2, dest, rev: 0.6, delay: start });
    tone({ type: 'triangle', f: midi(n), t: 1.2, vol: vol * 0.6, attack: 0.004, dest, delay: start });
  }
  /** War drum: deep tom with a skin slap. */
  function drum(start, vol, dest, low) {
    tone({ type: 'sine', f: low ? 62 : 88, f2: low ? 38 : 52, t: 0.55, vol, dest, delay: start, rev: 0.5 });
    burst({ t: 0.12, ff: 700, ff2: 150, vol: vol * 0.5, dest, delay: start });
  }

  function startMusic(mood) {
    if (!ctx) { musicState = { mood, pending: true }; return; }
    stopMusic();
    const battle = mood === 'battle';
    const st = { mood, alive: true, step: 0, nodes: [] };
    musicState = st;
    // low drone (root + fifth + a whisper of the tritone for unease), slowly breathing filter
    const droneG = ctx.createGain(); droneG.gain.value = 0.0001; droneG.connect(musicBus);
    droneG.gain.exponentialRampToValueAtTime(battle ? 0.13 : 0.11, ctx.currentTime + 3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2; lp.connect(droneG);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lfoG = ctx.createGain(); lfoG.gain.value = 120;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    [[33, 'sawtooth', 1], [40, 'sawtooth', 0.8], [39, 'sine', 0.18]].forEach(([n, type, v], i) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = midi(n); o.detune.value = (i - 1) * 6;
      const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(lp); o.start(); st.nodes.push(o);
    });
    // wind through the halls
    const wind = ctx.createBufferSource(); wind.buffer = noise(); wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 1.5;
    const wl = ctx.createOscillator(); wl.frequency.value = 0.08; const wlg = ctx.createGain(); wlg.gain.value = 300; wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
    const wg = ctx.createGain(); wg.gain.value = battle ? 0.025 : 0.04; wind.connect(wf); wf.connect(wg); wg.connect(musicBus); wind.start();
    st.nodes.push(lfo, wind, wl); st.droneG = droneG; st.windG = wg;

    const bpm = battle ? 76 : 52, beat = 60 / bpm;
    let next = ctx.currentTime + 0.3;
    st.t0 = next; st.beat = beat;
    const melody = [4, 3, 2, 3, 4, 5, 6, 4, 2, 1, 0, 0]; // scale degrees for sparse plucked phrases
    st.timer = setInterval(() => {
      if (!st.alive || !ctx) return;
      while (next < ctx.currentTime + 0.5) {
        const s = st.step++, d = next - ctx.currentTime;
        const bar = Math.floor(s / 8), chordIdx = Math.floor(bar / 2) % 4, chord = CHORDS[chordIdx];
        // choir chord every two bars
        if (s % 16 === 0) chord.forEach((n) => choir(n, d, beat * 8.5, battle ? 0.018 : 0.024, musicBus));
        // bell toll at the start of each cycle
        if (s % 64 === 0) metal(midi(45), 5, battle ? 0.05 : 0.07, BELL, { rev: true, delay: d, dest: musicBus });
        if (battle) {
          // war drums: heavy on 1, answer on 3-and, rolls at phrase ends
          if (s % 8 === 0) drum(d, 0.32, musicBus, true);
          if (s % 8 === 5) drum(d, 0.2, musicBus);
          if (s % 32 >= 28) drum(d, 0.12, musicBus);
          // low string ostinato in eighths
          const bn = BASS[chordIdx] + (s % 2 ? 12 : 0);
          tone({ type: 'sawtooth', f: midi(bn), t: beat * 0.5, vol: 0.05, attack: 0.02, filter: 'lowpass', ff: 520, q: 3, dest: musicBus, delay: d });
          if (s % 4 === 2 && Math.random() < 0.6) pluck(69 + SCALE[melody[(s >> 2) % melody.length]], d, 0.04, musicBus);
        } else {
          if (s % 8 === 0) tone({ type: 'sawtooth', f: midi(BASS[chordIdx]), t: beat * 7, vol: 0.05, attack: 0.6, filter: 'lowpass', ff: 300, dest: musicBus, rev: 0.4, delay: d });
          // sparse guitar-like arpeggio of the chord, with an occasional melodic note on top
          if (s % 2 === 0 && Math.random() < 0.75) pluck(chord[(s >> 1) % 3] + (s % 8 === 6 ? 12 : 0), d, 0.035, musicBus);
          if (s % 8 === 4 && Math.random() < 0.5) pluck(69 + SCALE[melody[(s >> 3) % melody.length]], d, 0.03, musicBus);
        }
        next += beat / 2;
      }
    }, 120);
  }
  function stopMusic() {
    const st = musicState; if (!st || !ctx || st.pending) { musicState = null; return; }
    st.alive = false; clearInterval(st.timer);
    const t = ctx.currentTime;
    [st.droneG, st.windG].forEach((g) => { if (g) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); } });
    st.nodes.forEach((n) => { try { n.stop(t + 0.9); } catch (e) { /* already stopped */ } });
    musicState = null;
  }

  /* ---------------- Hall ambience: sparse one-shots under the music ---------------- */
  // each hall has its own mix of dungeon sounds; they play quietly through the hall reverb
  const AMB = {
    drip() { const f = rnd(1400, 2200); tone({ type: 'sine', f, f2: f * 0.6, t: 0.12, vol: 0.035, rev: 0.9 }); if (Math.random() < 0.4) tone({ type: 'sine', f: f * 1.1, f2: f * 0.7, t: 0.1, vol: 0.02, rev: 0.9, delay: rnd(0.15, 0.35) }); },
    moan() { const f = rnd(110, 160); tone({ type: 'sawtooth', f, f2: f * rnd(0.7, 0.85), t: rnd(1.8, 2.8), vol: 0.018, attack: 0.6, filter: 'bandpass', ff: rnd(500, 750), q: 6, vib: 3, vibRate: 5, rev: 1 }); },
    chains() { const n = 3 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) metal(rnd(700, 1100), 0.2, 0.012, PLATE, { delay: i * rnd(0.05, 0.12), rev: 0.8 }); },
    creak() { tone({ type: 'sawtooth', f: rnd(60, 90), f2: rnd(80, 120), t: rnd(0.6, 1.1), vol: 0.02, filter: 'bandpass', ff: 380, q: 8, vib: 12, vibRate: rnd(18, 30), rev: 0.7 }); },
    wind() { burst({ t: rnd(2.5, 4), filter: 'bandpass', ff: rnd(300, 500), ff2: rnd(600, 900), q: 2, vol: 0.03, attack: 1.2, rev: 0.5 }); },
    crackle() { for (let i = 0; i < 6; i++) burst({ t: 0.02, filter: 'highpass', ff: rnd(1500, 3000), vol: 0.03, delay: rnd(0, 0.6) }); burst({ t: 0.8, ff: 500, vol: 0.02, attack: 0.3 }); },
    rumble() { tone({ type: 'sine', f: rnd(38, 50), f2: 30, t: 2.2, vol: 0.06, attack: 0.5 }); burst({ t: 2, ff: 160, vol: 0.04, attack: 0.5, rev: 0.4 }); },
    icecrack() { burst({ t: 0.08, filter: 'highpass', ff: 2200, vol: 0.05, rev: 0.8 }); metal(rnd(1500, 2200), 0.5, 0.012, PLATE, { rev: 0.8, delay: 0.03 }); },
    bubble() { const n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) { const f = rnd(180, 420); tone({ type: 'sine', f, f2: f * 1.8, t: 0.08, vol: 0.03, delay: i * rnd(0.08, 0.2) }); } },
    whisper() { burst({ t: rnd(1.2, 2), filter: 'bandpass', ff: rnd(1800, 2600), ff2: rnd(1200, 1600), q: 5, vol: 0.02, attack: 0.5, rev: 1 }); burst({ t: rnd(1, 1.6), filter: 'bandpass', ff: rnd(900, 1300), q: 6, vol: 0.015, attack: 0.4, rev: 1, delay: 0.3 }); },
    chime() { metal(rnd(900, 1300), 2.2, 0.012, BELL, { rev: 1 }); },
    toll() { metal(rnd(80, 100), 5, 0.035, BELL, { rev: 1 }); },
  };
  const HALL_AMB = {
    crypt: ['drip', 'moan', 'chains', 'creak', 'wind', 'toll'],
    abyss: ['crackle', 'rumble', 'moan', 'crackle', 'chains'],
    aqueduct: ['drip', 'drip', 'drip', 'wind', 'moan', 'creak'],
    catacombs: ['wind', 'icecrack', 'wind', 'moan', 'drip'],
    discord: ['whisper', 'whisper', 'chains', 'moan', 'toll'],
    blightmire: ['bubble', 'bubble', 'drip', 'moan', 'creak'],
    reliquary: ['chime', 'chime', 'whisper', 'chains', 'toll'],
  };
  let ambT = null;
  function ambience(hall) {
    clearTimeout(ambT); ambT = null;
    if (!hall) return;
    const list = HALL_AMB[hall] || HALL_AMB.crypt;
    const next = () => {
      ambT = setTimeout(() => {
        if (ctx && ctx.state === 'running' && settings.sfx > 0) { try { AMB[list[Math.random() * list.length | 0]](); } catch (e) { /* ignore */ } }
        next();
      }, rnd(1800, 5200));
    };
    next();
  }

  DH.audio = {
    ambience,
    play(name) {
      if (!ctx || settings.sfx <= 0 || ctx.state !== 'running') return;
      const gap = MIN_GAP[name] || 0.02, now = ctx.currentTime;
      if (last[name] && now - last[name] < gap) return;
      last[name] = now;
      try { SFX[name] && SFX[name](); } catch (e) { /* ignore audio errors */ }
    },
    music(mood) {
      if (musicState && musicState.mood === mood && !musicState.pending) return;
      if (!ctx) { musicState = { mood, pending: true }; return; }
      startMusic(mood);
    },
    stopMusic,
    BATTLE_BPM: 76,
    /** Beats elapsed in the battle music (float), or null when it is not playing. Used to sync the Skald's songs. */
    beatPos() {
      const st = musicState;
      if (!ctx || !st || st.pending || st.mood !== 'battle' || ctx.state !== 'running' || !st.t0) return null;
      return (ctx.currentTime - st.t0) / st.beat;
    },
    setVolumes(sfx, music) {
      settings.sfx = sfx; settings.music = music;
      if (sfxBus) sfxBus.gain.value = sfx;
      if (musicBus) musicBus.gain.value = music * 0.6;
    },
    vibrate(ms) {
      if (DH.save && DH.save.data && !DH.save.data.settings.vibration) return;
      const hap = DH.platform.plugin('Haptics');
      if (hap) hap.vibrate({ duration: ms }).catch(() => {});
      else if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* not supported */ }
    },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
  };
  // start pending music once the context unlocks
  window.addEventListener('pointerdown', () => {
    if (musicState && musicState.pending && ctx) { const m = musicState.mood; musicState = null; startMusic(m); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) DH.audio.suspend(); else DH.audio.resume(); });
})(window.DH);
