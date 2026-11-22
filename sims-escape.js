/* ============================================================================
   Kinetic — "Will It Escape?" Challenge Modes & 3D Isometric Particle Waves
   Upgraded with impact squash-and-stretch, directional sparks, near-miss
   tension feedback, spinning shatter shards, and 3D cast shadows.
   ============================================================================ */
(() => {
  'use strict';

  const { TAU, clamp, lerp, mod, fillStudioBg, drawSphere, drawStudioRing, drawSilkTrail, makeFX } = window.KT;
  const KA = window.KA;
  const SIMS = window.KSIMS || (window.KSIMS = {});

  function drawPrompt(c, w, h, dpr, headline, subline, accentCol, small) {
    if (small) return;
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const topY = Math.max(82 * dpr, h * 0.125);
    c.font = `600 ${Math.round(19 * dpr)}px "DM Sans", -apple-system, sans-serif`;
    c.fillStyle = accentCol || 'rgba(242,245,252,0.92)';
    c.fillText(headline, w * 0.5, topY);
    if (subline) {
      c.font = `500 ${Math.round(13 * dpr)}px "DM Sans", -apple-system, sans-serif`;
      c.fillStyle = 'rgba(176,188,210,0.78)';
      c.fillText(subline, w * 0.5, topY + 22 * dpr);
    }
    c.restore();
  }

  /* =========================================================================
     1. FREEZE & ESCAPE
     ========================================================================= */
  SIMS.freeze_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const ballR = R * 0.068;
    const FREEZE_SEC = 3.0;
    const MAX_FROZEN = small ? 12 : 24;

    const gapAng = -0.32;
    const gapWidth = 0.42;

    const frozen = [];
    let live = null;
    let freezeTimer = FREEZE_SEC, lastTickBin = 4;
    let totalTime = 0, noteI = 0, state = 'running', endTimer = 0, done = false;
    let escapeTime = 0, ringPulse = 0, lipFlash = 0;

    const dropBall = () => {
      const sp = R * 0.022;
      const dir = frozen.length % 2 === 0 ? -1 : 1; // start away from gap on drop 1
      live = {
        x: cx + (Math.random() - 0.5) * R * 0.24,
        y: cy - R * 0.72,
        vx: dir * sp * (0.68 + Math.random() * 0.38),
        vy: sp * 0.14,
        r: ballR,
        hue: (frozen.length * 0.11 + 0.05) % 1,
        sq: 0, sqAng: 0,
        trail: []
      };
      freezeTimer = FREEZE_SEC;
      lastTickBin = 4;
    };
    dropBall();

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        ringPulse *= Math.pow(0.86, dt);
        lipFlash *= Math.pow(0.86, dt);

        if (state !== 'running') {
          if (live && state === 'escaped') {
            live.x += live.vx * dt * 0.42;
            live.y += live.vy * dt * 0.42;
            live.vy += 0.14 * (R / 260) * dt;
            live.trail.push([live.x, live.y]);
            if (live.trail.length > 28) live.trail.shift();
          }
          endTimer -= dt / 60;
          if (endTimer <= 0) done = true;
          return;
        }

        const dtSec = (dt / 60) * S.speed;
        totalTime += dtSec;
        freezeTimer -= dtSec;

        // Soft wood-tick warning in final 0.9s before ball freezes
        const tickBin = Math.ceil(freezeTimer * 3);
        if (freezeTimer < 0.95 && freezeTimer > 0 && tickBin !== lastTickBin) {
          lastTickBin = tickBin;
          if (audio) KA.playTick(freezeTimer < 0.35);
        }

        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.28 * Math.max(0.25, S.grav) * (R / 260);
        const maxSpd = R * 0.052;
        const tLen = Math.round(6 + S.trail * 0.36);

        for (let s = 0; s < sub; s++) {
          if (!live) break;
          live.vy += g * sdt;
          live.x += live.vx * sdt;
          live.y += live.vy * sdt;

          for (const f of frozen) {
            const dx = live.x - f.x, dy = live.y - f.y, minD = live.r + f.r;
            const d2 = dx * dx + dy * dy;
            if (d2 < minD * minD && d2 > 0.0001) {
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
              live.x = f.x + nx * minD;
              live.y = f.y + ny * minD;
              const vn = live.vx * nx + live.vy * ny;
              if (vn < 0) {
                const e = clamp(S.bounce, 0.92, 1.04);
                live.vx = (live.vx - 2 * vn * nx) * e;
                live.vy = (live.vy - 2 * vn * ny) * e;
                const sp = Math.hypot(live.vx, live.vy);
                if (sp > maxSpd) { live.vx *= maxSpd / sp; live.vy *= maxSpd / sp; }
                live.sq = 0.85; live.sqAng = Math.atan2(ny, nx);
                f.flash = 1;
                fx.burstDir(f.x + nx * f.r, f.y + ny * f.r, -nx, -ny, pal.col(live.hue, 0.88), 6, R * 0.014, 1.9);
                if (audio) KA.playClack((live.x / w - 0.5) * 1.3, 0.58, 1.12 + (frozen.length % 5) * 0.06);
              }
            }
          }

          const dx = live.x - cx, dy = live.y - cy, dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const diff = Math.abs(Math.atan2(Math.sin(ang - gapAng), Math.cos(ang - gapAng)));
          const inGap = diff < gapWidth * 0.5 - (live.r / R) * 0.34;

          if (inGap && dist > R + live.r * 0.45) {
            state = 'escaped';
            escapeTime = totalTime;
            endTimer = 2.4;
            const col = pal.col(live.hue, 0.95);
            fx.burst(live.x, live.y, col, 52, R * 0.034, 2.8);
            fx.wave(live.x, live.y, col, 6, R * 0.62, 3.2, 0.72);
            fx.kick(Math.cos(gapAng), Math.sin(gapAng), 6);
            if (audio) { KA.playSub(0.75, 95); KA.playChord(4, 0.9); }
            break;
          } else if (!inGap && dist >= R - live.r && dist < R + live.r * 1.2) {
            const nx = dx / dist, ny = dy / dist;
            live.x = cx + nx * (R - live.r);
            live.y = cy + ny * (R - live.r);
            const dot = live.vx * nx + live.vy * ny;
            if (dot > 0) {
              const e = clamp(S.bounce, 0.92, 1.03);
              live.vx = (live.vx - 2 * dot * nx) * e - ny * 0.05 * (R / 260);
              live.vy = (live.vy - 2 * dot * ny) * e + nx * 0.05 * (R / 260);
              const sp = Math.hypot(live.vx, live.vy);
              if (sp > maxSpd) { live.vx *= maxSpd / sp; live.vy *= maxSpd / sp; }
              live.sq = 0.9; live.sqAng = ang;
              ringPulse = 0.78;
              const col = pal.col(live.hue, 0.9);
              const nearLip = diff < gapWidth * 0.5 + 0.16;
              if (nearLip) {
                lipFlash = 1;
                fx.burstDir(cx + nx * R, cy + ny * R, nx, ny, '#ffffff', 12, R * 0.02, 2.3);
                if (audio) KA.playNearMiss(nx * 0.72);
              } else {
                fx.burstDir(cx + nx * R, cy + ny * R, nx, ny, col, 7, R * 0.014, 1.9);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.58);
              }
              fx.rim(cx, cy, R, ang, nearLip ? '#ffffff' : col, 0.25, 0.62);
            }
          }
        }

        if (live && state === 'running') {
          live.sq *= Math.pow(0.78, dt);
          live.trail.push([live.x, live.y]);
          while (live.trail.length > tLen) live.trail.shift();
        }
        for (const f of frozen) {
          if (f.flash > 0.01) f.flash *= Math.pow(0.86, dt);
          f.pop = lerp(f.pop, 1, 0.18 * dt);
        }

        if (state === 'running' && freezeTimer <= 0 && live) {
          frozen.push({ x: live.x, y: live.y, r: live.r, hue: live.hue, flash: 1, pop: 1.24 });
          fx.wave(live.x, live.y, 'rgba(215,228,248,0.82)', live.r, live.r * 2.4, 2, 0.65);
          fx.kick(0, 1, 2.4);
          if (audio) { KA.playSub(0.45, 85); KA.playClack((live.x / w - 0.5) * 1.2, 0.85, 0.7); }
          if (frozen.length >= MAX_FROZEN) {
            state = 'trapped'; endTimer = 2.2; live = null;
          } else {
            dropBall();
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.save();
        c.translate(fx.ox, fx.oy);

        const dish = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
        dish.addColorStop(0, 'rgba(255,255,255,0.016)');
        dish.addColorStop(1, 'rgba(0,0,0,0.44)');
        c.fillStyle = dish;
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();

        const a0 = gapAng + gapWidth * 0.5, a1 = gapAng + TAU - gapWidth * 0.5;
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.14, ringPulse * 0.5, a0, a1, false);

        // Glowing exit lip caps + subtle animated outward chevron
        c.save();
        c.fillStyle = lipFlash > 0.3 ? '#fff' : pal.col(0.04, 0.95);
        for (const ea of [a0, a1]) {
          c.beginPath(); c.arc(cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, (3.2 + lipFlash * 1.4) * dpr, 0, TAU); c.fill();
        }
        const chevD = R + (14 + Math.sin(t * 0.005) * 3) * dpr;
        c.translate(cx + Math.cos(gapAng) * chevD, cy + Math.sin(gapAng) * chevD);
        c.rotate(gapAng);
        c.strokeStyle = pal.col(0.04, 0.45 + lipFlash * 0.45);
        c.lineWidth = 1.8 * dpr; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-4 * dpr, -5 * dpr); c.lineTo(3 * dpr, 0); c.lineTo(-4 * dpr, 5 * dpr); c.stroke();
        c.restore();

        for (const f of frozen) {
          c.save();
          c.globalAlpha = 0.64 + f.flash * 0.34;
          drawSphere(c, f.x, f.y, f.r * (f.pop || 1), pal, f.hue, 'ceramic', true);
          c.strokeStyle = `rgba(218,230,248,${0.26 + f.flash * 0.5})`;
          c.lineWidth = 1.4 * dpr;
          c.beginPath(); c.arc(f.x, f.y, f.r * (f.pop || 1) - 1, 0, TAU); c.stroke();
          c.restore();
        }

        if (live) {
          if (S.trail > 3) drawSilkTrail(c, live.trail, pal, live.hue, live.r * 1.15, 0.34);
          drawSphere(c, live.x, live.y, live.r, pal, live.hue, S.material, true, { amt: live.sq, ang: live.sqAng });
          if (state === 'running') {
            const frac = clamp(freezeTimer / FREEZE_SEC, 0, 1);
            c.strokeStyle = frac < 0.3 ? '#ff6b7d' : 'rgba(255,255,255,0.78)';
            c.lineWidth = 2.2 * dpr;
            c.lineCap = 'round';
            c.beginPath();
            c.arc(live.x, live.y, live.r + 5 * dpr, -Math.PI * 0.5, -Math.PI * 0.5 + frac * TAU);
            c.stroke();
          }
        }

        fx.draw(c, dpr);
        c.restore();

        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Escaped in ${escapeTime.toFixed(1)}s`, `${frozen.length} frozen before breakout`, pal.col(0.05, 1), small);
        else if (state === 'trapped') drawPrompt(c, w, h, dpr, 'Chamber locked', `${frozen.length} spheres frozen`, '#ff7b8b', small);
        else drawPrompt(c, w, h, dpr, 'Will it escape?', `Freezes in ${Math.max(0, freezeTimer).toFixed(1)}s  ·  ${frozen.length} frozen  ·  ${totalTime.toFixed(1)}s`, null, small);
      },
      interact(type, x, y) {
        if (type === 'down' && live && state === 'running') {
          live.vx += (x - live.x) * 0.035; live.vy += (y - live.y) * 0.035;
          if (audio) KA.playClack((x / w - 0.5) * 1.2, 0.5, 1.3);
        }
      },
      stat() { return state === 'escaped' ? `Escaped ${escapeTime.toFixed(1)}s` : `${totalTime.toFixed(1)}s · ${frozen.length} frozen`; },
      get done() { return done; },
      get progress() { return state !== 'running' ? 1 : clamp(frozen.length / MAX_FROZEN, 0, 1); }
    };
  };

  /* =========================================================================
     2. 15s ESCAPE CHALLENGE (With shattering metallic shards & timer arc!)
     ========================================================================= */
  SIMS.timed_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const numRings = small ? 8 : 16;
    const LIMIT = 15.0;
    const rings = Array.from({ length: numRings }, (_, i) => {
      const f = i / (numRings - 1);
      return {
        r: lerp(R * 0.22, R * 0.96, f),
        ang: i * 0.72 + Math.PI,
        vel: (i % 2 === 0 ? 1 : -1) * (0.015 + (1 - f) * 0.014),
        gap: lerp(0.64, 0.42, f),
        alive: true, hue: f * 0.9, flash: 0
      };
    });
    const shards = [];
    const b = { x: cx + R * 0.04, y: cy - R * 0.04, vx: R * 0.023, vy: -R * 0.012, r: R * 0.033, hue: 0.1, sq: 0, sqAng: 0, trail: [] };
    let escaped = 0, timeLeft = LIMIT, noteI = 0, state = 'running', endT = 0, done = false;

    const shatterRing = (rg, pal) => {
      rg.alive = false; escaped++;
      const segs = small ? 12 : 30, col = pal.col(rg.hue, 0.92);
      for (let k = 0; k < segs; k++) {
        const a = rg.ang + rg.gap * 0.5 + (k / segs) * (TAU - rg.gap);
        const sp = R * (0.009 + Math.random() * 0.016);
        shards.push({ x: cx + Math.cos(a) * rg.r, y: cy + Math.sin(a) * rg.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, rot: (Math.random() - 0.5) * 0.2, len: (TAU * rg.r / segs) * 0.7, life: 1, col });
      }
      fx.wave(cx, cy, col, rg.r * 0.94, rg.r * 1.14, 2.2, 0.55);
      fx.kick(0, 1, 2.2);
      if (audio) { KA.playSub(0.45, 95 + escaped * 3); KA.playChord(escaped % 7, 0.65); }
    };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        for (let i = shards.length - 1; i >= 0; i--) {
          const sh = shards[i];
          sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 0.08 * (R / 260) * dt;
          sh.a += sh.rot * dt; sh.life -= 0.02 * dt;
          if (sh.life <= 0) shards.splice(i, 1);
        }
        if (state !== 'running') { endT -= dt / 60; if (endT <= 0) done = true; return; }
        timeLeft -= (dt / 60) * S.speed;
        if (timeLeft <= 0) { timeLeft = 0; state = 'failed'; endT = 2.0; if (audio) KA.playSub(0.8, 65); return; }

        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.25 * S.grav * (R / 260), maxSpd = R * 0.056;
        const tLen = Math.round(6 + S.trail * 0.36);

        for (let s = 0; s < sub; s++) {
          for (const rg of rings) if (rg.alive) { rg.ang = mod(rg.ang + rg.vel * sdt, TAU); rg.flash *= Math.pow(0.9, sdt); }
          const active = rings.find(r => r.alive);
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          if (!active) continue;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          if (dist >= active.r - b.r && dist > 0.001) {
            const ang = mod(Math.atan2(dy, dx), TAU);
            const diff = Math.abs(Math.atan2(Math.sin(ang - active.ang), Math.cos(ang - active.ang)));
            if (diff < active.gap * 0.5) {
              shatterRing(active, pal);
              if (escaped >= numRings) { state = 'won'; endT = 2.2; if (audio) KA.playChord(5, 0.9); break; }
            } else {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * (active.r - b.r); b.y = cy + ny * (active.r - b.r);
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                b.vx = (b.vx - 2 * dot * nx) * 1.015 - ny * 0.09 * (R / 260);
                b.vy = (b.vy - 2 * dot * ny) * 1.015 + nx * 0.09 * (R / 260);
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
                b.sq = 0.85; b.sqAng = ang;
                active.flash = 1;
                fx.burstDir(cx + nx * active.r, cy + ny * active.r, nx, ny, pal.col(active.hue, 0.9), 6, R * 0.014, 1.8);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.7, 0.55);
              }
            }
          }
        }
        b.sq *= Math.pow(0.78, dt);
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.save();
        c.translate(fx.ox, fx.oy);

        // Sleek outer countdown progress halo
        const frac = clamp(timeLeft / LIMIT, 0, 1);
        c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 2.5 * dpr;
        c.beginPath(); c.arc(cx, cy, R * 1.05, 0, TAU); c.stroke();
        c.strokeStyle = frac < 0.28 ? '#ff6477' : pal.col(0.1, 0.55);
        c.lineWidth = 2.5 * dpr; c.lineCap = 'round';
        c.beginPath(); c.arc(cx, cy, R * 1.05, -Math.PI * 0.5, -Math.PI * 0.5 + frac * TAU); c.stroke();

        for (const rg of rings) {
          if (!rg.alive) continue;
          const a0 = rg.ang + rg.gap * 0.5, a1 = rg.ang + TAU - rg.gap * 0.5;
          drawStudioRing(c, cx, cy, rg.r, dpr, pal, rg.hue, rg.flash * 0.65, a0, a1, false);
        }
        for (const sh of shards) {
          c.save(); c.translate(sh.x, sh.y); c.rotate(sh.a);
          c.strokeStyle = sh.col; c.globalAlpha = sh.life; c.lineWidth = 2.5 * dpr;
          c.beginPath(); c.moveTo(-sh.len * 0.5, 0); c.lineTo(sh.len * 0.5, 0); c.stroke();
          c.restore();
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.2, 0.35);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true, { amt: b.sq, ang: b.sqAng });
        fx.draw(c, dpr);
        c.restore();

        if (state === 'won') drawPrompt(c, w, h, dpr, `Escaped with ${timeLeft.toFixed(1)}s left!`, `All ${numRings} rings shattered`, pal.col(0.05, 1), small);
        else if (state === 'failed') drawPrompt(c, w, h, dpr, 'Time up — trapped', `${numRings - escaped} rings remaining`, '#ff7b8b', small);
        else drawPrompt(c, w, h, dpr, `Escape ${numRings} rings in 15s?`, `${timeLeft.toFixed(1)}s left  ·  ${numRings - escaped} remaining`, timeLeft < 4 ? '#ff8b99' : null, small);
      },
      interact(type, x, y) { if (type === 'down') { b.vx += (x - b.x) * 0.04; b.vy += (y - b.y) * 0.04; } },
      stat() { return `${timeLeft.toFixed(1)}s · ${numRings - escaped} left`; },
      get done() { return done; },
      get progress() { return 1 - timeLeft / LIMIT; }
    };
  };

  /* =========================================================================
     3. CLOSING GAP (Fixed: never escapes instantly! Builds true suspense!)
     ========================================================================= */
  SIMS.narrow_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const INITIAL_GAP = 0.56; // ~32 deg — tight, exciting, never trivial!
    // Start ball in lower-left moving gently sideways/downward, opposite the top gap!
    const b = {
      x: cx - R * 0.28, y: cy + R * 0.2,
      vx: R * 0.019, vy: R * 0.008,
      r: R * 0.068, hue: 0.12, sq: 0, sqAng: 0, trail: []
    };
    let gapAng = -Math.PI * 0.5; // starts cleanly at 12 o'clock, away from ball!
    let gapW = INITIAL_GAP;
    const minGap = (b.r * 2.1) / R;
    let noteI = 0, bounces = 0, nearMisses = 0, jawFlash = 0, state = 'running', endT = 0, done = false, ringPulse = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        ringPulse *= Math.pow(0.86, dt);
        jawFlash *= Math.pow(0.84, dt);
        if (state !== 'running') {
          if (state === 'escaped') { b.x += b.vx * dt * 0.45; b.y += b.vy * dt * 0.45; }
          endT -= dt / 60; if (endT <= 0) done = true; return;
        }
        // Smooth, deliberate spin & steady closing (~18s total tension arc)
        gapAng = mod(gapAng + 0.0105 * dt * S.speed, TAU);
        gapW = Math.max(0, gapW - 0.00046 * dt * S.speed);
        if (gapW <= 0.01) {
          state = 'sealed'; endT = 2.0;
          fx.kick(0, 1, 4);
          if (audio) KA.playSub(0.85, 62);
          return;
        }

        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.25 * Math.max(0.2, S.grav) * (R / 260), maxSpd = R * 0.052;
        const tLen = Math.round(6 + S.trail * 0.36);

        for (let s = 0; s < sub; s++) {
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const ang = mod(Math.atan2(dy, dx), TAU);
          const diff = Math.abs(Math.atan2(Math.sin(ang - gapAng), Math.cos(ang - gapAng)));
          // Ball must be cleanly centered inside the opening (and at least 3 bounces to prevent instant fluke)
          const clearHalf = (gapW - minGap * 0.72) * 0.5;
          const fits = bounces >= 3 && gapW > minGap && diff < clearHalf;

          if (fits && dist > R + b.r * 0.42) {
            state = 'escaped'; endT = 2.2;
            const col = pal.col(b.hue, 0.95);
            fx.burst(b.x, b.y, col, 52, R * 0.032, 2.8);
            fx.wave(b.x, b.y, col, 8, R * 0.55, 3, 0.72);
            fx.kick(Math.cos(ang), Math.sin(ang), 6);
            if (audio) { KA.playSub(0.7, 92); KA.playChord(4, 0.9); }
            break;
          } else if (!fits && dist >= R - b.r && dist < R + b.r * 1.25) {
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * (R - b.r); b.y = cy + ny * (R - b.r);
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              b.vx = (b.vx - 2 * dot * nx) * 1.015 - ny * 0.055 * (R / 260);
              b.vy = (b.vy - 2 * dot * ny) * 1.015 + nx * 0.055 * (R / 260);
              const sp = Math.hypot(b.vx, b.vy);
              if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
              b.sq = 0.92; b.sqAng = ang;
              bounces++; ringPulse = 0.8; b.hue = (b.hue + 0.022) % 1;

              const nearLip = diff < gapW * 0.5 + 0.2;
              if (nearLip) {
                nearMisses++; jawFlash = 1;
                fx.burstDir(cx + nx * R, cy + ny * R, nx, ny, '#ffffff', 12, R * 0.02, 2.3);
                fx.rim(cx, cy, R, ang, '#ffffff', 0.24, 0.82);
                fx.kick(nx, ny, 3.2);
                if (audio) KA.playNearMiss(nx * 0.72);
              } else {
                const col = pal.col(b.hue, 0.9);
                fx.burstDir(cx + nx * R, cy + ny * R, nx, ny, col, 7, R * 0.014, 2);
                fx.rim(cx, cy, R, ang, col, 0.24, 0.62);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.6);
              }
            }
          }
        }
        b.sq *= Math.pow(0.78, dt);
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.save();
        c.translate(fx.ox, fx.oy);

        const a0 = gapAng + gapW * 0.5, a1 = gapAng + TAU - gapW * 0.5;
        const tooSmall = gapW <= minGap;
        drawStudioRing(c, cx, cy, R, dpr, pal, tooSmall ? 0.85 : 0.14, ringPulse * 0.55, a0, a1, !small);

        // Animated closing jaws / pinch clamps on both edges of the gap!
        if (gapW > 0.02) {
          c.save();
          const jawCol = jawFlash > 0.25 ? '#ffffff' : tooSmall ? '#ff6477' : pal.col(0.05, 0.95);
          c.fillStyle = jawCol;
          for (const ea of [a0, a1]) {
            const jx = cx + Math.cos(ea) * R, jy = cy + Math.sin(ea) * R;
            c.beginPath(); c.arc(jx, jy, (3.6 + jawFlash * 1.8) * dpr, 0, TAU); c.fill();
          }
          c.restore();
        }

        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true, { amt: b.sq, ang: b.sqAng });
        fx.draw(c, dpr);
        c.restore();

        const openPct = Math.round(clamp(gapW / INITIAL_GAP, 0, 1) * 100);
        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Escaped at ${openPct}% gap!`, `After ${bounces} bounces${nearMisses ? ` · ${nearMisses} near misses` : ''}`, pal.col(0.05, 1), small);
        else if (state === 'sealed') drawPrompt(c, w, h, dpr, 'Sealed shut', `Trapped after ${bounces} bounces`, '#ff7b8b', small);
        else drawPrompt(c, w, h, dpr, jawFlash > 0.4 ? 'So close!' : 'Will it beat the closing gap?', `Gap ${openPct}% open  ·  ${tooSmall ? 'Too narrow!' : bounces + ' bounces'}`, tooSmall ? '#ff8b99' : (jawFlash > 0.4 ? '#ffffff' : null), small);
      },
      interact(type, x, y) { if (type === 'down') { b.vx += (x - b.x) * 0.038; b.vy += (y - b.y) * 0.038; } },
      stat() { return `Gap ${Math.round(clamp(gapW / INITIAL_GAP, 0, 1) * 100)}% · ${bounces} hits`; },
      get done() { return done; },
      get progress() { return 1 - clamp(gapW / INITIAL_GAP, 0, 1); }
    };
  };

  /* =========================================================================
     4. SPINNING MAZE ESCAPE (True Rotating Labyrinth with Radial Baffles!)
     ========================================================================= */
  SIMS.maze_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const layers = small ? 4 : 6;
    const ringGap = 0.54;
    const walls = Array.from({ length: layers }, (_, i) => ({
      r: lerp(R * 0.24, R * 0.98, i / (layers - 1)),
      door: i * 1.95,
      baffle: i * 1.95 + Math.PI * 0.95, // radial divider inside corridor!
      hue: i / layers,
      flash: 0
    }));
    let rot = 0, simT = 0, noteI = 0, state = 'running', endT = 0, done = false;
    const b = { x: cx, y: cy, vx: R * 0.01, vy: 0, r: R * 0.04, hue: 0.08, sq: 0, sqAng: 0, trail: [] };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (state !== 'running') { endT -= dt / 60; if (endT <= 0) done = true; return; }
        simT += (dt / 60) * S.speed;
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.24 * Math.max(0.25, S.grav) * (R / 260);
        const tLen = Math.round(6 + S.trail * 0.34);

        for (let s = 0; s < sub; s++) {
          rot = mod(rot + (ptr && ptr.down ? 0.024 : 0.0095) * sdt, TAU);
          b.vy += g * sdt;
          b.vx *= Math.pow(0.996, sdt); b.vy *= Math.pow(0.996, sdt);
          b.x += b.vx * sdt; b.y += b.vy * sdt;

          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          if (dist > R + b.r * 0.8) {
            state = 'escaped'; endT = 2.2;
            fx.burst(b.x, b.y, pal.col(b.hue, 0.95), 48, R * 0.03, 2.6);
            if (audio) { KA.playSub(0.65, 92); KA.playChord(4, 0.88); }
            break;
          }
          const ang = mod(Math.atan2(dy, dx), TAU);
          for (let i = 0; i < walls.length; i++) {
            const wl = walls[i];
            wl.flash *= Math.pow(0.92, sdt);
            const dr = dist - wl.r;
            if (Math.abs(dr) < b.r + 2 * dpr) {
              const doorAng = mod(wl.door + rot, TAU);
              const diff = Math.abs(Math.atan2(Math.sin(ang - doorAng), Math.cos(ang - doorAng)));
              if (diff >= ringGap * 0.5) {
                const nx = dx / (dist || 1), ny = dy / (dist || 1);
                const sign = dr >= 0 ? 1 : -1;
                b.x = cx + nx * (wl.r + sign * (b.r + 2 * dpr));
                b.y = cy + ny * (wl.r + sign * (b.r + 2 * dpr));
                const vn = b.vx * nx + b.vy * ny;
                if (vn * sign < 0) {
                  b.vx = (b.vx - 1.72 * vn * nx) - ny * 0.14 * (R / 260);
                  b.vy = (b.vy - 1.72 * vn * ny) + nx * 0.14 * (R / 260);
                  b.sq = 0.65; b.sqAng = ang;
                  wl.flash = 1;
                  if (audio && Math.abs(vn) > 1.2) KA.playMelodyStep(noteI++, (b.x / w - 0.5) * 1.2, 0.36);
                }
              }
            }
            // Radial corridor baffle between wall i and i+1
            if (i < walls.length - 1 && dist > wl.r && dist < walls[i + 1].r) {
              const ba = mod(wl.baffle + rot, TAU);
              const ux = Math.cos(ba), uy = Math.sin(ba);
              const perp = dx * -uy + dy * ux;
              const proj = dx * ux + dy * uy;
              if (proj > wl.r && proj < walls[i + 1].r && Math.abs(perp) < b.r + 2 * dpr) {
                const sign = perp >= 0 ? 1 : -1;
                const nx = -uy * sign, ny = ux * sign;
                b.x += nx * (b.r + 2 * dpr - Math.abs(perp));
                b.y += ny * (b.r + 2 * dpr - Math.abs(perp));
                const vn = b.vx * nx + b.vy * ny;
                if (vn < 0) { b.vx -= 1.65 * vn * nx; b.vy -= 1.65 * vn * ny; if (audio) KA.playClack((b.x / w - 0.5) * 1.2, 0.35, 1.25); }
              }
            }
          }
        }
        b.sq *= Math.pow(0.78, dt);
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        for (let i = 0; i < walls.length; i++) {
          const wl = walls[i], da = wl.door + rot;
          drawStudioRing(c, cx, cy, wl.r, dpr, pal, wl.hue, wl.flash * 0.5, da + ringGap * 0.5, da + TAU - ringGap * 0.5, false);
          if (i < walls.length - 1) {
            const ba = wl.baffle + rot;
            c.strokeStyle = pal.col(wl.hue, 0.52);
            c.lineWidth = 3 * dpr; c.lineCap = 'round';
            c.beginPath();
            c.moveTo(cx + Math.cos(ba) * wl.r, cy + Math.sin(ba) * wl.r);
            c.lineTo(cx + Math.cos(ba) * walls[i + 1].r, cy + Math.sin(ba) * walls[i + 1].r);
            c.stroke();
          }
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true, { amt: b.sq, ang: b.sqAng });
        fx.draw(c, dpr);

        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Maze escaped in ${simT.toFixed(1)}s!`, 'All corridors navigated', pal.col(0.05, 1), small);
        else drawPrompt(c, w, h, dpr, 'Will it escape the maze?', `${simT.toFixed(1)}s  ·  Hold to spin faster`, null, small);
      },
      interact() {},
      stat() { return state === 'escaped' ? `Escaped ${simT.toFixed(1)}s` : `Maze ${simT.toFixed(1)}s`; },
      get done() { return done; },
      get progress() { return clamp(Math.hypot(b.x - cx, b.y - cy) / R, 0, 1); }
    };
  };

  /* =========================================================================
     5. ORBIT GATE (Dual Counter-Rotating Shields Guarding a Top Portal!)
     ========================================================================= */
  SIMS.gate_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.54, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const portalAng = -Math.PI * 0.5, portalW = 0.34;
    let shieldA = 0, shieldB = 1.2, bounces = 0, noteI = 0, simT = 0, state = 'running', endT = 0, done = false;
    const b = { x: cx - R * 0.2, y: cy + R * 0.16, vx: R * 0.023, vy: R * 0.012, r: R * 0.056, hue: 0.1, sq: 0, sqAng: 0, trail: [] };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (state !== 'running') {
          if (state === 'escaped') { b.x += b.vx * dt * 0.45; b.y += b.vy * dt * 0.45; }
          endT -= dt / 60; if (endT <= 0) done = true; return;
        }
        simT += (dt / 60) * S.speed;
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.055;
        const tLen = Math.round(6 + S.trail * 0.35);

        for (let s = 0; s < sub; s++) {
          shieldA = mod(shieldA + 0.024 * sdt, TAU);
          shieldB = mod(shieldB - 0.019 * sdt, TAU);
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const inPortal = Math.abs(Math.atan2(Math.sin(ang - portalAng), Math.cos(ang - portalAng))) < portalW * 0.42;

          // Two counter-rotating shield rings!
          for (const [guardR, sa, span] of [[R * 0.78, shieldA, 0.45], [R * 0.56, shieldB, 0.5]]) {
            if (Math.abs(dist - guardR) < b.r + 3 * dpr) {
              const hit = [sa, mod(sa + Math.PI, TAU)].some(a => Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))) < span);
              if (hit) {
                const nx = dx / (dist || 1), ny = dy / (dist || 1), side = dist >= guardR ? 1 : -1;
                b.x = cx + nx * (guardR + side * (b.r + 3 * dpr));
                b.y = cy + ny * (guardR + side * (b.r + 3 * dpr));
                const vn = b.vx * nx + b.vy * ny;
                if (vn * side < 0) {
                  b.vx = (b.vx - 2 * vn * nx) * 1.02; b.vy = (b.vy - 2 * vn * ny) * 1.02;
                  b.sq = 0.85; b.sqAng = ang;
                  fx.burstDir(b.x, b.y, -nx * side, -ny * side, pal.col(0.82, 0.92), 8, R * 0.016, 2);
                  fx.kick(nx * side, ny * side, 2.2);
                  if (audio) KA.playClack((b.x / w - 0.5) * 1.2, 0.65, 1.35);
                }
              }
            }
          }

          if (inPortal && dist > R + b.r * 0.4) {
            state = 'escaped'; endT = 2.2;
            fx.burst(b.x, b.y, pal.col(0.05, 0.95), 52, R * 0.032, 2.8);
            fx.kick(0, -1, 5.5);
            if (audio) { KA.playSub(0.7, 92); KA.playChord(4, 0.9); }
            break;
          } else if (!inPortal && dist >= R - b.r && dist < R + b.r * 1.2) {
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * (R - b.r); b.y = cy + ny * (R - b.r);
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              b.vx = (b.vx - 2 * dot * nx) * 1.01 - ny * 0.06 * (R / 260);
              b.vy = (b.vy - 2 * dot * ny) * 1.01 + nx * 0.06 * (R / 260);
              const sp = Math.hypot(b.vx, b.vy);
              if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
              b.sq = 0.85; b.sqAng = ang;
              bounces++; b.hue = (b.hue + 0.02) % 1;
              fx.burstDir(cx + nx * R, cy + ny * R, nx, ny, pal.col(b.hue, 0.88), 6, R * 0.013, 1.9);
              fx.rim(cx, cy, R, ang, pal.col(b.hue, 0.85), 0.22, 0.6);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.58);
            }
          }
        }
        b.sq *= Math.pow(0.78, dt);
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.save();
        c.translate(fx.ox, fx.oy);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.25, 0, portalAng + portalW * 0.5, portalAng + TAU - portalW * 0.5, false);
        // Subtle exit portal beacon glow at top
        c.strokeStyle = pal.col(0.06, 0.55); c.lineWidth = 2.5 * dpr;
        c.beginPath(); c.arc(cx, cy, R, portalAng - portalW * 0.48, portalAng + portalW * 0.48); c.stroke();

        for (const sa of [shieldA, shieldA + Math.PI]) drawStudioRing(c, cx, cy, R * 0.78, dpr, pal, 0.78, 0.25, sa - 0.44, sa + 0.44, false);
        for (const sb of [shieldB, shieldB + Math.PI]) drawStudioRing(c, cx, cy, R * 0.56, dpr, pal, 0.48, 0.2, sb - 0.48, sb + 0.48, false);

        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true, { amt: b.sq, ang: b.sqAng });
        fx.draw(c, dpr);
        c.restore();

        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Threaded in ${simT.toFixed(1)}s!`, `Cleared the orbit shields in ${bounces} hits`, pal.col(0.05, 1), small);
        else drawPrompt(c, w, h, dpr, 'Will it thread the gate?', `${simT.toFixed(1)}s  ·  ${bounces} bounces`, null, small);
      },
      interact(type, x, y) { if (type === 'down') { b.vx += (x - b.x) * 0.04; b.vy += (y - b.y) * 0.04; } },
      stat() { return `${simT.toFixed(1)}s · ${bounces} hits`; },
      get done() { return done; },
      get progress() { return state === 'escaped' ? 1 : (simT % 24) / 24; }
    };
  };

  /* =========================================================================
     6. 3D VORTEX DISC (Matte 3D Pedestal + Dynamic Cast Shadow + Funnel)
     ========================================================================= */
  SIMS.iso_torus = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w * 0.5, baseY = h * 0.67;
    const discR = Math.min(w * 0.38, h * 0.32);
    const tilt = 0.46, slabH = discR * 0.16;

    const rings = small ? 10 : 18;
    const pts = [];
    for (let ri = 2; ri <= rings; ri++) {
      const rf = ri / rings;
      const count = Math.max(10, Math.round(rf * (small ? 32 : 60)));
      for (let k = 0; k < count; k++) pts.push({ rf, a0: (k / count) * TAU });
    }
    let simT = 0, lastChime = 0;

    return {
      step(dt) {
        simT += (dt / 60) * S.speed;
        if (audio && simT - lastChime > 0.55) {
          lastChime = simT;
          KA.playScale(Math.round(4 + Math.sin(simT * 0.9) * 4), Math.sin(simT * 0.6) * 0.45, 0.22, { timbre: 'kalimba' });
        }
      },
      draw(c, t, pal, ptr) {
        const bg = c.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#130d24'); bg.addColorStop(0.55, '#090813'); bg.addColorStop(1, '#040407');
        c.fillStyle = bg; c.fillRect(0, 0, w, h);

        // 1. Matte 3D Cylindrical Pedestal with Soft Ambient Floor Shadow
        c.save();
        const fl = c.createRadialGradient(cx, baseY + slabH * 1.15, discR * 0.2, cx, baseY + slabH * 1.15, discR * 1.18);
        fl.addColorStop(0, 'rgba(0,0,0,0.65)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = fl;
        c.beginPath(); c.ellipse(cx, baseY + slabH * 1.15, discR * 1.18, discR * 1.18 * tilt, 0, 0, TAU); c.fill();

        const sideG = c.createLinearGradient(cx - discR, 0, cx + discR, 0);
        sideG.addColorStop(0, '#313339'); sideG.addColorStop(0.35, '#454851'); sideG.addColorStop(0.75, '#2b2d34'); sideG.addColorStop(1, '#1b1d22');
        c.fillStyle = sideG;
        c.beginPath();
        c.ellipse(cx, baseY + slabH, discR, discR * tilt, 0, 0, Math.PI);
        c.lineTo(cx - discR, baseY);
        c.ellipse(cx, baseY, discR, discR * tilt, 0, Math.PI, 0, true);
        c.closePath(); c.fill();

        const topG = c.createRadialGradient(cx, baseY - discR * 0.08, discR * 0.05, cx, baseY, discR);
        topG.addColorStop(0, '#444750'); topG.addColorStop(0.62, '#595c65'); topG.addColorStop(1, '#4c4f58');
        c.fillStyle = topG;
        c.beginPath(); c.ellipse(cx, baseY, discR, discR * tilt, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.2 * dpr; c.stroke();

        // Subtle dynamic vortex shadow on top of the disc
        const dipBreath = 0.8 + 0.22 * Math.sin(simT * 1.2);
        const sh = c.createRadialGradient(cx, baseY, 2, cx, baseY, discR * 0.68 * dipBreath);
        sh.addColorStop(0, 'rgba(0,0,0,0.52)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sh;
        c.beginPath(); c.ellipse(cx, baseY, discR * 0.68 * dipBreath, discR * 0.68 * dipBreath * tilt, 0, 0, TAU); c.fill();
        c.restore();

        // 2. Depth-sorted 3D Toroidal Sphere Vortex
        const mx = ptr && ptr.in ? (ptr.x / w - 0.5) * 0.55 : 0;
        const my = ptr && ptr.in ? (ptr.y / h - 0.5) * 0.45 : 0;
        const hoverY = baseY - discR * 0.36;
        const morph = 0.5 + 0.5 * Math.sin(simT * 0.42);
        const renderList = [];

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const swirl = simT * 0.55 + (1 - p.rf) * (1.85 + morph * 1.45);
          const a = p.a0 + swirl + mx;
          const funnel = -Math.exp(-p.rf * p.rf * 5.2) * (0.98 + 0.32 * Math.sin(simT * 1.2 + my * 3));
          const rimRoll = Math.sin(p.rf * Math.PI * 1.15 - simT * 1.8) * 0.22;
          const wave = Math.sin(p.rf * 7.5 - simT * 2.4) * 0.14 * morph;
          const z = (funnel + rimRoll + wave) * discR * 0.58;
          const rad = discR * (0.13 + Math.pow(p.rf, 0.88) * 0.83);
          const x3 = Math.cos(a) * rad, y3 = Math.sin(a) * rad;
          renderList.push({
            sx: cx + x3, sy: hoverY + y3 * tilt - z, depth: y3,
            h: clamp((z / (discR * 0.58) + 1.05) / 1.55, 0, 1)
          });
        }
        renderList.sort((a, b) => a.depth - b.depth);

        const baseDot = Math.max(2.6 * dpr, discR * (small ? 0.03 : 0.025));
        for (let i = 0; i < renderList.length; i++) {
          const q = renderList[i];
          const persp = 0.84 + ((q.depth / discR) + 1) * 0.16;
          drawSphere(c, q.sx, q.sy, baseDot * persp, pal, lerp(0.42, 0.02, q.h), S.material === 'chrome' ? 'chrome' : 'ceramic', false);
        }
      },
      interact() {},
      stat() { return `${pts.length} spheres · 3D Vortex`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* =========================================================================
     7. 3D WAVE SLAB (Matte 3D Slab + Etched Grid + Live Cast Shadows!)
     ========================================================================= */
  SIMS.iso_wave = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w * 0.5, baseY = h * 0.65;
    const span = Math.min(w * 0.44, h * 0.34);
    const slabH = span * 0.13;
    const N = small ? 13 : 21;
    let simT = 0, patternI = 0, lastChime = 0;

    const iso = (u, v, z = 0) => [
      cx + (u - v) * span * 0.78,
      baseY + (u + v) * span * 0.41 - z
    ];

    return {
      step(dt) {
        simT += (dt / 60) * S.speed;
        if (audio && simT - lastChime > 0.52) {
          lastChime = simT;
          KA.playScale(Math.round(5 + Math.cos(simT * 1.1) * 4), Math.sin(simT * 0.7) * 0.5, 0.2, { timbre: 'glass' });
        }
      },
      draw(c, t, pal, ptr) {
        const bg = c.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#120b24'); bg.addColorStop(0.55, '#080712'); bg.addColorStop(1, '#030306');
        c.fillStyle = bg; c.fillRect(0, 0, w, h);

        const cT = iso(-1.08, -1.08, 0), cR = iso(1.08, -1.08, 0), cB = iso(1.08, 1.08, 0), cL = iso(-1.08, 1.08, 0);

        // Left & right extruded walls
        c.fillStyle = '#3c3f48';
        c.beginPath(); c.moveTo(cL[0], cL[1]); c.lineTo(cB[0], cB[1]); c.lineTo(cB[0], cB[1] + slabH); c.lineTo(cL[0], cL[1] + slabH); c.closePath(); c.fill();
        c.fillStyle = '#24262d';
        c.beginPath(); c.moveTo(cB[0], cB[1]); c.lineTo(cR[0], cR[1]); c.lineTo(cR[0], cR[1] + slabH); c.lineTo(cB[0], cB[1] + slabH); c.closePath(); c.fill();

        // Top matte face + recessed inner grid border
        const topG = c.createLinearGradient(cT[0], cT[1], cB[0], cB[1]);
        topG.addColorStop(0, '#444751'); topG.addColorStop(0.5, '#585b65'); topG.addColorStop(1, '#4b4e58');
        c.fillStyle = topG;
        c.beginPath(); c.moveTo(cT[0], cT[1]); c.lineTo(cR[0], cR[1]); c.lineTo(cB[0], cB[1]); c.lineTo(cL[0], cL[1]); c.closePath(); c.fill();

        if (!small) {
          c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.85 * dpr;
          for (let i = 0; i < N; i++) {
            const f = (i / (N - 1)) * 2 - 1;
            const p0 = iso(f, -1, 0), p1 = iso(f, 1, 0);
            c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
            const q0 = iso(-1, f, 0), q1 = iso(1, f, 0);
            c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke();
          }
        }
        c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.1 * dpr;
        c.beginPath(); c.moveTo(cT[0], cT[1]); c.lineTo(cR[0], cR[1]); c.lineTo(cB[0], cB[1]); c.lineTo(cL[0], cL[1]); c.closePath(); c.stroke();

        // Compute heights & cast shadows directly onto the slab first!
        const phase = (simT * 0.24 + patternI) % 4;
        const wA = clamp(1 - Math.abs(phase - 0), 0, 1) + clamp(1 - Math.abs(phase - 4), 0, 1);
        const wB = clamp(1 - Math.abs(phase - 1), 0, 1);
        const wC = clamp(1 - Math.abs(phase - 2), 0, 1);
        const wD = clamp(1 - Math.abs(phase - 3), 0, 1);

        const px = ptr && ptr.in ? (ptr.x / w - 0.5) * 1.4 : 0;
        const py = ptr && ptr.in ? (ptr.y / h - 0.5) * 1.4 : 0;
        const hoverBase = span * 0.56;
        const dotR = Math.max(2.4 * dpr, span * (small ? 0.036 : 0.025));

        const cells = [];
        for (let sum = 0; sum <= (N - 1) * 2; sum++) {
          const iMin = Math.max(0, sum - (N - 1)), iMax = Math.min(N - 1, sum);
          for (let iu = iMin; iu <= iMax; iu++) {
            const iv = sum - iu;
            const u = (iu / (N - 1)) * 2 - 1, v = (iv / (N - 1)) * 2 - 1;
            const r2 = u * u + v * v, r = Math.sqrt(r2);

            const zA = hoverBase + (r2 * 0.24 - 0.14 + Math.sin(u * 2.2 + simT * 1.8) * 0.08 + Math.cos(v * 2.2 - simT * 1.5) * 0.08) * span;
            const zB = hoverBase + (0.28 - Math.exp(-r2 * 2.6) * 0.94 + Math.sin(r * 5.2 - simT * 2.4) * 0.05) * span;
            const zC = hoverBase + (Math.sin(r * 5.8 - simT * 2.8) * 0.22 * Math.exp(-r2 * 0.35) + Math.sin((u + v) * 2.4 - simT * 2) * 0.1) * span;
            const zD = hoverBase + ((u * u - v * v) * 0.28 * Math.cos(simT * 1.4) + Math.sin(u * 3 - simT * 2) * 0.1) * span;

            let z = zA * wA + zB * wB + zC * wC + zD * wD;
            if (ptr && ptr.in) {
              const pd2 = (u - px) * (u - px) + (v - py) * (v - py);
              z -= Math.exp(-pd2 * 3.8) * span * (ptr.down ? 0.42 : 0.18);
            }
            z = Math.max(dotR * 1.2, z);
            cells.push([u, v, z]);
          }
        }

        // Real-time soft cast shadows on the matte slab underneath low-dipping spheres
        if (!small) {
          c.fillStyle = 'rgba(0,0,0,0.22)';
          for (let i = 0; i < cells.length; i++) {
            const [u, v, z] = cells[i];
            const prox = clamp(1 - z / (span * 0.72), 0, 1);
            if (prox < 0.12) continue;
            const [gx, gy] = iso(u, v, 0);
            c.beginPath(); c.ellipse(gx, gy, dotR * (0.7 + prox * 0.8), dotR * 0.45 * (0.7 + prox * 0.8), 0, 0, TAU); c.fill();
          }
        }

        // Draw depth-sorted 3D spheres
        for (let i = 0; i < cells.length; i++) {
          const [u, v, z] = cells[i];
          const [sx, sy] = iso(u, v, z);
          const hNorm = clamp((z - span * 0.08) / (span * 0.82), 0, 1);
          drawSphere(c, sx, sy, dotR, pal, lerp(0.88, 0.22, hNorm), S.material === 'chrome' ? 'chrome' : 'velvet', false);
        }
      },
      interact(type) { if (type === 'down') { patternI = (patternI + 1) % 4; if (audio) KA.playChord(patternI * 2, 0.5); } },
      stat() { return `${N}×${N} matrix · Tap to morph`; },
      done: false,
      get progress() { return (simT % 28) / 28; }
    };
  };
})();
