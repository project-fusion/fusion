import { MAX_POINTS } from './path.js'

/*
 * The programs that draw the ribbon: the strands and the dust into a float
 * buffer with additive light, two blur levels of bloom, and the composite over
 * the page color.
 *
 * **Distance along the path, never the spline's parameter, sets every
 * frequency.** The parameter runs from 0 to 1 whatever the path's length, so a
 * twist written against it is tight in a box and stretched across a page. The
 * arc length in pixels, measured on the CPU and handed over beside the points as
 * `uLen`, keeps a strand's twist, sway and traveling light the same size
 * everywhere, and only grows, so none of them runs backward where the path
 * heads left (see `arcLengths`).
 */

/**
 * The centerline and one strand's place around it, shared by the strands and
 * the dust.
 *
 * `strandAt` answers a point in CSS pixels on screen and the strand's depth,
 * from `-1` at the back of the ribbon to `1` at the front, and fills `info`
 * with the point's brightness, its ribbon width as a share of the width, and
 * its distance along the path in pixels.
 *
 * **Each strand has a place in the ribbon's cross-section, which rolls.** The
 * place, rolled by the strand's angle, gives both how far it sits from the
 * axis and how near it is, so a strand at the front of the roll is the one
 * drawn nearer. `uDepth` scales what nearness does: a near strand sits further
 * out, as perspective puts it. `uDrift` gives each strand its own pace and
 * starting angle for the roll, and its own wave, so at `0` the ribbon turns as
 * one sheet and at `1` its strands cross over one another.
 *
 * **Every strand turns gently.** The twist runs once in about 3,100 pixels
 * of path and each strand's own wave once in about 1,000, so the tightest
 * turn a strand makes, at the edge of a wide ribbon, is about 400 pixels
 * round. Twice those rates curled the strands like loose hair.
 */
const PATH = `
uniform vec4 uPts[${MAX_POINTS}];
uniform vec4 uLen[${MAX_POINTS / 4}];
uniform int uCount;
uniform vec2 uView;
uniform float uScroll;
uniform vec2 uT;
uniform float uTime;
uniform float uSpread;
uniform float uDepth;
uniform float uDrift;

float h1(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

vec4 pt(int i) { return uPts[clamp(i, 0, uCount - 1)]; }

vec4 spline(float t) {
  float s = clamp(t, 0.0, 1.0) * float(uCount - 1);
  int i = min(int(floor(s)), uCount - 2);
  float f = s - float(i);
  vec4 p0 = pt(i - 1);
  vec4 p1 = pt(i);
  vec4 p2 = pt(i + 1);
  vec4 p3 = pt(i + 2);
  float f2 = f * f;
  float f3 = f2 * f;
  return 0.5 * ((2.0 * p1) + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2
    + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f3);
}

vec2 place(vec4 c) { return vec2(c.x * uView.x, c.y - uScroll); }

float len(int i) {
  int k = clamp(i, 0, uCount - 1);
  return uLen[k >> 2][k & 3];
}

/* Arc length at \`t\`, on the same spline as the centerline, so it only grows. */
float lengthAt(float t) {
  float s = clamp(t, 0.0, 1.0) * float(uCount - 1);
  int i = min(int(floor(s)), uCount - 2);
  float f = s - float(i);
  float f2 = f * f;
  float f3 = f2 * f;
  float p0 = len(i - 1);
  float p1 = len(i);
  float p2 = len(i + 1);
  float p3 = len(i + 2);
  return 0.5 * ((2.0 * p1) + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2
    + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f3);
}

vec3 strandAt(float id, float t, out vec3 info) {
  vec4 c = spline(t);
  vec2 p = place(c);
  vec2 q = place(spline(t + 0.0004));
  vec2 tg = q - p;
  tg = length(tg) > 1e-4 ? normalize(tg) : vec2(0.0, 1.0);
  vec2 nr = vec2(-tg.y, tg.x);
  float r1 = h1(id + 0.13);
  float r2 = h1(id + 1.71);
  float r3 = h1(id + 3.37);
  float r4 = h1(id + 5.93);
  float r8 = h1(id + 13.7);
  float r9 = h1(id + 17.3);
  float n = (r1 + r2 + r3) / 1.5 - 1.0;
  float z = (r4 - 0.5) * 2.0;
  float along = lengthAt(t);
  float pace = 1.0 + uDrift * (r8 - 0.5) * 1.2;
  float th = along * 0.002 * (1.0 + uDrift * (r9 - 0.5) * 0.3) + uTime * 0.25 * pace
    + r2 * (0.5 + uDrift * 2.6);
  float width = c.z * uSpread;
  float breadth = width * uView.x * (1.0 + 0.25 * sin(uTime * 0.4 + along * 0.0045));
  float sway = sin(along * 0.006 + uTime * 0.23) * mix(6.0, 30.0, smoothstep(0.02, 0.2, width));
  float ct = cos(th);
  float st = sin(th);
  float depth = clamp((z * 0.55 * ct - n * st) / 1.15, -1.0, 1.0);
  float lat = sway + breadth * (n * ct + z * 0.55 * st) * (1.0 + uDepth * 0.35 * depth);
  lat += sin(along * 0.006 * (1.0 + uDrift * (r9 - 0.5) * 0.3) + uTime * (0.6 + 0.5 * r1) * pace
    + r1 * 6.283) * 12.0 * (0.3 + r3) * (1.0 + uDrift * 0.5);
  /* **No strand crosses the center of the turn it is on.** A strand is the
     centerline moved sideways by \`lat\`, and on the inside of a turn whose
     radius is less than that, the moved line runs back over itself: a loop,
     or a fold where its quads flip. \`curve\` is the turn's curvature toward
     \`nr\`, from the spline either side of this point, and an offset on the
     inside is eased toward the center so that \`curve * lat\` stays under 1.
     Offsets on the outside, and on a straight run, are left as they are. */
  /* **Smooth, or it kinks every strand.** The spline's own curvature jumps at
     each point, so the turn is read across a whole segment, which averages the
     jump away. The squeeze eases in as a soft maximum of zero and the turn, so
     there is no corner where a turn to one side becomes a turn to the other. */
  float reach = 0.5 / float(max(uCount - 1, 1));
  vec2 back = place(spline(t - reach));
  vec2 ahead = place(spline(t + reach));
  vec2 velocity = (ahead - back) * 0.5;
  float curve = dot(ahead - 2.0 * p + back, nr) / max(dot(velocity, velocity), 1e-2);
  float inward = curve * lat;
  float squeeze = 0.5 * (inward + sqrt(inward * inward + 0.01));
  lat /= 1.0 + squeeze;
  info = vec3(max(c.w, 0.0), width, along);
  return vec3(p + nr * lat, depth);
}
`

/** Each strand as a ribbon of quads, wide enough to anti-alias and to blur. */
export const LINE_VERTEX = `#version 300 es
layout(location = 0) in vec2 aVert;
layout(location = 1) in float aId;
uniform float uDpr;
uniform float uSoftness;
uniform float uContrast;
uniform vec3 uGlow;
uniform vec3 uTint;
uniform vec3 uPeak;
out float vSide;
out vec3 vColor;
${PATH}
void main() {
  float id = aId;
  float r5 = h1(id + 7.77);
  float r6 = h1(id + 9.19);
  float r7 = h1(id + 11.3);
  float t = mix(uT.x, uT.y, aVert.x);
  vec3 info;
  vec3 unused;
  vec3 a = strandAt(id, t, info);
  vec3 b = strandAt(id, t + (uT.y - uT.x) / 700.0, unused);
  vec2 tg = b.xy - a.xy;
  tg = length(tg) > 1e-4 ? normalize(tg) : vec2(0.0, 1.0);
  vec2 nrm = vec2(-tg.y, tg.x);
  float soft = smoothstep(0.06, 0.28, info.y) * step(1.0 - uSoftness, r6);
  /* Nearer is thicker, and the back of the ribbon falls out of focus: wider
     at the same energy, so it reads as haze behind the sharp strands. */
  float base = mix(0.35, 1.3, r7 * r7) * uDpr * (1.0 + (0.3 + 0.5 * uDepth) * a.z);
  float focus = uDepth * smoothstep(-0.1, -0.9, a.z) * 10.0 * uDpr;
  float w = max(base + soft * mix(8.0, 36.0, r6) * uDpr + focus, 1.0);
  float drawW = w + 2.5 * uDpr;
  vec2 res = uView * uDpr;
  vec2 px = a.xy * uDpr + nrm * aVert.y * drawW * 0.5;
  gl_Position = vec4(px.x / res.x * 2.0 - 1.0, 1.0 - px.y / res.y * 2.0, 0.0, 1.0);
  vSide = aVert.y * drawW / w;
  float shimmer = 0.5 + 0.5 * sin(info.z * 0.044 - uTime * (2.0 + 2.0 * r5) + r6 * 6.283);
  shimmer *= shimmer;
  /* Contrast spreads the strands' brightness: a few burn and most fall back.
     The mean is held, so the ribbon as a whole keeps its strength. */
  float spread = mix(1.4, 4.5, uContrast);
  float least = mix(0.25, 0.04, uContrast);
  float bright = mix(least, 1.0, pow(r5, spread)) * 0.5625 / (least + (1.0 - least) / (spread + 1.0));
  float energy = min(base, w) / w;
  float fall = 0.3 + 0.5 * uDepth;
  float depth = (1.0 - fall * (1.0 - a.z) * 0.5) / (1.0 - fall * 0.5);
  float rest = mix(0.35, 0.15, uContrast);
  vec3 col = mix(uGlow, uTint, step(0.83, r6) * 0.9);
  col = mix(col, uPeak, step(0.93, r7) * 0.6);
  vColor = col * energy * info.x * (rest + (1.0 - rest) * shimmer) * bright * depth;
}
`

/** A soft profile across the ribbon, added into the buffer. */
export const LINE_FRAGMENT = `#version 300 es
precision highp float;
in float vSide;
in vec3 vColor;
uniform float uScale;
out vec4 outColor;
void main() {
  outColor = vec4(vColor * exp(-vSide * vSide * 2.4) * uScale, 1.0);
}
`

/** Specks drifting along the strands, thickest where the ribbon is bright. */
export const DUST_VERTEX = `#version 300 es
uniform float uDpr;
uniform float uStrands;
uniform vec3 uGlow;
uniform vec3 uPeak;
out vec3 vColor;
${PATH}
void main() {
  float id = float(gl_VertexID);
  float sid = floor(h1(id + 0.5) * uStrands);
  float r = h1(id + 2.3);
  float r2 = h1(id + 4.1);
  float t = mix(uT.x, uT.y, fract(r + uTime * 0.003 * (0.3 + r2)));
  vec3 info;
  vec3 a = strandAt(sid, t, info);
  vec2 off = (vec2(h1(id + 6.1), h1(id + 8.3)) - 0.5) * (24.0 + (150.0 + info.y * uView.x) * h1(id + 9.7));
  vec2 res = uView * uDpr;
  vec2 px = (a.xy + off) * uDpr;
  gl_Position = vec4(px.x / res.x * 2.0 - 1.0, 1.0 - px.y / res.y * 2.0, 0.0, 1.0);
  gl_PointSize = mix(1.2, 3.4, r2 * r2) * uDpr;
  float tw = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.5 + 1.8 * r) + r2 * 40.0));
  /* By the root of the ribbon's brightness, so specks show along a dim ribbon
     as well as round a bright bend. */
  vColor = mix(uGlow, uPeak, 0.55) * tw * mix(0.2, 0.9, r) * sqrt(info.x) * 0.8;
}
`

export const DUST_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
uniform float uScale;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  outColor = vec4(vColor * exp(-dot(c, c) * 16.0) * uScale, 1.0);
}
`

/** One triangle over the whole target, from three vertex ids and no buffer. */
export const QUAD_VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

/** Four bilinear taps, a box filter at half the step for the price of four reads. */
export const DOWN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec3 c = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0)).rgb
    + texture(uSource, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture(uSource, vUv + uTexel * vec2(-1.0, 1.0)).rgb
    + texture(uSource, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  outColor = vec4(c * 0.25, 1.0);
}
`

/** A nine-tap Gaussian in five reads, along one axis. */
export const BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uStep;
out vec4 outColor;
void main() {
  vec3 c = texture(uSource, vUv).rgb * 0.2270;
  c += (texture(uSource, vUv + uStep * 1.3846).rgb + texture(uSource, vUv - uStep * 1.3846).rgb) * 0.3162;
  c += (texture(uSource, vUv + uStep * 3.2308).rgb + texture(uSource, vUv - uStep * 3.2308).rgb) * 0.0703;
  outColor = vec4(c, 1.0);
}
`

/**
 * The light and its bloom over the page color.
 *
 * On a dark page the light is screened onto the ground, so it saturates to
 * the peak rather than clipping. On a light page added light is invisible, so
 * the same energy darkens the ground toward the peak as ink. A step of noise
 * under a code value hides the banding a slow gradient shows on eight bits.
 */
export const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uNear;
uniform sampler2D uFar;
uniform vec3 uGround;
uniform vec3 uInk;
uniform float uLight;
uniform float uGain;
uniform float uBloom;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 e = texture(uScene, vUv).rgb + (texture(uNear, vUv).rgb * 1.1 + texture(uFar, vUv).rgb * 0.9) * uBloom;
  e *= uGain;
  vec3 dark = 1.0 - (1.0 - uGround) * exp(-e);
  float lum = dot(e, vec3(0.3, 0.55, 0.15));
  vec3 light = mix(uGround, uInk, 1.0 - exp(-lum * 1.4));
  vec3 c = mix(dark, light, uLight);
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(c, 1.0);
}
`
