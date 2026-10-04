import { RIN, ROUT, TE } from './physics';

export const UNIFORMS = [
  'uSrc',
  'uRes',
  'uHole',
  'uR',
  'uTime',
  'uDim',
  'uWaveT',
  'uWaveA',
  'uFlare',
  'uFlat',
  'uSgn',
  'uRoll',
  'uPar'
];

// One oversized triangle covers the viewport; cheaper than a two-triangle quad.
export const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
export const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

export const FRAGMENT = `
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform vec2 uHole;
uniform float uR;
uniform float uTime;
uniform float uDim;
uniform float uWaveT;  // seconds since the last shake
uniform float uWaveA;  // its amplitude, already decayed
uniform float uFlare;  // disk flare, 0..1
uniform float uFlat;   // sin(elevation): 0.08 edge-on … 0.9 nearly from straight above
uniform float uSgn;    // +1 looking from above the disk plane, -1 from below
uniform float uRoll;   // the disk's bank on screen, radians
uniform vec2 uPar;     // parallax shift of the far layer, device px
const float TE = ${TE.toFixed(2)};
const float RIN = ${RIN.toFixed(2)};
const float ROUT = ${ROUT.toFixed(2)};
const vec3 CYAN = vec3(0.133, 0.878, 0.867);
const vec3 MAG = vec3(1.0, 0.36, 0.94);
const vec3 GROUND = vec3(0.0196, 0.0196, 0.031);

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){ return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.07 + 13.7) + 0.15 * vnoise(p * 4.13 - 7.1); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// A thin disk, q in the disk plane (units of R); +q.y points at the viewer.
vec3 disk(vec2 q){
  float rq = length(q);
  if (rq < RIN * 0.9 || rq > ROUT) return vec3(0.0);
  float edge = smoothstep(RIN * 0.9, RIN * 1.06, rq) * (1.0 - smoothstep(ROUT * 0.5, ROUT, rq));
  // two rigid layers turning at different rates: reads as differential rotation, never winds up
  float w = smoothstep(RIN, ROUT, rq);
  float n = mix(fbm(rot(uTime * 0.32) * q * 1.9), fbm(rot(uTime * 0.13) * q * 1.4 + 7.3), w);
  float lanes = 0.5 + 0.5 * sin(rq * 19.0 + n * 7.0);
  float heat = pow(RIN / rq, 2.2);
  // line-of-sight speed shrinks as the view turns face-on, and so does the beaming
  float beta = clamp(-0.55 * q.x / rq * sqrt(1.0 - uFlat * uFlat), -0.55, 0.55); // left side approaches
  float D = pow(1.0 + beta, 3.0); // relativistic beaming
  vec3 tint = mix(MAG, CYAN, clamp(0.5 + 0.95 * beta, 0.0, 1.0));
  vec3 col = mix(tint, vec3(1.0, 0.97, 0.92), clamp(heat * 0.75, 0.0, 1.0));
  return col * edge * heat * D * (0.35 + 0.65 * lanes) * (0.55 + 0.9 * n) * 1.5;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 d = (p - uHole) / uR;
  float r = max(length(d), 1e-4);

  // A shake sends a gravitational wave out of the hole. "Plus" polarisation, as LIGO sees it:
  // space stretches along x while it squeezes along y, then the other way, half a cycle later.
  vec2 dl = d;
  float env = 0.0, ph = 0.0;
  if (uWaveA > 0.001) {
    float rw = uWaveT * 7.0;
    env = uWaveA * exp(-pow((r - rw) / 1.2, 2.0));
    ph = sin((r - rw) * 4.2);
    dl = d + vec2(d.x, -d.y) / r * (0.55 * env * ph * 3.0 / (2.0 + r));
  }
  float rl = max(length(dl), 1e-4);

  // point-mass thin lens: a ray seen at r left the source at r (1 - te^2 / r^2)
  vec2 b = dl * (1.0 - TE * TE / (rl * rl));
  vec2 uv = (uHole + b * uR - uPar) / uRes;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec3 bg = mix(GROUND, texture2D(uSrc, clamp(uv, 0.0, 1.0)).rgb, inside);
  bg *= smoothstep(0.985, 1.005, r);

  // everything emissive lives near the hole; the rest of the screen skips it
  vec3 e = vec3(0.0);
  if (r < ROUT + 0.5) {
    // into the disk's own frame: undo the bank, and mirror when seen from below
    float cr = cos(uRoll), sr = sin(uRoll);
    vec2 dv = vec2(cr * d.x + sr * d.y, (-sr * d.x + cr * d.y) * uSgn);
    vec2 dir = dv / r;
    float face = clamp((uFlat - 0.2) / 0.6, 0.0, 1.0);
    // direct image of the disk; its far half is hidden by the shadow
    if (dv.y > 0.0 || r > 1.0) e += disk(vec2(dv.x, dv.y / uFlat));
    // far side of the disk, bent up and over the shadow
    if (r > 0.995 && r < 1.75) {
      float u = (r - 1.0) / 0.7;
      float fade = smoothstep(0.0, 0.07, u) * (1.0 - smoothstep(0.45, 1.0, u));
      // edge-on, the far side is bent into an arc over the top; face-on it closes into a full ring
      float top = mix(smoothstep(-0.2, 0.75, -dir.y), 0.7, face);
      e += disk(vec2(dir.x, -abs(dir.y)) * mix(RIN * 1.02, ROUT * 0.9, u)) * fade * top * 0.95;
      // and the thin secondary image underneath
      float u2 = (r - 1.0) / 0.16;
      float fade2 = smoothstep(0.0, 0.15, u2) * (1.0 - smoothstep(0.5, 1.0, u2));
      float bot = mix(smoothstep(0.1, 0.9, dir.y), 0.3, face);
      e += disk(vec2(dir.x, abs(dir.y)) * mix(RIN * 1.02, RIN * 1.6, u2)) * fade2 * bot * 0.6;
    }
    // photon ring
    float pw = max(0.011, 1.1 / uR);
    float ring = exp(-pow((r - 1.03) / pw, 2.0));
    e += vec3(1.0, 0.93, 0.86) * ring * (0.85 + 0.45 * -dir.x);
    e += mix(MAG, CYAN, 0.5 - 0.5 * dir.x) * (0.07 + 0.12 * uFlare) * exp(-(r - 1.0) * 2.4) * step(1.0, r);
    e *= 1.0 + 1.4 * uFlare;
  }
  // a faint glow riding the wavefront
  e += mix(CYAN, MAG, 0.5 + 0.5 * ph) * abs(env * ph) * 0.09 * step(1.0, r);
  e = 1.0 - exp(-e * 1.3);
  gl_FragColor = vec4((bg + e) * uDim, 1.0);
}`;
