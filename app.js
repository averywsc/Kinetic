/* ============================================================================
   Kinetic — Simulation Runner App Controller, Compositor & Studio UI
   ============================================================================ */
(() => {
  'use strict';

  const { clamp, mod, PALETTES, MATERIALS, makePalette } = window.KT;
  const KA = window.KA;
  const SIMS = window.KSIMS;
  const $ = id => document.getElementById(id);

  // 35 Curated Satisfying Simulations — each with its own signature song & instrument!
  const CATALOG = [
    // Will It Escape?
    { id: 'freeze_escape', name: 'Freeze & Escape', cat: 'escape', pal: 0, melody: 'mountain',   timbre: 'marimba', desc: 'Every 3s the ball freezes in place and a new one drops — how long until it escapes?' },
    { id: 'timed_escape',  name: '15s Escape',      cat: 'escape', pal: 1, melody: 'carol',      timbre: 'steel',   desc: 'Can the sphere shatter 16 spinning rings before 15 seconds run out?' },
    { id: 'narrow_escape', name: 'Closing Gap',     cat: 'escape', pal: 2, melody: 'toccata',    timbre: 'piano',   desc: 'The exit gap seals tighter every second — will it escape in time?' },
    { id: 'maze_escape',   name: 'Spinning Maze',   cat: 'escape', pal: 4, melody: 'bolero',     timbre: 'kalimba', desc: 'Navigate 6 rotating concentric walls to escape the labyrinth' },
    { id: 'gate_escape',   name: 'Orbit Gate',      cat: 'escape', pal: 3, melody: 'swan',       timbre: 'glass',   desc: 'Thread the narrow portal past two orbiting guard shields' },
    { id: 'escape',        name: 'Escape Rings',    cat: 'escape', pal: 1, melody: 'turkish',    timbre: 'marimba', desc: 'Slip through spinning gaps to shatter 12 metallic rings' },
    { id: 'shrink',        name: 'Shrink Escape',   cat: 'escape', pal: 4, melody: 'bumblebee',  timbre: 'kalimba', desc: 'Shrinks each hit to squeeze through tighter and tighter gaps' },

    // 3D & Waves
    { id: 'iso_torus',     name: '3D Vortex Disc',  cat: 'waves',  pal: 1, melody: 'gymnopedie', timbre: 'kalimba', desc: 'Isometric 3D pedestal with swirling toroidal particle funnel' },
    { id: 'iso_wave',      name: '3D Wave Slab',    cat: 'waves',  pal: 3, melody: 'claire',     timbre: 'glass',   desc: 'Floating 3D sphere matrix morphing between waves and deep funnels' },
    { id: 'ripples',       name: 'Ripple Tank',     cat: 'waves',  pal: 2, melody: 'pentatonic', timbre: 'water',   desc: 'Real 2D wave-equation water interference with droplet ASMR' },
    { id: 'cradle',        name: "Newton's Cradle", cat: 'waves',  pal: 2, melody: 'bolero',     timbre: 'steel',   desc: 'Brushed steel spheres with crisp elastic clack physics' },
    { id: 'galton',        name: 'Peg Cascade',     cat: 'waves',  pal: 0, melody: 'prelude',    timbre: 'glass',   desc: 'Beads plinking down pegs into a Gaussian bell curve' },
    { id: 'sand',          name: 'Sand Hourglass',  cat: 'waves',  pal: 5, melody: 'lydian',     timbre: 'kalimba', desc: 'Striated rainbow sand cascading over glass baffles' },
    { id: 'doublepend',    name: 'Chaos Fan',       cat: 'waves',  pal: 5, melody: 'moonlight',  timbre: 'piano',   desc: '12 double pendulums diverging from unison into silk trails' },
    { id: 'laser',         name: 'Caustic Beam',    cat: 'waves',  pal: 2, melody: 'nocturne',   timbre: 'glass',   desc: 'Sweeping mirror reflections & star-polygon envelopes' },
    { id: 'gravity',       name: 'Orbital',         cat: 'waves',  pal: 3, melody: 'claire',     timbre: 'piano',   desc: 'Comets slingshotting around binary stars' },
    { id: 'boids',         name: 'Murmuration',     cat: 'waves',  pal: 0, melody: 'lydian',     timbre: 'glass',   desc: '210 luminous particles flocking in velvet ribbons' },
    { id: 'cloth',         name: 'Silk Mesh',       cat: 'waves',  pal: 3, melody: 'gymnopedie', timbre: 'kalimba', desc: 'Interactive Verlet-physics woven tension cloth' },
    { id: 'epicycle',      name: 'Epicycles',       cat: 'waves',  pal: 4, melody: 'prelude',    timbre: 'kalimba', desc: 'Precision rotating arms tracing sacred geometry' },

    // Rings & Bounce
    { id: 'grow',          name: 'Grow Ring',       cat: 'bounce', pal: 0, melody: 'elise',      timbre: 'marimba', desc: 'Sphere grows on every bounce until finale' },
    { id: 'tether',        name: 'Tether Web',      cat: 'bounce', pal: 2, melody: 'moonlight',  timbre: 'kalimba', desc: 'Every wall bounce weaves a taut glowing string' },
    { id: 'polygon',       name: 'Polygon Morph',   cat: 'bounce', pal: 3, melody: 'canon',      timbre: 'piano',   desc: 'Container gains a vibrating side on every hit' },
    { id: 'duel',          name: 'Ring Duel',       cat: 'bounce', pal: 5, melody: 'swan',       timbre: 'steel',   desc: 'Two rival spheres clash and steal size' },
    { id: 'paint',         name: 'Paint Ring',      cat: 'bounce', pal: 1, melody: 'nocturne',   timbre: 'marimba', desc: 'Permanent layered ceramic paint strokes' },

    // Musical & MIDI
    { id: 'midi',          name: 'MIDI Pads',       cat: 'music',  pal: 0, melody: 'canon',      timbre: 'marimba', desc: 'Marble strikes curved acoustic pads playing real songs' },
    { id: 'squarebounce',  name: 'Rhythm Bounce',   cat: 'music',  pal: 5, melody: 'ode',        timbre: 'piano',   desc: 'Beveled cube bouncing down a synced melody canyon' },
    { id: 'polyrhythm',    name: 'Polyrhythm',      cat: 'music',  pal: 2, melody: 'prelude',    timbre: 'kalimba', desc: '18 concentric arches weaving harmonic standing waves' },
    { id: 'pendulum',      name: 'Pendulum Wave',   cat: 'music',  pal: 3, melody: 'pentatonic', timbre: 'marimba', desc: '22 phase-locked bobs drifting through double helices' },
    { id: 'domino',        name: 'Domino Spiral',   cat: 'music',  pal: 4, melody: 'spring',     timbre: 'marimba', desc: '144 beveled dominoes cascading in a musical wave' },

    // Smash & Merge
    { id: 'suika',         name: 'Merge Jar',       cat: 'smash',  pal: 5, melody: 'spring',     timbre: 'marimba', desc: 'Matching numbered spheres squish-merge into higher tiers' },
    { id: 'multiply',      name: 'Multiply',        cat: 'smash',  pal: 0, melody: 'carol',      timbre: 'glass',   desc: 'Spheres drop in through the top gap and multiply into 100+' },
    { id: 'breaker',       name: 'Ring Breaker',    cat: 'smash',  pal: 1, melody: 'turkish',    timbre: 'steel',   desc: 'Chrome marbles shatter concentric curved glass rings' },
    { id: 'slicer',        name: 'Laser Slicer',    cat: 'smash',  pal: 2, melody: 'toccata',    timbre: 'glass',   desc: 'Sweeping laser blade cleanly halves floating orbs' },
    { id: 'territory',     name: 'Territory War',   cat: 'smash',  pal: 5, melody: 'ode',        timbre: 'marimba', desc: '4 rival teams conquering beveled ceramic tiles' },
    { id: 'race',          name: 'Marble Race',     cat: 'smash',  pal: 1, melody: 'bumblebee',  timbre: 'steel',   desc: '8 glass marbles racing through windmills & funnels' }
  ];

  const CATS = [
    ['all',    `All (${CATALOG.length})`],
    ['escape', 'Will It Escape?'],
    ['waves',  '3D & Waves'],
    ['bounce', 'Rings & Bounce'],
    ['music',  'Musical & MIDI'],
    ['smash',  'Smash & Merge']
  ];

  const DEFAULTS = Object.freeze({
    sim: 'freeze_escape',
    pal: 0,
    material: 'glass',
    timbre: 'marimba',
    melody: 'mountain',
    speed: 1.0,
    grav: 1.0,
    bounce: 1.01,
    trail: 64,
    glow: 22,
    bright: 92,
    vol: 68,
    sound: true,
    paused: false,
    autorun: false,
    reels: false
  });

  const STORAGE_KEY = 'kinetic:v4';
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch (e) {}
  S.paused = false;
  if (!SIMS[S.sim]) S.sim = DEFAULTS.sim;
  const saveState = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) {} };

  /* =========================================================================
     Canvas Pipeline & Subtle Studio Compositor
     ========================================================================= */
  const cv = $('cv'), out = cv.getContext('2d');
  const simC = document.createElement('canvas'), sctx = simC.getContext('2d');
  const bloomC = document.createElement('canvas'), bctx = bloomC.getContext('2d');

  let W = 0, H = 0, dpr = 1, activeSim = null, activePal = makePalette(S.pal);
  let lastT = performance.now(), lastMove = performance.now(), autoTimer = 0;
  let activeCat = 'all';
  const ptr = { x: 0, y: 0, down: false, in: false };

  const resize = () => {
    const rect = $('frame').getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = simC.width = Math.max(2, Math.round(rect.width * dpr));
    H = cv.height = simC.height = Math.max(2, Math.round(rect.height * dpr));
    bloomC.width = Math.max(2, Math.ceil(W / 5));
    bloomC.height = Math.max(2, Math.ceil(H / 5));
    startSim(S.sim, false, false);
  };

  let toastTimer = 0;
  const showToast = (title, sub) => {
    const el = $('toast');
    el.innerHTML = `<strong>${title}</strong><span>${sub}</span>`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  };

  const applySimAudio = (item) => {
    S.pal = item.pal;
    S.melody = item.melody;
    S.timbre = item.timbre;
  };

  const startSim = (id, announce = true, applyPreset = false) => {
    const item = CATALOG.find(x => x.id === id) || CATALOG[0];
    S.sim = item.id;
    if (applyPreset) applySimAudio(item);
    activePal = makePalette(S.pal);
    activeSim = SIMS[item.id](W, H, { dpr, small: false, audio: true, S });
    autoTimer = 0;
    syncUI();
    if (announce) {
      const song = KA.MELODIES.find(m => m.id === S.melody);
      showToast(item.name, `${item.desc}${song ? ` · ${song.name}` : ''}`);
    }
  };

  const stepSim = (delta) => {
    const idx = CATALOG.findIndex(x => x.id === S.sim);
    const next = CATALOG[mod(idx + delta, CATALOG.length)];
    startSim(next.id, true, true);
  };

  const surprise = () => {
    let pick;
    do { pick = CATALOG[(Math.random() * CATALOG.length) | 0]; } while (pick.id === S.sim);
    startSim(pick.id, true, true);
  };

  const resetDefaults = () => {
    const keepSim = S.sim;
    const curItem = CATALOG.find(x => x.id === keepSim) || CATALOG[0];
    const wasReels = S.reels;
    Object.assign(S, DEFAULTS, {
      sim: curItem.id,
      pal: curItem.pal,
      melody: curItem.melody,
      timbre: curItem.timbre
    });
    ['kinetic:v1', 'kinetic:v2', 'kinetic:v3', 'kinetic:v4'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    syncUI();
    if (wasReels !== S.reels) {
      setTimeout(resize, 50);
      setTimeout(resize, 460);
    } else {
      startSim(S.sim, false, false);
    }
    showToast('Defaults restored', 'All settings reset to factory defaults');
  };

  const frame = now => {
    const dt = Math.min(2.4, (now - lastT) / 16.667);
    lastT = now;

    if (!S.paused && activeSim) {
      activeSim.step(dt, now, ptr, activePal);
      activeSim.draw(sctx, now, activePal, ptr);

      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalCompositeOperation = 'source-over';
      out.globalAlpha = 1;
      out.filter = S.bright === 100 ? 'none' : `brightness(${S.bright}%)`;
      out.drawImage(simC, 0, 0);
      out.filter = 'none';

      if (S.glow > 2) {
        bctx.drawImage(simC, 0, 0, bloomC.width, bloomC.height);
        out.globalCompositeOperation = 'screen';
        out.globalAlpha = (S.glow / 100) * 0.44 * (S.bright / 100);
        out.imageSmoothingEnabled = true;
        out.drawImage(bloomC, 0, 0, W, H);
        out.globalAlpha = 1;
        out.globalCompositeOperation = 'source-over';
      }

      $('stxt').textContent = activeSim.stat();

      autoTimer += dt / 60;
      const dur = 22;
      if (S.autorun) {
        const p = activeSim.done ? 1 : Math.max(activeSim.progress || 0, autoTimer / dur);
        $('progf').style.width = `${clamp(p * 100, 0, 100)}%`;
        if (activeSim.done || autoTimer >= dur) stepSim(1);
      } else if (activeSim.done) {
        startSim(S.sim, false, false);
      }
    }

    document.body.classList.toggle('idle', now - lastMove > 4200 && !ptr.down && !document.body.classList.contains('drawer-open'));
    requestAnimationFrame(frame);
  };

  /* =========================================================================
     Build Studio Drawer & UI Controls
     ========================================================================= */
  $('matGrid').innerHTML = MATERIALS.map(([id, label]) =>
    `<button class="chip" type="button" data-mat="${id}">${label}</button>`
  ).join('');

  $('palGrid').innerHTML = PALETTES.map((p, i) =>
    `<button class="palchip" type="button" data-pal="${i}" title="${p.name}">
       <span class="swatch" style="background:linear-gradient(90deg,${p.stops.join(',')})"></span>
       <span class="pname">${p.name}</span>
     </button>`
  ).join('');

  $('timGrid').innerHTML = KA.TIMBRES.map(([id, label]) =>
    `<button class="chip" type="button" data-tim="${id}">${label}</button>`
  ).join('');

  $('melGrid').innerHTML = KA.MELODIES.map(m =>
    `<button class="chip" type="button" data-mel="${m.id}">${m.name}</button>`
  ).join('');

  $('catTabs').innerHTML = CATS.map(([id, label]) =>
    `<button class="ctab" type="button" data-cat="${id}">${label}</button>`
  ).join('');

  if ($('catSub')) {
    $('catSub').textContent = `${CATALOG.length} interactive physics, escape challenge & 3D wave simulations running live.`;
  }

  const syncUI = () => {
    const idx = CATALOG.findIndex(x => x.id === S.sim);
    const cur = CATALOG[idx] || CATALOG[0];
    activePal = makePalette(S.pal);

    $('curName').textContent = cur.name;
    $('curIdx').textContent = `${idx + 1} / ${CATALOG.length}`;
    $('modeDot').style.background = activePal.raw[0];
    $('modeDot').style.boxShadow = `0 0 10px ${activePal.raw[0]}`;
    document.documentElement.style.setProperty('--accent', activePal.raw[0]);

    document.querySelectorAll('[data-mat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mat === S.material));
    document.querySelectorAll('[data-pal]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.pal === S.pal));
    document.querySelectorAll('[data-tim]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tim === S.timbre));
    document.querySelectorAll('[data-mel]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mel === S.melody));

    $('speed').value = S.speed; $('speedO').textContent = S.speed.toFixed(2) + '×';
    $('grav').value = S.grav; $('gravO').textContent = S.grav.toFixed(2) + '×';
    $('bounce').value = S.bounce; $('bounceO').textContent = S.bounce.toFixed(3);
    $('trail').value = S.trail; $('trailO').textContent = S.trail + '%';
    $('glow').value = S.glow; $('glowO').textContent = S.glow + '%';
    $('bright').value = S.bright; $('brightO').textContent = S.bright + '%';
    $('vol').value = S.vol; $('volO').textContent = S.vol + '%';

    $('sndBtn').setAttribute('aria-pressed', S.sound);
    $('playBtn').setAttribute('aria-pressed', S.paused);
    $('autoTop').setAttribute('aria-pressed', S.autorun);
    $('reelsTop').setAttribute('aria-pressed', S.reels);
    $('autoBtn').setAttribute('aria-pressed', S.autorun);
    $('reelsBtn').setAttribute('aria-pressed', S.reels);

    document.body.classList.toggle('autorun', S.autorun);
    document.body.classList.toggle('reels', S.reels);

    KA.setConfig({ sound: S.sound, vol: S.vol, timbre: S.timbre, melody: S.melody, pal: S.pal });
    saveState();
  };

  /* =========================================================================
     Categorized Live Preview Catalog Modal
     ========================================================================= */
  let galRaf = 0, galTiles = [], galIO = null;

  const closeCatalog = () => {
    cancelAnimationFrame(galRaf);
    if (galIO) galIO.disconnect();
    $('catalog').hidden = true;
  };

  const renderCatalogGrid = () => {
    cancelAnimationFrame(galRaf);
    if (galIO) galIO.disconnect();
    const list = activeCat === 'all' ? CATALOG : CATALOG.filter(x => x.cat === activeCat);
    document.querySelectorAll('.ctab').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === activeCat));

    $('catGrid').innerHTML = list.map(item => `
      <button class="tile" type="button" data-id="${item.id}" aria-current="${item.id === S.sim}">
        <canvas></canvas>
        <div class="tmeta">
          <b>${item.name}</b>
          <span>${item.desc}</span>
        </div>
      </button>
    `).join('');

    galIO = window.IntersectionObserver ? new IntersectionObserver(es => es.forEach(en => {
      if (en.target._tile) en.target._tile.vis = en.isIntersecting;
    }), { root: $('catalog') }) : null;

    galTiles = [...document.querySelectorAll('#catGrid .tile')].map(el => {
      const id = el.dataset.id, item = CATALOG.find(x => x.id === id);
      const cvs = el.querySelector('canvas'), tw = cvs.width = 300, th = cvs.height = 210;
      const pal = makePalette(item.pal);
      const tile = {
        id, vis: true, c: cvs.getContext('2d'), pal, p: null,
        eng: SIMS[id](tw, th, { dpr: 1, small: true, audio: false, S })
      };
      el._tile = tile;
      if (galIO) galIO.observe(el);
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        tile.p = { x: (e.clientX - r.left) * tw / r.width, y: (e.clientY - r.top) * th / r.height, down: e.buttons > 0, in: true };
      });
      el.addEventListener('pointerleave', () => { tile.p = null; });
      return tile;
    });

    let lastG = performance.now();
    const loop = now => {
      if (now - lastG > 34) {
        const dt = Math.min(2.1, (now - lastG) / 16.667);
        lastG = now;
        for (const t of galTiles) {
          if (!t.vis) continue;
          t.eng.step(dt, now, t.p, t.pal);
          t.eng.draw(t.c, now, t.pal, t.p);
          if (t.eng.done) t.eng = SIMS[t.id](300, 210, { dpr: 1, small: true, audio: false, S });
        }
      }
      galRaf = requestAnimationFrame(loop);
    };
    galRaf = requestAnimationFrame(loop);
  };

  const openCatalog = () => {
    $('catalog').hidden = false;
    $('catalog').scrollTop = 0;
    renderCatalogGrid();
  };

  /* =========================================================================
     Video Recording (WebM 60fps + Live Studio Audio) & PNG Snapshot
     ========================================================================= */
  let recorder = null, recChunks = [], recStart = 0, recTick = 0;
  const stopRec = () => { if (recorder && recorder.state !== 'inactive') recorder.stop(); };

  const toggleRec = () => {
    if (recorder && recorder.state === 'recording') { stopRec(); return; }
    if (!cv.captureStream || !window.MediaRecorder) { alert('WebM recording is not supported in this browser.'); return; }
    KA.wake();
    const vStream = cv.captureStream(60);
    const tracks = [...vStream.getVideoTracks()];
    const aStream = KA.getStream();
    if (aStream && S.sound) tracks.push(...aStream.getAudioTracks());
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    recChunks = [];
    recorder = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 7000000 } : undefined);
    recorder.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(recTick);
      $('recBadge').hidden = true;
      $('recBarBtn').setAttribute('aria-pressed', 'false');
      $('recDrawerBtn').setAttribute('aria-pressed', 'false');
      $('recDrawerBtn').textContent = 'Record WebM';
      if (!recChunks.length) return;
      const blob = new Blob(recChunks, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      $('mimg').hidden = true;
      $('mvid').hidden = false; $('mvid').src = url;
      $('mdl').href = url; $('mdl').download = `kinetic-${S.sim}.webm`; $('mdl').textContent = 'Download WebM Video';
      $('modal').hidden = false;
    };
    recorder.start(250);
    recStart = Date.now();
    $('recBadge').hidden = false;
    $('recBarBtn').setAttribute('aria-pressed', 'true');
    $('recDrawerBtn').setAttribute('aria-pressed', 'true');
    $('recDrawerBtn').textContent = 'Stop Recording';
    $('recTime').textContent = '00:00';
    recTick = setInterval(() => {
      const sec = Math.floor((Date.now() - recStart) / 1000);
      $('recTime').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }, 300);
  };

  /* =========================================================================
     Event Wiring
     ========================================================================= */
  const poke = () => { lastMove = performance.now(); document.body.classList.remove('idle'); };
  const cpos = e => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };

  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    Object.assign(ptr, cpos(e), { down: true, in: true });
    document.body.classList.add('used');
    poke(); KA.wake();
    if (activeSim && activeSim.interact) activeSim.interact('down', ptr.x, ptr.y, activePal);
  });
  cv.addEventListener('pointermove', e => {
    poke();
    Object.assign(ptr, cpos(e), { in: true });
    if (ptr.down && activeSim && activeSim.interact) activeSim.interact('move', ptr.x, ptr.y, activePal);
  });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, e => {
    if (ptr.down && activeSim && activeSim.interact) activeSim.interact('up', ptr.x, ptr.y, activePal);
    ptr.down = false;
    if (e.pointerType !== 'mouse') ptr.in = false;
  }));
  cv.addEventListener('pointerleave', () => { if (!ptr.down) ptr.in = false; });

  const toggleDrawer = (force) => {
    const open = force ?? !document.body.classList.contains('drawer-open');
    document.body.classList.toggle('drawer-open', open);
    $('ctrlTop').setAttribute('aria-pressed', open);
  };

  const toggleReels = () => {
    S.reels = !S.reels; syncUI();
    setTimeout(resize, 50);
    setTimeout(resize, 480);
  };

  $('modeBtn').addEventListener('click', () => { KA.wake(); openCatalog(); });
  $('catClose').addEventListener('click', closeCatalog);
  $('catTabs').addEventListener('click', e => {
    const b = e.target.closest('.ctab');
    if (!b) return;
    activeCat = b.dataset.cat;
    renderCatalogGrid();
  });
  $('catGrid').addEventListener('click', e => {
    const t = e.target.closest('.tile');
    if (!t) return;
    KA.wake();
    startSim(t.dataset.id, true, true);
    closeCatalog();
  });

  $('prevBtn').addEventListener('click', () => { KA.wake(); stepSim(-1); });
  $('nextBtn').addEventListener('click', () => { KA.wake(); stepSim(1); });
  $('playBtn').addEventListener('click', () => { S.paused = !S.paused; syncUI(); });
  $('rstBtn').addEventListener('click', () => { KA.wake(); startSim(S.sim, false, false); });
  $('sndBtn').addEventListener('click', () => { S.sound = !S.sound; if (S.sound) KA.wake(); syncUI(); });
  $('recBarBtn').addEventListener('click', toggleRec);
  $('recDrawerBtn').addEventListener('click', toggleRec);
  $('recBadge').addEventListener('click', stopRec);

  $('reelsTop').addEventListener('click', toggleReels);
  $('reelsBtn').addEventListener('click', toggleReels);
  $('autoTop').addEventListener('click', () => { S.autorun = !S.autorun; autoTimer = 0; syncUI(); });
  $('autoBtn').addEventListener('click', () => { S.autorun = !S.autorun; autoTimer = 0; syncUI(); });
  $('ctrlTop').addEventListener('click', () => toggleDrawer());
  $('drawerClose').addEventListener('click', () => toggleDrawer(false));
  $('surpBtn').addEventListener('click', () => { KA.wake(); surprise(); });
  $('resetDefBtn').addEventListener('click', resetDefaults);
  $('fsBtn').addEventListener('click', () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
  });
  $('pngBtn').addEventListener('click', () => {
    cv.toBlob(b => {
      if (!b) return;
      const u = URL.createObjectURL(b);
      $('mvid').hidden = true; $('mvid').pause();
      $('mimg').hidden = false; $('mimg').src = u;
      $('mdl').href = u; $('mdl').download = `kinetic-${S.sim}.png`; $('mdl').textContent = 'Download PNG';
      $('modal').hidden = false;
    }, 'image/png');
  });
  $('modal').addEventListener('click', e => {
    if (!e.target.closest('a') && e.target.tagName !== 'VIDEO') { $('modal').hidden = true; $('mvid').pause(); }
  });

  $('matGrid').addEventListener('click', e => { const b = e.target.closest('[data-mat]'); if (b) { S.material = b.dataset.mat; syncUI(); } });
  $('palGrid').addEventListener('click', e => { const b = e.target.closest('[data-pal]'); if (b) { S.pal = +b.dataset.pal; syncUI(); } });
  $('timGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-tim]');
    if (!b) return;
    S.timbre = b.dataset.tim; KA.wake(); syncUI();
    KA.playMelodyStep(0, 0, 0.7);
  });
  $('melGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-mel]');
    if (!b) return;
    S.melody = b.dataset.mel; KA.wake(); syncUI();
    KA.playMelodyStep(0, -0.25, 0.65);
    setTimeout(() => KA.playMelodyStep(1, 0, 0.65), 140);
    setTimeout(() => KA.playMelodyStep(2, 0.25, 0.65), 280);
  });

  [['speed', 'speed'], ['grav', 'grav'], ['bounce', 'bounce'], ['trail', 'trail'], ['glow', 'glow'], ['bright', 'bright'], ['vol', 'vol']].forEach(([id, k]) => {
    $(id).addEventListener('input', () => { S[k] = +$(id).value; syncUI(); });
  });

  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    poke();
    if (e.key === 'Escape') { closeCatalog(); $('modal').hidden = true; $('mvid').pause(); toggleDrawer(false); }
    else if (e.key === ' ') { e.preventDefault(); S.paused = !S.paused; syncUI(); }
    else if (e.key === 'r' || e.key === 'R') { KA.wake(); startSim(S.sim, false, false); }
    else if (e.key === 'g' || e.key === 'G') { $('catalog').hidden ? openCatalog() : closeCatalog(); }
    else if (e.key === 'c' || e.key === 'C') toggleDrawer();
    else if (e.key === 'm' || e.key === 'M') $('sndBtn').click();
    else if (e.key === 'v' || e.key === 'V') toggleReels();
    else if (e.key === 'a' || e.key === 'A') { S.autorun = !S.autorun; autoTimer = 0; syncUI(); }
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hide');
    else if (e.key === 'f' || e.key === 'F') $('fsBtn').click();
    else if (e.key === 'ArrowRight') { KA.wake(); stepSim(1); }
    else if (e.key === 'ArrowLeft') { KA.wake(); stepSim(-1); }
  });

  addEventListener('resize', resize);

  /* =========================================================================
     Boot
     ========================================================================= */
  syncUI();
  resize();
  const initial = CATALOG.find(x => x.id === S.sim) || CATALOG[0];
  setTimeout(() => {
    const song = KA.MELODIES.find(m => m.id === S.melody);
    showToast(initial.name, `${initial.desc}${song ? ` · ${song.name}` : ''}`);
  }, 400);
  requestAnimationFrame(frame);
})();
