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

  /* How much the members of a population differ from one another, 1 being the
     resting amount and 0 a set that is uniform. Read by the shapes made of many
     similar things, whether those are counted or continuous: streaks has lanes,
     particles has motes, rays has a fan, aurora has bundles and folds, prism
     has bands. Braid, waves and flow have a single subject and nothing to vary.
     Threads is the deliberate exception, being even on purpose: a pass had
     already given its strands their own hashes and produced a scatter rather
     than a set. */
  uniform float uVariance;
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
    /* The fan is a population too, even though it is continuous rather than
       counted: how far apart its light and dark run is how much one ray differs
       from the next. Both ends travel toward the midpoint, so a variance of 0
       is an even wash and a variance of 1 is exactly the pair this always had. */
    float rv = clamp(uVariance, 0.0, 1.0);
    float lit = spread * mix(mix(0.85, 0.2, rv), mix(0.85, 1.5, rv), fan) *
      mix(0.75, 1.15, dust) * falloff(dot(v, v), 0.8);
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

    /* A curtain stands. It does not hang.
    
       This was a falloff symmetric about the ridge, which is a band with a
       wavy centre line, and a band with vertical noise on it is an equaliser.
       An aurora has a sharp lower border where the field lines reach their
       lowest, and light that thins upward from it, so the top and the bottom
       cannot be the same function. Cut hard below, drawn long above.
    
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
      /* **The sheet stands on the ridge rather than hanging from it, and that
         inversion is the whole difference between an aurora and a landscape.**
         A hard edge with mass under it is a mountain silhouette, which is
         exactly what this drew: one unbroken ridge line across the frame with a
         striped solid below it. The real thing is the other way up. A curtain's
         lower border is its sharpest, brightest line, and what rises from it
         thins and breaks into rays. Nothing else here had to change. */
      float depth = q.y - ridge;
      /* Sharp, but not a cliff: the edge is where the light stops, and a step
         narrower than a pixel is an aliased line rather than an edge. */
      float edge = smoothstep(-0.1, 0.05, depth);
      float rise = exp(-max(depth, 0.0) * (1.5 + f * 0.7));
      /* Stretched hard along the fall, so the striations are the vertical rays
         a curtain is actually made of rather than texture on a stripe. */
      float rays = fbm(vec2(q.x * (9.0 + f * 4.0), q.y * 0.35 - t * (2.2 + f)));

      /* A rim along the top edge. The brightest part of a curtain is the line
         where the field lines end, and without it the sheet fades in from
         nothing and reads as fog with stripes rather than as something with a
         boundary. Wide enough to see: at k = 26 this was two pixels and might
         as well not have been there. */
      float rim = falloff(depth * depth, 7.0) * 0.45;

      /* **A curtain is not the width of the sky.** Running edge to edge is what
         made the ridge read as a horizon: a horizon is continuous and a curtain
         is not. Broken into lengths by a slow mask, with real gaps between
         them, it becomes some number of curtains rather than one long one. */
      float lengths = smoothstep(0.2, 0.66, noise(vec2(q.x * 1.15 + f * 13.0, t * 0.12)));

      /* Rays clump. Straight fbm is evenly spaced striping, which is a picket
         fence whatever else is done to it, and the floor under it lit the sheet
         everywhere so the rays only ever read as texture on a solid band.
         Pushing the midtones apart leaves bright bundles with real gaps
         between them, and the low floor is what lets the gaps be gaps. */
      float bundles = smoothstep(0.34, 0.86, rays);

      /* The curtain is a draped sheet, so it is bright where a fold turns edge
         on and nearly out where it faces us. A narrow range here is a band of
         even brightness, which is the other half of what made it read flat. */
      float foldNoise = noise(vec2(q.x * 1.5 + f * 7.0, t * 0.25));

      /* Bundles and folds are what a curtain is made many of, so both answer
         variance about their own midpoint: at 0 an even sheet, at 1 the
         clumping and the deep folds this was tuned to. */
      float av = clamp(uVariance, 0.0, 1.0);
      float bundled = mix(mix(0.85, 0.1, av), mix(0.85, 1.6, av), bundles);
      float folded = mix(mix(0.775, 0.15, av), mix(0.775, 1.4, av), foldNoise);
      lit += edge * lengths * (rise * bundled * folded + rim) * (1.0 - f * 0.45);
    }
    return lit;
  }

  /* The distance to an equilateral triangle, negative inside.
   *
   * iq's, unchanged. The folds use abs() and sign(), which put derivative
   * discontinuities exactly at the three corners, and a triangle is entitled to
   * corners: the crease rule is about edges that should not be there.
   */
  float sdTriangle(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) {
      p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
  }

  /* One beam, an ordered spread, and the thing that did it.
   *
   * **This is the one shape that is about the token layer.** Helix derives a
   * whole accessible palette from a single brand colour, and a prism is that
   * argument as a picture: one thing goes in, an ordered set comes out, and the
   * set is a consequence of the source rather than a list beside it.
   *
   * **The glass is drawn now, and that is the reimagining.** Every version
   * before this was a beam that bent and fanned, with nothing at the corner to
   * bend it, so it read as a fibre bundle or a searchlight: the deviation was
   * the only evidence that anything had happened, and a deviation on its own is
   * just a kink. Giving the wedge a rim and a faint interior turns the picture
   * from an effect into a cause, which is the whole point being made.
   *
   * **The cursor is the prism**, literally rather than by implication. The beam
   * runs whether or not anybody is there, and the wedge sits where the pointer
   * is, so carrying it along the beam carries the split with it. It turns
   * slowly at rest, about a degree a second, because an object that never moves
   * against a field that does reads as a sticker on the glass.
   */
  float prism(vec2 q, float t, vec2 qp, float reach) {
    /* **The glass stays put and the pointer turns it.** It used to sit at the
       cursor, which meant the whole subject, wedge and beam and fan together,
       translated across the frame and off the edge of it: there was nowhere to
       stand where the shape was not moving, and no way to look at it at rest.
       A background with no home is not a background.
    
       Turning it is the better half of the same idea anyway. Rotating a prism
       is what changes the deviation, so the fan swings and the bands rearrange
       while the object stays where it was composed. */
    vec2 c = q;

    float spin = t * 0.35 + qp.x * 0.55 * reach;
    mat2 turn = mat2(cos(spin), sin(spin), -sin(spin), cos(spin));
    float body = sdTriangle(turn * c, 0.42);

    /* A rim, and an interior barely above the ground. Glass is mostly the
       edges: fill it and the wedge becomes a solid triangle sitting on the
       field, which is a logo rather than something light passes through. */
    float glassRim = falloff(body * body, 16.0);

    vec2 dir = normalize(vec2(0.55, -1.0));
    vec2 side = vec2(-dir.y, dir.x);
    float along = dot(c, dir);
    float acrossIn = dot(c, side);

    /* **Graded, or it is a wireframe.** An outline of even weight is a vector
       drawing of a triangle, which is what this looked like: a logo with beams
       attached. Glass is only bright where light meets it, so the rim is lifted
       along the beam and the far edges fall back to almost nothing.
    
       The interior carries a gradient rather than a flat wash, so the body has
       somewhere thick and somewhere thin and reads as a solid the light is
       inside of rather than a filled shape. */
    float faceLight = mix(0.3, 1.55, smoothstep(-0.45, 0.3, along));
    float interior = smoothstep(0.04, -0.3, body) * mix(0.05, 0.16, smoothstep(-0.3, 0.25, along));
    float glass = glassRim * 0.72 * faceLight + interior;

    /* The entry beam, which stops at the glass rather than running through it.
       All of the light that the fan then divides, so it is the brighter half:
       drawn at parity the shape begins at a corner with nothing arriving. */
    float beam = exp(-(acrossIn * acrossIn) / (2.0 * 0.038 * 0.038)) *
      smoothstep(0.1, -0.75, along);

    /* Deviated, because that is what a prism does to what passes through it.
       Spreading about the entry axis is a diffuser. */
    float bend = radians(24.0);
    vec2 out1 = vec2(dir.x * cos(bend) - dir.y * sin(bend), dir.x * sin(bend) + dir.y * cos(bend));
    vec2 sideOut = vec2(-out1.y, out1.x);
    float alongOut = dot(c, out1);
    float acrossOut = dot(c, sideOut);

    /* The fan leaves a face, not a point. A base of 0.05 put every band through
       one pixel at the corner, which is a starburst. */
    float past = smoothstep(0.08, 0.5, alongOut);
    float spread = 0.1 + max(alongOut, 0.0) * 0.3;
    float fan = exp(-(acrossOut * acrossOut) / (2.0 * spread * spread)) * past;

    /* Banded across the fan rather than along it, because what leaves a prism
       is separated by angle: dividing by the spread keeps each band on its own
       ray as the fan widens rather than letting them curve. They resolve with
       distance, merged at the face and apart further out, which is what
       emerging from glass looks like. */
    float u = acrossOut / spread;
    /* Fewer and broader. At two per unit and a falloff of 6 each band was about
       a ninth of its own cell, which draws wires rather than colours: what
       leaves a prism is a set of overlapping bands, and the gaps between them
       are the last thing to appear, not the first. */
    float cell = fract(u * 1.5 + 0.5) - 0.5;
    float resolved = smoothstep(0.0, 0.9, max(alongOut, 0.0));
    float bands = falloff(cell * cell, mix(1.1, 3.4, resolved));

    float pv = clamp(uVariance, 0.0, 1.0);
    float order = mix(mix(0.825, 1.15, pv), mix(0.825, 0.5, pv), clamp(u * 0.5 + 0.5, 0.0, 1.0));
    fan *= mix(mix(1.01, 0.45, pv), mix(1.01, 1.6, pv), bands) * order;

    float grain = warped(vec2(along * 1.1, acrossIn * 2.2), t * 0.45);
    return (beam * 1.25 + fan + glass) * mix(0.7, 1.15, grain) * falloff(dot(q, q), 0.5);
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

    /* Three lanes are visited, not one, and that is the fix for a square edge.
    
       Each lane draws its speed, phase and length from a hash of its index, so
       every one of them is at a different point in its cycle. Sampled from the
       single lane a fragment falls in, the whole strip changes state at the
       boundary and the field acquires a hard vertical line at every lane edge:
       measured at 23 straight edges across the frame, and at a tilt of 90 the
       same count arrives horizontal, which is what says they belong to the
       shape's own axes rather than to the screen.
    
       Visiting the neighbours and weighting each by its own distance is the
       same answer particles already uses for the same reason. The weight
       reaches zero between centres, so nothing is left to step. */
    float laneF = s.x * 2.4;
    float base = floor(laneF);

    float lit = 0.0;
    /* Three lanes, which is what the widths support. The tail spreads to at
       most 0.15 and lanes sit 0.417 apart, so one lane out carries about a
       fiftieth and the lane that drops out of the visited set, two out, is
       around a ten millionth. That dropped lane is where a step could appear,
       and it is the whole reason this loop is not a single lane. */
    for (int k = -1; k <= 1; k++) {
      float id = base + float(k);
      float within = laneF - (id + 0.5);

      /* Speed and length were already drawn per lane, and measure a little over
         four times and seventy times across a frame. What was not drawn was
         width, which came out flat at 47 to 53 pixels on every lane, so a set
         that moved variously was still a set of identical objects.
    
         All four now scale from a common resting value, so a variance of 0 is a
         rank of equal streaks at one speed rather than a special case. Phase is
         never scaled: lanes sharing a phase march in lockstep, which is not a
         uniform population but a broken one. */
      /* Clamped, and the upper half of that is not defensive tidying. These
         are mix() calls, so a value past 1 extrapolates rather than
         exaggerating: at 1.6 the length term reaches zero and beyond it goes
         negative, which makes exp(-behind / len) grow instead of decay and the
         lane becomes a full-height white bar. Measured at 2, the frame held 93
         apparent lanes and six straight edges. There is nothing above 1 worth
         reaching, the resting spread already being fourfold in speed. */
      float v = clamp(uVariance, 0.0, 1.0);
      float speed = mix(1.3, 0.55 + hash(vec2(id, 11.0)) * 1.5, v);
      float phase = hash(vec2(id, 29.0));
      /* Longer than they were. At 0.3 to 1.3 the tail was spent within about
         half the gap and each streak read as a blob with a smudge behind it;
         the thing is named for the trail, so the trail is the part that should
         dominate the head. */
      float len = mix(1.7, 0.9 + hash(vec2(id, 47.0)) * 1.7, v);

      /* **The lane is periodic, not a single streak that is put back when it
         runs out.** It was fract() over a fixed span of 3.6, so a head left the
         top at 1.8 and was moved to -1.8, taking whatever of its tail was still
         on screen with it. That span is only off screen while the frame is
         small enough to sit inside it, and the visible half-extent is
         (|sin tilt| * aspect + |cos tilt|) * scale, which reaches 1.97 at a
         tilt of 45 and 2.0 at a scale of 2. Past that the removal happens in
         plain view, which is the popping.
    
         Making the field periodic in y removes the event rather than moving it
         out of sight: heads sit at every integer of u and the whole rank slides
         through, so there is no frame in which one is created or destroyed and
         no scale or tilt at which that becomes visible.
    
         P is the gap between successive heads in a lane, and it is what density
         is now made of. It varies too: lanes that are alike in spacing read as
         a grid however much else about them differs. */
      /* Wider spacing, because the tails are longer: at the old gap a streak's
         tail reached the next one's nose and the lane read as a dashed line
         rather than as separate things travelling. */
      float gap = mix(4.2, 3.2 + hash(vec2(id, 59.0)) * 2.2, v);
      float travel = phase + t * speed * 1.8 / gap;
      float u = s.y / gap - travel;
      float w = fract(u);
      /* **A streak is one solid, not a brightness curve times a fixed width.**
         Drawn separably it is a dart, and that is what these were: along the
         lane the light stopped over a fifth of a unit, across it the lane kept
         its full width the whole way, and the level sets of such a product meet
         at a point. Straight edges and an apex, which is a paper dart.
    
         So each term carries its own width. The tail leaves the head narrow and
         spreads as it falls behind, and the front is a round cap rather than a
         full-width wall cut off across the lane. Together that is a teardrop,
         which is the silhouette the thing actually has. */
      float across = within / 2.4;
      /* 0.06, which is what the profile it replaces actually measured. Lanes
         sit 0.417 apart and the old exp(-|within| * 4) was half-height at 0.072
         of a lane, so a sigma of 0.15 was two and a half times too wide: every
         lane overlapped both neighbours and the frame came out a blue wash with
         no streaks in it at all. */
      /* Thinner, and paired with the longer tail below. Length against width is
         what makes a streak read as a streak: at a ratio near four these were
         stubby rods with rounded ends whichever way they tapered, and the fix
         for that is proportion rather than another change of profile. */
      float wide = mix(0.045, 0.03 + hash(vec2(id, 71.0)) * 0.04, v);

      /* **The nose is the narrow end.** A round cap the full width of the body,
         with the body then widening behind it, draws a bulb on a shaft. That is
         the silhouette this had, and it is not one to ship on a landing page.
    
         Tapering the front to a fraction of the width and letting it open out
         backwards makes the bright end the thin end, which is also what a
         streak of light actually looks like: the luminous part is the point,
         and what widens behind it is the part that is fading. */
      float nose = wide * 0.38;

      float behind = (1.0 - w) * gap;
      float spread = min(nose + wide * behind * 0.85, 0.15);
      float tail = exp(-behind / len) * exp(-(across * across) / (2.0 * spread * spread));

      /* The cap is the same sigma as the tail is where they meet, so crossing a
         head is continuous in shape as well as in height: just under it the
         tail stands at full and the cap is spent, just over it the reverse, and
         at the join both are the same gaussian. */
      float ahead = w * gap;
      float cap = exp(-(ahead * ahead + across * across) / (2.0 * nose * nose));

      /* Slowed where the pointer is, which is the other half of an obstacle. */
      float weight = mix(1.0, 0.5 + hash(vec2(id, 83.0)) * 0.95, v);
      lit += (tail + cap) * weight * mix(1.0, 0.45, near);
    }
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
    /* **The warp was eating the waves.** At an amplitude of 2.4 against a band
       frequency of 1.7 it swung the sine's argument by about four radians,
       which is more than a whole period: the wavefronts were destroyed rather
       than bent and what came out was turbulence. It read as marbled paper, and
       at a low scale it filled the frame with near white.
    
       A tenth of that bends the fronts and leaves them fronts. */
    float warp = warped(vec2(q.x * 0.5, q.y * 0.4), t * 0.3) - 0.5;
    vec2 w = q + warp * 0.32;

    /* Two systems crossing, lit where they agree, which is what the shape is
       named for and what it had stopped doing. One sine is a corrugation; two
       at different angles interfere, and the slow beat between them is the
       thing worth looking at. */
    /* **And the frequency was too low to be a wave at all.** At 2.3 the period
       is 2.7 in shape units against a visible half height of 1, so less than
       one crest fitted across the frame: there was nothing periodic to see, and
       every version of this that looked like anything looked like it because
       the warp was making clouds. Around 8 puts five crests across the frame,
       which is a wave field rather than a single swell.
    
       The two are deliberately not harmonic. Close but unequal frequencies beat
       against each other, and the slow travelling interference that produces is
       the thing worth watching. */
    float a = sin((w.y * 8.1 + w.x * 2.3) - t * 0.9 - pull * 1.4);
    float b = sin((w.y * 5.3 - w.x * 3.4) + t * 0.6 + pull * 1.0);

    /* **Added, these two make a lattice, not a wave field.** Equal amplitudes
       crossing at an angle give a regular grid of lobes, which came out as
       bubble wrap and got worse the more of it fitted on screen. Waves are
       lines. So one system carries the fronts and the other only varies their
       brightness along their length, which is what a real swell does: the
       crests stay crests and are taller in some places than others. */
    float band = a * 0.5 + 0.5;
    band *= mix(0.45, 1.0, b * 0.5 + 0.5);

    float grain = warped(vec2(w.x * 1.2 + 6.0, w.y * 0.85), t * 0.28);
    return pow(band, 2.2) * mix(0.55, 1.2, grain) * falloff(dot(q, q), 0.4);
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
    /* Narrowed, not collapsed. At 0.88 the amplitude and the spacing both fell
       to a tenth and all seven threads landed on the same line, which is a
       bright blob rather than a gathering: what a pinch has to preserve is that
       there are still threads in it. */
    float gather = 1.0 - falloff((q.x - pinchAt) * (q.x - pinchAt), 1.1) * 0.6;

    /* Seven, and every one of them the same thread.
    
       The pass before this gave each its own amplitude, height, thickness and
       brightness, all from hashes, and the result was a scatter rather than a
       set: seven unrelated squiggles that happened to share a frame. What makes
       a weave read as a weave is that the strands are alike and only their
       phase differs, which is also what makes it a wave rather than a wobble.
    
       So one amplitude, one thickness, one weight, one frequency, and the
       phases fanned evenly across a turn. Alike, they cross at regular
       intervals instead of at coincidences. */
    float lit = 0.0;
    for (int i = 0; i < 7; i++) {
      float f = float(i);
      float phase = f * (6.2831853 / 7.0);

      /* Evenly spaced, and the spacing collapses at the pinch along with the
         amplitude: threads that only narrow still run parallel through it,
         where threads that also converge actually gather. */
      /* The spacing closes less than the amplitude does, so the threads draw
         together without stacking. */
      float lane = (f - 3.0) * 0.17 * mix(1.0, gather, 0.65);
      float amp = 0.34 * gather;

      /* A second harmonic at a third the frequency and a third the amplitude,
         which bends the long run of each thread without breaking it into
         wiggles. Low and quiet is the difference between a wave with character
         and a wave with noise on it. */
      float y =
        lane +
        sin(q.x * 1.5 + t * 0.55 + phase) * amp +
        sin(q.x * 0.5 - t * 0.3 + phase) * amp * 0.32;

      lit += falloff((q.y - y) * (q.y - y), 24.0);
    }
    /* Quiet grain. At the old depth it was texture on the threads rather than
       air around them, and a wave with grain on it is a wobble again. */
    float grain = fbm(vec2(q.x * 2.0, q.y * 2.0 - t));
    return lit * mix(0.85, 1.12, grain) * falloff(dot(q, q), 0.4);
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
        float v = clamp(uVariance, 0.0, 1.0);
        vec2 at = (c + 0.5 + (vec2(a, b) - 0.5) * 0.85) / 2.6;
        at += vec2(
          sin(t * mix(1.0, 0.5 + a, v) + b * 6.28),
          cos(t * mix(1.0, 0.42 + b, v) + a * 6.28)
        ) * 0.07;

        vec2 away = at - qp;
        float push = falloff(dot(away, away), 2.2) * reach;
        at += away * push * 0.55;

        vec2 off = q - at;
        /* Size, which was flat at 52 for every mote, so a field whose members
           already differed in brightness and in how fast they wandered was
           still made of one object repeated. Nine cells are visited here, so
           unlike a streak lane a mote may be broader as well as tighter
           without leaving an edge anywhere. */
        float grade = mix(52.0, 52.0 * (0.62 + hash(c + 5.7) * 0.95), v);

        /* **Stretched along the way each mote is going.** Round dots at rest
           are a starfield, and a starfield is the one thing in this set that
           says nothing: stars are famously fixed. Elongating each along its own
           drift is what makes the same field read as something in motion, and
           it costs one normalize and a change of basis.
    
           Plus a halo, an order of magnitude wider and a tenth the strength, so
           a mote sits in the field rather than on top of it. A hard little disc
           on a dark ground is a pixel; light has a neighbourhood. */
        vec2 way = normalize(vec2(hash(c + 3.3) - 0.5, hash(c + 8.8) - 0.5) + 0.0001);
        vec2 streak = vec2(dot(off, way) / 2.4, dot(off, vec2(-way.y, way.x)));
        float core = falloff(dot(streak, streak), grade);
        float halo = falloff(dot(off, off), grade * 0.16) * 0.1;
        lit += (core + halo) * mix(0.8, 0.35 + a * 0.9, v);
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
    /* **Halved, because the detail was the problem.** At 1.15 and 2.3 every
       octave landed small enough that the frame filled edge to edge with fine
       crumple at one density: marbled stone, and it looked the same at every
       scale, gain and bloom because there was no large form for any of them to
       act on. Big shapes first, detail on top of them. */
    /* **A current, which is the thing it did not have.** Isotropic noise makes
       clouds however large the octaves are, and clouds are what this was: soft
       masses with no direction in them and nothing being carried anywhere. A
       liquid reads as a liquid because its detail is drawn out along the way it
       is going.
    
       So a slow angle field says which way the current runs here, and the ink
       is sampled stretched along it: four times longer down the current than
       across it, which turns the same noise into filaments. It costs one extra
       noise lookup and a change of basis. */
    float ang = noise(p * 0.32 + vec2(t * 0.09, 0.0)) * 6.2831853;
    vec2 run = vec2(cos(ang), sin(ang));
    vec2 cut = vec2(-run.y, run.x);
    vec2 drawn = vec2(dot(p, run) * 0.4, dot(p, cut) * 1.6);

    float ink = warped(drawn, t * 0.55);
    float sheet = warped(p * 1.1 + vec2(3.1, 1.7), t * 0.35);

    /* **Floors of 0.55 and 0.5 meant it was never dark anywhere.** The lowest
       the field could reach was a quarter lit, so every fragment landed in the
       same middle band and the frame came out an even swatch of texture with no
       structure to look at. Dropping the floor gives it voids.
    
       And a slow large mass over the top, so the liquid is thick in places and
       clear in others. Fine detail everywhere at one density is static; what
       makes a fluid read is that it gathers. */
    /* Thresholded, not just varied. A gentle modulation over a field that is
       lit everywhere is still lit everywhere; what a liquid needs is somewhere
       it simply is not, so the empty parts of the frame are what give the full
       parts a shape. */
    float mass = smoothstep(0.24, 0.72, noise(vec2(p.x * 0.45 - t * 0.1, p.y * 0.4 + t * 0.07)));
    /* The void floor is 0.18 rather than 0.05. At a low scale the mass noise
       varies less across the frame than the frame is wide, so a reader can land
       inside one void and see nothing at all: empty has to mean faint, not
       absent, or the shape can disappear entirely at a setting the property
       explicitly allows. */
    /* 0.28 rather than 0.18 under the voids, and a brighter ceiling. At a low
       scale the mass noise varies less across the frame than the frame is wide,
       so a reader can sit inside one void and see almost nothing: measured at
       scale 0.5, which came out near black. Empty has to mean faint. */
    float body = mix(0.07, 1.55, ink) * mix(0.45, 1.25, sheet) * mix(0.28, 1.5, mass);

    /* The resting state matters more than the stirred one: most readers never
       move the pointer, and a shape that is dark until touched is a shape most
       people never see. */
    /* 0.85 at rest, not 0.5. Halving an untouched field made sense when the
       field had a floor under it and could not go dark; with the voids in, the
       two together took it to a dim murk that read as wet rock. The wake still
       lifts what it touches, from a resting level that is worth looking at. */
    return body * (0.85 + clamp(wake, 0.0, 1.0) * 0.5) * falloff(dot(q, q), 0.55);
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
    /* **No global response, parallax included.** Every named interaction is a
       promise about what the pointer does, and translating the whole field is
       not any of them: a consumer asking for a light asked for a light, not for
       a light and a lean. It survived a pass that removed the other two shared
       gestures on the grounds that it was small, and small is not the test.
    
       Measured on threads before removing it, sampling a column band on the far
       side of the frame from the cursor and correlating: 90 pixels of vertical
       travel on a 1224 pixel canvas, seven per cent of the frame, identical
       under native, light, shadow and ripple and zero under none. Whatever the
       pointer was told to do, it also moved everything.
    
       What answers the pointer now is each shape, in the terms it is made of,
       and the three generics for a consumer who asks for one. */
    vec2 q = p;

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
