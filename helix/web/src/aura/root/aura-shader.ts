/**
 * The shapes, in the order the shader branches on them.
 *
 * Exported so the component can turn a property into the integer the uniform
 * takes without a second list to keep in step.
 */
export const SHAPES = ['braid', 'rays', 'aurora', 'orbit', 'weave', 'flow'] as const

/** Which form the light takes. */
export type AuraShape = (typeof SHAPES)[number]

/**
 * Three vertices from `gl_VertexID`, covering the screen with one triangle.
 *
 * No attribute, no buffer and no upload, and one triangle rather than two, so
 * there is no seam down the diagonal where a quad's halves meet.
 */
export const VERTEX = `#version 300 es
  out vec2 uv;
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    uv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`

/**
 * One program, branching on a uniform, for all five shapes.
 *
 * A branch on a uniform is uniform across the whole draw, so every lane takes
 * the same path and it costs a jump rather than divergence. Five programs would
 * mean compiling and linking on a property change, which is the one moment a
 * reader is watching.
 *
 * **No backticks anywhere inside this string, including in comments.** One ends
 * the template literal early, and what follows is parsed as JavaScript: it has
 * silently stripped every brace out of a shader and left the driver reporting a
 * syntax error two hundred lines from the cause. `bun run check:shaders` fails
 * the build on it.
 */
export const FRAGMENT = `#version 300 es
  precision highp float;

  in vec2 uv;
  out vec4 color;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform int uShape;
  uniform vec2 uPointer;
  uniform float uReach;
  uniform float uTilt;
  uniform float uScale;
  uniform float uBloom;
  uniform float uGain;
  /* Where the pointer has been, as x, y and age. Age runs 0 at the moment it
     was left to 1 when it has faded, so a spent slot costs a compare.

     **This is what a fluid gets from a framebuffer, bought for eight vec3s.** A
     real solver advects a dye texture and reads it back the next frame, which
     needs render targets, a ping-pong pair and about six passes. What a reader
     actually perceives from that is one thing: the cursor leaves a wake that
     outlives it. A short history of where it went reproduces that in the single
     pass this component already makes, at a fixed cost that does not grow with
     how long the page has been open. What it cannot do is conserve anything, so
     there is no diffusion and no pressure: the wake decays rather than
     spreading. Worth knowing before this is asked to be a simulation. */
  uniform vec3 uTrail[8];
  uniform vec3 uGround;
  uniform vec3 uHaze;
  uniform vec3 uGlow;
  uniform vec3 uPeak;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    /* Quintic rather than cubic. Cubic smoothstep leaves a second derivative
       discontinuity at every cell edge, which four octaves of lighting turn
       into a faint square lattice: visible on a large soft field and exactly
       the artifact that reads as cheap. */
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /* Each octave is rotated as well as scaled. Doubling alone stacks every
     octave on the same axes, so value noise keeps its grid however many are
     summed. An irrational angle means no two octaves ever line up again. */
  const mat2 TURN = mat2(0.8, 0.6, -0.6, 0.8);

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += amp * noise(p);
      p = TURN * p * 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  /* Domain warping: the field is sampled at coordinates another field bends.
     This is the single largest difference between noise that reads as organic
     and noise that reads as television static, and it costs two more fbm calls
     rather than a different algorithm. */
  float warped(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
    return fbm(p + 4.0 * r);
  }

  /* Two strands half a turn apart, inside a wider volume. */
  float braid(vec2 q, float t) {
    float lit = 0.0;
    for (int i = 0; i < 2; i++) {
      float phase = float(i) * 3.14159265;
      float x = q.x - 0.34 * sin(q.y * 1.6 + t * 1.4 + phase);
      lit += 0.8 * exp(-abs(x) * 13.0);
    }
    float volume = exp(-abs(q.x) * 2.6);
    /* Compressed hard across the shaft and stretched along it. The same octaves
       sampled square read as haze; this way they read as filaments. */
    float streak = fbm(vec2(q.x * 9.0, q.y * 0.55 - t * 2.4));
    float haze = warped(vec2(q.x * 0.8 + 4.0, q.y * 0.45), t * 0.5);
    return lit * mix(0.35, 1.65, streak) + volume * 0.3 * mix(0.35, 1.05, haze);
  }

  /* A fan from a source above the frame, cut into filaments by angle. */
  float rays(vec2 q, float t) {
    vec2 o = vec2(0.0, 1.45);
    vec2 v = q - o;
    float dist = length(v);
    float ang = atan(v.x, -v.y);
    float fan = fbm(vec2(ang * 8.0, dist * 0.5 - t * 1.8));
    float dust = warped(vec2(ang * 2.0, dist * 0.7), t * 0.4);
    float spread = smoothstep(0.85, 0.05, abs(ang));
    return spread * mix(0.2, 1.5, fan) * mix(0.75, 1.15, dust) * exp(-dist * 0.8);
  }

  /* Curtains on a drifting horizon. */
  float aurora(vec2 q, float t) {
    float ridge = (warped(vec2(q.x * 0.7, 0.0), t * 0.7) - 0.5) * 1.3;
    float band = exp(-abs(q.y - ridge) * 3.2);
    float fall = fbm(vec2(q.x * 7.0, q.y * 0.7 - t * 2.6));
    return band * mix(0.3, 1.6, fall);
  }

  /* Rings in perspective, travelling out. */
  float orbit(vec2 q, float t) {
    vec2 e = vec2(q.x, q.y * 2.3);
    float r = length(e);
    float rings = sin(r * 8.0 - t * 5.0) * 0.5 + 0.5;
    float grain = warped(vec2(atan(e.y, e.x) * 1.5, r * 1.2), t * 0.6);
    return pow(rings, 4.0) * mix(0.45, 1.45, grain) * exp(-r * 1.05);
  }

  /* Ink in a viscous medium, drawn through by where the pointer went.
   *
   * **The wake is one stroke, not eight marks.** Each trail point used to add a
   * vortex of its own, rotating the sample around its own centre, which drew
   * eight discrete swirls fading in place: a row of blobs rather than anything
   * a hand had done. The marks are a polyline now. Distance is measured to the
   * nearest *segment*, age is interpolated along it, and what a reader sees is
   * a continuous stroke however far apart the samples fell.
   *
   * **And the displacement runs along the stroke, not around it.** Pushing the
   * sample down the tangent is advection: the pattern is carried the way the
   * hand went, which is what stirring looks like. Rotating it around a point is
   * a whirlpool, and eight whirlpools is a washing machine.
   *
   * The marks arrive oldest first, so consecutive indices are consecutive in
   * time. In the ring they are not, and a segment drawn across the wrap joined
   * the newest mark to the oldest with a bright bar through the middle of the
   * field.
   */
  float flowWake(vec2 p, out vec2 push) {
    push = vec2(0.0);
    float wake = 0.0;

    for (int i = 0; i < 7; i++) {
      vec3 a = uTrail[i];
      vec3 b = uTrail[i + 1];
      if (a.z >= 1.0 || b.z >= 1.0) {
        continue;
      }
      vec2 ab = b.xy - a.xy;
      float len2 = dot(ab, ab);
      if (len2 < 1e-6) {
        continue;
      }
      float t = clamp(dot(p - a.xy, ab) / len2, 0.0, 1.0);
      float r = length(p - (a.xy + ab * t));
      /* Squared, so a wake thins as it dies rather than switching off. */
      float life = 1.0 - mix(a.z, b.z, t);
      float w = life * life * exp(-r * 3.2);
      wake += w;
      push += (ab * inversesqrt(len2)) * w;
    }
    return wake;
  }

  float flow(vec2 q, float t) {
    vec2 push;
    float wake = flowWake(q * 0.9, push);
    vec2 p = q * 0.9 + push * 0.5;

    /* The field is warped by itself twice over, which is what gives a liquid
       its folded look: each sample is displaced by the field's own value, so
       structure gathers into sheets rather than staying a cloud. */
    float ink = warped(p * 1.15, t * 0.55);
    float sheet = warped(p * 2.3 + vec2(3.1, 1.7), t * 0.35);
    float body = mix(0.55, 1.3, ink) * mix(0.5, 1.15, sheet);

    /* The resting state matters more than the stirred one: most readers never
       move the pointer, and a shape that is dark until touched is a shape most
       people never see. */
    return body * (0.5 + clamp(wake, 0.0, 1.0) * 0.38) * exp(-length(q) * 0.55);
  }

  /* Two wave fields crossed, lit where they agree. */
  float weave(vec2 q, float t) {
    float a = 0.62;
    float u1 = q.x * cos(a) + q.y * sin(a);
    float u2 = q.x * cos(-a) + q.y * sin(-a);
    float w = sin(u1 * 9.0 + t * 2.2) * sin(u2 * 9.0 - t * 1.7);
    float grain = warped(vec2(q.x * 1.5, q.y * 1.5), t * 0.5);
    return pow(max(w, 0.0), 2.2) * mix(0.5, 1.4, grain) * exp(-length(q) * 0.85);
  }

  void main() {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    /* What the pointer does, and why it read as pointing somewhere else.

       The response was a bare multiply by one plus the falloff. Over a lit
       part of the field that brightens; over a dark part it multiplies nothing
       and shows nothing, so the visible answer to moving the cursor appeared
       wherever the shape already happened to be bright. That is not where the
       cursor is, and no falloff tightens its way out of a response that is
       absent half the time. The coordinate was exact the whole while, measured
       against the shader's own arithmetic for the same pixel.

       The grip term is the fix, and the first of three. It pulls the field
       toward the pointer, so structure gathers under it. A displacement shows
       up wherever there is pattern, lit or not, which is what makes a cursor
       feel like it is touching a medium rather than shining on one. */
    vec2 toPointer = p - uPointer;
    float grip = exp(-dot(toPointer, toPointer) * 2.6) * uReach;

    /* Parallax, and small on purpose. At 0.16 the whole field translated a
       sixth of the frame between one edge of the screen and the other, which
       reads as the background being dragged rather than as depth: a large
       global motion answering a small input, which no time constant rescues. */
    vec2 q = p - uPointer * 0.05 * uReach - toPointer * grip * 0.32;

    float a = radians(uTilt);
    q = vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
    q *= uScale;

    float t = uTime * 0.06;

    float d = 0.0;
    if (uShape == 0) {
      d = braid(q, t);
    } else if (uShape == 1) {
      d = rays(q, t);
    } else if (uShape == 2) {
      d = aurora(q, t);
    } else if (uShape == 3) {
      d = orbit(q, t);
    } else if (uShape == 4) {
      d = weave(q, t);
    } else {
      d = flow(q, t);
    }

    /* Bloom as an exponent on the field rather than a term inside each shape.
       Every shape is a density that falls off, so a power tightens or spreads
       that falloff and one control means the same thing in all five. */
    d = pow(max(d, 0.0), mix(2.0, 0.5, clamp(uBloom, 0.0, 1.0))) * uGain;

    /* Then it lifts what is lit, over a floor, so there is always something at
       the cursor. The floor is small deliberately: a light that follows the
       pointer across an unlit field is a torch, which is a different and much
       cheaper idea, and a tenth says the pointer is here without becoming one. */
    d = d * (1.0 + grip * 0.9) + grip * 0.1;

    d *= mix(0.65, 1.35, smoothstep(-1.0, 1.0, q.y));

    /* Rolled off rather than clipped. A hard clamp flattens the core into a
       plateau of one value, which is what makes a bright shader look like a
       sticker; this compresses toward one and keeps the gradient inside it. */
    float lift = 1.0 - exp(-max(d, 0.0) * 1.15);

    vec3 rgb = mix(uGround, uHaze, smoothstep(0.0, 0.16, lift));
    rgb = mix(rgb, uGlow, smoothstep(0.10, 0.46, lift));
    rgb = mix(rgb, uPeak, smoothstep(0.40, 0.72, lift) * 0.6);

    /* Dithered before the buffer quantizes. A falloff this soft spans a few
       hundred 8-bit steps across a screen, and without a sub-step of noise it
       paints as visible rings. */
    float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    color = vec4(rgb + dither, 1.0);
  }
`
