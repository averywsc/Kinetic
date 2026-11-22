/* ============================================================================
   Kinetic — Harmonic, Tactile ASMR & Generative Physics Sims (14 Upgraded)
   ============================================================================ */
(() => {
  'use strict';

  const { TAU, clamp, lerp, mod, fillStudioBg, drawSphere, drawStudioRing, drawBevelRect, drawSilkTrail, makeFX } = window.KT;
  const KA = window.KA;
  const SIMS = window.KSIMS || (window.KSIMS = {});

  /* --- 15. POLYRHYTHM ARCHES (With luminous strike pillars!) --- */
  SIMS.polyrhythm = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, baseY = h * 0.72, R = Math.min(w * 0.44, h * 0.55);
    const fx = makeFX(small);
    const N = small ? 10 : 18;
    const orbs = Array.from({ length: N }, (_, i) => {
      const f = i / (N - 1);
      return { r: lerp(R * 0.16, R, f), freq: 0.54 + (N - 1 - i) * 0.04, phase: 0, flash: 0, hitSide: 1, hue: f * 0.9, x: cx, y: baseY, trail: [] };
    });
    let simT = 0, hits = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed * (ptr && ptr.down ? 1.8 : 1);
        const tLen = Math.round(4 + S.trail * 0.22);
        for (let i = 0; i < N; i++) {
          const o = orbs[i];
          const prevC = Math.floor(o.phase / Math.PI);
          o.phase = simT * o.freq * Math.PI;
          const curC = Math.floor(o.phase / Math.PI);
          const loc = mod(o.phase, TAU);
          const ang = loc <= Math.PI ? loc : TAU - loc;
          o.x = cx + Math.cos(ang) * o.r;
          o.y = baseY - Math.sin(ang) * o.r;
          o.flash *= Math.pow(0.87, dt);
          o.trail.push([o.x, o.y]); while (o.trail.length > tLen) o.trail.shift();

          if (curC > prevC) {
            o.flash = 1; hits++;
            o.hitSide = curC % 2 === 1 ? -1 : 1;
            const hx = cx + o.hitSide * o.r, col = pal.col(o.hue, 0.9);
            fx.wave(hx, baseY, col, 3, R * 0.1, 1.8, 0.55);
            fx.burstDir(hx, baseY, 0, 1, col, 5, R * 0.012, 1.9);
            if (audio) KA.playScale(N - 1 - i, o.hitSide * (o.r / R) * 0.78, 0.56, { rate: 38 });
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        for (const o of orbs) {
          c.strokeStyle = pal.col(o.hue, 0.14 + o.flash * 0.44);
          c.lineWidth = (1.2 + o.flash * 2) * dpr;
          c.beginPath(); c.arc(cx, baseY, o.r, Math.PI, TAU); c.stroke();
          // Vertical harmonic strike pillar blooming from baseline!
          if (o.flash > 0.06) {
            const hx = cx + o.hitSide * o.r, ph = R * 0.24 * o.flash;
            const pg = c.createLinearGradient(0, baseY, 0, baseY - ph);
            pg.addColorStop(0, pal.col(o.hue, o.flash * 0.42));
            pg.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = pg;
            c.fillRect(hx - 3 * dpr, baseY - ph, 6 * dpr, ph);
          }
        }
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(cx - R * 1.04, baseY - 1.5 * dpr, R * 2.08, 3 * dpr);

        c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.2 * dpr;
        c.beginPath(); orbs.forEach((o, i) => i ? c.lineTo(o.x, o.y) : c.moveTo(o.x, o.y)); c.stroke();

        const orbR = Math.max(3.4 * dpr, R / (N * 2.15));
        for (const o of orbs) {
          if (S.trail > 5) drawSilkTrail(c, o.trail, pal, o.hue, orbR * 0.95, 0.3);
          drawSphere(c, o.x, o.y, orbR * (1 + o.flash * 0.35), pal, o.hue, S.material, false);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) { if (type === 'down') { simT += 0.35; fx.wave(x, y, pal.col(0.4, 0.8), 5, R * 0.2, 1.8, 0.5); } },
      stat() { return `${hits} chimes · ${N} arches`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 16. PENDULUM WAVE (With luminous nadir nodes!) --- */
  SIMS.pendulum = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const N = small ? 12 : 22;
    const topY = h * 0.14, spanX = Math.min(w * 0.76, h * 0.9), leftX = (w - spanX) / 2;
    const maxLen = h * 0.65;
    const bobs = Array.from({ length: N }, (_, i) => {
      const f = i / (N - 1);
      return { f, freq: 0.42 + i * 0.024, len: lerp(maxLen * 0.46, maxLen, f), lastSign: 1, flash: 0, x: w / 2, y: topY, trail: [] };
    });
    let simT = 0, amp = 0.54;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        amp = lerp(amp, ptr && ptr.down ? 0.78 : 0.54, 0.05 * dt);
        const tLen = Math.round(5 + S.trail * 0.28);

        for (let i = 0; i < N; i++) {
          const b = bobs[i];
          const s = Math.sin(simT * b.freq * TAU), ang = s * amp;
          b.x = leftX + b.f * spanX + Math.sin(ang) * (b.len * 0.45);
          b.y = topY + Math.cos(ang) * b.len;
          b.flash *= Math.pow(0.86, dt);
          b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();

          const sign = s >= 0 ? 1 : -1;
          if (sign !== b.lastSign) {
            b.lastSign = sign; b.flash = 1;
            fx.wave(b.x, b.y, pal.col(b.f, 0.85), 3, 26 * dpr, 1.6, 0.48);
            if (audio) KA.playScale(i, (b.f - 0.5) * 1.5, 0.42, { rate: 36 });
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.5 * dpr;
        c.beginPath(); c.moveTo(leftX - 16 * dpr, topY); c.lineTo(leftX + spanX + 16 * dpr, topY); c.stroke();
        // Subtle diagonal nadir baseline showing unison crossing line
        c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1.2 * dpr;
        c.beginPath(); c.moveTo(leftX, topY + bobs[0].len); c.lineTo(leftX + spanX, topY + bobs[N - 1].len); c.stroke();

        for (const b of bobs) {
          const ax = leftX + b.f * spanX;
          c.strokeStyle = pal.col(b.f, 0.16 + b.flash * 0.36); c.lineWidth = 1.1 * dpr;
          c.beginPath(); c.moveTo(ax, topY); c.lineTo(b.x, b.y); c.stroke();
          if (b.flash > 0.08) {
            c.fillStyle = pal.col(b.f, b.flash * 0.8);
            c.beginPath(); c.arc(ax, topY + b.len, (2.2 + b.flash * 3) * dpr, 0, TAU); c.fill();
          }
        }
        c.strokeStyle = 'rgba(255,255,255,0.26)'; c.lineWidth = 1.4 * dpr;
        c.beginPath(); bobs.forEach((b, i) => i ? c.lineTo(b.x, b.y) : c.moveTo(b.x, b.y)); c.stroke();
        const r = Math.max(4.2 * dpr, Math.min(w, h) * 0.0185);
        for (const b of bobs) {
          if (S.trail > 5) drawSilkTrail(c, b.trail, pal, b.f, r * 0.95, 0.28);
          drawSphere(c, b.x, b.y, r * (1 + b.flash * 0.32), pal, b.f, S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) { if (type === 'down') { amp = 0.84; fx.wave(x, y, pal.col(0.4, 0.8), 6, 80 * dpr, 1.8, 0.5); } },
      stat() { return `Phase ${(simT % 40).toFixed(1)}s · ${N} bobs`; },
      done: false,
      get progress() { return (simT % 40) / 40; }
    };
  };

  /* --- 17. NEWTON'S CRADLE (With live specular floor reflections!) --- */
  SIMS.cradle = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const N = small ? 5 : 7;
    const r = Math.min(w, h) * (small ? 0.056 : 0.044);
    const len = Math.min(w, h) * 0.42, topY = h * 0.21;
    const startX = w / 2 - (N - 1) * r;
    const balls = Array.from({ length: N }, (_, i) => ({
      px: startX + i * r * 2,
      a: i === 0 ? -0.78 : (i === 1 && !small ? -0.78 : 0),
      w: 0, hue: i / Math.max(1, N - 1), flash: 0
    }));
    let clacks = 0, simT = 0, modeI = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        const sub = 10, sdt = (dt / 60) * S.speed / sub, g = 11.5 * Math.max(0.3, S.grav);
        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            b.w += -(g / 1.4) * Math.sin(b.a) * sdt; b.a += b.w * sdt;
            b.w *= Math.pow(0.9994, sdt * 60); b.flash *= Math.pow(0.88, sdt * 60);
          }
          for (let i = 0; i < N - 1; i++) {
            const a = balls[i], b = balls[i + 1];
            const ax = a.px + Math.sin(a.a) * len, ay = topY + Math.cos(a.a) * len;
            const bx = b.px + Math.sin(b.a) * len, by = topY + Math.cos(b.a) * len;
            if (Math.hypot(bx - ax, by - ay) < r * 2 && a.w > b.w) {
              const tmp = a.w; a.w = b.w * 0.996; b.w = tmp * 0.996;
              const mid = (a.a + b.a) * 0.5; if (a.a > b.a) { a.a = mid; b.a = mid; }
              const imp = Math.abs(b.w - a.w);
              if (imp > 0.22) {
                clacks++; a.flash = 1; b.flash = 1;
                const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5;
                fx.burst(mx, my, pal.col(b.hue, 0.92), 6, 2.8 * dpr, 1.8);
                fx.wave(mx, my, pal.col(b.hue, 0.8), 3, r * 1.5, 1.5, 0.48);
                if (audio) { KA.playClack((mx / w - 0.5) * 1.1, clamp(imp * 0.5, 0.25, 1), 0.94 + i * 0.025); if (imp > 0.8) KA.playSub(0.28, 120); }
              }
            }
          }
        }
        const energy = balls.reduce((acc, b) => acc + b.a * b.a + b.w * b.w * 0.12, 0);
        if (energy < 0.06) { balls[0].a = -0.78; balls[0].w = 0; }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        const fw = (N + 1.4) * r * 2, fx0 = w / 2 - fw * 0.5;
        const barG = c.createLinearGradient(0, topY - 8 * dpr, 0, topY + 8 * dpr);
        barG.addColorStop(0, 'rgba(255,255,255,0.3)'); barG.addColorStop(0.5, 'rgba(130,145,170,0.2)'); barG.addColorStop(1, 'rgba(20,24,32,0.55)');
        c.fillStyle = barG;
        c.beginPath(); c.roundRect ? c.roundRect(fx0, topY - 6 * dpr, fw, 12 * dpr, 6 * dpr) : c.rect(fx0, topY - 6 * dpr, fw, 12 * dpr); c.fill();

        // Live glossy table reflections & soft shadows beneath each sphere!
        const floorY = topY + len + r * 1.68;
        for (const b of balls) {
          const x = b.px + Math.sin(b.a) * len, y = topY + Math.cos(b.a) * len;
          const elev = Math.max(0, (floorY - (y + r)) / (r * 3));
          const reflAlpha = clamp(0.26 - elev * 0.18, 0.03, 0.26);
          const rg = c.createRadialGradient(x, floorY, 1, x, floorY, r * (1.05 + elev * 0.5));
          rg.addColorStop(0, pal.col(b.hue, reflAlpha));
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = rg;
          c.beginPath(); c.ellipse(x, floorY, r * (1.05 + elev * 0.5), r * 0.34, 0, 0, TAU); c.fill();
        }

        for (const b of balls) {
          const x = b.px + Math.sin(b.a) * len, y = topY + Math.cos(b.a) * len;
          c.strokeStyle = `rgba(255,255,255,${0.2 + b.flash * 0.35})`; c.lineWidth = 1.3 * dpr;
          c.beginPath(); c.moveTo(b.px, topY + 4 * dpr); c.lineTo(x, y); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.52)'; c.beginPath(); c.arc(b.px, topY, 2.2 * dpr, 0, TAU); c.fill();
          drawSphere(c, x, y, r, pal, b.hue, S.material === 'velvet' ? 'chrome' : S.material, true);
        }
        fx.draw(c, dpr);
      },
      interact(type) {
        if (type === 'down') {
          modeI = (modeI + 1) % 3;
          balls.forEach(b => { b.a = 0; b.w = 0; });
          if (modeI === 0) balls[0].a = -0.82;
          else if (modeI === 1) { balls[0].a = -0.8; balls[1].a = -0.8; }
          else { balls[0].a = -0.78; balls[1].a = -0.78; balls[N - 1].a = 0.78; }
          if (audio) KA.playClack(0, 0.75, 1.1);
        }
      },
      stat() { return `${clacks} clacks · Tap to switch pattern`; },
      done: false,
      get progress() { return (simT % 22) / 22; }
    };
  };

  /* --- 18. MARBLE RACE (With etched numbers & crisp obstacle flashes!) --- */
  SIMS.race = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const trackW = Math.min(w * 0.72, h * 0.62), ox = (w - trackW) * 0.5, mR = trackW * 0.034;
    const trackLen = h * 3.8, N = small ? 5 : 8;

    const marbles = Array.from({ length: N }, (_, i) => ({
      id: i + 1, x: ox + trackW * (0.14 + (i / (N - 1)) * 0.72), y: h * 0.14 + (i % 2) * mR * 2.2,
      vx: (Math.random() - 0.5) * 1.4, vy: 0, hue: i / N, trail: []
    }));

    const pegs = [], spinners = [], ramps = [];
    for (let y = h * 0.34; y < trackLen - h * 0.35; y += trackW * 0.42) {
      const stage = Math.floor(y / (trackW * 0.42)) % 3;
      if (stage === 0) {
        for (let k = 0; k < 5; k++) pegs.push({ x: ox + trackW * (0.14 + k / 4 * 0.72), y, r: mR * 0.82, flash: 0 });
      } else if (stage === 1) {
        spinners.push({ x: ox + trackW * 0.32, y, r: trackW * 0.17, ang: Math.random() * TAU, vel: 0.032 });
        spinners.push({ x: ox + trackW * 0.68, y, r: trackW * 0.17, ang: Math.random() * TAU, vel: -0.032 });
      } else {
        const dir = ((y | 0) % 2 === 0) ? 1 : -1;
        ramps.push({ x0: dir > 0 ? ox + trackW * 0.06 : ox + trackW * 0.94, y0: y - trackW * 0.08, x1: ox + trackW * (dir > 0 ? 0.62 : 0.38), y1: y + trackW * 0.08 });
      }
    }
    let camY = 0, winner = null, finaleT = 0, done = false;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }
        const sub = 5, sdt = dt * S.speed / sub, g = 0.25 * Math.max(0.35, S.grav) * (trackW / 320);

        for (let s = 0; s < sub; s++) {
          for (const sp of spinners) sp.ang = mod(sp.ang + sp.vel * sdt, TAU);
          for (const p of pegs) if (p.flash > 0.01) p.flash *= Math.pow(0.92, sdt);

          for (const m of marbles) {
            m.vy += g * sdt; m.x += m.vx * sdt; m.y += m.vy * sdt; m.vx *= Math.pow(0.996, sdt);
            if (m.x - mR < ox) { m.x = ox + mR; m.vx = Math.abs(m.vx) * 0.8; }
            if (m.x + mR > ox + trackW) { m.x = ox + trackW - mR; m.vx = -Math.abs(m.vx) * 0.8; }

            for (const p of pegs) {
              const dx = m.x - p.x, dy = m.y - p.y, md = mR + p.r, d2 = dx * dx + dy * dy;
              if (d2 < md * md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
                m.x = p.x + nx * md; m.y = p.y + ny * md;
                const vn = m.vx * nx + m.vy * ny;
                if (vn < 0) {
                  m.vx = (m.vx - 1.72 * vn * nx) + (Math.random() - 0.5) * 0.3; m.vy = (m.vy - 1.72 * vn * ny);
                  p.flash = 1;
                  fx.burst(p.x + nx * p.r, p.y + ny * p.r, pal.col(m.hue, 0.85), 3, 2.2 * dpr, 1.5);
                  if (audio && Math.random() < 0.4) KA.playClack((m.x / w - 0.5) * 1.2, 0.35, 1.3 + m.hue * 0.3);
                }
              }
            }
            for (const sp of spinners) {
              for (let arm = 0; arm < 2; arm++) {
                const a = sp.ang + arm * Math.PI * 0.5, ax = Math.cos(a) * sp.r, ay = Math.sin(a) * sp.r;
                const x0 = sp.x - ax, y0 = sp.y - ay, x1 = sp.x + ax, y1 = sp.y + ay;
                const ldx = x1 - x0, ldy = y1 - y0, u = clamp(((m.x - x0) * ldx + (m.y - y0) * ldy) / (ldx * ldx + ldy * ldy || 1), 0, 1);
                const cx2 = x0 + u * ldx, cy2 = y0 + u * ldy, dx = m.x - cx2, dy = m.y - cy2, md = mR + 4 * dpr, d2 = dx * dx + dy * dy;
                if (d2 < md * md && d2 > 0.001) {
                  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
                  m.x = cx2 + nx * md; m.y = cy2 + ny * md;
                  const vn = m.vx * nx + m.vy * ny;
                  if (vn < 0) {
                    m.vx -= 1.75 * vn * nx - ny * sp.vel * 42; m.vy -= 1.75 * vn * ny + nx * sp.vel * 42;
                    if (audio && Math.random() < 0.3) KA.playScale(m.id + 2, (m.x / w - 0.5) * 1.2, 0.3, { timbre: 'glass' });
                  }
                }
              }
            }
            for (const rp of ramps) {
              const ldx = rp.x1 - rp.x0, ldy = rp.y1 - rp.y0, u = clamp(((m.x - rp.x0) * ldx + (m.y - rp.y0) * ldy) / (ldx * ldx + ldy * ldy || 1), 0, 1);
              const cx2 = rp.x0 + u * ldx, cy2 = rp.y0 + u * ldy, dx = m.x - cx2, dy = m.y - cy2, md = mR + 4 * dpr, d2 = dx * dx + dy * dy;
              if (d2 < md * md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
                m.x = cx2 + nx * md; m.y = cy2 + ny * md;
                const vn = m.vx * nx + m.vy * ny;
                if (vn < 0) { m.vx -= 1.55 * vn * nx; m.vy -= 1.55 * vn * ny; }
              }
            }
            if (m.y >= trackLen - h * 0.2 && !winner) {
              winner = m; finaleT = 1.8;
              fx.burst(m.x, m.y, pal.col(m.hue, 0.95), 52, 5.5 * dpr, 2.8);
              if (audio) { KA.playSub(0.7, 92); KA.playChord(4, 0.88); }
            }
          }
          for (let i = 0; i < N; i++) {
            const a = marbles[i];
            for (let j = i + 1; j < N; j++) {
              const b = marbles[j], dx = b.x - a.x, dy = b.y - a.y, md = mR * 2, d2 = dx * dx + dy * dy;
              if (d2 < md * md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (md - d) * 0.5;
                a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
                const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (vn < 0) { a.vx += vn * nx * 0.9; a.vy += vn * ny * 0.9; b.vx -= vn * nx * 0.9; b.vy -= vn * ny * 0.9; }
              }
            }
          }
        }
        const leader = marbles.reduce((a, b) => b.y > a.y ? b : a, marbles[0]);
        this._leader = leader;
        camY = lerp(camY, Math.max(0, leader.y - h * 0.48), 0.1 * dt);
        const tLen = Math.round(5 + S.trail * 0.18);
        for (const m of marbles) { m.trail.push([m.x, m.y]); while (m.trail.length > tLen) m.trail.shift(); }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        c.save(); c.translate(0, -camY);
        c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2.2 * dpr;
        c.beginPath(); c.moveTo(ox, 0); c.lineTo(ox, trackLen); c.moveTo(ox + trackW, 0); c.lineTo(ox + trackW, trackLen); c.stroke();

        const fy = trackLen - h * 0.2;
        c.strokeStyle = pal.col(0.15, 0.8); c.lineWidth = 3 * dpr; c.setLineDash([8 * dpr, 8 * dpr]);
        c.beginPath(); c.moveTo(ox, fy); c.lineTo(ox + trackW, fy); c.stroke(); c.setLineDash([]);

        for (const p of pegs) {
          c.fillStyle = p.flash > 0.2 ? '#fff' : 'rgba(205,218,240,0.45)';
          c.beginPath(); c.arc(p.x, p.y, p.r * (1 + p.flash * 0.35), 0, TAU); c.fill();
        }
        c.lineCap = 'round';
        for (const sp of spinners) {
          c.strokeStyle = pal.col(0.5, 0.65); c.lineWidth = 5 * dpr;
          for (let arm = 0; arm < 2; arm++) {
            const a = sp.ang + arm * Math.PI * 0.5;
            c.beginPath(); c.moveTo(sp.x - Math.cos(a) * sp.r, sp.y - Math.sin(a) * sp.r); c.lineTo(sp.x + Math.cos(a) * sp.r, sp.y + Math.sin(a) * sp.r); c.stroke();
          }
          drawSphere(c, sp.x, sp.y, 5 * dpr, pal, 0.5, 'chrome', false);
        }
        for (const rp of ramps) {
          c.strokeStyle = 'rgba(220,232,250,0.5)'; c.lineWidth = 6 * dpr;
          c.beginPath(); c.moveTo(rp.x0, rp.y0); c.lineTo(rp.x1, rp.y1); c.stroke();
        }
        for (const m of marbles) {
          if (S.trail > 5) drawSilkTrail(c, m.trail, pal, m.hue, mR * 0.95, 0.3);
          drawSphere(c, m.x, m.y, mR, pal, m.hue, S.material, true);
          if (!small && mR > 7 * dpr) {
            c.fillStyle = 'rgba(255,255,255,0.9)';
            c.font = `600 ${Math.round(mR * 0.9)}px "DM Sans", sans-serif`;
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(m.id, m.x, m.y + 0.5);
          }
        }
        fx.draw(c, dpr);
        c.restore();
      },
      interact(type) { if (type === 'down') for (const m of marbles) m.vy -= 4; },
      stat() { return winner ? `Marble #${winner.id} wins!` : `Leader #${this._leader ? this._leader.id : 1} · ${Math.round(clamp((this._leader ? this._leader.y : 0) / (trackLen - h * 0.2), 0, 1) * 100)}%`; },
      get done() { return done; },
      get progress() { return clamp((this._leader ? this._leader.y : 0) / (trackLen - h * 0.2), 0, 1); }
    };
  };

  /* --- 19. PEG CASCADE (GALTON BOARD) --- */
  SIMS.galton = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const fx = makeFX(small);
    const rows = small ? 8 : 12, bins = rows + 1;
    const boardW = Math.min(w * 0.76, h * 0.7), spX = boardW / (rows + 1), spY = (h * 0.43) / rows;
    const topY = h * 0.16, binTop = topY + rows * spY + spY * 0.7, binH = h * 0.23;
    const pegR = Math.max(2.2 * dpr, spX * 0.13), beadR = Math.max(2.6 * dpr, spX * 0.16);
    const pegs = [];
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 <= r; c2++) pegs.push({ x: w / 2 + (c2 - r * 0.5) * spX, y: topY + r * spY, flash: 0, hue: r / rows });
    const counts = new Float32Array(bins), binFlash = new Float32Array(bins), beads = [];
    const targetBeads = small ? 80 : 210;
    let landed = 0, spawnAcc = 0, nozzleX = w / 2, finaleT = 0, done = false;

    const spawnBead = () => {
      if (landed + beads.length >= targetBeads && !small) return;
      beads.push({ x: nozzleX + (Math.random() - 0.5) * spX * 0.18, y: topY - spY * 0.85, vx: (Math.random() - 0.5) * 0.4, vy: 0.4, hue: (landed + beads.length) / targetBeads });
    };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        nozzleX = ptr && ptr.down ? lerp(nozzleX, clamp(ptr.x, w / 2 - boardW * 0.36, w / 2 + boardW * 0.36), 0.18) : lerp(nozzleX, w / 2, 0.04);
        for (const p of pegs) if (p.flash > 0.01) p.flash *= Math.pow(0.84, dt);
        for (let i = 0; i < bins; i++) if (binFlash[i] > 0.01) binFlash[i] *= Math.pow(0.88, dt);
        if (finaleT > 0) { finaleT -= dt / 60; if (finaleT <= 0) done = true; return; }

        spawnAcc += dt * S.speed * (ptr && ptr.down ? 0.85 : 0.35);
        while (spawnAcc >= 1) { spawnBead(); spawnAcc -= 1; }
        const sub = 3, sdt = dt * S.speed / sub, g = 0.24 * Math.max(0.35, S.grav) * (spY / 28);

        for (let s = 0; s < sub; s++) {
          for (let i = beads.length - 1; i >= 0; i--) {
            const b = beads[i];
            b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
            for (const p of pegs) {
              const dx = b.x - p.x, dy = b.y - p.y, md = beadR + pegR, d2 = dx * dx + dy * dy;
              if (d2 < md * md && d2 > 0.001) {
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
                b.x = p.x + nx * md; b.y = p.y + ny * md;
                const dot = b.vx * nx + b.vy * ny;
                if (dot < 0) {
                  b.vx = (b.vx - 1.55 * dot * nx) * 0.72 + (Math.random() - 0.5) * 0.55;
                  b.vy = (b.vy - 1.55 * dot * ny) * 0.65;
                  p.flash = 1;
                  if (audio && Math.random() < 0.42) KA.playScale(Math.floor(p.hue * 12) + 4, (p.x / w - 0.5) * 1.4, 0.25, { rate: 26, timbre: 'glass' });
                }
              }
            }
            if (b.y >= binTop) {
              const bi = clamp(Math.floor((b.x - (w / 2 - bins * spX * 0.5)) / spX), 0, bins - 1);
              counts[bi]++; binFlash[bi] = 1; landed++;
              fx.burst(b.x, binTop, pal.col(bi / bins, 0.9), 3, 2 * dpr, 1.6);
              beads.splice(i, 1);
              if (landed >= targetBeads) { finaleT = 1.8; if (audio) KA.playChord(0, 0.8); }
            }
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        drawSphere(c, nozzleX, topY - spY * 0.9, beadR * 1.2, pal, 0.1, S.material, false);
        for (const p of pegs) {
          c.fillStyle = p.flash > 0.2 ? '#fff' : pal.col(p.hue, 0.42 + p.flash * 0.55);
          c.beginPath(); c.arc(p.x, p.y, pegR * (1 + p.flash * 0.55), 0, TAU); c.fill();
        }
        const maxC = Math.max(12, ...counts), startX = w / 2 - bins * spX * 0.5;
        for (let i = 0; i < bins; i++) {
          const bh = (counts[i] / maxC) * binH;
          if (bh > 1) drawBevelRect(c, startX + i * spX + spX * 0.14, binTop + binH - bh, spX * 0.72, bh, pal, i / bins, 0.62 + binFlash[i] * 0.35, binFlash[i], 3);
        }
        if (landed > 12) {
          c.strokeStyle = 'rgba(255,255,255,0.62)'; c.lineWidth = 1.8 * dpr;
          c.beginPath();
          for (let i = 0; i < bins; i++) {
            const bx = startX + (i + 0.5) * spX, by = binTop + binH - (counts[i] / maxC) * binH;
            i ? c.lineTo(bx, by) : c.moveTo(bx, by);
          }
          c.stroke();
        }
        for (const b of beads) drawSphere(c, b.x, b.y, beadR, pal, b.hue, S.material, false);
        fx.draw(c, dpr);
      },
      interact(type, x) { if (type === 'down') { nozzleX = clamp(x, w / 2 - boardW * 0.36, w / 2 + boardW * 0.36); spawnBead(); } },
      stat() { return `${landed}/${targetBeads} beads`; },
      get done() { return done; },
      get progress() { return clamp(landed / targetBeads, 0, 1); }
    };
  };

  /* --- 20. DOMINO SPIRAL (With soft 3D cast drop shadows!) --- */
  SIMS.domino = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.43;
    const fx = makeFX(small);
    const N = small ? 60 : 144;
    const tiles = Array.from({ length: N }, (_, i) => {
      const f = i / (N - 1), ang = f * TAU * 4.5, r = lerp(R * 0.12, R, f);
      return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, ang: ang + Math.PI * 0.5, hue: f, fall: 0, lit: 0 };
    });
    let head = 0, dir = 1, simT = 0, lastHit = -1;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        head += dt * 0.58 * S.speed * dir;
        if (head >= N + 18) dir = -1; else if (head <= -18) dir = 1;
        const ci = clamp(Math.floor(head), 0, N - 1);
        if (ci !== lastHit && head >= 0 && head < N) {
          lastHit = ci;
          const tl = tiles[ci]; tl.lit = 1;
          fx.burst(tl.x, tl.y, pal.col(tl.hue, 0.9), 3, 2.4 * dpr, 1.6);
          if (audio) KA.playScale(Math.floor(tl.hue * 16), (tl.x / w - 0.5) * 1.4, 0.34, { rate: 28, timbre: 'marimba' });
        }
        for (let i = 0; i < N; i++) {
          const tl = tiles[i];
          tl.fall = lerp(tl.fall, dir > 0 ? (i <= head ? 1 : 0) : (i >= head ? 0 : 1), 0.2 * dt);
          tl.lit *= Math.pow(0.9, dt);
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        const tw = Math.max(4 * dpr, R * 0.03), th = Math.max(10 * dpr, R * 0.088);
        for (const tl of tiles) {
          c.save(); c.translate(tl.x, tl.y); c.rotate(tl.ang);
          const tilt = Math.cos(tl.fall * 1.18), hDraw = Math.max(2.5 * dpr, th * tilt);
          // 3D cast drop shadow underneath tile
          c.fillStyle = 'rgba(0,0,0,0.42)';
          c.fillRect(-tw * 0.5 + 2.5 * dpr, -hDraw * 0.5 + 3.5 * dpr, tw, hDraw);
          drawBevelRect(c, -tw * 0.5, -hDraw * 0.5, tw, hDraw, pal, tl.hue, 0.42 + tl.fall * 0.5, tl.lit, 2);
          c.restore();
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down') {
          let best = 0, bd = 1e9;
          tiles.forEach((tl, i) => { const d = Math.hypot(tl.x - x, tl.y - y); if (d < bd) { bd = d; best = i; } });
          head = best; dir = -dir;
          fx.wave(x, y, pal.col(0.5, 0.8), 6, R * 0.24, 1.8, 0.5);
          if (audio) KA.playClack((x / w - 0.5) * 1.3, 0.7, 1.15);
        }
      },
      stat() { return `Wave ${Math.round(clamp(head / N, 0, 1) * 100)}% · ${N} tiles`; },
      done: false,
      get progress() { return (simT % 20) / 20; }
    };
  };

  /* --- 21. WATER RIPPLE TANK (Dual-light studio caustics + droplet crowns!) --- */
  SIMS.ripples = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const GW = small ? 76 : 156, GH = small ? 58 : Math.round(156 * (h / Math.max(1, w)));
    let cur = new Float32Array(GW * GH), prev = new Float32Array(GW * GH);
    const buf = document.createElement('canvas'); buf.width = GW; buf.height = GH;
    const bctx = buf.getContext('2d'), img = bctx.createImageData(GW, GH);
    const fx = makeFX(small);
    let simT = 0, dropT = 0, drops = 0;

    const dropAt = (gx, gy, str = 1.6, rad = 3, pal = null) => {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const px = gx + dx, py = gy + dy;
        if (px > 1 && px < GW - 2 && py > 1 && py < GH - 2) {
          const d = Math.hypot(dx, dy);
          if (d <= rad) cur[py * GW + px] += Math.cos((d / rad) * Math.PI * 0.5) * str;
        }
      }
      drops++;
      if (pal) fx.wave((gx / GW) * w, (gy / GH) * h, pal.col(0.05, 0.55), 2, 34 * dpr, 1.4, 0.45);
    };
    dropAt(GW >> 1, GH >> 1, 2.2, 4);

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed; dropT += (dt / 60) * S.speed;
        if (dropT > (small ? 0.85 : 0.72)) {
          dropT = 0;
          const gx = Math.floor(GW * (0.18 + Math.random() * 0.64)), gy = Math.floor(GH * (0.18 + Math.random() * 0.64));
          dropAt(gx, gy, 1.85, 3, pal);
          if (audio) KA.playWaterDrop((gx / GW - 0.5) * 1.4, 0.75 + Math.random() * 0.85, 0.65);
        }
        if (ptr && ptr.down) dropAt(clamp(Math.floor(ptr.x / w * GW), 2, GW - 3), clamp(Math.floor(ptr.y / h * GH), 2, GH - 3), 0.9, 3);
        const damp = 0.98;
        const steps = S.speed > 1.3 ? 2 : 1;
        for (let st = 0; st < steps; st++) {
          const next = new Float32Array(GW * GH);
          for (let y = 1; y < GH - 1; y++) {
            const row = y * GW;
            for (let x = 1; x < GW - 1; x++) {
              const i = row + x;
              next[i] = ((cur[i - 1] + cur[i + 1] + cur[i - GW] + cur[i + GW]) * 0.5 - prev[i]) * damp;
            }
          }
          prev = cur; cur = next;
        }
      },
      draw(c, t, pal) {
        const d = img.data, base = pal.rgb(0.28), hi = pal.rgb(0.04), rim = pal.rgb(0.65), deep = pal.rgb(0.8);
        for (let y = 1; y < GH - 1; y++) {
          const row = y * GW;
          for (let x = 1; x < GW - 1; x++) {
            const i = row + x, dx = cur[i + 1] - cur[i - 1], dy = cur[i + GW] - cur[i - GW];
            const light = clamp(0.18 + (-dx - dy) * 0.68, 0, 1);
            const spec = Math.pow(clamp((-dx - dy) * 0.58, 0, 1), 2.8);
            const bounce = clamp((dx + dy) * 0.42, 0, 0.5);
            const o = i * 4;
            d[o]     = clamp(deep[0] * 0.12 + base[0] * light * 0.62 + hi[0] * spec * 1.2 + rim[0] * bounce * 0.35, 0, 255);
            d[o + 1] = clamp(deep[1] * 0.12 + base[1] * light * 0.62 + hi[1] * spec * 1.2 + rim[1] * bounce * 0.35, 0, 255);
            d[o + 2] = clamp(deep[2] * 0.15 + base[2] * light * 0.62 + hi[2] * spec * 1.2 + rim[2] * bounce * 0.35, 0, 255);
            d[o + 3] = 255;
          }
        }
        bctx.putImageData(img, 0, 0);
        c.imageSmoothingEnabled = true; c.drawImage(buf, 0, 0, w, h);
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down') {
          dropAt(clamp(Math.floor(x / w * GW), 2, GW - 3), clamp(Math.floor(y / h * GH), 2, GH - 3), 2.4, 4, pal);
          if (audio) KA.playWaterDrop((x / w - 0.5) * 1.4, 0.9 + Math.random() * 0.5, 0.8);
        }
      },
      stat() { return `${drops} droplets · Tap to ripple`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 22. DOUBLE PENDULUM CHAOS FAN --- */
  SIMS.doublepend = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.44, L1 = Math.min(w, h) * 0.21, L2 = Math.min(w, h) * 0.2, N = small ? 6 : 12;
    let pends = [], simT = 0, lastChime = 0;

    const resetFan = (a1 = 2.38, a2 = 2.15) => {
      pends = Array.from({ length: N }, (_, i) => ({ a1: a1 + i * 0.0012, a2: a2 + i * 0.0012, w1: 0, w2: 0, hue: i / Math.max(1, N - 1), trail: [] }));
      simT = 0;
    };
    resetFan();

    const deriv = (a1, a2, w1, w2, g) => {
      const d = a1 - a2, sinD = Math.sin(d), cosD = Math.cos(d), den = 3 - Math.cos(2 * d);
      const dw1 = (-3 * g * Math.sin(a1) - g * Math.sin(a1 - 2 * a2) - 2 * sinD * (w2 * w2 + w1 * w1 * cosD)) / den;
      const dw2 = (2 * sinD * (2 * w1 * w1 + 2 * g * Math.cos(a1) + w2 * w2 * cosD)) / den;
      return [w1, w2, dw1, dw2];
    };

    return {
      step(dt) {
        const g = 9.8 * Math.max(0.2, S.grav), sub = 6, hStep = (dt / 60) * S.speed * 0.85 / sub;
        simT += (dt / 60) * S.speed;
        const tLen = Math.round(16 + S.trail * 1.0);
        for (let s = 0; s < sub; s++) {
          for (const p of pends) {
            const k1 = deriv(p.a1, p.a2, p.w1, p.w2, g);
            const k2 = deriv(p.a1 + k1[0] * hStep * 0.5, p.a2 + k1[1] * hStep * 0.5, p.w1 + k1[2] * hStep * 0.5, p.w2 + k1[3] * hStep * 0.5, g);
            const k3 = deriv(p.a1 + k2[0] * hStep * 0.5, p.a2 + k2[1] * hStep * 0.5, p.w1 + k2[2] * hStep * 0.5, p.w2 + k2[3] * hStep * 0.5, g);
            const k4 = deriv(p.a1 + k3[0] * hStep, p.a2 + k3[1] * hStep, p.w1 + k3[2] * hStep, p.w2 + k3[3] * hStep, g);
            p.a1 += (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * hStep / 6;
            p.a2 += (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * hStep / 6;
            p.w1 += (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * hStep / 6;
            p.w2 += (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]) * hStep / 6;
          }
        }
        for (const p of pends) {
          p.x1 = cx + Math.sin(p.a1) * L1; p.y1 = cy + Math.cos(p.a1) * L1;
          p.x2 = p.x1 + Math.sin(p.a2) * L2; p.y2 = p.y1 + Math.cos(p.a2) * L2;
          p.trail.push([p.x2, p.y2]); while (p.trail.length > tLen) p.trail.shift();
        }
        if (audio && simT - lastChime > 0.28 && Math.abs(pends[0].w2) > 4) {
          lastChime = simT;
          KA.playScale(14 - clamp(Math.floor(pends[0].y2 / h * 12), 0, 14), (pends[0].x2 / w - 0.5) * 1.4, 0.3, { timbre: 'glass' });
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        for (const p of pends) if (S.trail > 3) drawSilkTrail(c, p.trail, pal, p.hue, 3.2 * dpr, 0.45, 0);
        c.lineCap = 'round';
        for (const p of pends) {
          c.strokeStyle = pal.col(p.hue, 0.56); c.lineWidth = 2 * dpr;
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(p.x1, p.y1); c.lineTo(p.x2, p.y2); c.stroke();
          drawSphere(c, p.x2, p.y2, 4.8 * dpr, pal, p.hue, S.material, false);
        }
        drawSphere(c, cx, cy, 4.4 * dpr, pal, 0.1, 'chrome', false);
      },
      interact(type, x, y) { if (type === 'down') { const a = Math.atan2(x - cx, y - cy); resetFan(a, a * 0.9); if (audio) KA.playChord(3, 0.55); } },
      stat() { return `Spread ${clamp(Math.round(Math.hypot(pends[0].x2 - pends[N - 1].x2, pends[0].y2 - pends[N - 1].y2) / (L1 + L2) * 100), 0, 100)}%`; },
      done: false,
      get progress() { return (simT % 28) / 28; }
    };
  };

  /* --- 23. SAND HOURGLASS (With shimmering mineral grain variation!) --- */
  SIMS.sand = (w, h, opts) => {
    const { small, audio, S } = opts;
    const GW = small ? 72 : 140, GH = small ? 54 : 140;
    const grid = new Uint16Array(GW * GH);
    const grainShade = new Float32Array(GW * GH);
    const buf = document.createElement('canvas'); buf.width = GW; buf.height = GH;
    const bctx = buf.getContext('2d'), img = bctx.createImageData(GW, GH);
    const size = Math.min(w, h) * 0.8, ox = (w - size) / 2, oy = (h - size) / 2;

    const buildBaffles = () => {
      grid.fill(0); grainShade.fill(1);
      const line = (x0, y0, x1, y1) => {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
        for (let i = 0; i <= steps; i++) {
          const gx = Math.round(lerp(x0, x1, i / steps)), gy = Math.round(lerp(y0, y1, i / steps));
          for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
            const px = gx + dx, py = gy + dy;
            if (px >= 0 && px < GW && py >= 0 && py < GH) grid[py * GW + px] = 1;
          }
        }
      };
      line(GW * 0.14, GH * 0.28, GW * 0.44, GH * 0.40);
      line(GW * 0.86, GH * 0.28, GW * 0.56, GH * 0.40);
      line(GW * 0.30, GH * 0.62, GW * 0.50, GH * 0.52);
      line(GW * 0.70, GH * 0.62, GW * 0.50, GH * 0.52);
    };
    buildBaffles();
    let simT = 0, grains = 0, hueTick = 2, noteAcc = 0, done = false;

    const pour = (gx, gy, rad = 2) => {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad + 1) continue;
        const px = gx + dx, py = gy + dy;
        if (px > 1 && px < GW - 2 && py > 1 && py < GH - 2 && grid[py * GW + px] === 0 && Math.random() < 0.72) {
          const idx = py * GW + px;
          grid[idx] = 2 + (Math.floor(hueTick) % 64);
          grainShade[idx] = 0.82 + Math.random() * 0.32;
          grains++;
        }
      }
    };

    return {
      step(dt, t, ptr) {
        simT += (dt / 60) * S.speed; hueTick += dt * 0.14 * S.speed;
        pour(Math.round(GW * (0.5 + 0.26 * Math.sin(simT * 0.85))), 3, small ? 1 : 2);
        if (ptr && ptr.down) pour(Math.floor((ptr.x - ox) / size * GW), Math.floor((ptr.y - oy) / size * GH), small ? 2 : 3);
        const steps = Math.max(1, Math.round(2 * S.speed * Math.max(0.4, S.grav)));
        let moved = 0;
        for (let st = 0; st < steps; st++) {
          const dir = (st + Math.floor(simT * 60)) & 1 ? 1 : -1;
          for (let y = GH - 2; y >= 0; y--) {
            for (let xi = 0; xi < GW; xi++) {
              const x = dir > 0 ? xi : GW - 1 - xi, i = y * GW + x, v = grid[i];
              if (v < 2) continue;
              const sh = grainShade[i], below = (y + 1) * GW + x;
              if (grid[below] === 0) { grid[below] = v; grainShade[below] = sh; grid[i] = 0; moved++; }
              else {
                const d1 = Math.random() < 0.5 ? -1 : 1;
                if (x + d1 >= 0 && x + d1 < GW && grid[below + d1] === 0) { grid[below + d1] = v; grainShade[below + d1] = sh; grid[i] = 0; moved++; }
                else if (x - d1 >= 0 && x - d1 < GW && grid[below - d1] === 0) { grid[below - d1] = v; grainShade[below - d1] = sh; grid[i] = 0; moved++; }
              }
            }
          }
        }
        noteAcc += dt * (moved > 10 ? 1 : 0);
        if (audio && noteAcc > 9 && moved > 20) {
          noteAcc = 0;
          KA.playScale(6 + ((Math.floor(hueTick / 3)) % 10), Math.sin(simT * 0.85) * 0.65, 0.22, { rate: 14, timbre: 'kalimba' });
        }
        if (grains > GW * GH * 0.44) { if (S.autorun) done = true; else { buildBaffles(); grains = 0; } }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.04);
        const d = img.data;
        for (let i = 0; i < grid.length; i++) {
          const v = grid[i], o = i * 4;
          if (v === 0) { d[o] = 9; d[o + 1] = 11; d[o + 2] = 16; d[o + 3] = 255; }
          else if (v === 1) { d[o] = 175; d[o + 1] = 190; d[o + 2] = 215; d[o + 3] = 255; }
          else {
            const rgb = pal.rgb((v - 2) / 64), s = grainShade[i];
            d[o] = clamp(rgb[0] * s, 0, 255); d[o + 1] = clamp(rgb[1] * s, 0, 255); d[o + 2] = clamp(rgb[2] * s, 0, 255); d[o + 3] = 255;
          }
        }
        bctx.putImageData(img, 0, 0);
        c.imageSmoothingEnabled = false;
        c.drawImage(buf, ox, oy, size, size);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.strokeRect(ox, oy, size, size);
      },
      interact() {},
      stat() { return `${grains} grains`; },
      get done() { return done; },
      get progress() { return clamp(grains / (GW * GH * 0.44), 0, 1); }
    };
  };

  /* --- 24. CAUSTIC CHAMBER (Dual counter-sweeping harmonic beams!) --- */
  SIMS.laser = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    let simT = 0, lastRes = 0, rays = small ? 36 : 74;
    return {
      step(dt, t, ptr) {
        simT += (dt / 60) * S.speed;
        const stepAng = ptr && ptr.in ? lerp(0.18, Math.PI * 0.96, clamp(ptr.x / w, 0, 1)) : (0.24 + (simT * 0.085) % (Math.PI * 0.85));
        const nearest = Math.round((stepAng / Math.PI) * 12);
        if (audio && nearest !== lastRes && Math.abs((stepAng / Math.PI) * 12 - nearest) < 0.04) {
          lastRes = nearest;
          KA.playScale(nearest + 3, (stepAng / Math.PI - 0.5) * 1.2, 0.36, { timbre: 'glass' });
        }
      },
      draw(c, t, pal, ptr) {
        fillStudioBg(c, w, h, pal, 0.045);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.2, 0, 0, TAU, !small);
        const stepAng = ptr && ptr.in ? lerp(0.18, Math.PI * 0.96, clamp(ptr.x / w, 0, 1)) : (0.24 + (simT * 0.085) % (Math.PI * 0.85));
        c.save(); c.lineWidth = (small ? 1 : 1.35) * dpr;
        let a = simT * 0.14;
        for (let i = 0; i < rays; i++) {
          const aNext = a + stepAng * 2, f = i / rays;
          const x1 = cx + Math.cos(aNext) * R, y1 = cy + Math.sin(aNext) * R;
          c.strokeStyle = pal.col(f * 0.9 + simT * 0.04, 0.42 * (1 - f * 0.35));
          c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(x1, y1); c.stroke();
          if (i % 2 === 0) { c.fillStyle = pal.col(f, 0.72); c.beginPath(); c.arc(x1, y1, 1.8 * dpr, 0, TAU); c.fill(); }
          a = aNext;
        }
        c.restore();
      },
      interact(type) { if (type === 'down' && audio) KA.playScale(8, 0, 0.45, { timbre: 'glass' }); },
      stat() { return `${rays} reflections`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 25. ORBITAL SLINGSHOT (With gravity-well contour rings!) --- */
  SIMS.gravity = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const fx = makeFX(small), comets = [];
    let simT = 0, dragStart = null, dragNow = null;
    const addComet = (x, y, vx, vy, hue) => {
      if (comets.length >= (small ? 8 : 20)) comets.shift();
      comets.push({ x, y, vx, vy, hue, trail: [], prevD: 9999, approaching: true });
    };
    const initN = small ? 5 : 10;
    for (let i = 0; i < initN; i++) {
      const a = i / initN * TAU, dist = R * (0.48 + (i % 3) * 0.2), v = Math.sqrt(1800 / dist) * (0.72 + (i % 2) * 0.34);
      addComet(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, -Math.sin(a) * v, Math.cos(a) * v, i / initN);
    }

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        simT += (dt / 60) * S.speed;
        const sep = R * 0.16;
        const stars = [
          { x: cx + Math.cos(simT * 0.7) * sep, y: cy + Math.sin(simT * 0.7) * sep, m: 950 * Math.max(0.25, S.grav) },
          { x: cx - Math.cos(simT * 0.7) * sep, y: cy - Math.sin(simT * 0.7) * sep, m: 950 * Math.max(0.25, S.grav) }
        ];
        const sub = 4, sdt = dt * S.speed / sub, tLen = Math.round(22 + S.trail * 1.0);
        for (let s = 0; s < sub; s++) {
          for (const cm of comets) {
            let ax = 0, ay = 0, minD = 9999;
            for (const st of stars) {
              const dx = st.x - cm.x, dy = st.y - cm.y, d2 = dx * dx + dy * dy + 720 * dpr * dpr, d = Math.sqrt(d2);
              minD = Math.min(minD, d);
              const f = st.m * (R / 280) / (d2 * d); ax += dx * f; ay += dy * f;
            }
            cm.vx += ax * sdt; cm.vy += ay * sdt; cm.x += cm.vx * sdt; cm.y += cm.vy * sdt;
            if (Math.hypot(cm.x - cx, cm.y - cy) > R * 1.38) { cm.vx *= 0.96; cm.vy *= 0.96; }
            if (minD > cm.prevD && cm.approaching && minD < R * 0.4) {
              cm.approaching = false;
              fx.wave(cm.x, cm.y, pal.col(cm.hue, 0.85), 3, 24 * dpr, 1.4, 0.45);
              if (audio) KA.playScale(Math.floor(cm.hue * 12) + 2, (cm.x / w - 0.5) * 1.4, 0.28, { rate: 16, timbre: 'glass' });
            } else if (minD < cm.prevD) cm.approaching = true;
            cm.prevD = minD;
          }
        }
        for (const cm of comets) { cm.trail.push([cm.x, cm.y]); while (cm.trail.length > tLen) cm.trail.shift(); }
        this._stars = stars;
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.05);
        // Subtle gravity contour circles
        c.strokeStyle = 'rgba(255,255,255,0.04)'; c.lineWidth = 1 * dpr;
        for (let k = 1; k <= 4; k++) { c.beginPath(); c.arc(cx, cy, R * 0.28 * k, 0, TAU); c.stroke(); }

        for (const cm of comets) {
          if (S.trail > 3) drawSilkTrail(c, cm.trail, pal, cm.hue, 3.2 * dpr, 0.48, 0.08);
          drawSphere(c, cm.x, cm.y, 4.8 * dpr, pal, cm.hue, S.material, false);
        }
        for (const st of (this._stars || [])) drawSphere(c, st.x, st.y, 11 * dpr, pal, 0.08, 'velvet', false);
        if (dragStart && dragNow) {
          c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.6 * dpr; c.setLineDash([4 * dpr, 4 * dpr]);
          c.beginPath(); c.moveTo(dragStart.x, dragStart.y); c.lineTo(dragNow.x, dragNow.y); c.stroke(); c.setLineDash([]);
        }
        fx.draw(c, dpr);
      },
      interact(type, x, y, pal) {
        if (type === 'down') { dragStart = { x, y }; dragNow = { x, y }; }
        else if (type === 'move' && dragStart) dragNow = { x, y };
        else if (type === 'up' && dragStart) {
          const vx = (dragStart.x - x) * 0.045, vy = (dragStart.y - y) * 0.045;
          if (Math.hypot(vx, vy) < 0.8) {
            const a = Math.atan2(dragStart.y - cy, dragStart.x - cx), dist = Math.max(40, Math.hypot(dragStart.x - cx, dragStart.y - cy)), v = Math.sqrt(1800 / dist);
            addComet(dragStart.x, dragStart.y, -Math.sin(a) * v, Math.cos(a) * v, Math.random());
          } else addComet(dragStart.x, dragStart.y, clamp(vx, -12, 12), clamp(vy, -12, 12), Math.random());
          fx.wave(dragStart.x, dragStart.y, pal.col(0.4, 0.85), 4, 30 * dpr, 1.8, 0.5);
          if (audio) KA.playClack((dragStart.x / w - 0.5) * 1.4, 0.5, 1.4);
          dragStart = dragNow = null;
        }
      },
      stat() { return `${comets.length} comets · Drag to launch`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 26. MURMURATION --- */
  SIMS.boids = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const N = small ? 65 : 210, R = Math.min(w, h) * 0.44;
    const boids = Array.from({ length: N }, (_, i) => {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R;
      return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, vx: Math.cos(a + 1.5) * 3, vy: Math.sin(a + 1.5) * 3, hue: i / N, trail: [] };
    });
    let simT = 0, noteAcc = 0;

    return {
      step(dt, t, ptr) {
        simT += (dt / 60) * S.speed;
        const maxSpd = (small ? 2.6 : 4.1) * dpr * S.speed, rad = (small ? 34 : 56) * dpr, sepR = rad * 0.42;
        const tLen = Math.round(4 + S.trail * 0.14);
        const ax = ptr && ptr.in ? ptr.x : w / 2 + Math.cos(simT * 0.55) * R * 0.52;
        const ay = ptr && ptr.in ? ptr.y : h / 2 + Math.sin(simT * 0.82) * R * 0.42;

        for (let i = 0; i < N; i++) {
          const b = boids[i];
          let sx = 0, sy = 0, alx = 0, aly = 0, cohx = 0, cohy = 0, cnt = 0;
          for (let j = 0; j < N; j++) {
            if (i === j) continue;
            const o = boids[j], dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < rad * rad && d2 > 0.01) {
              cnt++; alx += o.vx; aly += o.vy; cohx += o.x; cohy += o.y;
              if (d2 < sepR * sepR) { const d = Math.sqrt(d2); sx -= dx / d; sy -= dy / d; }
            }
          }
          if (cnt) {
            b.vx += (sx * 0.16 + (alx / cnt - b.vx) * 0.045 + (cohx / cnt - b.x) * 0.0018) * dt;
            b.vy += (sy * 0.16 + (aly / cnt - b.vy) * 0.045 + (cohy / cnt - b.y) * 0.0018) * dt;
          }
          const adx = ax - b.x, ady = ay - b.y, ad = Math.hypot(adx, ady) + 1, pull = ptr && ptr.down ? 0.24 : 0.075;
          b.vx += (adx / ad * pull - ady / ad * pull * 0.65) * dt * dpr;
          b.vy += (ady / ad * pull + adx / ad * pull * 0.65) * dt * dpr;
          const m = 36 * dpr;
          if (b.x < m) b.vx += 0.35 * dpr; else if (b.x > w - m) b.vx -= 0.35 * dpr;
          if (b.y < m) b.vy += 0.35 * dpr; else if (b.y > h - m) b.vy -= 0.35 * dpr;
          const sp = Math.hypot(b.vx, b.vy) || 1, cl = clamp(sp, maxSpd * 0.45, maxSpd);
          b.vx = b.vx / sp * cl; b.vy = b.vy / sp * cl; b.x += b.vx * dt; b.y += b.vy * dt;
          b.hue = mod(Math.atan2(b.vy, b.vx) / TAU + 0.5, 1);
          b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
        }
        noteAcc += dt;
        if (audio && noteAcc > 28) {
          noteAcc = 0;
          const b = boids[(Math.random() * N) | 0];
          KA.playScale(Math.floor(b.hue * 12) + 4, (b.x / w - 0.5) * 1.4, 0.25, { timbre: 'glass' });
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.lineCap = 'round';
        for (const b of boids) {
          if (b.trail.length > 1) {
            c.strokeStyle = pal.col(b.hue, 0.55); c.lineWidth = (small ? 1.4 : 2.0) * dpr;
            c.beginPath(); c.moveTo(b.trail[0][0], b.trail[0][1]);
            for (let k = 1; k < b.trail.length; k++) c.lineTo(b.trail[k][0], b.trail[k][1]);
            c.stroke();
          }
          c.fillStyle = 'rgba(255,255,255,0.82)';
          c.beginPath(); c.arc(b.x, b.y, (small ? 1.2 : 1.8) * dpr, 0, TAU); c.fill();
        }
      },
      interact(type) { if (type === 'down' && audio) KA.playChord(2, 0.45); },
      stat() { return `${N} starlings · Move to lead`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 27. SILK MESH (With autonomous gliding ripple orb!) --- */
  SIMS.cloth = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cols = small ? 13 : 24, rows = small ? 10 : 17;
    const mw = Math.min(w * 0.72, h * 0.84), mh = mw * (rows / cols) * 0.86;
    const ox = (w - mw) / 2, oy = (h - mh) * 0.42, sx = mw / (cols - 1), sy = mh / (rows - 1);
    const pts = [], links = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = ox + x * sx, py = oy + y * sy;
      pts.push({ x: px, y: py, ox: px, oy: py, pin: y === 0 && (x % 3 === 0 || x === cols - 1) });
    }
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x < cols - 1) links.push([i, i + 1, sx]);
      if (y < rows - 1) links.push([i, i + cols, sy]);
    }
    let simT = 0, noteAcc = 0;

    return {
      step(dt, t, ptr) {
        simT += (dt / 60) * S.speed;
        const g = 0.28 * S.grav * dpr, wind = Math.sin(simT * 1.4) * 0.14 * dpr;
        // Gentle autonomous orb sweeping across the mesh when idle
        const gx = ptr && ptr.in ? ptr.x : w * 0.5 + Math.sin(simT * 0.9) * mw * 0.36;
        const gy = ptr && ptr.in ? ptr.y : oy + mh * 0.54 + Math.cos(simT * 1.35) * mh * 0.22;
        this._gx = gx; this._gy = gy;

        for (const p of pts) {
          if (p.pin) continue;
          const vx = (p.x - p.ox) * 0.985, vy = (p.y - p.oy) * 0.985;
          p.ox = p.x; p.oy = p.y;
          p.x += vx + wind + Math.sin(simT * 2.4 + p.x * 0.014 + p.y * 0.01) * 0.12 * dpr;
          p.y += vy + g;
          const dx = p.x - gx, dy = p.y - gy, d = Math.hypot(dx, dy);
          const R = (ptr && ptr.down ? 95 : 54) * dpr;
          if (d < R && d > 1) {
            const push = (1 - d / R) * (ptr && ptr.down ? 12 : 3.2) * dpr;
            p.x += dx / d * push; p.y += dy / d * push;
          }
        }
        for (let it = 0; it < 5; it++) for (const lk of links) {
          const a = pts[lk[0]], b = pts[lk[1]], rest = lk[2], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, diff = (d - rest) / d * 0.5;
          if (!a.pin) { a.x += dx * diff; a.y += dy * diff; }
          if (!b.pin) { b.x -= dx * diff; b.y -= dy * diff; }
        }
        noteAcc += dt;
        if (audio && ptr && ptr.down && noteAcc > 10) {
          noteAcc = 0;
          KA.playScale(Math.floor((1 - ptr.y / h) * 12) + 2, (ptr.x / w - 0.5) * 1.4, 0.34, { timbre: 'kalimba' });
        }
      },
      draw(c, t, pal, ptr) {
        fillStudioBg(c, w, h, pal, 0.045);
        c.lineWidth = (small ? 1 : 1.4) * dpr;
        for (const lk of links) {
          const a = pts[lk[0]], b = pts[lk[1]], rest = lk[2];
          const stretch = clamp((Math.hypot(b.x - a.x, b.y - a.y) - rest) / (rest * 0.45), 0, 1);
          c.strokeStyle = pal.col(clamp((lk[0] / pts.length) * 0.75 + stretch * 0.35, 0, 1), 0.36 + stretch * 0.54);
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        }
        for (const p of pts) if (p.pin) drawSphere(c, p.x, p.y, 3.4 * dpr, pal, 0.2, 'chrome', false);
        if (!ptr || !ptr.in) drawSphere(c, this._gx || w * 0.5, this._gy || h * 0.5, 7 * dpr, pal, 0.1, S.material, false);
      },
      interact(type, x, y) {
        if (type === 'down') {
          for (const p of pts) if (!p.pin) { const dx = p.x - x, dy = p.y - y; if (Math.hypot(dx, dy) < 120 * dpr) { p.ox -= dx * 0.14; p.oy -= dy * 0.14; } }
          if (audio) KA.playClack((x / w - 0.5) * 1.2, 0.45, 0.9);
        }
      },
      stat() { return `${cols}×${rows} silk · Drag to ripple`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* --- 28. EPICYCLES --- */
  SIMS.epicycle = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.41;
    const PRESETS = [
      [[0.48, 1], [0.24, -3], [0.14, 5], [0.08, -7]],
      [[0.44, 1], [0.26, 4], [0.16, -6], [0.09, 9]],
      [[0.50, 1], [0.28, -2], [0.13, 7], [0.06, -11]],
      [[0.42, 2], [0.26, -3], [0.18, 5], [0.09, -8]]
    ];
    let presetI = 0, simT = 0, trace = [], lastStep = 0;

    return {
      step(dt, t, ptr) {
        const sub = 6, sdt = (dt / 60) * S.speed * 1.2 / sub;
        const arms = PRESETS[presetI % PRESETS.length];
        const morph = ptr && ptr.down ? (ptr.x / w - 0.5) * 2.2 : 0;
        const maxTrace = small ? 220 : Math.round(280 + S.trail * 5);
        for (let s = 0; s < sub; s++) {
          simT += sdt;
          let x = cx, y = cy;
          for (let i = 0; i < arms.length; i++) {
            const rad = arms[i][0] * R, a = simT * (arms[i][1] + (i === 1 ? morph : 0));
            x += Math.cos(a) * rad; y += Math.sin(a) * rad;
          }
          trace.push([x, y, (simT * 0.08) % 1]); while (trace.length > maxTrace) trace.shift();
        }
        const beat = Math.floor(simT * 2.5);
        if (audio && beat !== lastStep) {
          lastStep = beat;
          const tip = trace[trace.length - 1];
          KA.playMelodyStep(beat, ((tip ? tip[0] : cx) / w - 0.5) * 1.3, 0.28, { rate: 20, timbre: 'kalimba' });
        }
      },
      draw(c, t, pal, ptr) {
        fillStudioBg(c, w, h, pal, 0.045);
        const arms = PRESETS[presetI % PRESETS.length], morph = ptr && ptr.down ? (ptr.x / w - 0.5) * 2.2 : 0;
        c.lineCap = 'round';
        for (let i = 1; i < trace.length; i++) {
          const f = i / trace.length;
          c.strokeStyle = pal.col(trace[i][2], f * 0.78);
          c.lineWidth = (0.9 + f * 2.2) * dpr;
          c.beginPath(); c.moveTo(trace[i - 1][0], trace[i - 1][1]); c.lineTo(trace[i][0], trace[i][1]); c.stroke();
        }
        let x = cx, y = cy;
        for (let i = 0; i < arms.length; i++) {
          const rad = arms[i][0] * R, a = simT * (arms[i][1] + (i === 1 ? morph : 0));
          const nx = x + Math.cos(a) * rad, ny = y + Math.sin(a) * rad;
          c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.1 * dpr;
          c.beginPath(); c.arc(x, y, rad, 0, TAU); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.68)'; c.lineWidth = 1.8 * dpr;
          c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
          drawSphere(c, x, y, 3 * dpr, pal, 0.2, 'chrome', false);
          x = nx; y = ny;
        }
        drawSphere(c, x, y, 5.4 * dpr, pal, (simT * 0.08) % 1, S.material, false);
      },
      interact(type) { if (type === 'down') { presetI = (presetI + 1) % PRESETS.length; trace = []; if (audio) KA.playChord(presetI * 2, 0.5); } },
      stat() { return `Harmonic #${presetI + 1} · Tap to morph`; },
      done: false,
      get progress() { return (simT % 18) / 18; }
    };
  };
})();
