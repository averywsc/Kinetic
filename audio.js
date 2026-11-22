/* ============================================================================
   Kinetic — Studio ASMR & Melodic Physics Audio Engine
   Multi-layered transient foley + 6 tactile instruments + 6 recognizable
   MIDI melodies + studio room reverb + WebM recording audio tap.
   ============================================================================ */
(() => {
  'use strict';

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mod = (n, m) => ((n % m) + m) % m;

  const TIMBRES = [
    ['marimba', 'Marimba'],
    ['kalimba', 'Kalimba'],
    ['glass',   'Glass'],
    ['piano',   'Felt Piano'],
    ['steel',   'Steel'],
    ['water',   'Droplet']
  ];

  // Exact MIDI note numbers for iconic viral satisfying-video melodies!
  const MELODIES = [
    {
      id: 'pentatonic', name: 'Pentatonic',
      notes: [60, 62, 64, 67, 69, 72, 74, 76, 74, 72, 69, 67, 64, 67, 69, 72, 76, 79, 76, 72, 69, 67, 64, 62]
    },
    {
      id: 'mountain', name: 'Mountain King',
      notes: [
        59, 61, 62, 64, 66, 62, 66, 65, 61, 65, 64, 60, 64,
        59, 61, 62, 64, 66, 62, 66, 71, 69, 66, 62, 66, 69,
        66, 68, 69, 71, 73, 69, 73, 72, 68, 72, 71, 68, 71
      ]
    },
    {
      id: 'elise', name: 'Für Elise',
      notes: [
        76, 75, 76, 75, 76, 71, 74, 72, 69,
        60, 64, 69, 71, 64, 68, 71, 72,
        64, 76, 75, 76, 75, 76, 71, 74, 72, 69,
        60, 64, 69, 71, 64, 72, 71, 69
      ]
    },
    {
      id: 'canon', name: 'Canon in D',
      notes: [
        78, 76, 74, 73, 71, 69, 71, 73,
        74, 73, 71, 69, 67, 66, 67, 69,
        62, 66, 69, 67, 66, 62, 66, 64,
        62, 59, 62, 69, 67, 71, 69, 67
      ]
    },
    {
      id: 'turkish', name: 'Turkish March',
      notes: [
        71, 69, 68, 69, 72,
        74, 72, 71, 72, 76,
        77, 76, 75, 76, 83, 81, 80, 81, 83, 81, 80, 81, 84,
        81, 84, 79, 81, 78, 79, 81, 79, 78, 79, 81, 79, 78, 79, 76
      ]
    },
    {
      id: 'lydian', name: 'Dream Lydian',
      notes: [62, 66, 69, 73, 74, 78, 81, 78, 74, 73, 69, 66, 64, 68, 71, 74, 76, 74, 71, 68]
    }
  ];

  // Palette-matched harmonic scales for positional / polyrhythmic sims
  const SCALES = [
    { root: 52, sc: [0, 2, 4, 7, 9] },
    { root: 50, sc: [0, 2, 4, 6, 7, 9, 11] },
    { root: 55, sc: [0, 2, 4, 7, 9] },
    { root: 53, sc: [0, 2, 4, 7, 9, 11] },
    { root: 48, sc: [0, 2, 4, 7, 9] },
    { root: 50, sc: [0, 3, 5, 7, 10] }
  ];

  let AC = null, mg = null, comp = null, rv = null, dl = null, recDest = null;
  let noiseBuf = null;
  let recent = [];
  let cfg = { sound: true, vol: 65, timbre: 'marimba', melody: 'pentatonic', pal: 0 };

  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  const scaleMidi = (deg, pi = cfg.pal) => {
    const s = SCALES[mod(pi, SCALES.length)], L = s.sc.length;
    return s.root + s.sc[mod(deg, L)] + Math.floor(deg / L) * 12;
  };

  function setConfig(patch) {
    Object.assign(cfg, patch);
    if (mg && AC) {
      mg.gain.setTargetAtTime(cfg.sound ? (cfg.vol / 100) * 0.72 : 0, AC.currentTime, 0.06);
    }
  }

  function wake() {
    if (!cfg.sound) return;
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    AC = new Ctx();

    mg = AC.createGain(); mg.gain.value = 0;
    comp = AC.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5.5;
    comp.attack.value = 0.003; comp.release.value = 0.14;
    mg.connect(comp);
    comp.connect(AC.destination);
    if (AC.createMediaStreamDestination) {
      recDest = AC.createMediaStreamDestination();
      comp.connect(recDest);
    }

    // Crisp warm studio room reverb (1.9s tailored decay)
    const len = Math.floor(AC.sampleRate * 1.9);
    const ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 3.2);
        d[i] = (Math.random() * 2 - 1) * env * 0.52;
      }
    }
    rv = AC.createConvolver(); rv.buffer = ir;
    const rg = AC.createGain(); rg.gain.value = 0.34;
    rv.connect(rg); rg.connect(mg);

    // Subtle acoustic stereo echo
    dl = AC.createDelay(1.0); dl.delayTime.value = 0.24;
    const fb = AC.createGain(); fb.gain.value = 0.2;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(rv);

    // Short noise burst buffer for tactile mallet/wood/glass transients
    const nlen = Math.floor(AC.sampleRate * 0.25);
    noiseBuf = AC.createBuffer(1, nlen, AC.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    setConfig({});
  }

  function gate(maxPerSec = 30) {
    if (!AC || AC.state !== 'running' || !cfg.sound) return false;
    const now = AC.currentTime;
    while (recent.length && now - recent[0] > 0.32) recent.shift();
    if (recent.length >= Math.ceil(maxPerSec * 0.32)) return false;
    recent.push(now);
    return true;
  }

  function route(node, pan = 0, useRev = true, useEcho = true) {
    if (AC.createStereoPanner) {
      const p = AC.createStereoPanner();
      p.pan.value = clamp(pan, -0.82, 0.82);
      node.connect(p);
      p.connect(mg);
      if (useRev && rv) p.connect(rv);
      if (useEcho && dl) p.connect(dl);
    } else {
      node.connect(mg);
      if (useRev && rv) node.connect(rv);
    }
  }

  // Tactile wood/mallet micro-transient click layered on top of notes
  function malletClick(at, freq, pan, vel) {
    if (!noiseBuf) return;
    const src = AC.createBufferSource(); src.buffer = noiseBuf;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(clamp(freq * 2.4, 700, 5200), at);
    bp.Q.value = 2.4;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.055 * vel, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.018);
    src.connect(bp); bp.connect(g);
    route(g, pan, false, false);
    src.start(at, Math.random() * 0.1, 0.025);
  }

  function playMidi(midi, pan = 0, vel = 0.72, opts = {}) {
    if (!gate(opts.rate || 30)) return;
    const now = AC.currentTime + (opts.delay || 0);
    const f = clamp(mtof(midi), 85, 3400);
    const tim = opts.timbre || cfg.timbre;
    const v = clamp(vel, 0.12, 1.15);

    if (tim === 'water') {
      playWaterDrop(pan, f / 440, v, now);
      return;
    }

    const g = AC.createGain();
    const o1 = AC.createOscillator();
    const o2 = AC.createOscillator();
    const g2 = AC.createGain();
    const fil = AC.createBiquadFilter();
    fil.type = 'lowpass';

    let dec = 0.45, peak = 0.17 * v, echo = opts.echo !== false;

    if (tim === 'marimba') {
      o1.type = 'sine'; o2.type = 'sine';
      o1.frequency.setValueAtTime(f, now);
      o2.frequency.setValueAtTime(f * 3.98, now); // real rosewood 4th harmonic
      g2.gain.setValueAtTime(0.22, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      fil.frequency.setValueAtTime(3800, now);
      dec = 0.36; peak = 0.2 * v;
      malletClick(now, f, pan, v * 0.85);
    } else if (tim === 'kalimba') {
      o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.setValueAtTime(f, now);
      o2.frequency.setValueAtTime(f * 2.96, now);
      g2.gain.setValueAtTime(0.2, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      fil.frequency.setValueAtTime(4200, now);
      dec = 0.62; peak = 0.17 * v;
      malletClick(now, f * 1.4, pan, v * 0.65);
    } else if (tim === 'glass') {
      o1.type = 'sine'; o2.type = 'sine';
      o1.frequency.setValueAtTime(f * 1.5, now);
      o2.frequency.setValueAtTime(f * 4.52, now);
      g2.gain.setValueAtTime(0.18, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      fil.frequency.setValueAtTime(6500, now);
      dec = 0.85; peak = 0.13 * v;
    } else if (tim === 'piano') {
      o1.type = 'triangle'; o2.type = 'sine';
      o1.frequency.setValueAtTime(f, now);
      o2.frequency.setValueAtTime(f * 2.002, now);
      g2.gain.setValueAtTime(0.24, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      fil.frequency.setValueAtTime(f * 4.2, now);
      fil.frequency.exponentialRampToValueAtTime(Math.max(360, f * 1.3), now + 0.8);
      dec = 0.92; peak = 0.15 * v;
      malletClick(now, f * 0.8, pan, v * 0.4);
    } else { // steel
      o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.setValueAtTime(f * 1.25, now);
      o2.frequency.setValueAtTime(f * 3.45, now);
      g2.gain.setValueAtTime(0.28, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      fil.frequency.setValueAtTime(7000, now);
      dec = 0.55; peak = 0.14 * v;
      malletClick(now, f * 2.2, pan, v * 1.1);
    }

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.0035);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dec);

    o1.connect(fil); o2.connect(g2); g2.connect(fil); fil.connect(g);
    route(g, pan, true, echo);
    o1.start(now); o2.start(now);
    o1.stop(now + dec + 0.04); o2.stop(now + dec + 0.04);
  }

  function playMelodyStep(stepIdx, pan = 0, vel = 0.72, opts = {}) {
    const mel = MELODIES.find(m => m.id === (opts.melody || cfg.melody)) || MELODIES[0];
    const midi = mel.notes[mod(stepIdx, mel.notes.length)] + (opts.shift || 0);
    playMidi(midi, pan, vel, opts);
    return midi;
  }

  function playScale(deg, pan = 0, vel = 0.65, opts = {}) {
    playMidi(scaleMidi(deg), pan, vel, opts);
  }

  function playChord(baseDeg = 0, vel = 0.72, timbre = 'glass') {
    if (!AC || AC.state !== 'running' || !cfg.sound) return;
    [0, 2, 4, 7].forEach((off, i) => {
      playMidi(scaleMidi(baseDeg + off), (i - 1.5) * 0.34, vel * 0.65, { delay: i * 0.042, rate: 64, timbre });
    });
  }

  // Ultra-crisp physical clack (Newton's cradle, marble collisions, dominoes)
  function playClack(pan = 0, vel = 0.75, pitch = 1) {
    if (!gate(36)) return;
    const now = AC.currentTime;
    const v = clamp(vel, 0.1, 1.1);
    // Sharp metallic/ceramic impulse + damped body ring
    malletClick(now, 1800 * pitch, pan, v * 1.45);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1450 * pitch, now);
    o.frequency.exponentialRampToValueAtTime(820 * pitch, now + 0.032);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.14 * v, now + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    o.connect(g);
    route(g, pan, true, false);
    o.start(now); o.stop(now + 0.075);
  }

  // Authentic upward-chirp water droplet bloop
  function playWaterDrop(pan = 0, pitch = 1, vel = 0.68, at = null) {
    if (!at && !gate(26)) return;
    if (!AC || AC.state !== 'running' || !cfg.sound) return;
    const now = at || AC.currentTime;
    const base = clamp(320 * pitch, 220, 1200);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(base, now);
    o.frequency.exponentialRampToValueAtTime(base * 2.45, now + 0.075);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.16 * vel, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.connect(g);
    route(g, pan, true, true);
    o.start(now); o.stop(now + 0.15);
  }

  // Juicy squish-pop merge sound (Suika / growth burst)
  function playMerge(tier = 0, pan = 0) {
    if (!gate(32)) return;
    const now = AC.currentTime;
    const f = 260 * Math.pow(1.12, clamp(tier, 0, 12));
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.65, now);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g);
    route(g, pan, true, true);
    o.start(now); o.stop(now + 0.2);
    playScale(tier + 2, pan, 0.55, { delay: 0.03, timbre: 'marimba' });
  }

  // Clean crystalline slice zing (Laser Slicer)
  function playSlice(pan = 0, pitch = 1) {
    if (!gate(26)) return;
    const now = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1600 * pitch, now);
    o.frequency.exponentialRampToValueAtTime(640 * pitch, now + 0.09);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.connect(g);
    route(g, pan, true, false);
    o.start(now); o.stop(now + 0.13);
  }

  window.KA = {
    TIMBRES, MELODIES,
    wake, setConfig,
    playMidi, playMelodyStep, playScale, playChord,
    playClack, playWaterDrop, playMerge, playSlice,
    getStream: () => recDest ? recDest.stream : null
  };
})();
