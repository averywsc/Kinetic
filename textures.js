/* ============================================================================
   Kinetic — High-Quality Procedural Textures & Physically Shaded Materials
   Supports Glass, Ceramic, Chrome, and Velvet sphere materials with offscreen
   high-DPI sprite caching + matte studio grain backdrop + beveled tiles/rings.
   ============================================================================ */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const mod = (n, m) => ((n % m) + m) % m;

  // Curated studio-graded palettes (rich, deep, refined — never cheap washed-out neon)
  const PALETTES = [
    { name: 'Mint Slate',    bg: '#090b10', stops: ['#26d9a8', '#3898ff', '#8b6bff', '#e85d99'] },
    { name: 'Amber Clay',    bg: '#0d0a09', stops: ['#f5c26b', '#ef7c45', '#d9455f', '#7c45c9'] },
    { name: 'Nordic Ice',    bg: '#080b11', stops: ['#c8f0ff', '#5cc8ff', '#3a78e8', '#6852d6'] },
    { name: 'Velvet Rose',   bg: '#0d090e', stops: ['#ffd6ea', '#f078b4', '#9e5ce6', '#4d4be0'] },
    { name: 'Sage Brass',    bg: '#090c0a', stops: ['#e6e89e', '#86cc6a', '#2da884', '#266d91'] },
    { name: 'Studio Prism',  bg: '#090a0f', stops: ['#f05a74', '#f4a842', '#38c993', '#4287f5', '#a15ee6'] }
  ];

  const MATERIALS = [
    ['glass',   'Glass'],
    ['ceramic', 'Ceramic'],
    ['chrome',  'Chrome'],
    ['velvet',  'Velvet']
  ];

  const hexToRgb = h => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16)
  ];

  function makePalette(pi) {
    const def = PALETTES[mod(pi, PALETTES.length)];
    const stops = def.stops.map(hexToRgb);
    const rgb = [];
    for (let i = 0; i < 64; i++) {
      const f = (i / 63) * (stops.length - 1);
      const k = Math.min(stops.length - 2, Math.floor(f));
      const t = f - k;
      rgb.push([
        Math.round(lerp(stops[k][0], stops[k + 1][0], t)),
        Math.round(lerp(stops[k][1], stops[k + 1][1], t)),
        Math.round(lerp(stops[k][2], stops[k + 1][2], t))
      ]);
    }
    return {
      name: def.name,
      bg: def.bg,
      raw: def.stops,
      rgb(t) {
        return rgb[clamp(Math.floor(mod(t, 1) * 63.99), 0, 63)];
      },
      col(t, a = 1, lum = 1) {
        const c = rgb[clamp(Math.floor(mod(t, 1) * 63.99), 0, 63)];
        const r = clamp(Math.round(c[0] * lum), 0, 255);
        const g = clamp(Math.round(c[1] * lum), 0, 255);
        const b = clamp(Math.round(c[2] * lum), 0, 255);
        return a >= 0.999 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
      }
    };
  }

  /* ---- Procedural Matte Studio Noise Pattern (cached 256x256 tile) ---- */
  let noisePat = null;
  function getNoisePattern(ctx) {
    if (noisePat) return noisePat;
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d');
    const img = g.createImageData(192, 192);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 110 + ((Math.random() * 60) | 0);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 7; // subtle refined studio micro-grain
    }
    g.putImageData(img, 0, 0);
    noisePat = ctx.createPattern(c, 'repeat');
    return noisePat;
  }

  function fillStudioBg(ctx, w, h, pal, intensity = 0.08) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle overhead studio softbox falloff
    const cx = w * 0.5, cy = h * 0.44;
    const rad = Math.max(w, h) * 0.72;
    const grad = ctx.createRadialGradient(cx, cy, rad * 0.05, cx, cy, rad);
    grad.addColorStop(0, pal.col(0.18, intensity, 0.85));
    grad.addColorStop(0.55, 'rgba(14,18,28,0.22)');
    grad.addColorStop(1, 'rgba(2,3,6,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fine matte surface grain
    const pat = getNoisePattern(ctx);
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ---- High-DPI 3D Material Sphere Sprite Cache ---- */
  const sphereCache = new Map();
  const SPRITE_SZ = 96;

  function getSphereSprite(rgb, material) {
    // Quantize color slightly for high cache hit-rate across 64-step LUT
    const key = `${material}:${rgb[0] >> 2},${rgb[1] >> 2},${rgb[2] >> 2}`;
    const hit = sphereCache.get(key);
    if (hit) return hit;

    if (sphereCache.size > 480) {
      const first = sphereCache.keys().next().value;
      sphereCache.delete(first);
    }

    const cv = document.createElement('canvas');
    cv.width = cv.height = SPRITE_SZ;
    const c = cv.getContext('2d');
    const half = SPRITE_SZ / 2;
    const r = half - 4;
    const [R, G, B] = rgb;
    const dark = (k) => `rgb(${Math.round(R * k)},${Math.round(G * k)},${Math.round(B * k)})`;
    const tint = (k) => `rgb(${Math.min(255, Math.round(R + (255 - R) * k))},${Math.min(255, Math.round(G + (255 - G) * k))},${Math.min(255, Math.round(B + (255 - B) * k))})`;

    c.save();
    c.beginPath();
    c.arc(half, half, r, 0, TAU);
    c.clip();

    if (material === 'glass') {
      // Deep translucent glass marble with internal caustic & crisp specular
      const body = c.createRadialGradient(half - r * 0.32, half - r * 0.34, r * 0.08, half, half, r);
      body.addColorStop(0, tint(0.55));
      body.addColorStop(0.32, dark(0.92));
      body.addColorStop(0.76, dark(0.42));
      body.addColorStop(1, dark(0.18));
      c.fillStyle = body;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      // Internal bottom-right refracted caustic bounce light
      const caustic = c.createRadialGradient(half + r * 0.36, half + r * 0.42, 1, half + r * 0.3, half + r * 0.35, r * 0.65);
      caustic.addColorStop(0, `rgba(${Math.min(255, R + 90)},${Math.min(255, G + 90)},${Math.min(255, B + 90)},0.62)`);
      caustic.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = caustic;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      // Crisp curved window highlight top-left
      c.save();
      c.translate(half - r * 0.34, half - r * 0.36);
      c.rotate(-0.65);
      const spec = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.34);
      spec.addColorStop(0, 'rgba(255,255,255,0.92)');
      spec.addColorStop(0.55, 'rgba(255,255,255,0.35)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = spec;
      c.scale(1.25, 0.72);
      c.beginPath(); c.arc(0, 0, r * 0.34, 0, TAU); c.fill();
      c.restore();

      // Thin fresnel glass rim
      c.strokeStyle = `rgba(${Math.min(255, R + 120)},${Math.min(255, G + 120)},${Math.min(255, B + 120)},0.48)`;
      c.lineWidth = 2.2;
      c.beginPath(); c.arc(half, half, r - 1.1, 0, TAU); c.stroke();

    } else if (material === 'chrome') {
      // Anodized brushed metal / chrome sphere with studio horizon band
      const base = c.createLinearGradient(half - r, half - r, half + r, half + r);
      base.addColorStop(0, tint(0.78));
      base.addColorStop(0.32, dark(0.9));
      base.addColorStop(0.48, dark(0.24));
      base.addColorStop(0.56, tint(0.35));
      base.addColorStop(0.78, dark(0.62));
      base.addColorStop(1, tint(0.45));
      c.fillStyle = base;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      // Sharp metallic pin highlight
      const hl = c.createRadialGradient(half - r * 0.32, half - r * 0.34, 0, half - r * 0.32, half - r * 0.34, r * 0.38);
      hl.addColorStop(0, 'rgba(255,255,255,0.95)');
      hl.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hl;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      c.strokeStyle = 'rgba(255,255,255,0.38)';
      c.lineWidth = 1.8;
      c.beginPath(); c.arc(half, half, r - 1, 0, TAU); c.stroke();

    } else if (material === 'ceramic') {
      // Tactile matte satin ceramic (soft, warm, ultra-pleasant low-glare)
      const body = c.createRadialGradient(half - r * 0.3, half - r * 0.35, r * 0.1, half + r * 0.1, half + r * 0.1, r * 1.15);
      body.addColorStop(0, tint(0.38));
      body.addColorStop(0.42, dark(0.88));
      body.addColorStop(0.84, dark(0.45));
      body.addColorStop(1, dark(0.24));
      c.fillStyle = body;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      // Soft diffused satin sheen
      const sheen = c.createRadialGradient(half - r * 0.28, half - r * 0.32, 0, half - r * 0.28, half - r * 0.32, r * 0.42);
      sheen.addColorStop(0, 'rgba(255,255,255,0.42)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sheen;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      c.strokeStyle = 'rgba(255,255,255,0.16)';
      c.lineWidth = 1.6;
      c.beginPath(); c.arc(half, half, r - 0.8, 0, TAU); c.stroke();

    } else {
      // Velvet soft-glow orb (controlled, non-blinding!)
      const body = c.createRadialGradient(half - r * 0.2, half - r * 0.22, r * 0.05, half, half, r);
      body.addColorStop(0, tint(0.62));
      body.addColorStop(0.45, dark(0.95));
      body.addColorStop(0.9, dark(0.62));
      body.addColorStop(1, dark(0.35));
      c.fillStyle = body;
      c.fillRect(0, 0, SPRITE_SZ, SPRITE_SZ);

      c.strokeStyle = `rgba(${Math.min(255, R + 70)},${Math.min(255, G + 70)},${Math.min(255, B + 70)},0.42)`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(half, half, r - 1, 0, TAU); c.stroke();
    }
    c.restore();

    sphereCache.set(key, cv);
    return cv;
  }

  function drawSphere(ctx, x, y, r, pal, hue, material = 'glass', shadow = true) {
    if (r < 0.8) return;
    const rgb = pal.rgb(hue);
    if (shadow && r > 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.arc(x + r * 0.12, y + r * 0.18, r * 1.02, 0, TAU);
      ctx.fill();
    }
    const spr = getSphereSprite(rgb, material);
    const scale = r / (SPRITE_SZ * 0.5 - 4);
    const drawSz = SPRITE_SZ * scale;
    ctx.drawImage(spr, x - drawSz * 0.5, y - drawSz * 0.5, drawSz, drawSz);
  }

  /* ---- Precision Metallic Ring Renderer (low-glare, high-depth) ---- */
  function drawStudioRing(ctx, cx, cy, R, dpr, pal, hue, pulse = 0, a0 = 0, a1 = TAU, ticks = false) {
    ctx.save();
    // Outer soft shadow groove
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = (7.5 + pulse * 1.5) * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();

    // Main anodized metallic band
    ctx.strokeStyle = pal.col(hue, 0.52 + pulse * 0.25, 0.9);
    ctx.lineWidth = (3.8 + pulse * 1.2) * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();

    // Inner specular highlight hairline
    ctx.strokeStyle = `rgba(255,255,255,${0.22 + pulse * 0.22})`;
    ctx.lineWidth = 1.1 * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, R - 1.3 * dpr, a0, a1); ctx.stroke();

    // Optional precision instrument degree ticks outside ring
    if (ticks) {
      ctx.strokeStyle = 'rgba(255,255,255,0.11)';
      ctx.lineWidth = 1 * dpr;
      const n = 48;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const long = i % 4 === 0;
        const r0 = R + 6 * dpr, r1 = R + (long ? 12 : 8.5) * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- Beveled Ceramic/Glass Tile ---- */
  function drawBevelRect(ctx, x, y, w, h, pal, hue, alpha = 0.85, flash = 0, rad = 3) {
    ctx.save();
    const r = Math.min(rad, w * 0.35, h * 0.35);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fillStyle = flash > 0.35
      ? pal.col(hue, Math.min(1, alpha + 0.2), 1.35)
      : pal.col(hue, alpha, 0.86 + flash * 0.3);
    ctx.fill();

    // Top-left bevel sheen
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + flash * 0.35})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /* ---- Clean Tapered Silk Trail (controlled, never blinding) ---- */
  function drawSilkTrail(ctx, pts, pal, hue, maxW, alphaScale = 0.42, hueShift = 0.14) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const f = i / pts.length;
      ctx.strokeStyle = pal.col(hue - (1 - f) * hueShift, f * f * alphaScale, 0.92);
      ctx.lineWidth = Math.max(0.8, maxW * f * f);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- Shared Tactile Impact FX ---- */
  function makeFX(small) {
    const sparks = [], waves = [], arcs = [];
    const maxS = small ? 36 : 240;
    return {
      burst(x, y, col, count = 8, spd = 3.5, size = 2.2) {
        const n = small ? Math.max(2, (count * 0.35) | 0) : count;
        for (let i = 0; i < n; i++) {
          if (sparks.length >= maxS) sparks.shift();
          const a = Math.random() * TAU, s = (0.3 + Math.random() * 0.8) * spd;
          sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, dec: 0.022 + Math.random() * 0.022, col, sz: size * (0.6 + Math.random() * 0.65) });
        }
      },
      wave(x, y, col, r0 = 5, rMax = 55, lw = 2.0, alpha = 0.65) {
        if (waves.length > (small ? 6 : 26)) waves.shift();
        waves.push({ x, y, r: r0, rMax, a: alpha, col, lw });
      },
      rim(cx, cy, R, ang, col, span = 0.32, alpha = 0.78) {
        if (arcs.length > (small ? 6 : 24)) arcs.shift();
        arcs.push({ cx, cy, R, ang, span, a: alpha, col });
      },
      step(dt) {
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= Math.pow(0.95, dt); p.vy = p.vy * Math.pow(0.95, dt) + 0.055 * dt;
          p.life -= p.dec * dt;
          if (p.life <= 0) sparks.splice(i, 1);
        }
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];
          w.r += (w.rMax - w.r) * 0.14 * dt;
          w.a *= Math.pow(0.89, dt);
          if (w.a < 0.02) waves.splice(i, 1);
        }
        for (let i = arcs.length - 1; i >= 0; i--) {
          const a = arcs[i];
          a.a *= Math.pow(0.88, dt);
          a.span += 0.022 * dt;
          if (a.a < 0.02) arcs.splice(i, 1);
        }
      },
      draw(c, dpr = 1) {
        c.save();
        for (const a of arcs) {
          c.strokeStyle = a.col;
          c.globalAlpha = a.a;
          c.lineWidth = 4.2 * dpr;
          c.lineCap = 'round';
          c.beginPath();
          c.arc(a.cx, a.cy, a.R, a.ang - a.span * 0.5, a.ang + a.span * 0.5);
          c.stroke();
        }
        for (const w of waves) {
          c.strokeStyle = w.col;
          c.globalAlpha = w.a;
          c.lineWidth = w.lw * dpr * w.a;
          c.beginPath(); c.arc(w.x, w.y, w.r, 0, TAU); c.stroke();
        }
        for (const p of sparks) {
          c.fillStyle = p.col;
          c.globalAlpha = p.life * 0.9;
          c.beginPath(); c.arc(p.x, p.y, p.sz * p.life * dpr, 0, TAU); c.fill();
        }
        c.restore();
      },
      clear() { sparks.length = 0; waves.length = 0; arcs.length = 0; }
    };
  }

  window.KT = {
    TAU, clamp, lerp, mod,
    PALETTES, MATERIALS,
    makePalette, fillStudioBg, drawSphere, drawStudioRing, drawBevelRect, drawSilkTrail, makeFX
  };
})();
