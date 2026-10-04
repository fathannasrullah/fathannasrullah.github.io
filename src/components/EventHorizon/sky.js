// The scene behind the hole, painted once per resize into a 2D canvas that becomes the
// lens's texture. Nothing here animates: the shader does the moving.

const GROUND = '#050508';
const STAR_TINTS = ['#9ff6f4', '#ffc4f8', '#ffe2c2'];

export function paintSky(ctx, { width, height, dpr, mobile }) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);
  paintNebula(ctx, width, height);
  paintLattice(ctx, width, height, mobile ? 22 : 28);
  paintStars(ctx, width, height);
}

function paintNebula(ctx, width, height) {
  const big = Math.max(width, height);
  const washes = [
    { x: 0.82, y: 0.18, r: 0.6, rgb: '124, 92, 255', a: 0.11 },
    { x: 0.1, y: 0.95, r: 0.55, rgb: '34, 224, 221', a: 0.07 }
  ];
  for (const w of washes) {
    const g = ctx.createRadialGradient(width * w.x, height * w.y, 0, width * w.x, height * w.y, big * w.r);
    g.addColorStop(0, `rgba(${w.rgb}, ${w.a})`);
    g.addColorStop(1, `rgba(${w.rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
}

// The dot lattice is flat space, until the hole bends it.
function paintLattice(ctx, width, height, gap) {
  ctx.fillStyle = 'rgba(226, 232, 240, 0.11)';
  for (let y = gap / 2; y < height; y += gap) {
    for (let x = gap / 2; x < width; x += gap) ctx.fillRect(x - 0.65, y - 0.65, 1.3, 1.3);
  }
}

// Seeded, so a resize keeps the same sky.
function paintStars(ctx, width, height) {
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const count = Math.round((width * height) / 2100);
  for (let i = 0; i < count; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const r = rnd() < 0.93 ? 0.35 + rnd() * 0.5 : 0.9 + rnd() * 0.7;
    const tint = rnd();
    ctx.globalAlpha = 0.3 + rnd() * 0.7;
    ctx.fillStyle = tint < 0.24 ? STAR_TINTS[Math.floor(tint / 0.08)] : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 9; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const s = 6 + rnd() * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.15, 'rgba(200,230,255,0.35)');
    g.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - s * 1.6, y - 0.4, s * 3.2, 0.8);
    ctx.fillRect(x - 0.4, y - s * 1.6, 0.8, s * 3.2);
  }
}

/**
 * The headline is real DOM text with transparent glyphs; its pixels are painted here at the
 * exact measured spot, so the hole can bend them like anything else behind it.
 * Each line carries a zero-height inline-block whose top edge sits on the baseline.
 */
export function paintName(ctx, stage, lines) {
  const origin = stage.getBoundingClientRect();
  for (const line of lines) {
    const style = getComputedStyle(line);
    const box = line.getBoundingClientRect();
    const marker = line.querySelector('[data-baseline]');
    const text = line.firstChild && line.firstChild.nodeValue;
    if (!marker || !text) continue;
    const x = box.left - origin.left;
    const baseline = marker.getBoundingClientRect().top - origin.top;
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    ctx.textBaseline = 'alphabetic';
    if (line.dataset.gradient !== undefined) {
      const g = ctx.createLinearGradient(x, 0, box.right - origin.left, 0);
      g.addColorStop(0, '#22e0dd');
      g.addColorStop(0.55, '#8f9bff');
      g.addColorStop(1, '#ff5cf0');
      ctx.save();
      ctx.shadowColor = 'rgba(143, 155, 255, 0.35)';
      ctx.shadowBlur = 28;
      ctx.fillStyle = g;
      ctx.fillText(text, x, baseline);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f2f1ee';
      ctx.fillText(text, x, baseline);
    }
  }
}
