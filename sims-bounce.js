/* ============================================================================
   Kinetic — Bounce, Ring, Merge & Smash Simulations (14 Viral Modes)
   ============================================================================ */
(() => {
  'use strict';

  const { TAU, clamp, lerp, mod, fillStudioBg, drawSphere, drawStudioRing, drawBevelRect, drawSilkTrail, makeFX } = window.KT;
  const KA = window.KA;
  const SIMS = window.KSIMS || (window.KSIMS = {});

  /* --- 1. GROW RING (Toned-down refined brightness, 3D shaded sphere) --- */
  SIMS.grow = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    let balls = [], bounces = 0, noteI = 0, finaleT = 0, done = false, ringPulse = 0;

    const spawnBall = (x = cx + R * 0.16, y = cy - R * 0.28, vx, vy, r = R * 0.062) => {
      const sp = R * 0.022;
      balls.push({
        x, y,
        vx: vx ?? (Math.random() < 0.5 ? 1 : -1) * sp * (0.76 + Math.random() * 0.25),
        vy: vy ?? -sp * 0.22,
        r, hue: (balls.length * 0.28 + 0.06) % 1, trail: []
      });
    };
    spawnBall();

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        ringPulse *= Math.pow(0.86, dt);
        if (finaleT > 0) {
          finaleT -= dt / 60;
          if (finaleT <= 0) done = true;
          return;
        }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.26 * S.grav * (R / 260);
        const maxSpd = R * 0.05;
        const tLen = Math.round(6 + S.trail * 0.45);

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.vy += g * sdt;
            b.x += b.vx * sdt; b.y += b.vy * sdt;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const lim = R - b.r;
            if (dist >= lim && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * lim; b.y = cy + ny * lim;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                const e = clamp(S.bounce, 0.9, 1.045);
                b.vx = (b.vx - 2 * dot * nx) * e - ny * 0.045 * (R / 260);
                b.vy = (b.vy - 2 * dot * ny) * e + nx * 0.045 * (R / 260);
                const spd = Math.hypot(b.vx, b.vy);
                if (spd > maxSpd) { b.vx *= maxSpd / spd; b.vy *= maxSpd / spd; }

                b.r += R * (balls.length > 1 ? 0.006 : 0.0108);
                b.hue = (b.hue + 0.022) % 1;
                bounces++;
                ringPulse = 0.85;
                const ang = Math.atan2(ny, nx);
                const hx = cx + nx * R, hy = cy + ny * R;
                const col = pal.col(b.hue, 0.88, 0.92);
                fx.rim(cx, cy, R, ang, col, 0.34, 0.62);
                fx.burst(hx, hy, col, 9, R * 0.014, 2.2);
                fx.wave(hx, hy, col, 4, R * 0.13, 1.8, 0.48);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.72, clamp(spd / (maxSpd * 0.62), 0.35, 0.92));

                if (b.r >= R * 0.9) {
                  finaleT = 1.6;
                  fx.burst(cx, cy, col, 52, R * 0.028, 2.8);
                  fx.burst(cx, cy, pal.col((b.hue + 0.3) % 1, 0.9, 0.9), 34, R * 0.024, 2.4);
                  fx.wave(cx, cy, col, R * 0.35, R * 1.25, 3.6, 0.65);
                  if (audio) KA.playChord(4, 0.82);
                  balls = [];
                  break;
                }
              }
            }
          }
          if (finaleT > 0) break;
        }
        for (const b of balls) {
          b.trail.push([b.x, b.y]);
          while (b.trail.length > tLen) b.trail.shift();
        }
      },
      draw(c, t, pal) {
        // Low-glare studio matte background
        fillStudioBg(c, w, h, pal, 0.045);

        // Subtle recessed inner dish shadow inside ring
        const dish = c.createRadialGradient(cx, cy, R * 0.12, cx, cy, R);
        dish.addColorStop(0, 'rgba(255,255,255,0.018)');
        dish.addColorStop(0.82, 'rgba(0,0,0,0.22)');
        dish.addColorStop(1, 'rgba(0,0,0,0.48)');
        c.fillStyle = dish;
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();

        drawStudioRing(c, cx, cy, R, dpr, pal, (t * 0.00005) % 1, ringPulse * 0.55, 0, TAU, !small);

        for (const b of balls) {
          if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.12, 0.32, 0.14);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down' && finaleT <= 0 && balls.length < 5) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
          const rr = Math.min(d, R * 0.72), a = Math.atan2(dy, dx);
          spawnBall(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, (Math.random() - 0.5) * R * 0.036, -R * 0.015, R * 0.055);
          fx.wave(x, y, pal.col(0.3, 0.8), 4, R * 0.14, 1.8, 0.5);
          if (audio) KA.playClack((x / w - 0.5) * 1.3, 0.65, 1.1);
        }
      },
      stat() {
        const pct = balls.length ? Math.round((balls[0].r / (R * 0.9)) * 100) : 100;
        return `${bounces} bounces · ${clamp(pct, 0, 100)}%`;
      },
      get done() { return done; },
      get progress() { return balls.length ? clamp(balls[0].r / (R * 0.9), 0, 1) : 1; }
    };
  };

  /* --- 2. ESCAPE RINGS --- */
  SIMS.escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    const fx = makeFX(small);
    const numRings = small ? 7 : 12;
    const rings = [];
    for (let i = 0; i < numRings; i++) {
      const f = i / (numRings - 1);
      rings.push({
        r: lerp(R * 0.24, R * 0.96, f),
        ang: i * 0.62,
        vel: (i % 2 === 0 ? 1 : -1) * (0.012 + (1 - f) * 0.013),
        gap: 0.62 - f * 0.14,
        alive: true, hue: f * 0.85, flash: 0
      });
    }
    const shards = [];
    const balls = [{ x: cx + R * 0.04, y: cy - R * 0.04, vx: R * 0.016, vy: -R * 0.01, r: R * 0.036, hue: 0.12, trail: [] }];
    let escaped = 0, noteI = 0, finaleT = 0, done = false;

    const shatterRing = (rg, pal) => {
      rg.alive = false; escaped++;
      const segs = small ? 16 : 38;
      const col = pal.col(rg.hue, 0.92, 0.95);
      for (let k = 0; k < segs; k++) {
        const a = rg.ang + rg.gap * 0.5 + (k / segs) * (TAU - rg.gap);
        const sp = R * (0.008 + Math.random() * 0.016);
        shards.push({
          x: cx + Math.cos(a) * rg.r, y: cy + Math.sin(a) * rg.r,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          a, rot: (Math.random() - 0.5) * 0.18,
          len: (TAU * rg.r / segs) * 0.72, life: 1, col
        });
      }
      fx.wave(cx, cy, col, rg.r * 0.92, rg.r * 1.15, 2.6, 0.55);
      if (audio) KA.playChord(escaped % 7, 0.72);
      if (escaped >= numRings) finaleT = 1.6;
    };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        for (let i = shards.length - 1; i >= 0; i--) {
          const sh = shards[i];
          sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 0.08 * (R / 260) * dt;
          sh.a += sh.rot * dt; sh.life -= 0.018 * dt;
          if (sh.life <= 0) shards.splice(i, 1);
        }
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.23 * S.grav * (R / 260), maxSpd = R * 0.044;
        const tLen = Math.round(6 + S.trail * 0.4);

        for (let s = 0; s < sub; s++) {
          for (const rg of rings) { if (rg.alive) { rg.ang = mod(rg.ang + rg.vel * sdt, TAU); rg.flash *= Math.pow(0.9, sdt); } }
          const active = rings.find(r => r.alive);
          for (const b of balls) {
            b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
            if (!active) continue;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const lim = active.r - b.r;
            if (dist >= lim && dist > 0.001) {
              const ang = mod(Math.atan2(dy, dx), TAU);
              const diff = Math.abs(Math.atan2(Math.sin(ang - active.ang), Math.cos(ang - active.ang)));
              if (diff < active.gap * 0.5) {
                shatterRing(active, pal);
              } else {
                const nx = dx / dist, ny = dy / dist;
                b.x = cx + nx * lim; b.y = cy + ny * lim;
                const dot = b.vx * nx + b.vy * ny;
                if (dot > 0) {
                  const e = clamp(S.bounce, 0.92, 1.03);
                  b.vx = (b.vx - 2 * dot * nx) * e - ny * 0.08 * (R / 260);
                  b.vy = (b.vy - 2 * dot * ny) * e + nx * 0.08 * (R / 260);
                  const spd = Math.hypot(b.vx, b.vy);
                  if (spd > maxSpd) { b.vx *= maxSpd / spd; b.vy *= maxSpd / spd; }
                  active.flash = 1;
                  const col = pal.col(active.hue, 0.9);
                  fx.burst(cx + nx * active.r, cy + ny * active.r, col, 7, R * 0.013, 2);
                  fx.rim(cx, cy, active.r, ang, col, 0.25, 0.7);
                  if (audio) KA.playMelodyStep(noteI++, nx * 0.7, 0.62);
                }
              }
            }
          }
        }
        for (const b of balls) { b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.055);
        for (const rg of rings) {
          if (!rg.alive) continue;
          const a0 = rg.ang + rg.gap * 0.5, a1 = rg.ang + TAU - rg.gap * 0.5;
          drawStudioRing(c, cx, cy, rg.r, dpr, pal, rg.hue, rg.flash * 0.7, a0, a1, false);
          c.fillStyle = 'rgba(255,255,255,0.72)';
          for (const ea of [a0, a1]) {
            c.beginPath(); c.arc(cx + Math.cos(ea) * rg.r, cy + Math.sin(ea) * rg.r, 2.2 * dpr, 0, TAU); c.fill();
          }
        }
        c.save();
        for (const sh of shards) {
          c.save(); c.translate(sh.x, sh.y); c.rotate(sh.a);
          c.strokeStyle = sh.col; c.globalAlpha = sh.life; c.lineWidth = 2.8 * dpr;
          c.beginPath(); c.moveTo(-sh.len * 0.5, 0); c.lineTo(sh.len * 0.5, 0); c.stroke();
          c.restore();
        }
        c.restore();
        for (const b of balls) {
          if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.2, 0.36);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down' && balls.length < 5 && finaleT <= 0) {
          balls.push({ x: cx, y: cy, vx: (x - cx) * 0.04, vy: (y - cy) * 0.04, r: R * 0.036, hue: Math.random(), trail: [] });
          if (audio) KA.playClack(0, 0.7, 1.2);
        }
      },
      stat() { return `${numRings - escaped}/${numRings} rings`; },
      get done() { return done; },
      get progress() { return escaped / numRings; }
    };
  };

  /* --- 3. TETHER WEB (Viral TikTok Anchor-String Ball!) --- */
  SIMS.tether = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const MAX_LINES = small ? 36 : 95;
    const anchors = [];
    const b = { x: cx + R * 0.2, y: cy - R * 0.25, vx: R * 0.022, vy: -R * 0.008, r: R * 0.055, hue: 0.08, trail: [] };
    let noteI = 0, finaleT = 0, done = false, pulse = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        pulse *= Math.pow(0.88, dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.046;
        const tLen = Math.round(6 + S.trail * 0.35);

        for (let s = 0; s < sub; s++) {
          b.vy += g * sdt;
          // Subtle elastic pull from existing tethers
          for (let k = Math.max(0, anchors.length - 12); k < anchors.length; k++) {
            const an = anchors[k];
            b.vx += (an.x - b.x) * 0.000018 * sdt;
            b.vy += (an.y - b.y) * 0.000018 * sdt;
          }
          b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const lim = R - b.r;
          if (dist >= lim && dist > 0.001) {
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * lim; b.y = cy + ny * lim;
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              const e = clamp(S.bounce, 0.94, 1.03);
              b.vx = (b.vx - 2 * dot * nx) * e - ny * 0.09 * (R / 260);
              b.vy = (b.vy - 2 * dot * ny) * e + nx * 0.09 * (R / 260);
              const sp = Math.hypot(b.vx, b.vy);
              if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
              b.hue = (b.hue + 0.015) % 1;
              const hx = cx + nx * R, hy = cy + ny * R;
              anchors.push({ x: hx, y: hy, hue: b.hue, flash: 1 });
              pulse = 0.9;
              const col = pal.col(b.hue, 0.85);
              fx.burst(hx, hy, col, 6, R * 0.013, 2);
              fx.rim(cx, cy, R, Math.atan2(ny, nx), col, 0.24, 0.65);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.65, { timbre: 'kalimba' });
              if (anchors.length >= MAX_LINES) {
                finaleT = 1.8;
                if (audio) KA.playChord(0, 0.82);
                break;
              }
            }
          }
        }
        for (const an of anchors) if (an.flash > 0.01) an.flash *= Math.pow(0.88, dt);
        b.trail.push([b.x, b.y]);
        while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        drawStudioRing(c, cx, cy, R, dpr, pal, b.hue, pulse * 0.5, 0, TAU, !small);

        // Silky taut anchor strings from rim to ball!
        c.save();
        for (let i = 0; i < anchors.length; i++) {
          const an = anchors[i];
          const age = i / Math.max(1, anchors.length);
          c.strokeStyle = pal.col(an.hue, 0.16 + age * 0.28 + an.flash * 0.45);
          c.lineWidth = (0.9 + an.flash * 1.8) * dpr;
          c.beginPath(); c.moveTo(an.x, an.y); c.lineTo(b.x, b.y); c.stroke();
          c.fillStyle = pal.col(an.hue, 0.75);
          c.beginPath(); c.arc(an.x, an.y, 2.2 * dpr, 0, TAU); c.fill();
        }
        c.restore();

        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.1, 0.3);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') {
          b.vx += (x - b.x) * 0.03; b.vy += (y - b.y) * 0.03;
          if (audio) KA.playClack((x / w - 0.5) * 1.2, 0.6, 1.3);
        }
      },
      stat() { return `${anchors.length}/${MAX_LINES} strings`; },
      get done() { return done; },
      get progress() { return anchors.length / MAX_LINES; }
    };
  };

  /* --- 4. POLYGON MORPH (Adds a side every bounce, vibrating string edges!) --- */
  SIMS.polygon = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const MAX_SIDES = small ? 16 : 26;
    let sides = 3, rot = -Math.PI / 2, noteI = 0, edgeFlash = -1, flashAmt = 0, finaleT = 0, done = false;
    const b = { x: cx + R * 0.12, y: cy - R * 0.1, vx: R * 0.022, vy: R * 0.014, r: R * 0.055, hue: 0.1, trail: [] };

    const getVerts = (n, ang) => {
      const vs = [];
      for (let i = 0; i < n; i++) {
        const a = ang + (i / n) * TAU;
        vs.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
      }
      return vs;
    };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        flashAmt *= Math.pow(0.86, dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.2 * S.grav * (R / 260), maxSpd = R * 0.048;
        const tLen = Math.round(8 + S.trail * 0.45);

        for (let s = 0; s < sub; s++) {
          rot += 0.0055 * sdt;
          b.vy += g * sdt;
          b.x += b.vx * sdt; b.y += b.vy * sdt;
          const vs = getVerts(sides, rot);
          let hit = false;
          for (let i = 0; i < sides; i++) {
            const p0 = vs[i], p1 = vs[(i + 1) % sides];
            const ex = p1[0] - p0[0], ey = p1[1] - p0[1], elen = Math.hypot(ex, ey) || 1;
            // Inward normal for CW/CCW polygon
            let nx = -ey / elen, ny = ex / elen;
            if ((cx - p0[0]) * nx + (cy - p0[1]) * ny < 0) { nx = -nx; ny = -ny; }
            const dist = (b.x - p0[0]) * nx + (b.y - p0[1]) * ny;
            if (dist < b.r) {
              b.x += nx * (b.r - dist);
              b.y += ny * (b.r - dist);
              const vn = b.vx * nx + b.vy * ny;
              if (vn < 0) {
                const e = clamp(S.bounce, 0.94, 1.03);
                b.vx = (b.vx - 2 * vn * nx) * e;
                b.vy = (b.vy - 2 * vn * ny) * e;
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
                hit = true;
                edgeFlash = i; flashAmt = 1;
                b.hue = (sides / MAX_SIDES) % 1;
                const col = pal.col(b.hue, 0.9);
                fx.burst(b.x - nx * b.r, b.y - ny * b.r, col, 9, R * 0.015, 2.2);
                fx.wave(b.x - nx * b.r, b.y - ny * b.r, col, 4, R * 0.14, 1.8, 0.55);
                if (audio) KA.playMelodyStep(noteI++, (b.x / w - 0.5) * 1.4, 0.68);
                sides++;
                if (sides > MAX_SIDES) {
                  finaleT = 1.6;
                  fx.burst(cx, cy, col, 46, R * 0.028, 2.6);
                  if (audio) KA.playChord(3, 0.85);
                }
                break;
              }
            }
          }
          if (hit && finaleT > 0) break;
        }
        b.trail.push([b.x, b.y]);
        while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.055);
        const n = Math.min(sides, MAX_SIDES);
        const vs = getVerts(n, rot);

        // Subtle inner polygon recess
        c.beginPath();
        vs.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1]));
        c.closePath();
        c.fillStyle = 'rgba(0,0,0,0.32)';
        c.fill();

        // Draw edges with plucked-string vibration on the hit edge!
        c.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const p0 = vs[i], p1 = vs[(i + 1) % n];
          const isHit = i === edgeFlash && flashAmt > 0.05;
          c.strokeStyle = isHit ? '#ffffff' : pal.col(i / n, 0.68);
          c.lineWidth = (isHit ? 4.2 : 2.8) * dpr;
          c.beginPath();
          if (isHit) {
            const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
            const vib = Math.sin(t * 0.07) * flashAmt * 9 * dpr;
            const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
            c.moveTo(p0[0], p0[1]);
            c.quadraticCurveTo(mx + dx / d * vib, my + dy / d * vib, p1[0], p1[1]);
          } else {
            c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]);
          }
          c.stroke();
        }
        // Metallic vertex pins
        for (const v of vs) {
          c.fillStyle = 'rgba(255,255,255,0.65)';
          c.beginPath(); c.arc(v[0], v[1], 2.4 * dpr, 0, TAU); c.fill();
        }

        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') { b.vx += (x - b.x) * 0.04; b.vy += (y - b.y) * 0.04; }
      },
      stat() { return `${Math.min(sides, MAX_SIDES)} sides`; },
      get done() { return done; },
      get progress() { return (sides - 3) / (MAX_SIDES - 3); }
    };
  };

  /* --- 5. MIDI MELODY PADS (Xylophone Arc Bars Depressing on Every Bounce!) --- */
  SIMS.midi = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const PADS = small ? 10 : 16;
    const pads = Array.from({ length: PADS }, (_, i) => ({
      a0: (i / PADS) * TAU + 0.025,
      a1: ((i + 1) / PADS) * TAU - 0.025,
      push: 0, flash: 0, hue: i / PADS
    }));
    const balls = [{ x: cx + R * 0.14, y: cy - R * 0.22, vx: R * 0.02, vy: -R * 0.012, r: R * 0.056, hue: 0.1, trail: [] }];
    let noteI = 0, simT = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += dt / 60;
        for (const p of pads) { p.push *= Math.pow(0.84, dt); p.flash *= Math.pow(0.88, dt); }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.25 * S.grav * (R / 260), maxSpd = R * 0.046;
        const tLen = Math.round(8 + S.trail * 0.42);

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const lim = R - b.r;
            if (dist >= lim && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * lim; b.y = cy + ny * lim;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                const e = clamp(S.bounce, 0.94, 1.02);
                b.vx = (b.vx - 2 * dot * nx) * e - ny * 0.06 * (R / 260);
                b.vy = (b.vy - 2 * dot * ny) * e + nx * 0.06 * (R / 260);
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
                const ang = mod(Math.atan2(ny, nx), TAU);
                const pi = clamp(Math.floor(ang / TAU * PADS), 0, PADS - 1);
                pads[pi].push = 1; pads[pi].flash = 1;
                b.hue = pads[pi].hue;
                const col = pal.col(pads[pi].hue, 0.92);
                fx.burst(cx + nx * R, cy + ny * R, col, 8, R * 0.015, 2.1);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.75, 0.72, { timbre: S.timbre === 'steel' ? 'marimba' : S.timbre });
              }
            }
          }
        }
        for (const b of balls) { b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        c.lineCap = 'round';
        for (const p of pads) {
          const rr = R + p.push * 11 * dpr;
          c.strokeStyle = p.flash > 0.45 ? '#fff' : pal.col(p.hue, 0.42 + p.flash * 0.52);
          c.lineWidth = (9 + p.flash * 4) * dpr;
          c.beginPath(); c.arc(cx, cy, rr, p.a0, p.a1); c.stroke();
        }
        for (const b of balls) {
          if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.35);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down' && balls.length < 4) {
          balls.push({ x: cx, y: cy, vx: (x - cx) * 0.045, vy: (y - cy) * 0.045, r: R * 0.05, hue: Math.random(), trail: [] });
          if (audio) KA.playClack(0, 0.65, 1.1);
        }
      },
      stat() { return `Note #${noteI} · ${balls.length} Ball${balls.length > 1 ? 's' : ''}`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 6. RHYTHM BOUNCE (Viral TikTok Square/Marble Musical Platform Canyon!) --- */
  SIMS.squarebounce = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const scale = Math.min(w, h) * 0.0022;
    const cubeR = 16 * scale * (small ? 1.25 : 1);
    let camX = 0, camY = 0, noteI = 0, simT = 0;

    // Pre-generate deterministic synced staircase/canyon of bounce platforms
    const plats = [];
    let px = 0, py = 0, dir = 1;
    const vxBase = 3.2 * scale, vyJump = -7.8 * scale, gBase = 0.34 * scale;
    const flightFrames = Math.round((-2 * vyJump) / gBase); // exact apex-to-land time!

    const addNextPlat = () => {
      const idx = plats.length;
      const stepX = dir * vxBase * flightFrames * (0.78 + (idx % 3 === 0 ? 0.15 : 0));
      const stepY = (idx % 4 === 2 ? -22 : 28) * scale;
      if (Math.abs(px + stepX) > Math.min(w, h) * 0.34) dir *= -1;
      px += dir * Math.abs(stepX) * 0.68;
      py += stepY;
      plats.push({ x: px, y: py, w: 72 * scale, h: 16 * scale, hue: (idx * 0.07) % 1, hit: 0, dip: 0, idx });
    };
    plats.push({ x: 0, y: 0, w: 84 * scale, h: 16 * scale, hue: 0, hit: 0, dip: 0, idx: 0 });
    for (let i = 0; i < 24; i++) addNextPlat();

    let seg = 0, segT = 0, squash = 0;
    const trail = [];

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += dt / 60;
        const dur = 0.42 / Math.max(0.3, S.speed);
        segT += (dt / 60) / dur;
        squash *= Math.pow(0.82, dt);

        for (const pl of plats) { pl.hit *= Math.pow(0.88, dt); pl.dip *= Math.pow(0.82, dt); }

        while (segT >= 1) {
          segT -= 1;
          seg++;
          if (seg + 16 >= plats.length) addNextPlat();
          const land = plats[seg];
          land.hit = 1; land.dip = 1; squash = 1;
          const col = pal.col(land.hue, 0.92);
          fx.burst(land.x, land.y - cubeR, col, 10, 4.2 * scale, 2.2);
          fx.wave(land.x, land.y, col, 5, 48 * scale, 1.8, 0.52);
          if (audio) KA.playMelodyStep(noteI++, clamp(land.x / (w * 0.4), -0.75, 0.75), 0.72);
        }

        const p0 = plats[seg], p1 = plats[seg + 1];
        const bx = lerp(p0.x, p1.x, segT);
        const arcH = Math.max(58 * scale, Math.abs(p1.y - p0.y) + 46 * scale);
        const by = lerp(p0.y, p1.y, segT) - 4 * arcH * segT * (1 - segT) - cubeR;
        this._bx = bx; this._by = by; this._rot = segT * Math.PI * (p1.x >= p0.x ? 0.5 : -0.5);
        this._hue = p0.hue;

        camX = lerp(camX, bx, 0.1 * dt);
        camY = lerp(camY, by + 20 * scale, 0.1 * dt);
        trail.push([bx, by]);
        const tLen = Math.round(10 + S.trail * 0.45);
        while (trail.length > tLen) trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.055);
        c.save();
        c.translate(w / 2 - camX, h * 0.52 - camY);

        // Subtle connecting trajectory guide arc
        const p0 = plats[seg], p1 = plats[seg + 1];
        c.strokeStyle = 'rgba(255,255,255,0.06)';
        c.lineWidth = 1.5 * dpr;
        c.beginPath();
        for (let i = Math.max(0, seg - 4); i < Math.min(plats.length, seg + 12); i++) {
          const pl = plats[i];
          i === Math.max(0, seg - 4) ? c.moveTo(pl.x, pl.y) : c.lineTo(pl.x, pl.y);
        }
        c.stroke();

        // Platforms with physical depression on bounce
        for (let i = Math.max(0, seg - 6); i < Math.min(plats.length, seg + 14); i++) {
          const pl = plats[i];
          drawBevelRect(c, pl.x - pl.w * 0.5, pl.y + pl.dip * 8 * scale, pl.w, pl.h, pal, pl.hue, 0.78 + pl.hit * 0.22, pl.hit, 5 * scale);
        }

        if (S.trail > 3) drawSilkTrail(c, trail, pal, this._hue || 0, cubeR * 1.15, 0.35);

        // Glossy beveled bouncing cube with squash & stretch
        c.save();
        c.translate(this._bx || 0, this._by || 0);
        c.rotate(this._rot || 0);
        const sx = 1 + squash * 0.26, sy = 1 - squash * 0.22;
        c.scale(sx, sy);
        drawBevelRect(c, -cubeR, -cubeR, cubeR * 2, cubeR * 2, pal, this._hue || 0, 0.96, squash * 0.6, 6 * scale);
        c.restore();

        fx.draw(c, dpr);
        c.restore();
      },
      interact(type) { if (type === 'down' && audio) KA.playChord(noteI % 7, 0.6); },
      stat() { return `Step ${seg} · Synced Melody`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 7. SHRINK ESCAPE (Shrinks every hit to slip through tighter & tighter rings!) --- */
  SIMS.shrink = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    const fx = makeFX(small);
    const ringN = small ? 5 : 8;
    const rings = Array.from({ length: ringN }, (_, i) => {
      const f = i / (ringN - 1);
      return {
        r: lerp(R * 0.34, R * 0.96, f),
        ang: i * 1.1,
        vel: (i % 2 ? 1 : -1) * (0.01 + f * 0.01),
        gap: lerp(0.54, 0.16, f), // tighter gaps on outer rings!
        alive: true, hue: f * 0.9, flash: 0
      };
    });
    const b = { x: cx + R * 0.06, y: cy - R * 0.08, vx: R * 0.017, vy: -R * 0.012, r: R * 0.15, hue: 0.06, trail: [] };
    let bounces = 0, escaped = 0, finaleT = 0, done = false;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.2 * S.grav * (R / 260), maxSpd = R * 0.05;
        const tLen = Math.round(6 + S.trail * 0.42);

        for (let s = 0; s < sub; s++) {
          for (const rg of rings) if (rg.alive) { rg.ang = mod(rg.ang + rg.vel * sdt, TAU); rg.flash *= Math.pow(0.9, sdt); }
          const active = rings.find(r => r.alive);
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          if (!active) continue;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const lim = active.r - b.r;
          if (dist >= lim && dist > 0.001) {
            const ang = mod(Math.atan2(dy, dx), TAU);
            const diff = Math.abs(Math.atan2(Math.sin(ang - active.ang), Math.cos(ang - active.ang)));
            const chordW = 2 * active.r * Math.sin(active.gap * 0.5);
            if (diff < active.gap * 0.5 && b.r * 1.82 < chordW) {
              active.alive = false; escaped++;
              fx.wave(cx, cy, pal.col(active.hue, 0.9), active.r * 0.94, active.r * 1.15, 2.5, 0.55);
              if (audio) KA.playChord(escaped + 2, 0.75);
              if (escaped >= ringN) finaleT = 1.5;
            } else {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * lim; b.y = cy + ny * lim;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                b.vx = (b.vx - 2 * dot * nx) * 1.012 - ny * 0.07 * (R / 260);
                b.vy = (b.vy - 2 * dot * ny) * 1.012 + nx * 0.07 * (R / 260);
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
                b.r = Math.max(R * 0.018, b.r * 0.968);
                b.hue = (b.hue + 0.025) % 1;
                bounces++; active.flash = 1;
                const col = pal.col(b.hue, 0.9);
                fx.burst(cx + nx * active.r, cy + ny * active.r, col, 7, R * 0.014, 2);
                // Pitch rises as ball gets smaller!
                const pitchDeg = Math.floor(lerp(0, 18, 1 - (b.r - R * 0.018) / (R * 0.132)));
                if (audio) KA.playScale(pitchDeg, nx * 0.72, 0.6);
              }
            }
          }
        }
        b.trail.push([b.x, b.y]);
        while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        for (const rg of rings) {
          if (!rg.alive) continue;
          const a0 = rg.ang + rg.gap * 0.5, a1 = rg.ang + TAU - rg.gap * 0.5;
          drawStudioRing(c, cx, cy, rg.r, dpr, pal, rg.hue, rg.flash * 0.7, a0, a1, false);
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') { b.r = Math.max(R * 0.02, b.r * 0.88); b.vx += (x - b.x) * 0.03; b.vy += (y - b.y) * 0.03; }
      },
      stat() { return `Size ${Math.round(b.r / (R * 0.15) * 100)}% · ${ringN - escaped} left`; },
      get done() { return done; },
      get progress() { return escaped / ringN; }
    };
  };

  /* --- 8. SUIKA MERGE JAR (Viral 2048/Watermelon Physics Merge!) --- */
  SIMS.suika = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const jarW = Math.min(w * 0.68, h * 0.62);
    const jarH = Math.min(h * 0.72, jarW * 1.18);
    const ox = (w - jarW) * 0.5, oy = (h - jarH) * 0.5 + 10 * dpr;
    const baseR = jarW * 0.058;
    const TIERS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
    const radFor = tier => baseR * Math.pow(1.24, clamp(tier, 0, 8));

    const balls = [];
    let spawnT = 0, score = 0, merges = 0, topTier = 0, dropX = w / 2, simT = 0;

    const dropBall = (x = dropX, tier = Math.floor(Math.random() * 3)) => {
      if (balls.length >= (small ? 26 : 54)) return;
      const r = radFor(tier);
      balls.push({
        x: clamp(x, ox + r + 4, ox + jarW - r - 4),
        y: oy + r + 4,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.5,
        r, tier, pop: 1
      });
    };
    for (let i = 0; i < (small ? 6 : 10); i++) dropBall(ox + jarW * (0.2 + Math.random() * 0.6), i % 3);

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        dropX = ptr && ptr.in ? clamp(ptr.x, ox + baseR * 2, ox + jarW - baseR * 2) : w / 2 + Math.sin(simT * 1.3) * jarW * 0.34;

        spawnT += (dt / 60) * S.speed;
        if (spawnT > (small ? 0.8 : 0.58)) { spawnT = 0; dropBall(dropX); }

        const sub = 5, sdt = dt * S.speed / sub;
        const g = 0.36 * Math.max(0.3, S.grav) * (jarH / 420);

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.vy += g * sdt;
            b.vx *= Math.pow(0.994, sdt); b.vy *= Math.pow(0.994, sdt);
            b.x += b.vx * sdt; b.y += b.vy * sdt;
            if (b.x - b.r < ox) { b.x = ox + b.r; b.vx = Math.abs(b.vx) * 0.5; }
            if (b.x + b.r > ox + jarW) { b.x = ox + jarW - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
            if (b.y + b.r > oy + jarH) { b.y = oy + jarH - b.r; b.vy = -Math.abs(b.vy) * 0.42; }
          }

          // Collide & Merge identical tiers!
          let mergedSet = new Set();
          const toAdd = [];
          for (let i = 0; i < balls.length; i++) {
            if (mergedSet.has(i)) continue;
            const a = balls[i];
            for (let j = i + 1; j < balls.length; j++) {
              if (mergedSet.has(j)) continue;
              const b = balls[j];
              const dx = b.x - a.x, dy = b.y - a.y, minD = a.r + b.r;
              const d2 = dx * dx + dy * dy;
              if (d2 < minD * minD && d2 > 0.001) {
                if (a.tier === b.tier && a.tier < TIERS.length - 2) {
                  mergedSet.add(i); mergedSet.add(j);
                  const nt = a.tier + 1;
                  const mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5;
                  toAdd.push({ x: mx, y: my, vx: (a.vx + b.vx) * 0.4, vy: -2.2, r: radFor(nt), tier: nt, pop: 1.35 });
                  merges++; score += TIERS[nt]; topTier = Math.max(topTier, nt);
                  const col = pal.col(nt / 8, 0.95);
                  fx.burst(mx, my, col, 10 + nt * 2, 3.6 * dpr, 2.5);
                  fx.wave(mx, my, col, radFor(nt) * 0.5, radFor(nt) * 2.1, 2.4, 0.65);
                  if (audio) KA.playMerge(nt, (mx / w - 0.5) * 1.4);
                  break;
                } else {
                  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (minD - d) * 0.5;
                  a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
                  const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
                  if (vn < 0) {
                    const imp = -vn * 0.65;
                    a.vx -= imp * nx; a.vy -= imp * ny;
                    b.vx += imp * nx; b.vy += imp * ny;
                  }
                }
              }
            }
          }
          if (mergedSet.size) {
            for (let k = balls.length - 1; k >= 0; k--) if (mergedSet.has(k)) balls.splice(k, 1);
            for (const nb of toAdd) balls.push(nb);
          }
        }
        for (const b of balls) b.pop = lerp(b.pop, 1, 0.16 * dt);
        // Gentle auto-pop overflow if packed to the brim
        if (balls.length > (small ? 24 : 50)) {
          const oldest = balls.findIndex(b => b.tier === 0);
          if (oldest >= 0) balls.splice(oldest, 1);
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        // Sleek glass jar enclosure
        c.save();
        c.fillStyle = 'rgba(255,255,255,0.025)';
        c.strokeStyle = 'rgba(255,255,255,0.22)';
        c.lineWidth = 2.2 * dpr;
        c.beginPath();
        c.moveTo(ox, oy); c.lineTo(ox, oy + jarH); c.lineTo(ox + jarW, oy + jarH); c.lineTo(ox + jarW, oy);
        c.stroke();
        c.fillRect(ox, oy, jarW, jarH);

        // Drop guide hairline
        c.strokeStyle = 'rgba(255,255,255,0.1)';
        c.setLineDash([4 * dpr, 4 * dpr]);
        c.beginPath(); c.moveTo(dropX, oy); c.lineTo(dropX, oy + jarH); c.stroke();
        c.setLineDash([]);
        c.restore();

        for (const b of balls) {
          const dr = b.r * b.pop;
          drawSphere(c, b.x, b.y, dr, pal, (b.tier * 0.13) % 1, S.material, true);
          if (!small && dr > 11 * dpr) {
            c.fillStyle = 'rgba(255,255,255,0.88)';
            c.font = `600 ${Math.round(dr * 0.58)}px "JetBrains Mono", monospace`;
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(TIERS[b.tier], b.x, b.y + 1);
          }
        }
        fx.draw(c, dpr);
      },
      interact(type, x) {
        if (type === 'down') { dropBall(x, Math.floor(Math.random() * 3)); if (audio) KA.playClack((x / w - 0.5) * 1.2, 0.5, 1.3); }
      },
      stat() { return `Score ${score} · Max ${TIERS[topTier]}`; },
      done: false,
      get progress() { return (simT % 28) / 28; }
    };
  };

  /* --- 9. MULTIPLY --- */
  SIMS.multiply = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const CAP = small ? 34 : 105;
    const br = R * (small ? 0.058 : 0.044);
    let balls = [], bounceCount = 0, noteI = 0, fullT = 0, done = false;

    const addBall = (x, y, vx, vy, hue) => {
      if (balls.length >= CAP) return;
      balls.push({ x, y, vx, vy, r: br, hue, trail: [] });
    };
    addBall(cx + R * 0.14, cy - R * 0.28, R * 0.017, -R * 0.008, 0.05);

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (balls.length >= CAP) {
          fullT += dt / 60;
          if (fullT > 2.4 && balls.length) {
            fx.burst(cx, cy, pal.col(0.4, 0.9), 58, R * 0.032, 2.8);
            if (audio) KA.playChord(2, 0.85);
            balls = [];
          }
          if (fullT > 3.7) done = true;
          return;
        }
        const sub = 4, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.042;
        const tLen = Math.round(4 + S.trail * 0.16);

        for (let s = 0; s < sub; s++) {
          const toAdd = [];
          for (const b of balls) {
            b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const lim = R - b.r;
            if (dist >= lim && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * lim; b.y = cy + ny * lim;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                b.vx = (b.vx - 2 * dot * nx) * clamp(S.bounce, 0.92, 1.02);
                b.vy = (b.vy - 2 * dot * ny) * clamp(S.bounce, 0.92, 1.02);
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
                bounceCount++;
                fx.rim(cx, cy, R, Math.atan2(ny, nx), pal.col(b.hue, 0.85), 0.22, 0.6);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.75, 0.5, { rate: 28 });
                const every = balls.length < 8 ? 1 : balls.length < 28 ? 3 : 7;
                if (bounceCount % every === 0 && balls.length + toAdd.length < CAP) {
                  const a = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? 0.42 : -0.42);
                  const nsp = Math.max(R * 0.015, sp * 0.95);
                  toAdd.push([b.x - nx * 2, b.y - ny * 2, Math.cos(a) * nsp, Math.sin(a) * nsp, (b.hue + 0.08) % 1]);
                }
              }
            }
          }
          for (const a of toAdd) addBall(...a);
          for (let i = 0; i < balls.length; i++) {
            const a = balls[i];
            for (let j = i + 1; j < balls.length; j++) {
              const b = balls[j], dx = b.x - a.x, dy = b.y - a.y, minD = a.r + b.r, d2 = dx * dx + dy * dy;
              if (d2 < minD * minD && d2 > 0.0001) {
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (minD - d) * 0.5;
                a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
                const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (vn < 0) {
                  const imp = -vn * 0.96;
                  a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
                  if (audio && balls.length < 36 && Math.abs(vn) > 2.5) KA.playClack((a.x / w - 0.5) * 1.4, 0.32, 1.35);
                }
              }
            }
          }
        }
        for (const b of balls) { b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        drawStudioRing(c, cx, cy, R, dpr, pal, (t * 0.00005) % 1, 0, 0, TAU, !small);
        for (const b of balls) {
          if (S.trail > 8 && balls.length < 55) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.0, 0.28);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, false);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down' && balls.length < CAP) {
          for (let k = 0; k < 4; k++) {
            const a = Math.random() * TAU;
            addBall(cx + (x - cx) * 0.5, cy + (y - cy) * 0.5, Math.cos(a) * R * 0.02, Math.sin(a) * R * 0.02, Math.random());
          }
          fx.wave(x, y, pal.col(0.5, 0.8), 5, R * 0.14, 1.8, 0.5);
          if (audio) KA.playClack(0, 0.7, 1.2);
        }
      },
      stat() { return `${balls.length}/${CAP} spheres`; },
      get done() { return done; },
      get progress() { return clamp(balls.length / CAP, 0, 1); }
    };
  };

  /* --- 10. RING DUEL (Two rival spheres clashing & stealing size until one wins!) --- */
  SIMS.duel = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const sp = R * 0.024;
    let balls = [
      { x: cx - R * 0.35, y: cy - R * 0.15, vx: sp, vy: -sp * 0.3, r: R * 0.12, hue: 0.06, name: 'A', trail: [] },
      { x: cx + R * 0.35, y: cy + R * 0.15, vx: -sp, vy: sp * 0.3, r: R * 0.12, hue: 0.78, name: 'B', trail: [] }
    ];
    let clashes = 0, noteI = 0, finaleT = 0, done = false;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.052;
        const tLen = Math.round(6 + S.trail * 0.4);

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const lim = R - b.r;
            if (dist >= lim && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * lim; b.y = cy + ny * lim;
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) {
                b.vx = (b.vx - 2 * dot * nx) * 1.015;
                b.vy = (b.vy - 2 * dot * ny) * 1.015;
                const spd = Math.hypot(b.vx, b.vy);
                if (spd > maxSpd) { b.vx *= maxSpd / spd; b.vy *= maxSpd / spd; }
                b.r += R * 0.004;
                fx.rim(cx, cy, R, Math.atan2(ny, nx), pal.col(b.hue, 0.85), 0.26, 0.65);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.7, 0.52);
              }
            }
          }
          if (balls.length === 2) {
            const a = balls[0], b = balls[1];
            const dx = b.x - a.x, dy = b.y - a.y, minD = a.r + b.r, d = Math.hypot(dx, dy);
            if (d < minD && d > 0.001) {
              const nx = dx / d, ny = dy / d, ov = (minD - d) * 0.5;
              a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
              const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (vn < 0) {
                const imp = -vn * 1.06;
                a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
                clashes++;
                // Faster ball steals radius!
                const sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy);
                const transfer = R * 0.015;
                if (sa >= sb) { a.r += transfer; b.r -= transfer; } else { b.r += transfer; a.r -= transfer; }
                const mx = (a.x + b.x) * 0.5, my = (a.y + b.y) * 0.5;
                fx.burst(mx, my, '#fff', 14, R * 0.02, 2.5);
                fx.wave(mx, my, pal.col(sa >= sb ? a.hue : b.hue, 0.9), 6, R * 0.2, 2.4, 0.7);
                if (audio) KA.playClack((mx / w - 0.5) * 1.3, 0.95, 0.85);
                const loser = a.r < R * 0.032 ? 0 : b.r < R * 0.032 ? 1 : -1;
                if (loser >= 0) {
                  const dead = balls.splice(loser, 1)[0];
                  fx.burst(dead.x, dead.y, pal.col(dead.hue, 0.95), 44, R * 0.03, 3);
                  if (audio) KA.playChord(4, 0.85);
                  finaleT = 1.6;
                }
              }
            }
          }
        }
        for (const b of balls) { b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.5, 0, 0, TAU, !small);
        for (const b of balls) {
          if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') for (const b of balls) { b.vx += (x - b.x) * 0.03; b.vy += (y - b.y) * 0.03; }
      },
      stat() {
        if (balls.length < 2) return `Winner! · ${clashes} clashes`;
        const tot = balls[0].r + balls[1].r;
        return `${Math.round(balls[0].r / tot * 100)}% vs ${Math.round(balls[1].r / tot * 100)}%`;
      },
      get done() { return done; },
      get progress() { return balls.length < 2 ? 1 : clamp(Math.abs(balls[0].r - balls[1].r) / (R * 0.2), 0, 1); }
    };
  };

  /* --- 11. PAINT RING (Permanent oil/ceramic paint trail filling the circle!) --- */
  SIMS.paint = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const paintC = document.createElement('canvas'); paintC.width = w; paintC.height = h;
    const pctx = paintC.getContext('2d');
    const fx = makeFX(small);
    const b = { x: cx + R * 0.18, y: cy - R * 0.24, vx: R * 0.025, vy: -R * 0.01, r: R * 0.075, hue: 0 };
    let px = b.x, py = b.y, bounces = 0, noteI = 0, done = false;
    const TARGET = small ? 36 : 78;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.048;

        for (let s = 0; s < sub; s++) {
          px = b.x; py = b.y;
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const lim = R - b.r;
          if (dist >= lim && dist > 0.001) {
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * lim; b.y = cy + ny * lim;
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              b.vx = (b.vx - 2 * dot * nx) * 1.008 - ny * 0.09 * (R / 260);
              b.vy = (b.vy - 2 * dot * ny) * 1.008 + nx * 0.09 * (R / 260);
              const sp = Math.hypot(b.vx, b.vy);
              if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
              bounces++;
              b.hue = (b.hue + 0.032) % 1;
              b.r = Math.min(R * 0.14, b.r + R * 0.0008);
              fx.rim(cx, cy, R, Math.atan2(ny, nx), pal.col(b.hue, 0.85), 0.25, 0.6);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.7, 0.58);
              if (bounces >= TARGET) done = true;
            }
          }
          // Stamp silky permanent paint stroke onto offscreen canvas
          pctx.save();
          pctx.beginPath(); pctx.arc(cx, cy, R - 2 * dpr, 0, TAU); pctx.clip();
          pctx.strokeStyle = pal.col(b.hue, 0.88, 0.88);
          pctx.lineWidth = b.r * 1.92;
          pctx.lineCap = 'round';
          pctx.beginPath(); pctx.moveTo(px, py); pctx.lineTo(b.x, b.y); pctx.stroke();
          // Crisp dark outline edge for layered ribbon depth!
          pctx.strokeStyle = 'rgba(0,0,0,0.22)';
          pctx.lineWidth = b.r * 1.92 + 2 * dpr;
          pctx.globalCompositeOperation = 'destination-over';
          pctx.beginPath(); pctx.moveTo(px, py); pctx.lineTo(b.x, b.y); pctx.stroke();
          pctx.restore();
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.04);
        c.drawImage(paintC, 0, 0);
        drawStudioRing(c, cx, cy, R, dpr, pal, b.hue, 0, 0, TAU, !small);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') { b.vx += (x - b.x) * 0.04; b.vy += (y - b.y) * 0.04; }
      },
      stat() { return `${Math.round(bounces / TARGET * 100)}% painted`; },
      get done() { return done; },
      get progress() { return clamp(bounces / TARGET, 0, 1); }
    };
  };

  /* --- 12. RING BREAKER --- */
  SIMS.breaker = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
    const fx = makeFX(small);
    const rings = small ? 3 : 5;
    const bricks = [];
    for (let ri = 0; ri < rings; ri++) {
      const rIn = lerp(R * 0.4, R * 0.88, ri / rings);
      const rOut = lerp(R * 0.4, R * 0.88, (ri + 0.82) / rings);
      const cols = small ? 12 + ri * 4 : 16 + ri * 6;
      for (let ci = 0; ci < cols; ci++) {
        bricks.push({
          rIn, rOut, a0: ci / cols * TAU + 0.025, a1: (ci + 1) / cols * TAU - 0.025,
          hue: ri / rings * 0.85 + ci / cols * 0.15, alive: true
        });
      }
    }
    const total = bricks.length;
    let broken = 0, combo = 0, finaleT = 0, done = false;
    const balls = [];
    const spawnBall = (x = cx, y = cy, ang = Math.random() * TAU) => {
      if (balls.length >= 10) return;
      const sp = R * 0.026;
      balls.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: R * 0.032, hue: Math.random(), trail: [] });
    };
    spawnBall(cx - R * 0.1, cy, -0.7);
    spawnBall(cx + R * 0.1, cy, 2.3);
    if (!small) spawnBall(cx, cy + R * 0.08, -2.1);

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 5, sdt = dt * S.speed / sub;
        const tLen = Math.round(5 + S.trail * 0.25);

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.x += b.vx * sdt; b.y += b.vy * sdt;
            const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
            const ang = mod(Math.atan2(dy, dx), TAU);
            if (dist + b.r >= R) {
              const nx = dx / dist, ny = dy / dist;
              b.x = cx + nx * (R - b.r); b.y = cy + ny * (R - b.r);
              const dot = b.vx * nx + b.vy * ny;
              if (dot > 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
              fx.rim(cx, cy, R, ang, pal.col(b.hue, 0.85), 0.22, 0.55);
            }
            for (const bk of bricks) {
              if (!bk.alive) continue;
              if (dist + b.r >= bk.rIn && dist - b.r <= bk.rOut && ang >= bk.a0 && ang <= bk.a1) {
                bk.alive = false; broken++; combo++;
                const nx = dx / (dist || 1), ny = dy / (dist || 1);
                const dot = b.vx * nx + b.vy * ny;
                b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
                const mx = cx + Math.cos((bk.a0 + bk.a1) * 0.5) * (bk.rIn + bk.rOut) * 0.5;
                const my = cy + Math.sin((bk.a0 + bk.a1) * 0.5) * (bk.rIn + bk.rOut) * 0.5;
                const col = pal.col(bk.hue, 0.92);
                fx.burst(mx, my, col, 8, R * 0.016, 2.2);
                if (audio) KA.playScale(combo % 15, (mx / w - 0.5) * 1.4, 0.52, { rate: 32 });
                if (broken % 18 === 0 && balls.length < 8) spawnBall(mx, my, Math.random() * TAU);
                if (broken >= total) { finaleT = 1.5; if (audio) KA.playChord(5, 0.85); }
                break;
              }
            }
          }
        }
        for (const b of balls) { b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.4, 0, 0, TAU, false);
        for (const bk of bricks) {
          if (!bk.alive) continue;
          const rMid = (bk.rIn + bk.rOut) * 0.5;
          c.strokeStyle = pal.col(bk.hue, 0.78, 0.9);
          c.lineWidth = (bk.rOut - bk.rIn);
          c.beginPath(); c.arc(cx, cy, rMid, bk.a0, bk.a1); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.22)';
          c.lineWidth = 1 * dpr;
          c.beginPath(); c.arc(cx, cy, bk.rOut - 1, bk.a0, bk.a1); c.stroke();
        }
        for (const b of balls) {
          if (S.trail > 5) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.25, 0.35);
          drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y) { if (type === 'down') { spawnBall(x, y, Math.atan2(cy - y, cx - x)); if (audio) KA.playClack(0, 0.65, 1.2); } },
      stat() { return `${total - broken}/${total} tiles`; },
      get done() { return done; },
      get progress() { return broken / total; }
    };
  };

  /* --- 13. LASER SLICER (Sweeping precision blade slicing floating spheres in half!) --- */
  SIMS.slicer = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small);
    const orbs = [];
    const minR = R * 0.032, MAX_ORBS = small ? 28 : 68;
    let beamAng = 0, slices = 0, simT = 0;

    const addOrb = (x, y, vx, vy, r, hue, cd = 0) => {
      if (orbs.length >= MAX_ORBS) return;
      orbs.push({ x, y, vx, vy, r, hue, cd });
    };
    for (let i = 0; i < (small ? 3 : 5); i++) {
      const a = i / 5 * TAU;
      addOrb(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, -Math.sin(a) * R * 0.008, Math.cos(a) * R * 0.008, R * 0.145, i * 0.2);
    }

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        beamAng = ptr && ptr.down ? Math.atan2(ptr.y - cy, ptr.x - cx) : mod(beamAng + 0.022 * dt * S.speed, TAU);
        const bx = Math.cos(beamAng), by = Math.sin(beamAng);

        const toAdd = [];
        for (let i = orbs.length - 1; i >= 0; i--) {
          const o = orbs[i];
          if (o.cd > 0) o.cd -= dt;
          o.x += o.vx * dt * S.speed; o.y += o.vy * dt * S.speed;
          const dx = o.x - cx, dy = o.y - cy, dist = Math.hypot(dx, dy);
          if (dist + o.r >= R && dist > 0.001) {
            const nx = dx / dist, ny = dy / dist;
            o.x = cx + nx * (R - o.r); o.y = cy + ny * (R - o.r);
            const dot = o.vx * nx + o.vy * ny;
            if (dot > 0) { o.vx -= 2 * dot * nx; o.vy -= 2 * dot * ny; }
          }
          // Distance from orb center to infinite rotating laser chord passing through center
          const proj = dx * bx + dy * by;
          const perp = Math.abs(dx * -by + dy * bx);
          if (o.cd <= 0 && o.r > minR && perp < o.r * 0.55 && Math.abs(proj) < R) {
            // SLICE cleanly into two smaller orbs!
            const nr = o.r * 0.72;
            const sepNx = -by, sepNy = bx, kick = R * 0.012;
            const col = pal.col(o.hue, 0.92);
            fx.burst(o.x, o.y, col, 10, R * 0.015, 2.2);
            fx.wave(o.x, o.y, col, nr * 0.5, o.r * 1.9, 1.8, 0.55);
            if (audio) KA.playSlice((o.x / w - 0.5) * 1.4, lerp(1.4, 0.75, nr / (R * 0.14)));
            slices++;
            orbs.splice(i, 1);
            toAdd.push([o.x + sepNx * nr * 0.9, o.y + sepNy * nr * 0.9, o.vx + sepNx * kick, o.vy + sepNy * kick, nr, (o.hue + 0.05) % 1, 26]);
            toAdd.push([o.x - sepNx * nr * 0.9, o.y - sepNy * nr * 0.9, o.vx - sepNx * kick, o.vy - sepNy * kick, nr, (o.hue + 0.11) % 1, 26]);
          }
        }
        for (const a of toAdd) addOrb(...a);
        // Auto-refresh when all orbs are finely diced
        if (orbs.length >= MAX_ORBS - 4 || orbs.every(o => o.r <= minR)) {
          orbs.length = 0;
          for (let i = 0; i < (small ? 3 : 5); i++) {
            const a = i / 5 * TAU + simT;
            addOrb(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, -Math.sin(a) * R * 0.008, Math.cos(a) * R * 0.008, R * 0.145, (i * 0.2 + simT * 0.1) % 1, 18);
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.2, 0, 0, TAU, !small);
        for (const o of orbs) drawSphere(c, o.x, o.y, o.r, pal, o.hue, S.material, true);

        // Precision laser blade beam
        const bx = Math.cos(beamAng) * R, by = Math.sin(beamAng) * R;
        c.save();
        c.strokeStyle = pal.col(0.05, 0.35);
        c.lineWidth = 7 * dpr;
        c.beginPath(); c.moveTo(cx - bx, cy - by); c.lineTo(cx + bx, cy + by); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.88)';
        c.lineWidth = 1.8 * dpr;
        c.beginPath(); c.moveTo(cx - bx, cy - by); c.lineTo(cx + bx, cy + by); c.stroke();
        drawSphere(c, cx, cy, 5 * dpr, pal, 0.05, 'chrome', false);
        c.restore();
        fx.draw(c, dpr);
      },
      interact(type, x, y) {
        if (type === 'down') addOrb(x, y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, R * 0.12, Math.random(), 10);
      },
      stat() { return `${slices} slices · ${orbs.length} orbs`; },
      done: false,
      get progress() { return (simT % 22) / 22; }
    };
  };

  /* --- 14. TERRITORY WAR (4-Team Beveled Ceramic Grid Battle) --- */
  SIMS.territory = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const G = small ? 14 : 22;
    const size = Math.min(w, h) * 0.74;
    const ox = (w - size) / 2, oy = (h - size) / 2, cs = size / G;
    const grid = new Uint8Array(G * G);
    const flash = new Float32Array(G * G);
    const teamHues = [0.04, 0.32, 0.62, 0.88];
    const half = G >> 1;
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) grid[y * G + x] = (y >= half ? 2 : 0) + (x >= half ? 1 : 0);

    const spd = cs * 0.34;
    const balls = [0, 1, 2, 3].map(tm => {
      const qx = (tm & 1) ? 0.75 : 0.25, qy = (tm & 2) ? 0.75 : 0.25;
      const a = 0.5 + Math.random() * 1.1 + tm * 1.5;
      return { tm, x: ox + size * qx, y: oy + size * qy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: cs * 0.38 };
    });
    let flips = 0, counts = [0, 0, 0, 0], elapsed = 0, done = false;
    const recount = () => { counts = [0, 0, 0, 0]; for (let i = 0; i < grid.length; i++) counts[grid[i]]++; };
    recount();

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        elapsed += dt / 60;
        for (let i = 0; i < flash.length; i++) if (flash[i] > 0.01) flash[i] *= Math.pow(0.86, dt);
        const sub = 4, sdt = dt * S.speed / sub;

        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            const nx = b.x + b.vx * sdt, ny = b.y + b.vy * sdt;
            if (nx - b.r < ox) { b.x = ox + b.r; b.vx = Math.abs(b.vx); }
            else if (nx + b.r > ox + size) { b.x = ox + size - b.r; b.vx = -Math.abs(b.vx); } else b.x = nx;
            if (ny - b.r < oy) { b.y = oy + b.r; b.vy = Math.abs(b.vy); }
            else if (ny + b.r > oy + size) { b.y = oy + size - b.r; b.vy = -Math.abs(b.vy); } else b.y = ny;

            const gx = clamp(Math.floor((b.x - ox) / cs), 0, G - 1);
            const gy = clamp(Math.floor((b.y - oy) / cs), 0, G - 1);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const cx2 = gx + dx, cy2 = gy + dy;
              if (cx2 < 0 || cx2 >= G || cy2 < 0 || cy2 >= G) continue;
              const idx = cy2 * G + cx2;
              if (grid[idx] === b.tm) continue;
              const rx = ox + cx2 * cs, ry = oy + cy2 * cs;
              const clx = clamp(b.x, rx, rx + cs), cly = clamp(b.y, ry, ry + cs);
              const ddx = b.x - clx, ddy = b.y - cly;
              if (ddx * ddx + ddy * ddy < b.r * b.r) {
                grid[idx] = b.tm; flash[idx] = 1; flips++;
                if (Math.abs(ddx) > Math.abs(ddy)) b.vx *= -1; else b.vy *= -1;
                const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 0.08, sp = Math.hypot(b.vx, b.vy);
                b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
                fx.burst(rx + cs * 0.5, ry + cs * 0.5, pal.col(teamHues[b.tm], 0.9), 3, cs * 0.12, 1.6);
                if (audio) KA.playScale(b.tm * 3 + (flips % 4), (cx2 / G - 0.5) * 1.4, 0.34, { rate: 28, timbre: 'marimba' });
                break;
              }
            }
          }
        }
        recount();
        if (Math.max(...counts) >= grid.length * 0.95 || elapsed > 36) done = true;
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.04);
        const pad = Math.max(1, cs * 0.07);
        for (let y = 0; y < G; y++) {
          for (let x = 0; x < G; x++) {
            const idx = y * G + x, tm = grid[idx], fl = flash[idx];
            drawBevelRect(c, ox + x * cs + pad, oy + y * cs + pad, cs - pad * 2, cs - pad * 2, pal, teamHues[tm], 0.34 + fl * 0.5, fl, 3);
          }
        }
        c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2 * dpr;
        c.strokeRect(ox, oy, size, size);
        for (const b of balls) drawSphere(c, b.x, b.y, b.r * 1.15, pal, teamHues[b.tm], S.material, true);
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down') {
          const gx = Math.floor((x - ox) / cs), gy = Math.floor((y - oy) / cs);
          if (gx >= 0 && gx < G && gy >= 0 && gy < G) {
            const tm = (flips++) % 4;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const cx2 = gx + dx, cy2 = gy + dy;
              if (cx2 >= 0 && cx2 < G && cy2 >= 0 && cy2 < G) { grid[cy2 * G + cx2] = tm; flash[cy2 * G + cx2] = 1; }
            }
            fx.wave(x, y, pal.col(teamHues[tm], 0.85), 5, cs * 2.8, 1.8, 0.6);
            if (audio) KA.playClack((x / w - 0.5) * 1.4, 0.6, 1.1);
          }
        }
      },
      stat() { return `Lead ${Math.round(Math.max(...counts) / grid.length * 100)}% · ${flips} flips`; },
      get done() { return done; },
      get progress() { return clamp(elapsed / 36, 0, 1); }
    };
  };
})();
