import { MAX_POINTS } from './path.js'

/*
 * The programs that draw the ribbon: the strands and the dust into a float
 * buffer with additive light, two blur levels of bloom, and the composite over
 * the page color.
 *
 * **Distance along the path, never the spline's parameter, sets every
 * frequency.** The parameter runs from 0 to 1 whatever the path's length, so a
 * twist written against it is tight in a box and stretched across a page. The
 * running sum of `y` and `x` in pixels, which grows along a vertical stretch and
 * a horizontal wave alike, keeps a strand's twist, sway and traveling light the
 * same size everywhere.
 */

/**
 * The centerline and one strand's place around it, shared by the strands and
 * the dust.
 *
 * `strandAt` answers a point in CSS pixels on screen and the strand's depth,
 * and fills `info` with the point's brightness, its ribbon width as a share of
 * the width, and its distance along the path in pixels.
 */
const PATH = `
uniform vec4 uPts[${MAX_POINTS}];
uniform int uCount;
uniform vec2 uView;
uniform float uScroll;
uniform vec2 uT;
uniform float uTime;
uniform float uSpread;

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
  float n = (r1 + r2 + r3) / 1.5 - 1.0;
  float z = (r4 - 0.5) * 2.0;
  float along = c.y + c.x * uView.x;
  float th = along * 0.0033 + uTime * 0.25 + r2 * 0.5;
  float width = c.z * uSpread;
  float fan = width * uView.x * (1.0 + 0.25 * sin(uTime * 0.4 + along * 0.0045));
  float sway = sin(along * 0.006 + uTime * 0.23) * mix(6.0, 30.0, smoothstep(0.02, 0.2, width));
  float lat = sway + fan * (n * cos(th) + z * 0.55 * sin(th));
  lat += sin(along * 0.01 + uTime * (0.6 + 0.5 * r1) + r1 * 6.283) * 12.0 * (0.3 + r3);
  info = vec3(max(c.w, 0.0), width, along);
  return vec3(p + nr * lat, z * sin(th));
}
`

/** Each strand as a ribbon of quads, wide enough to anti-alias and to blur. */
export const LINE_VERTEX = `#version 300 es
layout(location = 0) in vec2 aVert;
layout(location = 1) in float aId;
uniform float uDpr;
uniform float uSoftness;
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
  float base = mix(0.35, 1.3, r7 * r7) * uDpr * (1.0 + 0.3 * a.z);
  float w = max(base + soft * mix(8.0, 36.0, r6) * uDpr, 1.0);
  float drawW = w + 2.5 * uDpr;
  vec2 res = uView * uDpr;
  vec2 px = a.xy * uDpr + nrm * aVert.y * drawW * 0.5;
  gl_Position = vec4(px.x / res.x * 2.0 - 1.0, 1.0 - px.y / res.y * 2.0, 0.0, 1.0);
  vSide = aVert.y * drawW / w;
  float shimmer = 0.5 + 0.5 * sin(info.z * 0.044 - uTime * (2.0 + 2.0 * r5) + r6 * 6.283);
  shimmer *= shimmer;
  float bright = mix(0.25, 1.0, pow(r5, 1.4));
  float energy = min(base, w) / w;
  float depth = 0.7 + 0.3 * a.z;
  vec3 col = mix(uGlow, uTint, step(0.83, r6) * 0.9);
  col = mix(col, uPeak, step(0.93, r7) * 0.6);
  vColor = col * energy * info.x * (0.35 + 0.65 * shimmer) * bright * depth;
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
  vColor = mix(uGlow, uPeak, 0.55) * tw * mix(0.2, 0.9, r) * info.x * 0.8;
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
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 e = texture(uScene, vUv).rgb + texture(uNear, vUv).rgb * 1.1 + texture(uFar, vUv).rgb * 0.9;
  e *= uGain;
  vec3 dark = 1.0 - (1.0 - uGround) * exp(-e);
  float lum = dot(e, vec3(0.3, 0.55, 0.15));
  vec3 light = mix(uGround, uInk, 1.0 - exp(-lum * 1.4));
  vec3 c = mix(dark, light, uLight);
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(c, 1.0);
}
`
