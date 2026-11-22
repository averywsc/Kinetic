/* ============================================================================
   Kinetic — "Will It Escape?" Challenge Modes & 3D Isometric Particle Waves
   ============================================================================ */
(() => {
  'use strict';

  const { TAU, clamp, lerp, mod, fillStudioBg, drawSphere, drawStudioRing, drawSilkTrail, makeFX } = window.KT;
  const KA = window.KA;
  const SIMS = window.KSIMS || (window.KSIMS = {});

  /* ---- Helper: Clean understated on-stage challenge prompt ---- */
  function drawPrompt(c, w, h, dpr, headline, subline, accentCol, small) {
    if (small) return;
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const topY = Math.max(82 * dpr, h * 0.13);
    c.font = `600 ${Math.round(20 * dpr)}px "DM Sans", -apple-system, sans-serif`;
    c.fillStyle = accentCol || 'rgba(242,245,252,0.92)';
    c.fillText(headline, w * 0.5, topY);
    if (subline) {
      c.font = `500 ${Math.round(13 * dpr)}px "DM Sans", -apple-system, sans-serif`;
      c.fillStyle = 'rgba(176,188,210,0.78)';
      c.fillText(subline, w * 0.5, topY + 23 * dpr);
    }
    c.restore();
  }

  /* =========================================================================
     1. FREEZE & ESCAPE
     A small gap sits on the ring. Every 3.0 seconds the live ball freezes
     solidly in place and a new ball drops. Colliding off frozen balls, how
     long until one threads the tiny gap and escapes?
     ========================================================================= */
  SIMS.freeze_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.53, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const ballR = R * 0.068;
    const FREEZE_SEC = 3.0;
    const MAX_FROZEN = small ? 12 : 24;

    // Small gap (~26 deg) positioned on the upper-right wall so balls have to build & ricochet!
    const gapAng = -0.32;
    const gapWidth = 0.44; // ~25 degrees — just wide enough for a clean escape!

    const frozen = [];
    let live = null;
    let freezeTimer = FREEZE_SEC;
    let totalTime = 0, noteI = 0, state = 'running', endTimer = 0, done = false;
    let escapeTime = 0, ringPulse = 0;

    const dropBall = () => {
      const sp = R * 0.022;
      const dir = (frozen.length % 2 === 0 ? 1 : -1);
      live = {
        x: cx + (Math.random() - 0.5) * R * 0.28,
        y: cy - R * 0.72,
        vx: dir * sp * (0.65 + Math.random() * 0.45),
        vy: sp * 0.15,
        r: ballR,
        hue: (frozen.length * 0.11 + 0.05) % 1,
        trail: []
      };
      freezeTimer = FREEZE_SEC;
    };
    dropBall();

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        ringPulse *= Math.pow(0.86, dt);

        if (state !== 'running') {
          if (live && state === 'escaped') {
            live.x += live.vx * dt * 0.55;
            live.y += live.vy * dt * 0.55;
            live.vy += 0.18 * (R / 260) * dt;
            live.trail.push([live.x, live.y]);
            if (live.trail.length > 26) live.trail.shift();
          }
          endTimer -= dt / 60;
          if (endTimer <= 0) done = true;
          return;
        }

        const dtSec = (dt / 60) * S.speed;
        totalTime += dtSec;
        freezeTimer -= dtSec;

        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.28 * Math.max(0.25, S.grav) * (R / 260);
        const maxSpd = R * 0.052;
        const tLen = Math.round(6 + S.trail * 0.35);

        for (let s = 0; s < sub; s++) {
          if (!live) break;
          live.vy += g * sdt;
          live.x += live.vx * sdt;
          live.y += live.vy * sdt;

          // Collide against all previously frozen spheres!
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
                f.flash = 1;
                fx.burst(f.x + nx * f.r, f.y + ny * f.r, pal.col(live.hue, 0.85), 5, R * 0.012, 1.9);
                if (audio) KA.playClack((live.x / w - 0.5) * 1.3, 0.55, 1.15 + (frozen.length % 5) * 0.06);
              }
            }
          }

          // Ring boundary & tiny gap check
          const dx = live.x - cx, dy = live.y - cy, dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const diff = Math.abs(Math.atan2(Math.sin(ang - gapAng), Math.cos(ang - gapAng)));
          const inGap = diff < gapWidth * 0.5 - (live.r / R) * 0.32;

          if (inGap && dist > R + live.r * 0.45) {
            // ESCAPED!
            state = 'escaped';
            escapeTime = totalTime;
            endTimer = 2.4;
            const col = pal.col(live.hue, 0.95);
            fx.burst(live.x, live.y, col, 48, R * 0.032, 2.8);
            fx.wave(live.x, live.y, col, 6, R * 0.55, 3, 0.72);
            if (audio) KA.playChord(4, 0.88);
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
              ringPulse = 0.75;
              const col = pal.col(live.hue, 0.88);
              fx.rim(cx, cy, R, ang, col, 0.24, 0.6);
              fx.burst(cx + nx * R, cy + ny * R, col, 6, R * 0.012, 1.9);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.56);
            }
          }
        }

        if (live && state === 'running') {
          live.trail.push([live.x, live.y]);
          while (live.trail.length > tLen) live.trail.shift();
        }
        for (const f of frozen) if (f.flash > 0.01) f.flash *= Math.pow(0.86, dt);

        // Every 3.0 seconds: freeze active ball in place and drop a new one!
        if (state === 'running' && freezeTimer <= 0 && live) {
          frozen.push({ x: live.x, y: live.y, r: live.r, hue: live.hue, flash: 1 });
          fx.wave(live.x, live.y, 'rgba(210,224,245,0.75)', live.r, live.r * 2.2, 2, 0.6);
          if (audio) KA.playClack((live.x / w - 0.5) * 1.2, 0.85, 0.72);
          if (frozen.length >= MAX_FROZEN) {
            state = 'trapped';
            endTimer = 2.2;
            live = null;
          } else {
            dropBall();
          }
        }
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);

        // Recessed inner dish
        const dish = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
        dish.addColorStop(0, 'rgba(255,255,255,0.015)');
        dish.addColorStop(1, 'rgba(0,0,0,0.42)');
        c.fillStyle = dish;
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();

        // Ring with small exit gap
        const a0 = gapAng + gapWidth * 0.5, a1 = gapAng + TAU - gapWidth * 0.5;
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.15, ringPulse * 0.5, a0, a1, false);

        // Crisp glowing exit markers at gap lips
        c.save();
        c.fillStyle = pal.col(0.05, 0.95);
        for (const ea of [a0, a1]) {
          c.beginPath(); c.arc(cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, 3.2 * dpr, 0, TAU); c.fill();
        }
        // Subtle exit arrow outside gap
        const ex = cx + Math.cos(gapAng) * (R + 18 * dpr), ey = cy + Math.sin(gapAng) * (R + 18 * dpr);
        c.strokeStyle = pal.col(0.05, 0.45);
        c.lineWidth = 1.6 * dpr;
        c.beginPath();
        c.moveTo(cx + Math.cos(gapAng) * (R + 8 * dpr), cy + Math.sin(gapAng) * (R + 8 * dpr));
        c.lineTo(ex, ey);
        c.stroke();
        c.restore();

        // Frozen spheres (frosted matte slate ceramic with lock ring)
        for (const f of frozen) {
          c.save();
          c.globalAlpha = 0.62 + f.flash * 0.35;
          drawSphere(c, f.x, f.y, f.r, pal, f.hue, 'ceramic', true);
          c.strokeStyle = `rgba(215,228,245,${0.25 + f.flash * 0.5})`;
          c.lineWidth = 1.4 * dpr;
          c.beginPath(); c.arc(f.x, f.y, f.r - 1, 0, TAU); c.stroke();
          c.restore();
        }

        // Active live sphere + 3-second circular freeze countdown ring around it!
        if (live) {
          if (S.trail > 3) drawSilkTrail(c, live.trail, pal, live.hue, live.r * 1.1, 0.34);
          drawSphere(c, live.x, live.y, live.r, pal, live.hue, S.material, true);
          if (state === 'running') {
            const frac = clamp(freezeTimer / FREEZE_SEC, 0, 1);
            c.strokeStyle = frac < 0.28 ? '#ff6b7d' : 'rgba(255,255,255,0.75)';
            c.lineWidth = 2 * dpr;
            c.beginPath();
            c.arc(live.x, live.y, live.r + 4.5 * dpr, -Math.PI * 0.5, -Math.PI * 0.5 + frac * TAU);
            c.stroke();
          }
        }

        fx.draw(c, dpr);

        if (state === 'escaped') {
          drawPrompt(c, w, h, dpr, `Escaped in ${escapeTime.toFixed(1)}s`, `${frozen.length} frozen before breakout`, pal.col(0.05, 1), small);
        } else if (state === 'trapped') {
          drawPrompt(c, w, h, dpr, 'Chamber locked', `${frozen.length} spheres frozen — restarting`, '#ff7b8b', small);
        } else {
          drawPrompt(c, w, h, dpr, 'Will it escape?', `Freezes in ${Math.max(0, freezeTimer).toFixed(1)}s  ·  ${frozen.length} frozen  ·  ${totalTime.toFixed(1)}s`, null, small);
        }
      },
      interact(type, x, y) {
        if (type === 'down' && live && state === 'running') {
          live.vx += (x - live.x) * 0.035;
          live.vy += (y - live.y) * 0.035;
          if (audio) KA.playClack((x / w - 0.5) * 1.2, 0.5, 1.3);
        }
      },
      stat() {
        return state === 'escaped' ? `Escaped ${escapeTime.toFixed(1)}s` : `${totalTime.toFixed(1)}s · ${frozen.length} frozen`;
      },
      get done() { return done; },
      get progress() { return state !== 'running' ? 1 : clamp(frozen.length / MAX_FROZEN, 0, 1); }
    };
  };

  /* =========================================================================
     2. 15s ESCAPE CHALLENGE ("Can it escape 16 rings in 15 seconds?")
     ========================================================================= */
  SIMS.timed_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.53, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const numRings = small ? 8 : 16;
    const LIMIT = 15.0;
    const rings = Array.from({ length: numRings }, (_, i) => {
      const f = i / (numRings - 1);
      return {
        r: lerp(R * 0.22, R * 0.98, f),
        ang: i * 0.72,
        vel: (i % 2 === 0 ? 1 : -1) * (0.016 + (1 - f) * 0.015),
        gap: lerp(0.68, 0.42, f),
        alive: true, hue: f * 0.9, flash: 0
      };
    });
    const b = { x: cx + R * 0.03, y: cy - R * 0.04, vx: R * 0.024, vy: -R * 0.014, r: R * 0.032, hue: 0.1, trail: [] };
    let escaped = 0, timeLeft = LIMIT, noteI = 0, state = 'running', endT = 0, done = false;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (state !== 'running') { endT -= dt / 60; if (endT <= 0) done = true; return; }
        timeLeft -= (dt / 60) * S.speed;
        if (timeLeft <= 0) {
          timeLeft = 0; state = 'failed'; endT = 2.0;
          if (audio) KA.playClack(0, 0.9, 0.55);
          return;
        }
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.26 * S.grav * (R / 260), maxSpd = R * 0.056;
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
              active.alive = false; escaped++;
              fx.wave(cx, cy, pal.col(active.hue, 0.9), active.r * 0.94, active.r * 1.15, 2.2, 0.55);
              if (audio) KA.playChord(escaped % 7, 0.65);
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
                active.flash = 1;
                fx.burst(cx + nx * active.r, cy + ny * active.r, pal.col(active.hue, 0.9), 6, R * 0.013, 1.8);
                if (audio) KA.playMelodyStep(noteI++, nx * 0.7, 0.55);
              }
            }
          }
        }
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        for (const rg of rings) {
          if (!rg.alive) continue;
          const a0 = rg.ang + rg.gap * 0.5, a1 = rg.ang + TAU - rg.gap * 0.5;
          drawStudioRing(c, cx, cy, rg.r, dpr, pal, rg.hue, rg.flash * 0.65, a0, a1, false);
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.2, 0.35);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);

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
     3. CLOSING GAP ("Will it escape before the gap seals shut?")
     ========================================================================= */
  SIMS.narrow_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.53, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const b = { x: cx - R * 0.22, y: cy - R * 0.16, vx: R * 0.024, vy: -R * 0.012, r: R * 0.068, hue: 0.12, trail: [] };
    let gapAng = 0.8, gapW = 0.92;
    const minGap = (b.r * 2.02) / R;
    let noteI = 0, bounces = 0, state = 'running', endT = 0, done = false, ringPulse = 0;

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        ringPulse *= Math.pow(0.86, dt);
        if (state !== 'running') {
          if (state === 'escaped') { b.x += b.vx * dt * 0.5; b.y += b.vy * dt * 0.5; }
          endT -= dt / 60; if (endT <= 0) done = true; return;
        }
        gapAng = mod(gapAng + 0.013 * dt * S.speed, TAU);
        gapW = Math.max(0, gapW - 0.00088 * dt * S.speed);
        if (gapW <= 0.01) { state = 'sealed'; endT = 2.0; if (audio) KA.playClack(0, 0.9, 0.55); return; }

        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.24 * S.grav * (R / 260), maxSpd = R * 0.054;
        const tLen = Math.round(6 + S.trail * 0.36);

        for (let s = 0; s < sub; s++) {
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const ang = mod(Math.atan2(dy, dx), TAU);
          const diff = Math.abs(Math.atan2(Math.sin(ang - gapAng), Math.cos(ang - gapAng)));
          const fits = gapW > minGap && diff < (gapW - minGap * 0.45) * 0.5;

          if (fits && dist > R + b.r * 0.4) {
            state = 'escaped'; endT = 2.2;
            const col = pal.col(b.hue, 0.95);
            fx.burst(b.x, b.y, col, 48, R * 0.03, 2.8);
            fx.wave(b.x, b.y, col, 8, R * 0.5, 3, 0.7);
            if (audio) KA.playChord(4, 0.88);
            break;
          } else if (!fits && dist >= R - b.r && dist < R + b.r * 1.2) {
            const nx = dx / dist, ny = dy / dist;
            b.x = cx + nx * (R - b.r); b.y = cy + ny * (R - b.r);
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
              b.vx = (b.vx - 2 * dot * nx) * 1.018 - ny * 0.06 * (R / 260);
              b.vy = (b.vy - 2 * dot * ny) * 1.018 + nx * 0.06 * (R / 260);
              const sp = Math.hypot(b.vx, b.vy);
              if (sp > maxSpd) { b.vx *= maxSpd / sp; b.vy *= maxSpd / sp; }
              bounces++; ringPulse = 0.8; b.hue = (b.hue + 0.025) % 1;
              fx.rim(cx, cy, R, ang, pal.col(b.hue, 0.9), 0.26, 0.65);
              fx.burst(cx + nx * R, cy + ny * R, pal.col(b.hue, 0.9), 7, R * 0.013, 2);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.6);
            }
          }
        }
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        const a0 = gapAng + gapW * 0.5, a1 = gapAng + TAU - gapW * 0.5;
        drawStudioRing(c, cx, cy, R, dpr, pal, gapW <= minGap ? 0.85 : 0.12, ringPulse * 0.5, a0, a1, !small);
        if (gapW > 0.02) {
          c.fillStyle = gapW > minGap ? pal.col(0.05, 0.95) : '#ff6b7d';
          for (const ea of [a0, a1]) { c.beginPath(); c.arc(cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, 3.2 * dpr, 0, TAU); c.fill(); }
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);

        const openPct = Math.round(clamp(gapW / 0.92, 0, 1) * 100);
        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Escaped at ${openPct}% gap!`, `After ${bounces} bounces`, pal.col(0.05, 1), small);
        else if (state === 'sealed') drawPrompt(c, w, h, dpr, 'Sealed shut', `Trapped after ${bounces} bounces`, '#ff7b8b', small);
        else drawPrompt(c, w, h, dpr, 'Will it beat the closing gap?', `Gap ${openPct}% open  ·  ${gapW <= minGap ? 'Too narrow!' : bounces + ' bounces'}`, gapW <= minGap ? '#ff8b99' : null, small);
      },
      interact(type, x, y) { if (type === 'down') { b.vx += (x - b.x) * 0.04; b.vy += (y - b.y) * 0.04; } },
      stat() { return `Gap ${Math.round(clamp(gapW / 0.92, 0, 1) * 100)}% · ${bounces} hits`; },
      get done() { return done; },
      get progress() { return 1 - clamp(gapW / 0.92, 0, 1); }
    };
  };

  /* =========================================================================
     4. SPINNING MAZE ESCAPE (5-layer rotating labyrinth with radial baffles!)
     ========================================================================= */
  SIMS.maze_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.53, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const layers = small ? 4 : 6;
    const ringGap = 0.56;
    const walls = Array.from({ length: layers }, (_, i) => ({
      r: lerp(R * 0.24, R * 0.98, i / (layers - 1)),
      door: i * 1.85,
      hue: i / layers
    }));
    let rot = 0, simT = 0, noteI = 0, state = 'running', endT = 0, done = false;
    const b = { x: cx, y: cy, vx: R * 0.008, vy: 0, r: R * 0.042, hue: 0.08, trail: [] };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (state !== 'running') { endT -= dt / 60; if (endT <= 0) done = true; return; }
        simT += (dt / 60) * S.speed;
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.24 * Math.max(0.25, S.grav) * (R / 260);
        const tLen = Math.round(6 + S.trail * 0.34);

        for (let s = 0; s < sub; s++) {
          rot = mod(rot + (ptr && ptr.down ? 0.022 : 0.009) * sdt, TAU);
          b.vy += g * sdt;
          b.vx *= Math.pow(0.996, sdt); b.vy *= Math.pow(0.996, sdt);
          b.x += b.vx * sdt; b.y += b.vy * sdt;

          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          if (dist > R + b.r * 0.8) {
            state = 'escaped'; endT = 2.2;
            fx.burst(b.x, b.y, pal.col(b.hue, 0.95), 44, R * 0.028, 2.6);
            if (audio) KA.playChord(4, 0.88);
            break;
          }
          const ang = mod(Math.atan2(dy, dx), TAU);
          for (const wl of walls) {
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
                  if (audio && Math.abs(vn) > 1.2) KA.playClack((b.x / w - 0.5) * 1.2, 0.42, 1.0 + wl.hue * 0.45);
                }
              }
            }
          }
        }
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        for (const wl of walls) {
          const da = wl.door + rot;
          drawStudioRing(c, cx, cy, wl.r, dpr, pal, wl.hue, 0, da + ringGap * 0.5, da + TAU - ringGap * 0.5, false);
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.1, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);

        if (state === 'escaped') drawPrompt(c, w, h, dpr, `Maze escaped in ${simT.toFixed(1)}s!`, 'All layers navigated', pal.col(0.05, 1), small);
        else drawPrompt(c, w, h, dpr, 'Will it escape the maze?', `${simT.toFixed(1)}s  ·  Hold to spin faster`, null, small);
      },
      interact() {},
      stat() { return state === 'escaped' ? `Escaped ${simT.toFixed(1)}s` : `Maze ${simT.toFixed(1)}s`; },
      get done() { return done; },
      get progress() { return clamp(Math.hypot(b.x - cx, b.y - cy) / R, 0, 1); }
    };
  };

  /* =========================================================================
     5. ORBIT GATE ("Will it thread the guarded exit portal?")
     ========================================================================= */
  SIMS.gate_escape = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w / 2, cy = h * 0.53, R = Math.min(w, h) * 0.37;
    const fx = makeFX(small);
    const portalAng = -Math.PI * 0.5, portalW = 0.34;
    let shieldA = 0, bounces = 0, noteI = 0, simT = 0, state = 'running', endT = 0, done = false;
    const b = { x: cx + R * 0.14, y: cy + R * 0.1, vx: R * 0.024, vy: -R * 0.02, r: R * 0.056, hue: 0.1, trail: [] };

    return {
      step(dt, t, ptr, pal) {
        fx.step(dt);
        if (state !== 'running') {
          if (state === 'escaped') { b.x += b.vx * dt * 0.5; b.y += b.vy * dt * 0.5; }
          endT -= dt / 60; if (endT <= 0) done = true; return;
        }
        simT += (dt / 60) * S.speed;
        const sub = 6, sdt = dt * S.speed / sub;
        const g = 0.22 * S.grav * (R / 260), maxSpd = R * 0.056;
        const tLen = Math.round(6 + S.trail * 0.35);

        for (let s = 0; s < sub; s++) {
          shieldA = mod(shieldA + 0.026 * sdt, TAU);
          b.vy += g * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
          const dx = b.x - cx, dy = b.y - cy, dist = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const inPortal = Math.abs(Math.atan2(Math.sin(ang - portalAng), Math.cos(ang - portalAng))) < portalW * 0.42;

          // Inner orbiting guard paddle at radius R * 0.78
          const guardR = R * 0.78;
          if (Math.abs(dist - guardR) < b.r + 3 * dpr) {
            const hitShield = [shieldA, mod(shieldA + Math.PI, TAU)].some(sa =>
              Math.abs(Math.atan2(Math.sin(ang - sa), Math.cos(ang - sa))) < 0.46
            );
            if (hitShield) {
              const nx = dx / (dist || 1), ny = dy / (dist || 1);
              const side = dist >= guardR ? 1 : -1;
              b.x = cx + nx * (guardR + side * (b.r + 3 * dpr));
              b.y = cy + ny * (guardR + side * (b.r + 3 * dpr));
              const vn = b.vx * nx + b.vy * ny;
              if (vn * side < 0) {
                b.vx = (b.vx - 2 * vn * nx) * 1.02; b.vy = (b.vy - 2 * vn * ny) * 1.02;
                fx.burst(b.x, b.y, pal.col(0.85, 0.9), 7, R * 0.014, 2);
                if (audio) KA.playClack((b.x / w - 0.5) * 1.2, 0.65, 1.35);
              }
            }
          }

          if (inPortal && dist > R + b.r * 0.4) {
            state = 'escaped'; endT = 2.2;
            fx.burst(b.x, b.y, pal.col(0.05, 0.95), 48, R * 0.03, 2.8);
            if (audio) KA.playChord(4, 0.9);
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
              bounces++; b.hue = (b.hue + 0.02) % 1;
              fx.rim(cx, cy, R, ang, pal.col(b.hue, 0.85), 0.22, 0.6);
              if (audio) KA.playMelodyStep(noteI++, nx * 0.72, 0.58);
            }
          }
        }
        b.trail.push([b.x, b.y]); while (b.trail.length > tLen) b.trail.shift();
      },
      draw(c, t, pal) {
        fillStudioBg(c, w, h, pal, 0.045);
        drawStudioRing(c, cx, cy, R, dpr, pal, 0.25, 0, portalAng + portalW * 0.5, portalAng + TAU - portalW * 0.5, false);
        // Two orbiting metallic guard shields
        for (const sa of [shieldA, shieldA + Math.PI]) {
          drawStudioRing(c, cx, cy, R * 0.78, dpr, pal, 0.78, 0.25, sa - 0.45, sa + 0.45, false);
        }
        if (S.trail > 3) drawSilkTrail(c, b.trail, pal, b.hue, b.r * 1.15, 0.34);
        drawSphere(c, b.x, b.y, b.r, pal, b.hue, S.material, true);
        fx.draw(c, dpr);

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
     6. 3D VORTEX DISC (Directly inspired by user Image 1 — @ParticlesFlow!)
     Matte 3D cylindrical pedestal + dense 3D concentric sphere vortex funnel
     ========================================================================= */
  SIMS.iso_torus = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w * 0.5, baseY = h * 0.67;
    const discR = Math.min(w * 0.38, h * 0.32);
    const tilt = 0.46; // isometric vertical squash
    const slabH = discR * 0.16;

    // Precompute concentric rings of 3D particles
    const rings = small ? 10 : 17;
    const pts = [];
    for (let ri = 2; ri <= rings; ri++) {
      const rf = ri / rings; // 0..1 radial coordinate
      const count = Math.max(10, Math.round(rf * (small ? 32 : 58)));
      for (let k = 0; k < count; k++) {
        pts.push({ rf, a0: (k / count) * TAU });
      }
    }
    let simT = 0, lastChime = 0;

    return {
      step(dt, t) {
        simT += (dt / 60) * S.speed;
        if (audio && simT - lastChime > 0.55) {
          lastChime = simT;
          const deg = Math.round(4 + Math.sin(simT * 0.9) * 4);
          KA.playScale(deg, Math.sin(simT * 0.6) * 0.45, 0.22, { timbre: 'kalimba' });
        }
      },
      draw(c, t, pal, ptr) {
        // Deep midnight violet-to-black studio gradient matching reference!
        const bg = c.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#130d24');
        bg.addColorStop(0.55, '#090813');
        bg.addColorStop(1, '#040407');
        c.fillStyle = bg;
        c.fillRect(0, 0, w, h);

        // 1. Matte 3D Cylindrical Pedestal Disc
        c.save();
        // Extruded vertical side wall
        const sideG = c.createLinearGradient(cx - discR, 0, cx + discR, 0);
        sideG.addColorStop(0, '#303238');
        sideG.addColorStop(0.35, '#41444c');
        sideG.addColorStop(0.75, '#2b2d33');
        sideG.addColorStop(1, '#1c1e22');
        c.fillStyle = sideG;
        c.beginPath();
        c.ellipse(cx, baseY + slabH, discR, discR * tilt, 0, 0, Math.PI);
        c.lineTo(cx - discR, baseY);
        c.ellipse(cx, baseY, discR, discR * tilt, 0, Math.PI, 0, true);
        c.closePath();
        c.fill();

        // Top matte flat face
        const topG = c.createRadialGradient(cx, baseY - discR * 0.08, discR * 0.05, cx, baseY, discR);
        topG.addColorStop(0, '#44474e');
        topG.addColorStop(0.6, '#565961');
        topG.addColorStop(1, '#4c4f57');
        c.fillStyle = topG;
        c.beginPath();
        c.ellipse(cx, baseY, discR, discR * tilt, 0, 0, TAU);
        c.fill();

        // Subtle rim bevel highlight
        c.strokeStyle = 'rgba(255,255,255,0.12)';
        c.lineWidth = 1.1 * dpr;
        c.stroke();

        // Soft cast shadow on pedestal center beneath vortex throat
        const sh = c.createRadialGradient(cx, baseY, 2, cx, baseY, discR * 0.65);
        sh.addColorStop(0, 'rgba(0,0,0,0.48)');
        sh.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sh;
        c.beginPath(); c.ellipse(cx, baseY, discR * 0.65, discR * 0.65 * tilt, 0, 0, TAU); c.fill();
        c.restore();

        // 2. Compute 3D Toroidal Vortex Funnel positions & depth-sort back-to-front!
        const mx = ptr && ptr.in ? (ptr.x / w - 0.5) * 0.5 : 0;
        const my = ptr && ptr.in ? (ptr.y / h - 0.5) * 0.4 : 0;
        const hoverY = baseY - discR * 0.36;
        const morph = 0.5 + 0.5 * Math.sin(simT * 0.45);
        const renderList = [];

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const swirl = simT * 0.55 + (1 - p.rf) * (1.8 + morph * 1.4);
          const a = p.a0 + swirl + mx;
          // Toroidal vortex profile: outer curls smoothly into a wide rim, inner plunges into a deep funnel!
          const funnel = -Math.exp(-p.rf * p.rf * 5.2) * (0.95 + 0.35 * Math.sin(simT * 1.2 + my * 3));
          const rimRoll = Math.sin(p.rf * Math.PI * 1.15 - simT * 1.8) * 0.22;
          const wave = Math.sin(p.rf * 7.5 - simT * 2.4) * 0.14 * morph;
          const z = (funnel + rimRoll + wave) * discR * 0.58;

          // Pull inner rings slightly inward as they dip into the funnel throat
          const rad = discR * (0.14 + Math.pow(p.rf, 0.88) * 0.82);
          const x3 = Math.cos(a) * rad;
          const y3 = Math.sin(a) * rad;

          const sx = cx + x3;
          const sy = hoverY + y3 * tilt - z;
          const depth = y3; // larger y3 = closer to viewer
          const heightNorm = clamp((z / (discR * 0.58) + 1.05) / 1.55, 0, 1);
          renderList.push({ sx, sy, depth, h: heightNorm, rf: p.rf });
        }

        renderList.sort((a, b) => a.depth - b.depth);

        const baseDot = Math.max(2.6 * dpr, discR * (small ? 0.03 : 0.025));
        for (let i = 0; i < renderList.length; i++) {
          const q = renderList[i];
          const persp = 0.84 + ((q.depth / discR) + 1) * 0.16;
          // Color gradient: low funnel core (0.35) -> bright rim crest (0.02)
          const hue = lerp(0.42, 0.02, q.h);
          drawSphere(c, q.sx, q.sy, baseDot * persp, pal, hue, S.material === 'chrome' ? 'chrome' : 'ceramic', false);
        }
      },
      interact() {},
      stat() { return `${pts.length} spheres · 3D Vortex`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };

  /* =========================================================================
     7. 3D WAVE SLAB (Directly inspired by user Images 2 & 3 — @ParticlesFlow!)
     Isometric 3D dark-gray square pedestal with grid grooves + 22x22 floating
     3D sphere sheet morphing between parabolic ripple & deep funnel dip!
     ========================================================================= */
  SIMS.iso_wave = (w, h, opts) => {
    const { dpr, small, audio, S } = opts;
    const cx = w * 0.5, baseY = h * 0.65;
    const span = Math.min(w * 0.44, h * 0.34);
    const slabH = span * 0.13;
    const N = small ? 13 : 21;
    let simT = 0, patternI = 0, lastChime = 0;

    // Isometric projection of normalized (u, v) in [-1, 1] and height z
    const iso = (u, v, z = 0) => [
      cx + (u - v) * span * 0.78,
      baseY + (u + v) * span * 0.41 - z
    ];

    return {
      step(dt, t) {
        simT += (dt / 60) * S.speed;
        if (audio && simT - lastChime > 0.52) {
          lastChime = simT;
          KA.playScale(Math.round(5 + Math.cos(simT * 1.1) * 4), Math.sin(simT * 0.7) * 0.5, 0.2, { timbre: 'glass' });
        }
      },
      draw(c, t, pal, ptr) {
        // Deep violet-midnight vertical gradient matching Images 2 & 3!
        const bg = c.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#120b24');
        bg.addColorStop(0.55, '#080712');
        bg.addColorStop(1, '#030306');
        c.fillStyle = bg;
        c.fillRect(0, 0, w, h);

        // 1. Isometric 3D Square Matte Pedestal Slab
        const cT = iso(-1.08, -1.08, 0);
        const cR = iso(1.08, -1.08, 0);
        const cB = iso(1.08, 1.08, 0);
        const cL = iso(-1.08, 1.08, 0);

        // Left extruded vertical wall
        c.fillStyle = '#3a3d45';
        c.beginPath();
        c.moveTo(cL[0], cL[1]); c.lineTo(cB[0], cB[1]);
        c.lineTo(cB[0], cB[1] + slabH); c.lineTo(cL[0], cL[1] + slabH);
        c.closePath(); c.fill();

        // Right extruded vertical wall
        c.fillStyle = '#25272d';
        c.beginPath();
        c.moveTo(cB[0], cB[1]); c.lineTo(cR[0], cR[1]);
        c.lineTo(cR[0], cR[1] + slabH); c.lineTo(cB[0], cB[1] + slabH);
        c.closePath(); c.fill();

        // Top diamond matte face
        const topG = c.createLinearGradient(cT[0], cT[1], cB[0], cB[1]);
        topG.addColorStop(0, '#444750');
        topG.addColorStop(0.5, '#555861');
        topG.addColorStop(1, '#4b4e57');
        c.fillStyle = topG;
        c.beginPath();
        c.moveTo(cT[0], cT[1]); c.lineTo(cR[0], cR[1]); c.lineTo(cB[0], cB[1]); c.lineTo(cL[0], cL[1]);
        c.closePath(); c.fill();

        // Subtle recessed micro-grid lines etched on top of the slab (just like Images 2 & 3!)
        if (!small) {
          c.strokeStyle = 'rgba(0,0,0,0.22)';
          c.lineWidth = 0.85 * dpr;
          for (let i = 0; i < N; i++) {
            const f = (i / (N - 1)) * 2 - 1;
            const p0 = iso(f, -1, 0), p1 = iso(f, 1, 0);
            c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
            const q0 = iso(-1, f, 0), q1 = iso(1, f, 0);
            c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke();
          }
        }
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1 * dpr;
        c.beginPath();
        c.moveTo(cT[0], cT[1]); c.lineTo(cR[0], cR[1]); c.lineTo(cB[0], cB[1]); c.lineTo(cL[0], cL[1]);
        c.closePath(); c.stroke();

        // 2. 3D Floating Sphere Matrix (seamlessly morphs between Image 2 funnel & Image 3 parabolic sheet!)
        const phase = (simT * 0.26 + patternI) % 3;
        const wFunnel = clamp(1 - Math.abs(phase - 1), 0, 1);
        const wSheet = clamp(1 - Math.abs(phase - 0), 0, 1) + clamp(1 - Math.abs(phase - 3), 0, 1);
        const wRipple = clamp(1 - Math.abs(phase - 2), 0, 1);

        const px = ptr && ptr.in ? (ptr.x / w - 0.5) * 1.4 : 0;
        const py = ptr && ptr.in ? (ptr.y / h - 0.5) * 1.4 : 0;

        const hoverBase = span * 0.56;
        const dotR = Math.max(2.4 * dpr, span * (small ? 0.036 : 0.025));

        // Traverse in exact isometric back-to-front order (increasing u + v!)
        for (let sum = 0; sum <= (N - 1) * 2; sum++) {
          const iMin = Math.max(0, sum - (N - 1));
          const iMax = Math.min(N - 1, sum);
          for (let iu = iMin; iu <= iMax; iu++) {
            const iv = sum - iu;
            const u = (iu / (N - 1)) * 2 - 1;
            const v = (iv / (N - 1)) * 2 - 1;
            const r2 = u * u + v * v;
            const r = Math.sqrt(r2);

            // Mode A: Parabolic curved hovering sheet (Image 3)
            const zSheet = hoverBase + (r2 * 0.24 - 0.14 + Math.sin(u * 2.2 + simT * 1.8) * 0.08 + Math.cos(v * 2.2 - simT * 1.5) * 0.08) * span;
            // Mode B: Deep inverted bell / funnel dipping down to touch slab center (Image 2)
            const dip = Math.exp(-r2 * 2.6);
            const zFunnel = hoverBase + (0.28 - dip * 0.94 + Math.sin(r * 5.2 - simT * 2.4) * 0.06) * span;
            // Mode C: Flowing interference wave
            const zRipple = hoverBase + (Math.sin(r * 5.8 - simT * 2.8) * 0.22 * Math.exp(-r2 * 0.35) + Math.sin((u + v) * 2.4 - simT * 2) * 0.1) * span;

            let z = zSheet * wSheet + zFunnel * wFunnel + zRipple * wRipple;
            if (ptr && ptr.in) {
              const pd2 = (u - px) * (u - px) + (v - py) * (v - py);
              z -= Math.exp(-pd2 * 3.8) * span * (ptr.down ? 0.42 : 0.18);
            }
            z = Math.max(dotR * 1.2, z);

            const [sx, sy] = iso(u, v, z);
            const hNorm = clamp((z - span * 0.08) / (span * 0.82), 0, 1);
            // Rich deep blue-violet in the trough -> glowing orchid/magenta on peaks!
            const hue = lerp(0.88, 0.22, hNorm);
            drawSphere(c, sx, sy, dotR, pal, hue, S.material === 'chrome' ? 'chrome' : 'velvet', false);
          }
        }
      },
      interact(type) {
        if (type === 'down') {
          patternI = (patternI + 1) % 3;
          if (audio) KA.playChord(patternI * 2, 0.5);
        }
      },
      stat() { return `${N}×${N} matrix · Tap to morph`; },
      done: false,
      get progress() { return (simT % 24) / 24; }
    };
  };
})();
