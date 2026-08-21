/**
 * The shapes, in the order the shader branches on them.
 *
 * Exported so the component can turn a property into the integer the uniform
 * takes without a second list to keep in step.
 */
export const SHAPES = [
  'braid',
  'rays',
  'aurora',
  'prism',
  'streaks',
  'waves',
  'threads',
  'particles',
  'flow',
] as const

/** Which form the light takes. */
export type AuraShape = (typeof SHAPES)[number]

/**
 * What the pointer does, in the order the shader branches on them.
 *
 * `native` is the shape's own, and is what absence means: braid leans, rays are
 * occluded, threads pinch. The rest are generic, and deliberately few.
 *
 * **The generics are the thing this component spent a day removing**, so they
 * are opt-in and never a default. A response made of the same material as the
 * shape says something about that shape; a lamp that follows the cursor says
 * the same nothing on all nine. They are here because a consumer may want the
 * quieter, more conventional answer, not because it is the better one.
 */
export const INTERACTIONS = ['native', 'light', 'shadow', 'ripple', 'none'] as const

/** How the field answers the pointer. */
export type AuraInteraction = (typeof INTERACTIONS)[number]

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
  uniform int uInteraction;
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
  uniform vec3 uTrail[9];
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

  /* An exponential falloff without the corner.
   *
   * Both abs and length have a vertex at zero and their derivative jumps
   * across it, so a falloff built on either acquires a hard line exactly along
   * the axis it is brightest on. That is a crease in something meant to be
   * light, and it is what put a chevron through the braid wherever the
   * pointer's height crossed a strand.
   *
   * Softening the distance rather than the exponent keeps the tails identical
   * and rounds only the point. The softening scales with the rate, so a tight
   * falloff is rounded tightly and a broad one broadly: at zero the result is
   * exp(-0.06) whatever the rate is, six per cent off the peak, which is not
   * visible as flattening.
   *
   * Takes the squared distance, because every caller already has one and a
   * square root taken here is the one that would have reintroduced the vertex.
   */
  float falloff(float d2, float k) {
    float soft = 0.06 / k;
    return exp(-sqrt(d2 + soft * soft) * k);
  }

  /* Two strands half a turn apart, inside a wider volume. */
  float braid(vec2 q, float t, vec2 qp, float reach) {
    /* The strands lean toward the pointer where it is alongside them, and are
       unmoved where it is not. A braid is a thing with a length, so what it can
       answer with is a bend at a height, not a bulge at a point. */
    float alongside = falloff((q.y - qp.y) * (q.y - qp.y), 1.1) * reach;
    float lean = qp.x * alongside * 0.45;
    float lit = 0.0;
    for (int i = 0; i < 2; i++) {
      float phase = float(i) * 3.14159265;
      float x = q.x - lean - 0.34 * sin(q.y * 1.6 + t * 1.4 + phase);
      lit += 0.8 * falloff(x * x, 13.0);
    }
    float volume = falloff(q.x * q.x, 2.6);
    /* Compressed hard across the shaft and stretched along it. The same octaves
       sampled square read as haze; this way they read as filaments. */
    float streak = fbm(vec2(q.x * 9.0, q.y * 0.55 - t * 2.4));
    float haze = warped(vec2(q.x * 0.8 + 4.0, q.y * 0.45), t * 0.5);
    return lit * mix(0.35, 1.65, streak) + volume * 0.3 * mix(0.35, 1.05, haze);
  }

  /* A fan from a source above the frame, cut into filaments by angle. */
  float rays(vec2 q, float t, vec2 qp, float reach) {
    /* The pointer occludes, rather than the source moving.
    
       Swinging the source re-aimed the whole fan, which is a thing a light does
       and not a thing that happens when something passes in front of one. What
       a reader knows about rays is that an object crossing them takes a bite
       out of the light and drags a shadow behind itself, away from the source.
       So the source is fixed and the pointer is a blocker.
    
       The shadow is angular, not radial: it is the wedge of directions the
       object covers as seen from the source, and it only exists further along
       than the object is. A fragment nearer the source than the blocker is in
       front of it and stays lit, which is the whole difference between an
       occluder and a dark patch that follows the cursor. */
    vec2 o = vec2(0.0, 1.45);
    vec2 v = q - o;
    float dist = length(v);
    float ang = atan(v.x, -v.y);

    vec2 vp = qp - o;
    float distToBlocker = length(vp);
    float angToBlocker = atan(vp.x, -vp.y);
    /* Widened with distance, so the object reads as a fixed size rather than
       as a wedge that grows the further out it is carried. */
    float halfAngle = 0.055 / max(distToBlocker, 0.35);
    float across = (ang - angToBlocker) / halfAngle;
    /* Cast from the near edge of the object rather than from somewhere past it.
       Ramping in over a fifth of a unit started the shadow below the thing
       supposedly casting it, which reads as two objects. */
    float behind = smoothstep(-0.03, 0.05, dist - distToBlocker);
    float shadow = exp(-across * across) * behind * reach;

    float fan = fbm(vec2(ang * 8.0, dist * 0.5 - t * 1.8));
    float dust = warped(vec2(ang * 2.0, dist * 0.7), t * 0.4);
    float spread = smoothstep(0.85, 0.05, abs(ang));
    float lit = spread * mix(0.2, 1.5, fan) * mix(0.75, 1.15, dust) * falloff(dot(v, v), 0.8);
    return lit * (1.0 - shadow * 0.82);
  }

  /* Curtains on a drifting horizon. */
  float aurora(vec2 q, float t, vec2 qp, float reach) {
    /* The curtain waves harder where the pointer is, rather than being lifted
       by it. An aurora is a sheet with an amplitude, and a swell only raised
       the whole thing locally, which is a bump in a line. Multiplying the
       amplitude bends it instead: the folds deepen and the ridge travels
       further, which is what an aurora does when it is disturbed. */
    float agitate = falloff((q.x - qp.x) * (q.x - qp.x), 1.5) * reach;

    /* A curtain hangs. It does not sit.
    
       This was a falloff symmetric about the ridge, which is a band with a
       wavy centre line, and a band with vertical noise on it is an equaliser.
       An aurora has a sharp top edge where the field lines end and light that
       falls away beneath it, so the top and the bottom cannot be the same
       function. Cut hard above, hung long below.
    
       Two of them, offset and at different depths, because a single sheet reads
       as a decal and what makes the real thing look like drapery is one curtain
       seen through another. */
    float lit = 0.0;
    for (int i = 0; i < 2; i++) {
      float f = float(i);
      /* Two octaves, not a warp. A warp folds the domain back on itself and
         puts high frequencies in the ridge, and against a hard top edge every
         wiggle becomes a spike: the first pass came out a mountain range. What
         an aurora has is a long undulation with a few folds in it, which is
         what a low fundamental and one overtone give. */
      float ridge =
        ((noise(vec2(q.x * (0.55 + f * 0.2) + f * 4.0, t * 0.3)) - 0.5) * 1.7 +
          (noise(vec2(q.x * (1.3 + f * 0.4) + f * 9.0, t * 0.45)) - 0.5) * 0.55) *
          (1.0 + agitate * 2.0) +
        f * 0.22;
      float depth = ridge - q.y;
      /* Sharp, but not a cliff: the edge is where the light stops, and a step
         narrower than a pixel is an aliased line rather than an edge. */
      float edge = smoothstep(-0.1, 0.05, depth);
      float hang = exp(-max(depth, 0.0) * (1.5 + f * 0.7));
      /* Stretched hard along the fall, so the striations are the vertical rays
         a curtain is actually made of rather than texture on a stripe. */
      float rays = fbm(vec2(q.x * (9.0 + f * 4.0), q.y * 0.35 - t * (2.2 + f)));
      lit += edge * hang * mix(0.25, 1.5, rays) * (1.0 - f * 0.45);
    }
    return lit;
  }

  /* One beam, split into an ordered spread by whatever it passes through.
   *
   * **This is the one shape that is about the token layer.** Helix derives a
   * whole accessible palette from a single brand colour, and a prism is that
   * argument as a picture: one thing goes in, an ordered set comes out, and the
   * set is a consequence of the source rather than a list beside it. Rings in
   * perspective, which this replaces, were pretty and said nothing.
   *
   * **The cursor is the prism.** The beam runs whether or not anybody is there,
   * and where the pointer meets it the light fans. That is a different kind of
   * interaction from the others: not the field reacting near the cursor, but
   * the cursor being a thing in the field's way. Moving it along the beam moves
   * where the split happens, which is exactly what carrying a prism does.
   *
   * The bands are lightness and never hue, because the palette is one hue. A
   * rainbow here would be the one drawing on the site that contradicts the
   * thing it is drawing.
   */
  float prism(vec2 q, float t, vec2 qp, float reach) {
    vec2 dir = normalize(vec2(0.5, -1.0));
    vec2 side = vec2(-dir.y, dir.x);

    /* Where the split happens: under the pointer when there is one, and at the
       centre when there is not, so the shape is whole at rest. */
    vec2 rel = q - qp * reach;
    float along = dot(rel, dir);
    float across = dot(rel, side);

    /* Tight before, widening after. The spread is what a prism does, so it is
       the only thing that changes across the split. */
    float spread = 0.04 + max(along, 0.0) * 0.38;
    float beam = exp(-(across * across) / (2.0 * spread * spread));

    /* The ordered set, and it only exists after the split.
    
       Banded across the fan rather than along it, because what comes out of a
       prism is separated by angle: dividing by the spread keeps each band on
       its own ray as the fan widens, rather than letting them curve. The
       contrast has to carry, or the whole thing reads as one beam that simply
       got wider, which is not the point being made. */
    float u = across / spread;
    /* Discrete bands with gaps between them, not a ripple.
    
       A sine across the fan is a continuous swell, and what comes out of a
       prism is a set of separated things: the whole argument is that one input
       becomes countable outputs. Folding the coordinate into cells and lighting
       the middle of each gives edges to count. */
    float cell = fract(u * 2.6 + 0.5) - 0.5;
    float bands = falloff(cell * cell, 11.0);
    float after = smoothstep(-0.02, 0.22, along);
    float structure = mix(1.0, mix(0.12, 1.7, bands), after);

    float grain = warped(vec2(along * 1.1, across * 2.2), t * 0.45);
    return beam * structure * mix(0.65, 1.2, grain) * falloff(dot(q, q), 0.5);
  }

  /* Light travelling in lanes, at speed.
   *
   * The one shape here that is about motion rather than about a form. Each lane
   * carries a trail with its own speed, length and phase, so the field reads as
   * something passing rather than something standing: the streaks the earlier
   * ground plane wanted and never got.
   *
   * The wrap is deliberately outside the frame. A trail restarting is a pop, so
   * the travel runs to plus and minus 1.8 while the visible field ends nearer
   * 1.2, and the reset happens where nobody is looking.
   *
   * The pointer is an obstacle: lanes bow around it and slow through it, the way
   * anything moving past a body does. Pushed outward in proportion to the offset
   * rather than by its sign, because a sign is a discontinuity and a
   * discontinuity in a displacement is a crease.
   */
  float streaks(vec2 q, float t, vec2 qp, float reach) {
    float near = falloff(dot(q - qp, q - qp), 1.6) * reach;
    vec2 s = q + vec2((q.x - qp.x) * near * 1.1, 0.0);

    float lane = s.x * 2.4;
    float id = floor(lane);
    float within = fract(lane) - 0.5;

    float speed = 0.55 + hash(vec2(id, 11.0)) * 1.5;
    float phase = hash(vec2(id, 29.0));
    float head = fract(phase + t * speed * 0.5) * 3.6 - 1.8;

    float ahead = s.y - head;
    float behind = max(-ahead, 0.0);
    float len = 0.3 + hash(vec2(id, 47.0)) * 1.0;
    float trail = exp(-behind / len) * smoothstep(0.07, 0.0, max(ahead, 0.0));

    /* Slowed where the pointer is, which is the other half of an obstacle. */
    trail *= mix(1.0, 0.45, near);

    float lit = trail * falloff(within * within, 9.0);
    float grain = fbm(vec2(s.x * 3.0, s.y * 1.4 - t * 1.6));
    return lit * mix(0.55, 1.35, grain) * falloff(dot(q, q), 0.42);
  }

  /* Broad bands rolling under a warp.
   *
   * The softest shape here, and the only one with no filaments in it at all:
   * where braid and threads are made of lines, this is made of gradients. The
   * warp is what stops it sliding: bands moved by phase alone travel sideways
   * like a barcode, and bands moved through a warped domain roll.
   *
   * The pointer drags them. Bowing the phase toward it bends the crests without
   * changing how many there are, which is what a surface does when something
   * pulls across it.
   */
  float waves(vec2 q, float t, vec2 qp, float reach) {
    float pull = falloff(dot(q - qp, q - qp), 1.2) * reach;
    float warp = warped(vec2(q.x * 0.55, q.y * 0.45), t * 0.35);
    float phase = q.y * 1.7 + warp * 2.4 - t * 0.9 - pull * 1.6;
    float band = sin(phase * 1.7) * 0.5 + 0.5;
    float grain = warped(vec2(q.x * 1.3 + 6.0, q.y * 0.9), t * 0.3);
    return pow(band, 1.7) * mix(0.5, 1.3, grain) * falloff(dot(q, q), 0.4);
  }

  /* Luminous threads, woven to a pinch.
   *
   * Five curves at different frequencies and speeds, each a thin bright line
   * rather than a band: what makes this read as woven is that they cross, and
   * what makes it read as one object rather than five is the pinch, where every
   * amplitude narrows at once and the whole weave gathers.
   *
   * The pointer is the pinch, which is the interaction this shape is for.
   * Carrying it along drags the gathering point with it and the threads open
   * behind and close ahead.
   */
  float threads(vec2 q, float t, vec2 qp, float reach) {
    float pinchAt = mix(0.0, qp.x, reach);
    float gather = 1.0 - falloff((q.x - pinchAt) * (q.x - pinchAt), 1.1) * 0.88;

    float lit = 0.0;
    for (int i = 0; i < 5; i++) {
      float f = float(i);
      float amp = (0.3 + hash(vec2(f, 3.0)) * 0.45) * gather;

      /* Two harmonics, not one. A single sine is a mechanical curve and five of
         them are five mechanical curves: the second, at an incommensurate
         frequency and running the other way, is what stops each thread
         repeating itself across the frame. */
      float y =
        sin(q.x * (1.2 + f * 0.28) + t * (0.5 + f * 0.22) + f * 1.7) * amp +
        sin(q.x * (2.7 + f * 0.51) - t * (0.31 + f * 0.17) + f * 3.1) * amp * 0.42;

      /* And each hangs at its own height. Centred on the same line, five
         threads cross only where their phases happen to meet, which is a fan;
         spread apart they cross everywhere, which is a weave. */
      y += (hash(vec2(f, 23.0)) - 0.5) * 0.75 * gather;

      /* Thickness varies too, so the set does not read as one pen. */
      float thick = 15.0 + hash(vec2(f, 41.0)) * 16.0;
      lit += falloff((q.y - y) * (q.y - y), thick) * (0.55 + hash(vec2(f, 9.0)) * 0.7);
    }
    float grain = fbm(vec2(q.x * 2.2, q.y * 2.2 - t));
    return lit * mix(0.7, 1.2, grain) * falloff(dot(q, q), 0.4);
  }

  /* Points adrift, and pushed aside.
   *
   * One per cell of a coarse lattice, jittered off centre so the lattice never
   * shows, and drifting on its own small orbit. Nine cells are visited because a
   * point near a boundary has to be drawn by its neighbours too, which is what
   * stops them popping in and out at the seams.
   *
   * The pointer repels. Pushing along the offset rather than by its sign keeps
   * the displacement smooth, and it is the one response here where the reader
   * is plainly moving things rather than lighting them.
   */
  float particles(vec2 q, float t, vec2 qp, float reach) {
    float lit = 0.0;
    vec2 cell = floor(q * 2.6);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        float a = hash(c);
        float b = hash(c + 17.3);
        vec2 at = (c + 0.5 + (vec2(a, b) - 0.5) * 0.85) / 2.6;
        at += vec2(sin(t * (0.5 + a) + b * 6.28), cos(t * (0.42 + b) + a * 6.28)) * 0.07;

        vec2 away = at - qp;
        float push = falloff(dot(away, away), 2.2) * reach;
        at += away * push * 0.55;

        vec2 off = q - at;
        lit += falloff(dot(off, off), 52.0) * (0.35 + a * 0.9);
      }
    }
    return lit * falloff(dot(q, q), 0.4);
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
   *
   * Nine, not eight: eight committed marks and the live head, which is held
   * outside the ring so that committing appends rather than overwrites. A
   * zero-length segment between the newest mark and the head is skipped below,
   * which is what makes the commit invisible.
   */
  float flowWake(vec2 at, mat2 turn, vec2 shift, out vec2 push) {
    push = vec2(0.0);
    float wake = 0.0;

    for (int i = 0; i < 8; i++) {
      vec3 a = uTrail[i];
      vec3 b = uTrail[i + 1];
      if (a.z >= 1.0 || b.z >= 1.0) {
        continue;
      }
      /* The marks arrive in screen space, and the field is sampled after a
         rotation, a scale and a parallax shift. Compared without carrying them
         through the same three, the wake sits somewhere else entirely: at a
         tilt of 42 and a scale of 1.7 it landed most of a frame from the
         cursor, which is what read as offset rather than as lagging. */
      vec2 pa = turn * (a.xy - shift) * uScale;
      vec2 pb = turn * (b.xy - shift) * uScale;
      vec2 ab = pb - pa;
      float len2 = dot(ab, ab);
      if (len2 < 1e-6) {
        continue;
      }
      float t = clamp(dot(at - pa, ab) / len2, 0.0, 1.0);
      vec2 off = at - (pa + ab * t);

      /* Elongated along the stroke, not round about it.
      
         A circular falloff makes the wake a tube of even thickness, which is
         what a pipe looks like and not what a stirred medium does. Ink pulled
         through a liquid smears the way the hand went: it reaches further along
         the direction of travel than across it. Weighting the along component
         down stretches the ellipse into that direction, and costs one dot
         product. */
      vec2 tangent = ab * inversesqrt(len2);
      float alongOff = dot(off, tangent);
      float acrossOff = dot(off, vec2(-tangent.y, tangent.x));
      float shaped = acrossOff * acrossOff + alongOff * alongOff * 0.3;

      /* Squared, so a wake thins as it dies rather than switching off. */
      float life = 1.0 - mix(a.z, b.z, t);
      float w = life * life * falloff(shaped, 3.2);
      wake += w;
      push += (ab * inversesqrt(len2)) * w;
    }

    /* Limited, because an unbounded displacement folds and a fold is a crease.
    
       Where the map from sample to displaced sample stops being one to one,
       neighbouring samples land on the same value and the pattern piles into a
       hard bright line: a caustic, which is what a sharp diagonal with a bright
       wedge beside it always is. The sum runs over eight segments of unit
       tangents, so near the stroke it reached several times the width of the
       falloff it was displacing across, and folded every time.
    
       The falloff is about a third of a unit wide, so the displacement has to
       stay under that for the map to stay monotone. Saturating rather than
       clamped: a clamp is a corner, and a corner in a displacement is the same
       crease by another route. */
    float mag = length(push);
    push = mag > 0.0 ? push * (0.24 / (0.9 + mag)) : vec2(0.0);
    return wake;
  }

  float flow(vec2 q, float t, mat2 turn, vec2 shift) {
    vec2 push;
    float wake = flowWake(q, turn, shift, push);
    /* Already limited inside, so it is applied whole. */
    vec2 p = q + push;

    /* The field is warped by itself twice over, which is what gives a liquid
       its folded look: each sample is displaced by the field's own value, so
       structure gathers into sheets rather than staying a cloud. */
    float ink = warped(p * 1.15, t * 0.55);
    float sheet = warped(p * 2.3 + vec2(3.1, 1.7), t * 0.35);
    float body = mix(0.55, 1.3, ink) * mix(0.5, 1.15, sheet);

    /* The resting state matters more than the stirred one: most readers never
       move the pointer, and a shape that is dark until touched is a shape most
       people never see. */
    return body * (0.5 + clamp(wake, 0.0, 1.0) * 0.38) * falloff(dot(q, q), 0.55);
  }

  /* Two wave fields crossed, lit where they agree. */
  void main() {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    /* What the pointer does, and the two answers this stopped giving.
    
       It multiplied what was already lit, which shows nothing over a dark part
       of the field, so the visible answer to moving the cursor appeared
       wherever the shape happened to be bright rather than where the cursor
       was. Replacing that with a pull toward the pointer fixed the location and
       introduced the second problem: a radial pull is a magnifier, so every
       shape answered a pointer by zooming, and the lift that remained answered
       by glowing. Two gestures, applied identically to six different things,
       neither of which had anything to do with the thing it was applied to.
    
       There is no shared response now. What is left here is parallax, and each
       shape answers for itself below. */
    /* Parallax, and small on purpose. At 0.16 the whole field translated a
       sixth of the frame between one edge of the screen and the other, which
       reads as the background being dragged rather than as depth: a large
       global motion answering a small input, which no time constant rescues. */
    /* Turning the response off turns all of it off, parallax included: a
       consumer asking for none is not asking for a quieter one. */
    float shift = uInteraction == 4 ? 0.0 : uReach;
    vec2 q = p - uPointer * 0.05 * shift;

    float a = radians(uTilt);
    mat2 turn = mat2(cos(a), sin(a), -sin(a), cos(a));
    q = turn * q * uScale;

    /* The pointer, carried into the same frame the shapes are drawn in, so each
       one can answer it in its own terms. */
    vec2 qp = turn * uPointer * uScale;

    float t = uTime * 0.06;

    /* Each shape answers the pointer in the terms it is made of, and there is
       no shared response left over.
    
       There used to be two, applied to everything: the field was pulled toward
       the cursor, and what was already lit was multiplied over a floor. Those
       are a zoom and a glow, they are the same gesture on every shape, and
       neither says anything about the shape it is on. A braid has a length and
       can lean. Rays have a source and can re-aim. A curtain has a horizon and
       can swell. Rings are made of spacing and can crowd. A weave is made of
       agreement and can shear. Flow is stirred, and had the only one of these
       that was ever about its own material. */
    /* A shape answers for itself only when nothing else has been asked for.
       Given a generic response, its own is switched off rather than layered
       under: two answers to one gesture is how the zoom and the glow got here
       in the first place. */
    float own = uInteraction == 0 ? uReach : 0.0;

    float d = 0.0;
    if (uShape == 0) {
      d = braid(q, t, qp, own);
    } else if (uShape == 1) {
      d = rays(q, t, qp, own);
    } else if (uShape == 2) {
      d = aurora(q, t, qp, own);
    } else if (uShape == 3) {
      d = prism(q, t, qp, own);
    } else if (uShape == 4) {
      d = streaks(q, t, qp, own);
    } else if (uShape == 5) {
      d = waves(q, t, qp, own);
    } else if (uShape == 6) {
      d = threads(q, t, qp, own);
    } else if (uShape == 7) {
      d = particles(q, t, qp, own);
    } else {
      d = flow(q, t, turn, uPointer * 0.05 * uReach);
    }

    /* Bloom as an exponent on the field rather than a term inside each shape.
       Every shape is a density that falls off, so a power tightens or spreads
       that falloff and one control means the same thing in all five. */
    d = pow(max(d, 0.0), mix(2.0, 0.5, clamp(uBloom, 0.0, 1.0))) * uGain;

    /* The generic answers, for a consumer who has asked for one.
    
       All three are functions of distance from the pointer and nothing else,
       which is exactly what makes them generic and exactly what makes them say
       less. The light option lifts what is lit and puts a floor under itself so
       there is something at the cursor over a dark field. The shadow option is
       that gesture inverted, which suits a bright field where a lamp would be
       invisible. The ripple option is the one with a clock in it, so it keeps
       moving after the pointer has stopped. */
    if (uInteraction != 0 && uInteraction != 4) {
      vec2 toCursor = p - uPointer;
      float near = falloff(dot(toCursor, toCursor), 3.0) * uReach;
      if (uInteraction == 1) {
        d = d * (1.0 + near * 1.2) + near * 0.08;
      } else if (uInteraction == 2) {
        d *= 1.0 - near * 0.85;
      } else {
        float rings = sin(length(toCursor) * 13.0 - uTime * 3.2);
        d *= 1.0 + rings * near * 0.75;
      }
    }

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
