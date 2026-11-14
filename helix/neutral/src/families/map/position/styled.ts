import { oneOf } from '../../../render.js'
import { fn, list, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import position from './headless.js'

/**
 * Map Position's styled tier.
 *
 * **A point with no box of its own**, stood on the position by the connector
 * the way a marker is, with the ring's radius and the heading written beside
 * where it stands. Zero by zero, so the frame lays nothing out for it, and
 * `left` rather than `inset-inline-start` for the marker's reason: the
 * renderer measures from the left whatever the page's direction. A phone's
 * frame writes the same numbers, which the rules read as measured values.
 *
 * **Not the brand: the page's ink, ringed in its surface.** The places and
 * the routes are the brand, so a position in it was one more of them. Its
 * body is the ink, black on a light map and white on a dark one, the most
 * contrast the page has against its land, and its ring the surface, so it
 * is the one thing on the map in the page's own two colors. The wash around
 * it, its halo, beam and pulse, is the ink as well. A tone says otherwise
 * where the position means something: its body and wash in the tone, its
 * ring the surface.
 *
 * **Web only:** the tilt with the map's pitch, the glow the way it is going,
 * the pulse, the arrow's lift, and forced colors.
 */
export default styles(
  position,
  {
    prefix: 'map-position',
    hooks: ({ own }) => ({
      color: own.mapPositionInk,
      edge: token('color-surface'),
      fill: own.mapPositionInk,
      size: '1.25rem',
    }),
    own: {
      mapPositionColor: null,
      mapPositionEdge: null,
      mapPositionFill: null,
      mapPositionHeading: null,
      mapPositionInk: null,
      mapPositionPitch: null,
      mapPositionRadius: null,
      mapPositionSize: null,
      mapPositionTone: null,
      mapPositionX: null,
      mapPositionY: null,
    },
    props: {
      separation: oneOf(['elevated', 'filled', 'outlined', 'plain']),
      shape: oneOf(['diamond', 'ring', 'rounded', 'square']),
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'map/position/map-position.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => {
    const radius = measured('_map-position-radius', '0px')
    const heading = measured('_map-position-heading', '0deg')
    return [
      on('host', [
        rule({
          own: {
            /* **The ink a little short of itself**: a page's foreground is
               black or white outright, and a black mark on a near-white map
               read as a hole in it. A step toward the surface is the
               charcoal and the soft white a map draws its own marks in, and
               still the most contrast the page has. */
            mapPositionInk: mix(token('color-foreground'), 84, token('color-surface')),
            mapPositionColor: hook.color,
            mapPositionEdge: hook.edge,
            mapPositionFill: hook.fill,
            mapPositionSize: hook.size,
          },
          blockSize: 0,
          display: 'block',
          inlineSize: 0,
          insetBlockStart: web(own.mapPositionY),
          left: web(own.mapPositionX),
          pointerEvents: 'none',
          position: 'absolute',
          /* **Over the places it passes**, since it is the thing that
             moves: drawn after it, a marker it stood on covered it whole. */
          zIndex: token('layer-raised'),
        }),
        /* **Declared here and written by the connector**, in a sheet of the
           position's own, where this can read them. */
        web([
          rule({
            own: {
              mapPositionHeading: '0deg',
              mapPositionPitch: '0deg',
              mapPositionRadius: '0px',
              mapPositionX: '0px',
              mapPositionY: '0px',
            },
          }),
        ]),
        /* A phone's frame writes where the position stands. */
        native([
          rule({
            insetBlockStart: measured('_map-position-y', '0px'),
            left: measured('_map-position-x', '0px'),
          }),
        ]),
      ]),
      /* **Laid on the ground**, tilted back as far as the map is, so its
         ring, its glow and its arrow shorten with the road they stand on.
         Every part turns in the ground's plane before the plane is tilted,
         which is how the map itself turns and then tilts. A zero-sized box at
         the point, so the tilt turns about the point. */
      on('position', [
        rule({
          display: 'block',
          left: 0,
          position: 'absolute',
          top: 0,
          web: { transform: fn('rotateX', own.mapPositionPitch) },
        }),
        /* Not yet placed, which would draw it in the frame's corner. **The
           drawing and not the host**, so its status stays in the tree: a
           position behind the globe is unplaced, and a van there that
           arrived said nothing. */
        rule({ placed: false }, { visibility: 'hidden' }),
      ]),
      /* **As wide as the position is uncertain**, in meters on the ground,
         which the connector turns into pixels at the zoom the map is at. A
         wash of the point's color rather than a line, since it is a
         likelihood and not an edge. */
      on('accuracy', [
        rule({
          background: mix(own.mapPositionColor, 12, 'transparent'),
          blockSize: web(product(own.mapPositionRadius, 2)),
          border: [token('border-thin'), 'solid', mix(own.mapPositionColor, 35, 'transparent')],
          borderRadius: token('radii-full'),
          boxSizing: 'border-box',
          inlineSize: web(product(own.mapPositionRadius, 2)),
          left: web(0),
          position: 'absolute',
          top: web(0),
          web: { translate: ['-50%', '-50%'] },
        }),
        /* A phone has no share of the box to move by, so the ring is drawn
           back by its radius. */
        native([
          rule({
            blockSize: product(radius, 2),
            inlineSize: product(radius, 2),
            left: product(radius, '-1'),
            top: product(radius, '-1'),
          }),
        ]),
      ]),
      /* **A glow the way it is going**, feathered at its sides rather than
         cut, so it reads as where it is looking rather than as a slice taken
         out of the map: strongest at the point, gone by its edge, turned
         clockwise from north by the heading. Drawn only where a heading is
         known. */
      on('heading', [
        rule({ display: 'none' }),
        web([
          rule({
            background: fn(
              'conic-gradient',
              ['from', '-45deg'],
              ['transparent', '0deg'],
              [own.mapPositionColor, '30deg', '60deg'],
              ['transparent', '90deg'],
            ),
            blockSize: product(own.mapPositionSize, 5),
            borderRadius: token('radii-full'),
            inlineSize: product(own.mapPositionSize, 5),
            left: 0,
            mask: fn(
              'radial-gradient',
              'closest-side',
              ['rgb(0 0 0 / 0.32)', '20%'],
              'transparent',
            ),
            position: 'absolute',
            rotate: own.mapPositionHeading,
            top: 0,
            translate: ['-50%', '-50%'],
          }),
          rule({ heading: true }, { display: 'block' }),
        ]),
      ]),
      /* **A ring that radiates from the point**, which is what says live
         rather than one more place. Paced from the theme's own slow
         duration, so an `instant` theme, whose durations are zero, has none,
         and so does a reader who asked for less motion. */
      on('pulse', [
        native([rule({ display: 'none' })]),
        web([
          rule({
            animation: [
              'map-position-pulse',
              product(token('duration-slow'), 7.5),
              token('easing-decelerate'),
              'infinite',
            ],
            background: own.mapPositionColor,
            blockSize: own.mapPositionSize,
            borderRadius: token('radii-full'),
            inlineSize: own.mapPositionSize,
            left: 0,
            opacity: 0,
            position: 'absolute',
            top: 0,
            translate: ['-50%', '-50%'],
          }),
          rule({ reducedMotion: true }, { animation: 'none' }),
        ]),
      ]),
      keyframes('map-position-pulse', {
        from: { opacity: 0.45, scale: 1 },
        to: { opacity: 0, scale: 3.2 },
      }),
      /* **The point, flat in its body and ringed in its edge**, so it stands
         off any ground the map draws under it, with a halo a marker does not
         have, so it reads as moving rather than as one more place. */
      on('dot', [
        rule({
          background: own.mapPositionFill,
          blockSize: own.mapPositionSize,
          border: [token('border-thick'), 'solid', own.mapPositionEdge],
          borderRadius: token('radii-full'),
          boxShadow: list(
            [
              0,
              0,
              0,
              product(own.mapPositionSize, 0.3),
              mix(own.mapPositionColor, 20, 'transparent'),
            ],
            token('shadow-sm'),
          ),
          boxSizing: 'border-box',
          inlineSize: own.mapPositionSize,
          left: 0,
          position: 'absolute',
          top: 0,
          web: { translate: ['-50%', '-50%'] },
        }),
        native([
          rule({
            left: product(own.mapPositionSize, '-0.5'),
            top: product(own.mapPositionSize, '-0.5'),
          }),
        ]),
        /* **Shape: circle unless said otherwise.** Rounded and square for a
           thing the page wants read as a vehicle or a device rather than a
           person; a diamond, turned a quarter, for one that must not be
           mistaken for a place; a ring, the edge alone, for a position that
           is only a guess. A position with a heading is its arrow whatever
           its shape. */
        rule({ shape: 'rounded' }, { borderRadius: token('radii-md') }),
        rule({ shape: 'square' }, { borderRadius: token('radii-none') }),
        rule(
          { shape: 'diamond' },
          { borderRadius: token('radii-none'), rotate: '45deg', scale: 0.85 },
        ),
        rule(
          { shape: 'ring' },
          {
            background: 'transparent',
            /* The ring is all there is, so it is drawn in the body's color:
               in the edge's, the surface, it was the land ringing the land. */
            borderColor: own.mapPositionFill,
            borderWidth: product(own.mapPositionSize, 0.25),
          },
        ),
        /* **Separation: how it stands off the map.** Absent is all of it,
           the edge, the halo and a little lift. `outlined` is the edge
           alone, `elevated` the edge lifted, as an elevated card is,
           `filled` the halo alone with no edge, and `plain` the bare point.
           The arrow has no edge unless it is `outlined`, and the lift unless
           it is `outlined` or `plain`. */
        rule({ separation: 'outlined' }, { boxShadow: 'none' }),
        rule({ separation: 'elevated' }, { boxShadow: token('shadow-md') }),
        rule({ separation: 'filled' }, { borderColor: 'transparent' }),
        rule({ separation: 'plain' }, { borderColor: 'transparent', boxShadow: 'none' }),
        rule({ heading: true }, { display: 'none' }),
      ]),
      /* **With a heading, the point becomes the arrow**, the mark a
         navigation app draws for where you are and where you face, turned
         with the heading. An arrow inside a dot was a few pixels across at a
         map's size, too small to read which way it pointed. **No edge of its
         own**, the ink alone with a little lift, since an arrow is its shape
         and a ring around it said nothing the shape did not; `outlined`
         gives it one, a stroke in the surface painted under the fill with
         rounded joins. Its notch is shallow, so the tip is the one sharp
         point. */
      on('arrow', [
        rule({
          blockSize: product(own.mapPositionSize, 1.6),
          display: 'none',
          inlineSize: product(own.mapPositionSize, 1.6),
          left: 0,
          overflow: 'visible',
          position: 'absolute',
          rotate: web(own.mapPositionHeading),
          top: 0,
          web: {
            filter: fn('drop-shadow', [
              0,
              token('border-thin'),
              token('border-thick'),
              mix(token('color-foreground'), 30, 'transparent'),
            ]),
            translate: ['-50%', '-50%'],
          },
        }),
        native([
          rule({
            left: product(own.mapPositionSize, '-0.8'),
            rotate: heading,
            top: product(own.mapPositionSize, '-0.8'),
          }),
        ]),
        rule({ heading: true }, { display: 'block' }),
        web([rule([{ separation: 'outlined' }, { separation: 'plain' }], { filter: 'none' })]),
      ]),
      on({ part: 'arrow', inner: 'path' }, [
        web([
          rule({
            fill: own.mapPositionFill,
            paintOrder: 'stroke',
            stroke: 'none',
            strokeLinejoin: 'round',
            strokeWidth: product(token('border-thick'), 1.5),
          }),
          rule({ separation: 'outlined' }, { stroke: own.mapPositionEdge }),
        ]),
      ]),
      on('arrow-shape', [
        native([
          rule({
            fill: own.mapPositionFill,
            stroke: 'none',
            strokeLinejoin: 'round',
            strokeWidth: product(token('border-thick'), 1.5),
          }),
          rule({ separation: 'outlined' }, { stroke: own.mapPositionEdge }),
        ]),
      ]),
      /* **Heard, not seen**: the description is for a reader who cannot see
         the point move, and a sighted one has the page's own words for it. */
      on('status', [
        rule({
          blockSize: '1px',
          clipPath: fn('inset', '50%'),
          inlineSize: '1px',
          overflow: 'hidden',
          position: 'absolute',
          whiteSpace: 'nowrap',
        }),
      ]),
      on('host', [
        rule(
          { tone: true },
          { own: { mapPositionColor: own.mapPositionTone, mapPositionFill: own.mapPositionTone } },
        ),
        rule({ tone: 'accent' }, { own: { mapPositionTone: token('color-accent') } }),
        rule({ tone: 'danger' }, { own: { mapPositionTone: token('color-danger') } }),
        rule({ tone: 'info' }, { own: { mapPositionTone: token('color-info') } }),
        rule({ tone: 'neutral' }, { own: { mapPositionTone: token('color-foreground-muted') } }),
        rule({ tone: 'primary' }, { own: { mapPositionTone: token('color-primary') } }),
        rule({ tone: 'success' }, { own: { mapPositionTone: token('color-success') } }),
        rule({ tone: 'warning' }, { own: { mapPositionTone: token('color-warning-mark') } }),
      ]),
      /* Forced colors: the dot, its pulse and its heading are backgrounds,
         which the browser replaced with the canvas, over a map that keeps its
         colors. They keep theirs. */
      on(
        ['dot', 'heading', 'pulse'],
        [web([rule({ forcedColors: true }, { forcedColorAdjust: 'none' })])],
      ),
    ]
  },
)
