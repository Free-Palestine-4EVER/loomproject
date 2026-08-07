// LOOM Studio — procedural cartoon butterflies (three.js, no external assets)
// createButterfly(THREE, variantKey) -> { group, update(t) }

/* ------------------------------------------------------------------ */
/* wing outline builders                                              */
/* ------------------------------------------------------------------ */

// Forewing: root at origin, sweeps up-and-out to a soft rounded tip, then
// tucks back under toward the body. `tip` pushes the outer corner further out
// and up (pointier, more "butterfly"); `notch` scallops the trailing edge.
function foreShape(THREE, s) {
  const { w, h } = s;
  const tip = s.tip ?? 1;
  const p = new THREE.Shape();
  p.moveTo(0, 0.02 * h);
  // leading edge — long, shallow, out to the tip
  p.bezierCurveTo(0.35 * w, 1.05 * h, 1.15 * w, 1.35 * h * tip, 1.72 * w * tip, 1.02 * h * tip);
  // rounded outer corner
  p.bezierCurveTo(2.05 * w * tip, 0.82 * h * tip, 2.02 * w, 0.34 * h, 1.62 * w, 0.08 * h);
  // trailing edge back to the body, with an optional scallop
  p.bezierCurveTo(1.3 * w, -0.12 * h, 0.85 * w, (-0.06 - 0.16 * (s.notch ?? 0)) * h, 0.62 * w, -0.2 * h);
  p.bezierCurveTo(0.34 * w, -0.32 * h, 0.12 * w, -0.22 * h, 0, 0.02 * h);
  return p;
}

// Hindwing: shorter, rounder lobe sitting below and slightly behind the fore.
function hindShape(THREE, s) {
  const { w, h } = s;
  const p = new THREE.Shape();
  p.moveTo(0, -0.02 * h);
  p.bezierCurveTo(0.4 * w, -0.18 * h, 1.06 * w, -0.32 * h, 1.24 * w, -0.78 * h);
  p.bezierCurveTo(1.44 * w, -1.28 * h, 1.02 * w, -1.62 * h, 0.62 * w, -1.5 * h);
  p.bezierCurveTo(0.3 * w, -1.4 * h, 0.1 * w, -0.86 * h, 0, -0.02 * h);
  return p;
}

/* ------------------------------------------------------------------ */
/* fan-tessellated wing geometry                                      */
/*  u = root(0) -> rim(1)  (uv.x)   v = along outline (uv.y)          */
/* ------------------------------------------------------------------ */

function wingGeometry(THREE, shape, rings, segs, dome, scallop) {
  const outline = shape.getSpacedPoints(segs);
  const pos = [];
  const uvs = [];
  const idx = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    for (let j = 0; j <= segs; j++) {
      const p = outline[j % outline.length];
      // scalloped rim: pinch the outline in and out around its perimeter, and
      // only near the rim, so the root stays flush against the body
      let k = 1;
      if (scallop) {
        const wave = Math.sin((j / segs) * Math.PI * 2 * scallop.freq);
        k = 1 + scallop.amp * wave * u * u;
      }
      pos.push(p.x * u * k, p.y * u * k, Math.sin(u * Math.PI) * dome);
      uvs.push(u, j / segs);
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j;
      const b = a + row;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* wing texture painted in (u,v) space                                */
/* ------------------------------------------------------------------ */

function wingTexture(THREE, cfg) {
  const W = 512;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");

  // base gradient along u (canvas x = u)
  const g = x.createLinearGradient(0, 0, W, 0);
  cfg.stops.forEach(([t, col]) => g.addColorStop(t, col));
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // soft veins radiating outward
  if (cfg.veins) {
    x.strokeStyle = cfg.veins;
    x.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const y = (i + 0.5) * (H / 7);
      x.beginPath();
      x.moveTo(W * 0.12, y);
      x.lineTo(W * 0.95, y + (Math.sin(i) * H) / 40);
      x.stroke();
    }
  }

  // cartoon dots
  (cfg.dots || []).forEach((d) => {
    x.fillStyle = d.c;
    x.beginPath();
    x.ellipse(d.u * W, d.v * H, d.r * W, d.r * H * 1.6, 0, 0, Math.PI * 2);
    x.fill();
  });

  // rim band = cartoon outline, painted at the outer edge
  if (cfg.rim) {
    const rg = x.createLinearGradient(W * 0.78, 0, W, 0);
    rg.addColorStop(0, cfg.rim + "00");
    rg.addColorStop(0.55, cfg.rim + "cc");
    rg.addColorStop(1, cfg.rim);
    x.fillStyle = rg;
    x.fillRect(W * 0.78, 0, W * 0.22, H);
  }

  return toTex(THREE, c, true);
}

function toTex(THREE, canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function newCanvas(W, H) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return [c, c.getContext("2d")];
}

// deterministic noise so a wing looks identical on every reload
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* --- STAINED: leaded glass panels, lit from within (Lantern) -------- */
function stainedMaps(THREE, cfg) {
  const W = 640;
  const H = 640;
  const [c, x] = newCanvas(W, H);
  const [e, ex] = newCanvas(W, H);
  const rnd = lcg(9271);

  x.fillStyle = cfg.lead;
  x.fillRect(0, 0, W, H);
  ex.fillStyle = "#000";
  ex.fillRect(0, 0, W, H);

  const cols = 5; // along u (root -> tip)
  const rows = 9; // around the outline
  const gap = 7;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x0 = (i / cols) * W;
      const y0 = (j / rows) * H;
      const w = W / cols - gap;
      const h = H / rows - gap;
      const pane = cfg.panes[(i + j) % cfg.panes.length];
      const r = Math.min(w, h) * 0.34;

      const g = x.createRadialGradient(x0 + w / 2, y0 + h / 2, r * 0.2, x0 + w / 2, y0 + h / 2, r * 2.1);
      g.addColorStop(0, pane.hot);
      g.addColorStop(1, pane.cool);

      [x, ex].forEach((ctx, k) => {
        ctx.fillStyle = k === 0 ? g : pane.glow;
        ctx.globalAlpha = k === 0 ? 1 : 0.55 + rnd() * 0.45;
        ctx.beginPath();
        ctx.roundRect(x0 + gap / 2, y0 + gap / 2, w, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  }
  // dark leading around the rim reads as the lantern's frame
  [x, ex].forEach((ctx, k) => {
    ctx.fillStyle = k === 0 ? cfg.lead : "#000";
    ctx.fillRect(W * 0.9, 0, W * 0.1, H);
  });

  return { map: toTex(THREE, c, true), emissiveMap: toTex(THREE, e, true) };
}

/* --- VELVET: plush pile with a fuzzy, tufted rim -------------------- */
function velvetMaps(THREE, cfg) {
  const W = 640;
  const H = 640;
  const [c, x] = newCanvas(W, H);
  const [a, ax] = newCanvas(W, H);
  const rnd = lcg(4413);

  const g = x.createLinearGradient(0, 0, W, 0);
  cfg.stops.forEach(([t, col]) => g.addColorStop(t, col));
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // pile: thousands of short light strokes, denser toward the rim
  x.lineWidth = 1.4;
  for (let i = 0; i < 9000; i++) {
    const u = Math.pow(rnd(), 0.6);
    const px = u * W;
    const py = rnd() * H;
    x.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + 5 + rnd() * 7, py + (rnd() - 0.5) * 5);
    x.stroke();
  }

  // Eyespots are NOT painted here. Constant-v lines in this texture radiate out
  // along the wing outline, so any circle drawn in (u,v) space lands on the
  // wing as a crescent. They're built as real geometry instead — see eyespots().

  // alpha: solid to u≈0.86, then a ragged tuft fringe instead of a clean edge
  ax.fillStyle = "#fff";
  ax.fillRect(0, 0, W * 0.86, H);
  ax.strokeStyle = "#fff";
  ax.lineWidth = 6;
  ax.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const py = (i / 900) * H;
    const len = W * (0.05 + rnd() * 0.12);
    ax.beginPath();
    ax.moveTo(W * 0.84, py);
    ax.lineTo(W * 0.86 + len, py + (rnd() - 0.5) * 8);
    ax.stroke();
  }

  return { map: toTex(THREE, c, true), alphaMap: toTex(THREE, a, false) };
}

/* --- WOVEN: an actual warp/weft lattice with open gaps (LOOM) ------- */
// A hex string in, an rgb() string lightened/darkened by `factor` out — used
// to give every strand its own small brightness jitter so the lattice reads
// as hand-loomed fibre rather than a printed grid.
function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

function wovenMaps(THREE, cfg) {
  const W = 768;
  const H = 768;
  const [c, x] = newCanvas(W, H);
  const [a, ax] = newCanvas(W, H);
  const rnd = lcg(5231);

  // Warm base wash — cream at the root deepening to gold at the tip — so the
  // fibre itself carries colour before a single strand is drawn, and the
  // open gaps in the weave show a coloured veil instead of a flat cutout.
  // Canvas x = u (root -> tip). Previously this canvas started fully
  // transparent (clearRect) with nothing but flat strand colour on top —
  // one reason the wing read as pale and colourless once lit.
  const wash = x.createLinearGradient(0, 0, W, 0);
  cfg.stops.forEach(([t, col]) => wash.addColorStop(t, col));
  x.fillStyle = wash;
  x.fillRect(0, 0, W, H);
  ax.fillStyle = "#000"; // transparent by default — the gaps in the weave
  ax.fillRect(0, 0, W, H);

  // A CHUNKY, legible knit. The original lattice was 30 spokes x 34 rings —
  // fine enough that at the size this butterfly actually renders on the page
  // (a 300-420px hero element), each gap fell below a screen pixel. An
  // alternating light/dark pattern that fine does not survive mip-mapping;
  // it just averages down to flat grey noise, which is exactly the
  // "perforated dot-matrix" the wing used to read as. Few, thick strands
  // read as yarn at real size instead of dissolving into static.
  const warp = 9;  // spokes running root -> tip
  const weft = 10; // rings running around
  const tw = (H / warp) * 0.8;
  const tf = (W / weft) * 0.8;

  const strand = (ctx, x0, y0, x1, y1, width, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  // spokes first (the "under" pass, root -> tip), then rings on top — the
  // alternating highlight is what sells it as woven rather than a printed
  // grid. A small jitter per spoke keeps a fan of nine from reading as a
  // perfect, machine-regular dartboard.
  for (let j = 0; j < warp; j++) {
    const y = ((j + 0.5) / warp) * H + (rnd() - 0.5) * tw * 0.4;
    const k = 0.86 + rnd() * 0.3;
    strand(x, 0, y, W, y, tw, shade(cfg.weftColor, k));
    strand(x, 0, y - tw * 0.3, W, y - tw * 0.3, tw * 0.32, cfg.sheenLine);
    strand(ax, 0, y, W, y, tw, "#fff");
  }
  for (let i = 0; i < weft; i++) {
    const px = ((i + 0.5) / weft) * W + (rnd() - 0.5) * tf * 0.3;
    const k = 0.86 + rnd() * 0.3;
    // Full-length pass first: without it the dashes below punch hard holes
    // right through the wing where the ring is meant to only dip *under*.
    strand(x, px, 0, px, H, tf * 0.84, shade(cfg.warpShadow, k));
    strand(ax, px, 0, px, H, tf, "#fff");
    // then the dashed "over" pass — the strand riding on top of the spoke
    ;[
      [x, shade(cfg.warpColor, k), tf * 0.92, 0],
      [x, cfg.sheenLine, tf * 0.3, -tf * 0.28],
    ].forEach(([ctx, style, width, dx]) => {
      ctx.save();
      ctx.setLineDash([(H / warp) * 0.6, (H / warp) * 0.46])
      ctx.lineDashOffset = (i % 2) * (H / warp) * 0.5;
      strand(ctx, px + dx, 0, px + dx, H, width, style);
      ctx.restore();
    });
  }

  // fibre grain: hundreds of short strokes running the local length of
  // whichever strand they land on, so a "thread" reads as spun fibre —
  // individual filaments catching the light — rather than a flat ribbon.
  // One-time canvas paint at butterfly creation, not a per-frame cost.
  x.lineWidth = 1.1;
  for (let i = 0; i < 1100; i++) {
    const onSpoke = rnd() > 0.45;
    const light = rnd() > 0.5;
    x.strokeStyle = light ? "rgba(255,250,232,0.15)" : "rgba(96,64,22,0.13)";
    const len = 9 + rnd() * 16;
    x.beginPath();
    if (onSpoke) {
      const xx = rnd() * W, yy = rnd() * H;
      x.moveTo(xx, yy);
      x.lineTo(xx + len, yy + (rnd() - 0.5) * 3);
    } else {
      const xx = rnd() * W, yy = rnd() * H;
      x.moveTo(xx, yy);
      x.lineTo(xx + (rnd() - 0.5) * 3, yy + len);
    }
    x.stroke();
  }

  // solid selvedge: a bound edge all the way around the rim, and a solid
  // collar at the root where the wing meets the body (no gaps at the hinge)
  [x, ax].forEach((ctx, k) => {
    ctx.fillStyle = k === 0 ? cfg.edgeColor : "#fff";
    ctx.fillRect(W * 0.9, 0, W * 0.1, H);
    ctx.fillRect(0, 0, W * 0.08, H);
  });
  x.fillStyle = cfg.sheenLine;
  x.fillRect(W * 0.9, 0, W * 0.016, H);

  return { map: toTex(THREE, c, true), alphaMap: toTex(THREE, a, false) };
}

/* ------------------------------------------------------------------ */
/* variant definitions                                                */
/* ------------------------------------------------------------------ */

export const SPECS = {
  mango: {
    id: "mango",
    name: "Mango",
    tagline: "Warm brass monarch. Plush, glossy, straight out of the LOOM palette.",
    scale: 1,
    fore: { w: 0.86, h: 0.82, tip: 1.02, notch: 0.25 },
    hind: { w: 0.82, h: 0.78 },
    rings: 14,
    segs: 96,
    dome: 0.14,
    bend: 0.3,
    flapMin: 6,
    flapMax: 54,
    period: 2.6,
    body: { color: 0x3a2415, rough: 0.55, len: 0.72, rad: 0.135 },
    eye: { color: 0xfffdf7, pupil: 0x1a1108, size: 0.15, style: "googly" },
    antenna: 0x3a2415,
    antennaTip: 0xd8b568,
    material: { rough: 0.42, metal: 0.05, clearcoat: 0.5, sheen: 0.4, transmission: 0 },
    tex: {
      stops: [
        [0.0, "#ffe9b8"],
        [0.42, "#f0b950"],
        [0.82, "#e08a2a"],
        [1.0, "#c9761f"],
      ],
      veins: "rgba(120,66,16,0.18)",
      rim: "#5a3510",
      dots: [
        { u: 0.72, v: 0.18, r: 0.045, c: "#fff4dc" },
        { u: 0.62, v: 0.34, r: 0.035, c: "#fff4dc" },
        { u: 0.78, v: 0.52, r: 0.04, c: "#fff4dc" },
        { u: 0.66, v: 0.72, r: 0.032, c: "#fff4dc" },
        { u: 0.74, v: 0.88, r: 0.042, c: "#fff4dc" },
        { u: 0.4, v: 0.5, r: 0.05, c: "rgba(255,255,255,0.28)" },
      ],
    },
  },

  aqua: {
    id: "aqua",
    name: "Aqua",
    tagline: "Frosted acrylic wings — light passes straight through, like the stands.",
    scale: 1,
    fore: { w: 0.98, h: 0.74, tip: 1.14, notch: 0 },
    hind: { w: 0.7, h: 0.86 },
    rings: 14,
    segs: 96,
    dome: 0.09,
    bend: 0.38,
    flapMin: 4,
    flapMax: 48,
    period: 3.1,
    body: { color: 0x123640, rough: 0.35, len: 0.66, rad: 0.125 },
    eye: { color: 0x9fe4f2, pupil: 0x06303c, size: 0.145, style: "crystal" },
    antenna: 0x123640,
    antennaTip: 0x8fd4e3,
    material: { rough: 0.12, metal: 0, clearcoat: 1, sheen: 0.2, transmission: 0.45 },
    tex: {
      stops: [
        [0.0, "#eafbff"],
        [0.38, "#bfe8f0"],
        [0.75, "#7fcadd"],
        [1.0, "#4aa8c4"],
      ],
      veins: "rgba(255,255,255,0.45)",
      rim: "#2b7f99",
      dots: [
        { u: 0.68, v: 0.26, r: 0.05, c: "rgba(255,255,255,0.6)" },
        { u: 0.55, v: 0.55, r: 0.06, c: "rgba(255,255,255,0.45)" },
        { u: 0.72, v: 0.8, r: 0.045, c: "rgba(255,255,255,0.55)" },
      ],
    },
  },

  blossom: {
    id: "blossom",
    name: "Blossom",
    tagline: "Folded-paper pastel. Matte, faceted, papercraft-cute.",
    scale: 1,
    fore: { w: 0.8, h: 0.92, tip: 0.9, notch: 0.5 },
    hind: { w: 0.86, h: 0.72 },
    rings: 5,
    segs: 22,
    dome: 0.18,
    bend: 0.24,
    flapMin: 8,
    flapMax: 60,
    period: 2.2,
    body: { color: 0x4a3550, rough: 0.85, len: 0.62, rad: 0.145 },
    eye: { color: 0xfff8fb, pupil: 0x2c1c33, size: 0.155, style: "paper" },
    antenna: 0x4a3550,
    antennaTip: 0xffc2d8,
    material: { rough: 0.92, metal: 0, clearcoat: 0, sheen: 0.9, transmission: 0 },
    flat: true,
    tex: {
      stops: [
        [0.0, "#fff1f6"],
        [0.4, "#ffc8dd"],
        [0.72, "#d9a7e8"],
        [1.0, "#a97fd4"],
      ],
      veins: null,
      rim: "#7c569b",
      dots: [
        { u: 0.6, v: 0.3, r: 0.06, c: "rgba(255,255,255,0.55)" },
        { u: 0.68, v: 0.68, r: 0.05, c: "rgba(255,255,255,0.45)" },
      ],
    },
  },
};

/* --- eyespots as real discs sitting on the wing surface ------------- */
// Placed at an actual mesh vertex, so they're round on the wing rather than
// smeared by the fan UVs. The wing's u is baked into each disc's uv so the
// shared bend shader displaces the disc exactly as much as the wing under it.
function eyespots(THREE, wing, geo, spots, rings, segs, bendSource) {
  const row = segs + 1;
  const p = new THREE.Vector3();
  spots.forEach((s) => {
    const i = Math.round(s.u * rings) * row + (Math.round(s.v * segs) % row);
    p.fromBufferAttribute(geo.attributes.position, i);
    const layers = [
      [s.r, s.halo],
      [s.r * 0.76, s.outer],
      [s.r * 0.46, s.inner],
      [s.r * 0.16, "#fffdf7"],
    ];
    layers.forEach(([r, col], k) => {
      const g = new THREE.CircleGeometry(r, 30);
      const uv = g.attributes.uv;
      for (let j = 0; j < uv.count; j++) uv.setXY(j, s.u, 0);
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(col),
        roughness: 0.95,
        sheen: 0.7,
        sheenColor: new THREE.Color(0xffd9c0),
        side: THREE.DoubleSide,
      });
      m.onBeforeCompile = bendSource.onBeforeCompile;
      const d = new THREE.Mesh(g, m);
      d.position.set(p.x, p.y, p.z + 0.012 + k * 0.004);
      wing.add(d);
    });
  });
}

/* ---- round two: three different constructions, not three recolours -- */

SPECS.lantern = {
  id: "lantern",
  name: "Lantern",
  tagline: "Leaded-glass panes lit from inside. Glows in the dark half of the page.",
  style: "stained",
  scale: 1,
  fore: { w: 0.9, h: 0.86, tip: 1.06, notch: 0.15 },
  hind: { w: 0.8, h: 0.8 },
  rings: 12,
  segs: 84,
  dome: 0.12,
  bend: 0.26,
  flapMin: 6,
  flapMax: 50,
  period: 3.4,
  scallop: { freq: 9, amp: 0.05 },
  body: { color: 0x1d1410, rough: 0.5, len: 0.6, rad: 0.135 },
  eye: { color: 0xfff6e2, pupil: 0x140d07, size: 0.145, style: "glow", glow: 0xffcf7a },
  antenna: 0x1d1410,
  antennaTip: 0xffcf7a,
  material: { rough: 0.3, metal: 0.1, clearcoat: 0.7, sheen: 0.2, transmission: 0 },
  emissive: 0xffffff,
  emissiveIntensity: 0.85,
  tex: {
    lead: "#241b15",
    panes: [
      { hot: "#ffe6a8", cool: "#e0a23c", glow: "#ffcf7a" },
      { hot: "#ffd0e0", cool: "#c9628f", glow: "#ff9ec4" },
      { hot: "#cdeff7", cool: "#4f9fb8", glow: "#8fd4e3" },
    ],
  },
};

SPECS.velvet = {
  id: "velvet",
  name: "Velvet",
  tagline: "Plush moth-butterfly with a fuzzy tufted rim and two big eyespots.",
  style: "velvet",
  scale: 1,
  fore: { w: 0.82, h: 0.9, tip: 0.88, notch: 0.1 },
  hind: { w: 0.94, h: 0.78 },
  rings: 14,
  segs: 96,
  dome: 0.22,
  bend: 0.2,
  flapMin: 10,
  flapMax: 44,
  period: 3.8,
  scallop: { freq: 7, amp: 0.045 },
  body: { color: 0x3a1f2e, rough: 1, len: 0.66, rad: 0.165 },
  eye: { color: 0xfff7f2, pupil: 0x2a1220, size: 0.165, style: "sleepy" },
  antenna: 0x3a1f2e,
  antennaTip: 0xe8b4c8,
  material: { rough: 1, metal: 0, clearcoat: 0, sheen: 1, transmission: 0 },
  sheenColor: 0xffc9a8,
  tex: {
    stops: [
      [0.0, "#8b3f5c"],
      [0.4, "#a8496b"],
      [0.78, "#6d2f52"],
      [1.0, "#4a1f3c"],
    ],
  },
  foreSpots: [{ u: 0.62, v: 0.28, r: 0.19, halo: "#f3dcc6", outer: "#2a1220", inner: "#e8a04a" }],
  hindSpots: [{ u: 0.6, v: 0.52, r: 0.15, halo: "#f3dcc6", outer: "#2a1220", inner: "#e8a04a" }],
};

SPECS.woven = {
  id: "woven",
  name: "Woven",
  tagline: "Wings made of actual warp and weft — open weave, bound brass selvedge.",
  style: "woven",
  scale: 1,
  fore: { w: 0.88, h: 0.84, tip: 1.1, notch: 0.2 },
  hind: { w: 0.8, h: 0.82 },
  rings: 14,
  segs: 96,
  dome: 0.1,
  bend: 0.3,
  // A REAL open/close. The old 5..52 band (47 degrees) never let the wings
  // spread flat and never let them close over the back, so at any usable beat
  // rate the stroke read as a vibration rather than as a wingbeat — no amount
  // of profile tuning can fix that, because a flight profile can only scale
  // the stroke AROUND its rest angle (strokeAmp), never widen this band.
  // -14..76 spreads slightly below horizontal at the bottom of the stroke and
  // brings the wings up near-together at the top, which is the shape a viewer
  // reads as "opening and closing".
  flapMin: -14,
  flapMax: 76,
  period: 2.9,
  body: { color: 0x3a1020, rough: 0.75, len: 0.64, rad: 0.14 },
  // Glow, not button. The stitched-disc eye is lovely on a turntable and
  // disappears on the page: it flies at roughly 165px of wingspan, where the
  // disc is ~6px and its thread holes are sub-pixel, so it read as a blank
  // head. The glow eye carries its own emissive, which is what keeps it
  // legible at flight size and against the dark lower sections.
  eye: { color: 0xfff6e2, pupil: 0x140d07, size: 0.145, style: "glow", glow: 0xffcf7a },
  antenna: 0x3a1020,
  antennaTip: 0xffc2dd,
  material: { rough: 0.55, metal: 0.15, clearcoat: 0.3, sheen: 0.5, transmission: 0 },
  membrane: { color: 0xffd9ec, opacity: 0.22 },
  // Rose — the LOOM magenta (#f21c8c) carried through the warp/weft rather
  // than the original brass. Same woven construction, recoloured: the weave
  // is the brand idea, the palette is the choice.
  tex: {
    stops: [
      [0.0, "#fff0f7"],
      [0.45, "#ffb3d6"],
      [0.8, "#f2559f"],
      [1.0, "#c01c6d"],
    ],
    warpColor: "#ffe6f2",
    warpShadow: "#bb2a72",
    weftColor: "#f56cae",
    sheenLine: "rgba(255,240,247,0.6)",
    edgeColor: "#bb2a72",
  },
};

/* ------------------------------------------------------------------ */
/* faces — one construction per butterfly, never the same googly pair  */
/*                                                                     */
/* Every style returns { blink(k) } where k is 0 (open) -> 1 (shut).   */
/* Styles that physically can't blink (stitched, faceted) just idle.   */
/* ------------------------------------------------------------------ */

function buildFace(THREE, S, headR, group) {
  const Y = 0.66; // head centre
  const style = S.eye.style || "googly";
  const size = S.eye.size;
  const parts = [];
  // every material buildFace() constructs, so the caller can dispose them —
  // geometries are already caught by Companion's scene traverse, materials aren't
  const mats = [];

  const put = (mesh, sx, ox, oy, oz) => {
    mesh.position.set(sx * headR * ox, Y + headR * oy, headR * oz);
    group.add(mesh);
    parts.push(mesh);
    return mesh;
  };

  const mouth = (color, radius, tube, arc, y, tilt) => {
    const mouthMat = new THREE.MeshBasicMaterial({ color });
    mats.push(mouthMat);
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(headR * radius, headR * tube, 8, 28, arc),
      mouthMat
    );
    m.position.set(0, Y + headR * y, headR * 0.98);
    m.rotation.set(-0.25, 0, Math.PI + Math.PI * 0.05 + (tilt || 0));
    group.add(m);
    return m;
  };

  /* ---- GOOGLY (Mango): classic bulging cartoon eye, two glints ---- */
  if (style === "googly") {
    const white = new THREE.MeshPhysicalMaterial({ color: S.eye.color, roughness: 0.08, clearcoat: 1 });
    const pupil = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
    mats.push(white, pupil, glint);
    [-1, 1].forEach((sx) => {
      put(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 18), white), sx, 0.5, 0.06, 0.72);
      put(new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, 18, 14), pupil), sx, 0.53, 0.042, 0.72 + (size / headR) * 0.66);
      put(new THREE.Mesh(new THREE.SphereGeometry(size * 0.19, 12, 10), glint), sx, 0.4, 0.14, 0.72 + (size / headR) * 0.8);
    });
    mouth(S.eye.pupil, 0.34, 0.075, Math.PI * 0.9, -0.3);
  }

  /* ---- CRYSTAL (Aqua): faceted gems, no whites, dark core inside --- */
  if (style === "crystal") {
    const gem = new THREE.MeshPhysicalMaterial({
      color: S.eye.color,
      roughness: 0.02,
      metalness: 0,
      transmission: 0.85,
      thickness: size,
      ior: 1.8,
      clearcoat: 1,
      flatShading: true,
      transparent: true,
    });
    const core = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    mats.push(gem, core);
    [-1, 1].forEach((sx) => {
      const g = put(new THREE.Mesh(new THREE.IcosahedronGeometry(size * 1.05, 0), gem), sx, 0.5, 0.05, 0.7);
      g.rotation.set(0.4, sx * 0.5, 0.2);
      put(new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.34, 0), core), sx, 0.5, 0.05, 0.7);
    });
    // a straight, cool little line of a mouth — gems don't grin
    const lineMat = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    mats.push(lineMat);
    const line = new THREE.Mesh(
      new THREE.CapsuleGeometry(headR * 0.05, headR * 0.34, 4, 10),
      lineMat
    );
    line.rotation.z = Math.PI / 2;
    line.position.set(0, Y - headR * 0.36, headR * 0.94);
    group.add(line);
  }

  /* ---- PAPER (Blossom): flat printed almond eyes, cut-out look ----- */
  if (style === "paper") {
    const ink = new THREE.MeshBasicMaterial({ color: S.eye.pupil, side: THREE.DoubleSide });
    const white = new THREE.MeshBasicMaterial({ color: S.eye.color, side: THREE.DoubleSide });
    mats.push(ink, white);
    [-1, 1].forEach((sx) => {
      // printed on the head as flat discs, not glued-on balls
      const e = put(new THREE.Mesh(new THREE.CircleGeometry(size * 0.95, 26), ink), sx, 0.48, 0.08, 0.99);
      e.scale.set(0.78, 1.15, 1);
      e.rotation.y = sx * -0.35;
      const hi = put(new THREE.Mesh(new THREE.CircleGeometry(size * 0.3, 18), white), sx, 0.39, 0.2, 1.02);
      hi.rotation.y = sx * -0.35;
    });
    // rosy paper cheeks
    const blush = new THREE.MeshBasicMaterial({ color: 0xff9ec0, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    mats.push(blush);
    [-1, 1].forEach((sx) => {
      const b = put(new THREE.Mesh(new THREE.CircleGeometry(size * 0.5, 20), blush), sx, 0.76, -0.3, 0.82);
      b.rotation.y = sx * -0.7;
    });
    mouth(S.eye.pupil, 0.22, 0.06, Math.PI * 0.95, -0.34);
  }

  /* ---- GLOW (Lantern): the eyes are two little lit panes ----------- */
  if (style === "glow") {
    const lit = new THREE.MeshStandardMaterial({
      color: 0x2a1c10,
      emissive: new THREE.Color(S.eye.glow),
      emissiveIntensity: 2.4,
      roughness: 0.3,
    });
    const lead = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.8 });
    mats.push(lit, lead);
    [-1, 1].forEach((sx) => {
      const ring = put(new THREE.Mesh(new THREE.TorusGeometry(size * 0.92, size * 0.2, 10, 26), lead), sx, 0.5, 0.06, 0.78);
      ring.rotation.y = sx * -0.25;
      const pane = put(new THREE.Mesh(new THREE.SphereGeometry(size * 0.86, 22, 16), lit), sx, 0.5, 0.06, 0.76);
      pane.scale.z = 0.55;
      const spark = new THREE.PointLight(S.eye.glow, 0.48, 1.2);
      spark.position.copy(pane.position);
      group.add(spark);
    });
    mouth(0x1a120c, 0.26, 0.06, Math.PI * 0.8, -0.34);
  }

  /* ---- SLEEPY (Velvet): heavy lids and long lashes ----------------- */
  if (style === "sleepy") {
    const white = new THREE.MeshPhysicalMaterial({ color: S.eye.color, roughness: 0.15, clearcoat: 0.8 });
    const iris = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    const lidMat = new THREE.MeshPhysicalMaterial({ color: S.body.color, roughness: 1, sheen: 1 });
    const lashMat = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    mats.push(white, iris, lidMat, lashMat);

    [-1, 1].forEach((sx) => {
      put(new THREE.Mesh(new THREE.SphereGeometry(size, 26, 20), white), sx, 0.5, 0.05, 0.7);
      put(new THREE.Mesh(new THREE.SphereGeometry(size * 0.46, 18, 14), iris), sx, 0.5, 0.0, 0.7 + (size / headR) * 0.66);
      // lid: a shallow cap sitting over the top third of the eye
      const lid = put(
        new THREE.Mesh(new THREE.SphereGeometry(size * 1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), lidMat),
        sx, 0.5, 0.05, 0.7
      );
      lid.rotation.x = 0.55;
      // three lashes fanning off the outer corner
      [-0.4, 0, 0.4].forEach((a, i) => {
        const lash = new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.05, size * (0.5 + i * 0.08), 4, 8), lashMat);
        lash.position.set(sx * (headR * 0.5 + size * 0.95), Y + headR * 0.05 + size * 0.7, headR * 0.7);
        lash.rotation.z = sx * (0.5 + a);
        group.add(lash);
      });
    });
    mouth(S.eye.pupil, 0.2, 0.055, Math.PI * 0.9, -0.36);
  }

  /* ---- BUTTON (Woven): plush toy buttons, sewn on with thread ------ */
  if (style === "button") {
    const btn = new THREE.MeshPhysicalMaterial({
      color: S.eye.color,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
    });
    const thread = new THREE.MeshBasicMaterial({ color: S.eye.pupil });
    mats.push(btn, thread);
    [-1, 1].forEach((sx) => {
      const disc = put(new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.3, 26), btn), sx, 0.5, 0.05, 0.8);
      disc.rotation.set(Math.PI / 2, 0, 0);
      // two crossed stitches through four holes, like a real coat button
      [-1, 1].forEach((d) => {
        const st = put(new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.075, size * 0.85, 4, 8), thread), sx, 0.5, 0.05, 0.8 + (size / headR) * 0.2);
        st.rotation.z = (d * Math.PI) / 4;
      });
      // the four holes themselves
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([hx, hy]) => {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(size * 0.11, 12), thread);
        hole.position.set(
          sx * headR * 0.5 + hx * size * 0.34,
          Y + headR * 0.05 + hy * size * 0.34,
          headR * 0.8 + size * 0.17
        );
        group.add(hole);
      });
    });
    // stitched smile: a running dash of little thread ticks
    for (let i = 0; i < 5; i++) {
      const a = -0.55 + (i / 4) * 1.1;
      const tick = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.035, headR * 0.11, 4, 6), thread);
      tick.position.set(Math.sin(a) * headR * 0.3, Y - headR * 0.34 - Math.cos(a) * headR * 0.1, headR * 0.95);
      tick.rotation.z = a * 1.2 + Math.PI / 2;
      group.add(tick);
    }
  }

  return { parts, mats };
}

/* ------------------------------------------------------------------ */
/* wing rig defaults                                                  */
/*                                                                     */
/* Every named field a flight profile may drive per-frame via the      */
/* `drive` argument to update(t, drive). All fields are optional on a  */
/* `drive` object — anything omitted falls back to the default here.   */
/* Exported so callers (butterflyAsset.js, flight profiles) can read   */
/* the defaults instead of re-typing the magic numbers.                */
/* ------------------------------------------------------------------ */
export const WING_RIG_DEFAULTS = Object.freeze({
  strokeAmp: 1,          // multiplier on stroke angular range (0 = parked at rest angle)
  strokeRate: 1,         // multiplier on beat frequency (cycles per unit t)
  downstrokeFrac: 0.38,  // fraction of each beat spent on the fast power (down) stroke
  pronationAmp: 0.34,    // radians, peak wing pitch/twist about the leading-edge axis
  pronationPhase: 0.22,  // 0..1, phase offset of the pronation wave vs the stroke wave
  sweepAmp: 0.12,        // radians, peak fore/aft sweep (deviation) of the wing
  sweepPhase: 0,         // 0..1, phase offset of the sweep wave vs the stroke wave
  hindPhase: 0.06,       // 0..1, phase LAG of the hindwing's whole cycle vs the forewing's
  membraneLagFrac: 0.09, // fraction of the beat period used as the membrane-lag time constant
  membraneCamber: 1,     // multiplier on the always-on spanwise camber bulge
  bobAmp: 1,             // multiplier on the body's stroke-coupled vertical bob (position.y)
  tiltAmp: 1,            // multiplier on the body's stroke-coupled pitch tilt (rotation.x)
});

// Builds one wing material (fore or hind get their own instance + uniforms,
// because fore/hind can now run the stroke at a phase offset from each other
// — a single shared bend uniform would only ever answer for one of them).
// Shader responsibilities:
//  1) bend the membrane: uBendLag is a JS-side EXPONENTIALLY LAGGED copy of
//     the stroke openness (see update() below) — the trailing edge arrives
//     late, proportional to how far behind the lag filter is.
//  2) camber: uCamber is an always-on, un-lagged bulge proportional to the
//     stroke's instantaneous angular velocity — a simple parabola across the
//     span (zero at root and tip, peak mid-span) so the membrane looks like
//     it is catching air, not just trailing.
//  3) RECOMPUTE THE NORMAL analytically from the derivative of the already
//     bent view-space position (dFdx/dFdy), blended with the mesh's own
//     smooth vertex normal. Fixes the correctness bug where every frame bent
//     real vertex positions while lighting kept answering for the flat bind
//     pose — deeper deformation (lag + camber) makes that mismatch glaring.
//     This is a lighting-correctness fix, not a restyle: the blend factor is
//     fixed, not exposed as a tunable.
function makeWingMaterial(THREE, S, maps) {
  const mat = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    alphaMap: maps.alphaMap || null,
    emissiveMap: maps.emissiveMap || null,
    emissive: new THREE.Color(S.emissive ?? 0x000000),
    emissiveIntensity: S.emissiveIntensity ?? 1,
    side: THREE.DoubleSide,
    roughness: S.material.rough,
    metalness: S.material.metal,
    clearcoat: S.material.clearcoat,
    clearcoatRoughness: 0.25,
    sheen: S.material.sheen,
    sheenColor: new THREE.Color(S.sheenColor ?? 0xffffff),
    transmission: S.material.transmission,
    thickness: S.material.transmission ? 0.4 : 0,
    transparent: S.material.transmission > 0 || !!maps.alphaMap,
    // alphaTest keeps the open weave sorting correctly against itself, which
    // plain alpha blending on a DoubleSide mesh will not do
    alphaTest: maps.alphaMap ? 0.42 : 0,
    depthWrite: true,
    flatShading: !!S.flat,
  });

  const uniforms = { uBendLag: { value: 0 }, uCamber: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBendLag = uniforms.uBendLag;
    sh.uniforms.uCamber = uniforms.uCamber;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uBendLag;\nuniform float uCamber;\nvarying vec3 vBendPos;"
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float _u = uv.x;
         transformed.z += uBendLag * _u * _u + uCamber * _u * (1.0 - _u) * 4.0;
         transformed.xy *= 1.0 - 0.06 * uBendLag * uBendLag * _u;`
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\n        vBendPos = mvPosition.xyz;"
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBendPos;")
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
         {
           vec3 _fdx = dFdx(vBendPos);
           vec3 _fdy = dFdy(vBendPos);
           vec3 _bentNormal = normalize(cross(_fdx, _fdy));
           #ifdef DOUBLE_SIDED
           _bentNormal *= faceDirection;
           #endif
           normal = normalize(mix(normal, _bentNormal, 0.65));
         }`
      );
  };
  return { mat, uniforms };
}

/* ------------------------------------------------------------------ */
/* wing kinematics — pure functions of t, reused for fore and hind     */
/* ------------------------------------------------------------------ */

// cyclePos: 0..1 through the beat, warped asymmetric so the down-stroke (the
// power stroke) burns through faster than the up-stroke (the recovery).
// Both halves are their own smoothstep, so the warp is C1-continuous at
// every junction (start of down-stroke, the reversal, and the wrap back to
// the next down-stroke) — no seam for a fast scroll or a slow one to expose.
// `phaseOffsetFrac` (0..1) shifts the whole cycle — this is how the hindwing
// runs `hindPhase` behind the forewing.
// Pronation (wing pitch about the leading edge) and sweep (fore/aft
// deviation) are each a sine at the SAME frequency as the stroke, phase-
// shifted by their own fraction of the cycle. Two rotations at one frequency
// with a phase offset is exactly what makes a wingTIP trace a small
// Lissajous loop (a tilted figure-eight) instead of hinging like a door.
function wingCycle(t, period, rate, downFrac, pronPhaseFrac, sweepPhaseFrac, phaseOffsetFrac) {
  const cyclePos = (((t * rate) / period + phaseOffsetFrac) % 1 + 1) % 1;
  let openRaw; // 0 = spread, 1 = raised
  if (cyclePos < downFrac) {
    const x = cyclePos / downFrac;
    openRaw = 1 - x * x * (3 - 2 * x); // raised -> spread: fast power stroke
  } else {
    const x = (cyclePos - downFrac) / (1 - downFrac);
    openRaw = x * x * (3 - 2 * x); // spread -> raised: slower recovery
  }
  const pronCyc = ((cyclePos + pronPhaseFrac) % 1 + 1) % 1;
  const sweepCyc = ((cyclePos + sweepPhaseFrac) % 1 + 1) % 1;
  return {
    openRaw,
    pronRaw: Math.sin(pronCyc * Math.PI * 2),
    sweepRaw: Math.sin(sweepCyc * Math.PI * 2),
    cyclePos,
  };
}

// Per-wing membrane state: an exponentially lagged copy of stroke openness
// (the trailing edge arriving late, proportional to how far the lag has
// fallen behind) plus an always-on camber bulge driven by the stroke's
// instantaneous angular velocity (a wing catching air cambers; a stalled one
// doesn't). `t` is the caller's own clock — see butterflyAsset.js's header
// for why it isn't always real seconds — so the lag time constant is
// expressed as a FRACTION of the beat period, keeping the trail's relative
// length constant whether the flap is coasting or mid-burst.
function makeBendTracker(S) {
  let lastT = null;
  let lastOpen = 0.5;
  let bendState = 0;
  return function trackBend(openness, t, lagFrac, camberMult, uniforms) {
    const dtLocal = lastT === null ? 0 : Math.max(0, t - lastT);
    lastT = t;
    const targetBend = -(openness * 2 - 1) * S.bend;
    const lagTau = Math.max(1e-4, S.period * lagFrac);
    const lagRate = dtLocal > 0 ? 1 - Math.exp(-dtLocal / lagTau) : 1;
    bendState += (targetBend - bendState) * lagRate;
    const velNorm = dtLocal > 0 ? ((openness - lastOpen) / dtLocal) * S.period : 0;
    lastOpen = openness;
    uniforms.uBendLag.value = bendState;
    // No THREE reference in this pure helper (only createButterfly gets
    // THREE injected) — a manual clamp instead of THREE.MathUtils.clamp.
    const camberRaw = Math.max(-1, Math.min(1, velNorm * 0.18));
    uniforms.uCamber.value = camberRaw * S.bend * camberMult;
  };
}

/* ------------------------------------------------------------------ */
/* builder                                                            */
/* ------------------------------------------------------------------ */

export function createButterfly(THREE, key) {
  const S = SPECS[key];
  const group = new THREE.Group();

  const maps =
    S.style === "stained" ? stainedMaps(THREE, S.tex)
    : S.style === "velvet" ? velvetMaps(THREE, S.tex)
    : S.style === "woven" ? wovenMaps(THREE, S.tex)
    : { map: wingTexture(THREE, S.tex) };

  // Fore and hind each get their own material + bend uniforms so they can
  // run the stroke (and therefore the membrane lag/camber that follows it)
  // at a phase offset from one another. Both sides (L/R) of a given wing
  // share one material — mirroring is a transform (scale.x = sx), not a
  // material change.
  const { mat: foreMat, uniforms: foreU } = makeWingMaterial(THREE, S, maps);
  const { mat: hindMat, uniforms: hindU } = makeWingMaterial(THREE, S, maps);

  // The veil behind an open weave shares its wing's bend uniforms, so it
  // curls exactly in step with the mesh it is backing.
  function makeMembraneMat(sourceMat) {
    if (!S.membrane) return null;
    const m = new THREE.MeshPhysicalMaterial({
      color: S.membrane.color,
      transparent: true,
      opacity: S.membrane.opacity,
      roughness: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    m.onBeforeCompile = sourceMat.onBeforeCompile;
    return m;
  }
  const foreMembraneMat = makeMembraneMat(foreMat);
  const hindMembraneMat = makeMembraneMat(hindMat);

  const wingMeshes = [];
  const sides = [1, -1];
  const hinges = [];

  sides.forEach((sx) => {
    // Shoulder: the fixed anchor point on the side of the thorax, BEHIND the
    // body, the way a real butterfly's wing root sits. Pivoting on the
    // body's centre axis (0,0,0) swings the wing surface straight through
    // the abdomen and head on every stroke — no amount of tweaking the wing
    // shape fixes that, the axis is the bug. Fore and hind each get their
    // OWN hinge under this shared shoulder so they can be driven
    // independently (phase offset, different amplitudes).
    const shoulder = new THREE.Group();
    shoulder.name = sx > 0 ? "Shoulder_R" : "Shoulder_L";
    shoulder.position.set(sx * S.body.rad * 0.62, 0.3, -S.body.rad * 1.5);
    group.add(shoulder);

    const foreHinge = new THREE.Group();
    foreHinge.name = sx > 0 ? "WingHinge_R_fore" : "WingHinge_L_fore";
    shoulder.add(foreHinge);
    const hindHinge = new THREE.Group();
    hindHinge.name = sx > 0 ? "WingHinge_R_hind" : "WingHinge_L_hind";
    shoulder.add(hindHinge);
    hinges.push({ hinge: foreHinge, sx, wing: "fore" }, { hinge: hindHinge, sx, wing: "hind" });

    const fore = new THREE.Mesh(
      wingGeometry(THREE, foreShape(THREE, S.fore), S.rings, S.segs, S.dome, S.scallop),
      foreMat
    );
    const hind = new THREE.Mesh(
      wingGeometry(THREE, hindShape(THREE, S.hind), S.rings, S.segs, S.dome * 0.8, S.scallop),
      hindMat
    );
    // hindwing tucks behind and a touch below the fore
    hind.position.set(0.02, -0.06, -0.03);

    if (S.foreSpots) eyespots(THREE, fore, fore.geometry, S.foreSpots, S.rings, S.segs, foreMat);
    if (S.hindSpots) eyespots(THREE, hind, hind.geometry, S.hindSpots, S.rings, S.segs, hindMat);

    const foreWing = new THREE.Group();
    foreWing.scale.x = sx;
    foreWing.rotation.z = sx * -0.05;
    foreWing.add(fore);
    if (foreMembraneMat) {
      const veil = new THREE.Mesh(fore.geometry, foreMembraneMat);
      veil.position.z -= 0.012;
      foreWing.add(veil);
    }
    foreHinge.add(foreWing);

    const hindWing = new THREE.Group();
    hindWing.scale.x = sx;
    hindWing.rotation.z = sx * -0.05;
    hindWing.add(hind);
    if (hindMembraneMat) {
      const veil = new THREE.Mesh(hind.geometry, hindMembraneMat);
      veil.position.copy(hind.position);
      veil.position.z -= 0.012;
      hindWing.add(veil);
    }
    hindHinge.add(hindWing);

    wingMeshes.push(fore, hind);
  });

  /* ---- body ---- */
  // Keep the body genuinely dark — sheen + a bright key wash a mid tone out to
  // grey, which reads as plastic rather than a velvety little thorax.
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: S.body.color,
    roughness: S.body.rough,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
    sheen: 0.35,
    sheenColor: new THREE.Color(S.antennaTip),
    flatShading: !!S.flat,
  });

  // Taper the capsule toward the tail so it reads as an abdomen, not a peg.
  const abGeo = new THREE.CapsuleGeometry(S.body.rad, S.body.len, 8, S.flat ? 8 : 24);
  {
    const pa = abGeo.attributes.position;
    const half = S.body.len / 2 + S.body.rad;
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i);
      const k = 1 - 0.42 * Math.max(0, (half - y) / (2 * half));
      pa.setX(i, pa.getX(i) * k);
      pa.setZ(i, pa.getZ(i) * k * 0.94);
    }
    abGeo.computeVertexNormals();
  }
  const abdomen = new THREE.Mesh(abGeo, bodyMat);
  abdomen.position.y = -0.06;
  group.add(abdomen);

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(S.body.rad * 1.35, S.flat ? 10 : 28, S.flat ? 8 : 20), bodyMat);
  thorax.position.y = 0.34;
  thorax.scale.set(1, 1.1, 1);
  group.add(thorax);

  const headR = S.body.rad * 1.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, S.flat ? 10 : 28, S.flat ? 8 : 20), bodyMat);
  head.position.y = 0.66;
  group.add(head);

  /* ---- eyes + mouth: a different construction per butterfly ---- */
  const face = buildFace(THREE, S, headR, group);

  /* ---- antennae ---- */
  const antMat = new THREE.MeshStandardMaterial({ color: S.antenna, roughness: 0.6 });
  const tipMat = new THREE.MeshStandardMaterial({ color: S.antennaTip, roughness: 0.35, metalness: 0.2 });
  const antennae = [];

  [-1, 1].forEach((sx) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sx * 0.06, 0.76, 0.02),
      new THREE.Vector3(sx * 0.3, 1.14, 0.04),
      new THREE.Vector3(sx * 0.52, 1.32, 0.02)
    );
    const a = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 8, false), antMat);
    group.add(a);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), tipMat);
    tip.position.copy(curve.getPoint(1));
    group.add(tip);
    antennae.push(tip);
  });

  group.scale.setScalar(S.scale);

  /* ---- animation ---- */
  // Per-wing (fore/hind) exponential bend trackers: closure state so the
  // membrane lag has a real "time since last call" to filter against. Two
  // independent instances because fore and hind can run at a phase offset.
  const foreBend = makeBendTracker(S);
  const hindBend = makeBendTracker(S);

  const lo = THREE.MathUtils.degToRad(S.flapMin);
  const hi = THREE.MathUtils.degToRad(S.flapMax);
  const restAngle = lo + 0.5 * (hi - lo);

  // update(t, drive) — `drive` is optional; every field in WING_RIG_DEFAULTS
  // may be overridden per-frame by a flight profile. Called with no `drive`
  // (or `drive` omitted entirely), the rig runs on its own defaults and
  // looks correct with nothing driving it — this is what ButterflyField.js's
  // plain `bf.update(t)` calls get.
  function update(t, drive) {
    const d = drive || null;
    const rate = d?.strokeRate ?? WING_RIG_DEFAULTS.strokeRate;
    const downFrac = THREE.MathUtils.clamp(d?.downstrokeFrac ?? WING_RIG_DEFAULTS.downstrokeFrac, 0.05, 0.95);
    const strokeAmp = d?.strokeAmp ?? WING_RIG_DEFAULTS.strokeAmp;
    const pronationAmp = d?.pronationAmp ?? WING_RIG_DEFAULTS.pronationAmp;
    const pronationPhase = d?.pronationPhase ?? WING_RIG_DEFAULTS.pronationPhase;
    const sweepAmp = d?.sweepAmp ?? WING_RIG_DEFAULTS.sweepAmp;
    const sweepPhase = d?.sweepPhase ?? WING_RIG_DEFAULTS.sweepPhase;
    const hindPhase = d?.hindPhase ?? WING_RIG_DEFAULTS.hindPhase;
    const membraneLagFrac = Math.max(1e-3, d?.membraneLagFrac ?? WING_RIG_DEFAULTS.membraneLagFrac);
    const membraneCamber = d?.membraneCamber ?? WING_RIG_DEFAULTS.membraneCamber;
    const bobAmp = d?.bobAmp ?? WING_RIG_DEFAULTS.bobAmp;
    const tiltAmp = d?.tiltAmp ?? WING_RIG_DEFAULTS.tiltAmp;

    // Two independent kinematic cycles — stroke (phi), pronation/supination
    // (alpha, wing pitch about the leading edge) and sweep (theta, fore/aft
    // deviation) — each a function of the SAME warped, asymmetric cyclePos
    // so the three combine into a small Lissajous loop at the wingtip every
    // beat instead of a flat arc. Hind runs `hindPhase` behind fore.
    const foreCyc = wingCycle(t, S.period, rate, downFrac, pronationPhase, sweepPhase, 0);
    const hindCyc = wingCycle(t, S.period, rate, downFrac, pronationPhase, sweepPhase, hindPhase);

    hinges.forEach(({ hinge, sx, wing }) => {
      const cyc = wing === "fore" ? foreCyc : hindCyc;
      const angle = lo + cyc.openRaw * (hi - lo);
      // strokeAmp scales the deviation from the mid-stroke REST angle, so
      // strokeAmp=0 parks the wing half-open (coasting) rather than snapping
      // it flat — same "amplitude around rest" contract prepFlyer's weight
      // used to bolt on after the fact, now native to the rig.
      hinge.rotation.y = sx * (restAngle + (angle - restAngle) * strokeAmp);
      hinge.rotation.x = sx * pronationAmp * cyc.pronRaw;
      hinge.rotation.z = sx * sweepAmp * cyc.sweepRaw;
    });

    // Membrane lag + camber, tracked against the FINAL amplitude-scaled
    // openness (0..1) so a parked (strokeAmp=0) wing's membrane goes still
    // too, instead of rippling on motion the hinge itself isn't performing.
    const foreOpen = 0.5 + (foreCyc.openRaw - 0.5) * strokeAmp;
    const hindOpen = 0.5 + (hindCyc.openRaw - 0.5) * strokeAmp;
    foreBend(foreOpen, t, membraneLagFrac, membraneCamber, foreU);
    hindBend(hindOpen, t, membraneLagFrac, membraneCamber, hindU);

    // body follows the stroke: lift on the down-beat, settle on the up-beat.
    // Derived from the SAME forewing cyclePos the hinges just used (so it
    // tracks strokeRate automatically) — this is the ONLY place in the whole
    // rig that couples body position/rotation to the wingbeat; Companion.js
    // must never add a second one (see its own header comment).
    const bobPhase = foreCyc.cyclePos * Math.PI * 2;
    group.position.y = Math.sin(bobPhase - 0.5) * 0.07 * bobAmp;
    group.rotation.x = -0.08 + Math.sin(bobPhase - 0.9) * 0.065 * tiltAmp;
    group.rotation.z = Math.sin(t * 0.42) * 0.06;
    group.rotation.y = Math.sin(t * 0.31) * 0.14;

    antennae.forEach((tip, i) => {
      tip.position.y += Math.sin(t * 2.1 + i) * 0.0015;
    });
  }

  // The builder animates `group` (bob, tilt, idle sway). Callers that fly the
  // butterfly around need a transform of their own, so hand them an outer
  // wrapper — otherwise placement and idle motion overwrite each other.
  const root = new THREE.Group();
  root.add(group);

  return { group: root, inner: group, hinges, update, spec: S, dispose: () => {
    foreMat.dispose();
    hindMat.dispose();
    foreMembraneMat?.dispose();
    hindMembraneMat?.dispose();
    // every map the style produced — a wing can carry colour, alpha and
    // emissive, and each is its own canvas-backed texture
    Object.values(maps).forEach((t) => t?.dispose?.());
    wingMeshes.forEach((m) => m.geometry.dispose());
    // body/antenna/face materials — geometries are caught by Companion's own
    // scene traverse, but that traverse never touches .material
    bodyMat.dispose();
    antMat.dispose();
    tipMat.dispose();
    face.mats.forEach((m) => m.dispose());
  } };
}
