import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import marker from './headless.js'

/**
 * Map Marker's styled tier.
 *
 * **A point with no box of its own**, stood on the place by the connector,
 * which writes where that is as `--_map-marker-x` and `--_map-marker-y` every
 * time the view moves. Zero by zero, so the frame lays nothing out for it and
 * the button is centered on the point it names. **`left` and not
 * `inset-inline-start`**: the renderer measures from the left whatever the
 * page's direction, so a right-to-left page would put every place in its
 * mirror image. A phone's frame writes the same numbers, which the rules
 * read as measured values.
 *
 * **A phone draws the face, the teardrop and the tip as parts**, the web's
 * gradient, `::before` and `::after`, and shows the name after a press.
 *
 * **Web only:** clusters, the clustered and fanned places, the far side of a
 * globe, the name turned to the start, the rings of hover and focus, forced
 * colors and the reader's motion preference.
 */
export default styles(
  marker,
  {
    prefix: 'map-marker',
    hooks: {
      clusterColor: token('color-primary-surface'),
      clusterSize: '1.75rem',
      color: token('color-primary'),
      ink: token('color-foreground-on-primary'),
      labelBorderWidth: token('border-floating'),
      labelShadow: token('shadow-floating'),
      size: '1.375rem',
    },
    own: {
      mapMarkerColor: null,
      mapMarkerEdge: null,
      mapMarkerFace: null,
      mapMarkerFill: null,
      mapMarkerHalo: null,
      mapMarkerInk: null,
      mapMarkerLeg: null,
      mapMarkerLegAngle: null,
      mapMarkerLegDot: null,
      mapMarkerLegInk: null,
      mapMarkerLift: null,
      mapMarkerShadow: null,
      mapMarkerSize: null,
      mapMarkerX: null,
      mapMarkerY: null,
    },
    props: {
      material: oneOf(['frosted', 'glass', 'transparent']),
      separation: oneOf(['elevated', 'filled', 'outlined', 'plain']),
      shape: oneOf(['diamond', 'pin', 'ring', 'rounded', 'square']),
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'success', 'warning']),
    },
    stylesheet: 'map/marker/map-marker.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* **No shadow is written `0 0 transparent`**: `none` is no value inside
       a list of shadows, and took the whole list with it. */
    const noShadow = [0, 0, 'transparent']
    const translate = fn(
      'translate',
      quotient(own.mapMarkerSize, '-2'),
      difference('-50%', own.mapMarkerLift),
    )
    return [
      on('host', [
        rule({
          own: {
            mapMarkerColor: hook.color,
            /* **What the point is filled with, and the ink of its dot or
               letter.** Not the tone itself: white on the brand or a status
               color measured 2.80 on primary and 3.12 on danger in dark
               mode, and 4.40 on primary in light, which is why the token
               layer pairs each `-surface` fill with its role's label,
               `foreground-on-primary` here. */
            mapMarkerFill: hook.color(token('color-primary-surface')),
            mapMarkerInk: hook.ink,
            /* **The point's measures, which the axes below move together**:
               its size, larger for a pin and a cluster; how far its center
               stands above the place, which a pin raises so its tip is what
               stands there; and its edge, its halo and its lift, which
               separation decides. */
            mapMarkerEdge: token('color-surface'),
            /* **A band of the point's own color around its edge**, which
               with the lift sets a page's place apart from the map's
               landmarks: `drawMapImage` draws a landmark as a 22 pixel disc
               ringed in the land and laid flat, and a place is as large,
               lifted, and haloed. */
            mapMarkerHalo: [
              0,
              0,
              0,
              product(own.mapMarkerSize, 0.22),
              mix(own.mapMarkerColor, 30, 'transparent'),
            ],
            mapMarkerLift: '0px',
            mapMarkerShadow: token('shadow-sm'),
            mapMarkerSize: hook.size,
          },
          blockSize: 0,
          display: 'block',
          inlineSize: 0,
          insetBlockStart: web(own.mapMarkerY),
          left: web(own.mapMarkerX),
          position: 'absolute',
        }),
        web([
          rule({
            own: {
              /* **What the point shows on its face**: the fill with a dot of
                 its ink in the middle, the way a map draws a place, until it
                 holds a letter. A pin shows it on its teardrop, which is
                 drawn over the point's own face. */
              mapMarkerFace: fn(
                'radial-gradient',
                'circle',
                [own.mapMarkerInk, product(own.mapMarkerSize, 0.12)],
                [own.mapMarkerFill, sum(product(own.mapMarkerSize, 0.12), '0.75px')],
              ),
              /* **Declared here and written by the connector**, in a sheet
                 of the marker's own, which is what makes them readable below:
                 the connector lives in another package and writes the place's
                 screen position every time the view moves. Zero is where an
                 unplaced marker would sit, which the rule after this hides. */
              mapMarkerLeg: '0px',
              mapMarkerLegAngle: '0rad',
              mapMarkerX: '0px',
              mapMarkerY: '0px',
            },
          }),
          /* **Over a live position while a reader is on it**, which
             otherwise stands over the places it passes, so the name a reader
             asked for is not under it. */
          rule([{ hover: true }, { focusWithin: true }], { zIndex: sum(token('layer-raised'), 1) }),
          /* Not yet placed, which is a marker the connector has not reached:
             drawn at the corner it would be a place in the wrong place. */
          rule({ placed: false }, { visibility: 'hidden' }),
          /* **Behind the globe**, out of sight and out of the pointer's way,
             and still focusable: a reader walking the markers reaches it, and
             the connector turns the globe to show it. */
          rule({ behind: true }, { opacity: 0, pointerEvents: 'none' }),
        ]),
        /* **A phone's frame writes where the place falls, and the host is the
           point's box on it**, raised by the lift: a touch lands only inside
           its view's own box on a phone, so a host of no size took none. */
        native([
          rule({
            blockSize: own.mapMarkerSize,
            inlineSize: own.mapMarkerSize,
            insetBlockStart: difference(
              difference(measured('_map-marker-y', '0px'), quotient(own.mapMarkerSize, 2)),
              own.mapMarkerLift,
            ),
            left: difference(measured('_map-marker-x', '0px'), quotient(own.mapMarkerSize, 2)),
          }),
          rule({ placed: false }, { opacity: 0 }),
        ]),
      ]),
      on('marker', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-xs'),
          left: 0,
          outline: 'none',
          position: 'absolute',
          top: 0,
          web: {
            cursor: 'pointer',
            /* **Only the point is pressed.** The button's box runs the width
               of its name, which is invisible until the marker is pointed
               at, and that box took presses and drags meant for the map, and
               for the marker beside it, across a name nobody could see. */
            pointerEvents: 'none',
            transform: translate,
          },
        }),
        /* **The point stands on the place, at whichever end of the button it
           is.** The button is the point then the name, in reading order, so
           the point is its first box on a left-to-right page and its last on
           a right-to-left one, and turned to the start the two swap.
           Anchored by a fixed offset, a right-to-left page stood every place
           a name's width off its point. */
        web([
          rule([{ dir: 'rtl' }, { start: true }], {
            transform: fn(
              'translate',
              sum('-100%', quotient(own.mapMarkerSize, 2)),
              difference('-50%', own.mapMarkerLift),
            ),
          }),
          rule({ dir: 'rtl', start: true }, { transform: translate }),
          /* The name before the point, where the connector found no room
             after it. */
          rule({ start: true }, { flexDirection: 'row-reverse' }),
        ]),
        /* A phone has no share of the box to move by: the host stands the
           point's box on the place, and the button fills it. */
        native([
          rule({
            flexDirection: 'row',
            left: 0,
            top: 0,
          }),
        ]),
      ]),
      on('point', [
        rule({
          alignItems: 'center',
          background: web(own.mapMarkerFace),
          blockSize: own.mapMarkerSize,
          border: [token('border-thick'), 'solid', own.mapMarkerEdge],
          borderRadius: token('radii-full'),
          boxShadow: list(own.mapMarkerHalo, own.mapMarkerShadow),
          boxSizing: 'border-box',
          color: own.mapMarkerInk,
          display: web('grid'),
          flex: 'none',
          fontFamily: token('font-sans'),
          fontSize: product(own.mapMarkerSize, 0.5),
          fontWeight: token('weight-semibold'),
          inlineSize: own.mapMarkerSize,
          lineHeight: 1,
          position: 'relative',
          web: {
            isolation: 'isolate',
            justifyItems: 'center',
            pointerEvents: 'auto',
            transition: ['transform', token('duration-fast'), token('easing-standard')],
          },
        }),
        native([
          rule({
            backgroundColor: own.mapMarkerFill,
            display: 'flex',
            justifyContent: 'center',
          }),
          /* **The letter keeps to the point** at every text size: a phone's
             point stops growing at the largest standard size, where its
             text does not, and a letter grew out of its point. Half the
             point at the default size, as the web's. */
          rule({ fontSize: '11px' }),
          rule({ shape: 'pin' }, { fontSize: '13px' }),
        ]),
      ]),
      /* **A point holding a letter, a number or an icon shows it in place of
         the dot**, on the fill its ink reads on. */
      on('host', [web([rule({ icon: true }, { own: { mapMarkerFace: own.mapMarkerFill } })])]),
      /* **Shape: circle unless said otherwise**, so a page can tell kinds of
         place apart by more than their color, which a reader who cannot tell
         the colors apart needs: rounded or square corners, a diamond turned a
         quarter, a ring, the place's color as an edge around the surface, or
         a pin. */
      on('point', [
        rule({ shape: 'rounded' }, { borderRadius: token('radii-md') }),
        rule({ shape: 'square' }, { borderRadius: token('radii-none') }),
        rule(
          { shape: 'diamond' },
          { borderRadius: token('radii-none'), rotate: '45deg', scale: 0.85 },
        ),
      ]),
      /* What a diamond holds stays upright. */
      on({ region: 'icon', slotted: '*' }, [
        web([rule({ shape: 'diamond' }, { rotate: '-45deg' })]),
      ]),
      on('point', [
        rule(
          { shape: 'ring' },
          {
            background: token('color-surface'),
            borderColor: own.mapMarkerColor,
            borderWidth: product(own.mapMarkerSize, 0.18),
            color: own.mapMarkerColor,
          },
        ),
        /* A phone draws the fill as a color of its own, which the ring's
           ground takes the place of. */
        native([rule({ shape: 'ring' }, { backgroundColor: token('color-surface') })]),
      ]),
      /* **A pin, where a place is where the journey ends.** A teardrop behind
         what the point holds, its tip straight down, and the marker raised
         until the tip, rather than the point's middle, stands on the place:
         the rest of the pin is above what it marks, the way a pin pushed into
         a map is. The teardrop is a square with one sharp corner turned an
         eighth, so its tip is the corner's diagonal below the middle. */
      on('host', [
        rule(
          { shape: 'pin' },
          {
            own: {
              mapMarkerLift: product(own.mapMarkerSize, 0.72),
              mapMarkerSize: hook.size('1.625rem'),
            },
          },
        ),
      ]),
      /* **The pin's head is the point's own circle**, the fill behind what
         it holds, which the teardrop drawn over it matches exactly: a square
         rounded on three corners is that circle and a tip. Behind the letter
         as well as around it, so the letter stands on its fill wherever it is
         measured, not only where a pseudo-element is painted. */
      on('point', [
        rule(
          { shape: 'pin' },
          {
            background: own.mapMarkerFill,
            border: 0,
            borderRadius: token('radii-full'),
            boxShadow: 'none',
          },
        ),
      ]),
      on({ before: 'point' }, [
        web([
          rule(
            { shape: 'pin' },
            {
              background: own.mapMarkerFace,
              border: [token('border-thick'), 'solid', own.mapMarkerEdge],
              borderRadius: [
                token('radii-full'),
                token('radii-full'),
                token('radii-full'),
                token('radii-none'),
              ],
              boxShadow: list(own.mapMarkerHalo, own.mapMarkerShadow),
              boxSizing: 'border-box',
              content: '""',
              inset: 0,
              position: 'absolute',
              rotate: '-45deg',
              zIndex: token('layer-beneath'),
            },
          ),
        ]),
      ]),
      /* **Where the tip meets the ground**, a small dot of the pin's own
         color ringed in the surface: a pin standing over a busy map read as
         somewhere near its place rather than on it, and a soft shadow there
         read as a smudge on a dark map. Beneath the teardrop, so the tip is
         drawn over it. */
      on({ after: 'point' }, [
        web([
          rule(
            { shape: 'pin' },
            {
              background: own.mapMarkerFill,
              blockSize: product(own.mapMarkerSize, 0.26),
              border: [token('border-thin'), 'solid', own.mapMarkerEdge],
              borderRadius: token('radii-full'),
              boxSizing: 'border-box',
              content: '""',
              inlineSize: product(own.mapMarkerSize, 0.26),
              left: '50%',
              position: 'absolute',
              top: sum('50%', own.mapMarkerLift),
              translate: ['-50%', '-50%'],
              zIndex: difference(token('layer-beneath'), 1),
            },
          ),
        ]),
      ]),
      /* The pin's teardrop on a phone, over the point's head, and its tip. */
      on('point-drop', [
        native([
          rule({
            backgroundColor: own.mapMarkerFill,
            border: [token('border-thick'), 'solid', own.mapMarkerEdge],
            borderRadius: token('radii-full'),
            borderEndStartRadius: token('radii-none'),
            boxShadow: list(own.mapMarkerHalo, own.mapMarkerShadow),
            boxSizing: 'border-box',
            display: 'none',
            inset: 0,
            position: 'absolute',
            transform: fn('rotate', '-45deg'),
            zIndex: token('layer-beneath'),
          }),
          rule({ shape: 'pin' }, { display: 'flex' }),
        ]),
      ]),
      on('point-foot', [
        native([
          rule({
            backgroundColor: own.mapMarkerFill,
            blockSize: product(own.mapMarkerSize, 0.26),
            border: [token('border-thin'), 'solid', own.mapMarkerEdge],
            borderRadius: token('radii-full'),
            boxSizing: 'border-box',
            display: 'none',
            inlineSize: product(own.mapMarkerSize, 0.26),
            left: product(own.mapMarkerSize, 0.37),
            position: 'absolute',
            top: sum(product(own.mapMarkerSize, 0.37), own.mapMarkerLift),
            zIndex: difference(token('layer-beneath'), 1),
          }),
          rule({ shape: 'pin' }, { display: 'flex' }),
        ]),
      ]),
      /* The dot of ink in the middle of the point, which a letter, an icon
         or a ring takes the place of. */
      on('point-dot', [
        native([
          rule({
            backgroundColor: own.mapMarkerInk,
            blockSize: product(own.mapMarkerSize, 0.24),
            borderRadius: token('radii-full'),
            inlineSize: product(own.mapMarkerSize, 0.24),
          }),
          rule([{ icon: true }, { cluster: true }, { shape: 'ring' }], { display: 'none' }),
        ]),
      ]),
      /* **A cluster: the count of the places it stands for**, in a circle
         whatever shape its first place takes, filled with the brand's fill
         that carries white and haloed in the brand, which says there is more
         than one here before the number is read. Larger than a lettered
         point, the count being up to three figures. */
      on('host', [
        web([
          rule(
            { cluster: true },
            { own: { mapMarkerLift: '0px', mapMarkerSize: hook.clusterSize } },
          ),
        ]),
      ]),
      on('point', [
        web([
          rule(
            { cluster: true },
            {
              background: hook.clusterColor,
              border: [token('border-thick'), 'solid', own.mapMarkerEdge],
              borderRadius: token('radii-full'),
              boxShadow: list(
                [
                  0,
                  0,
                  0,
                  product(own.mapMarkerSize, 0.18),
                  mix(hook.clusterColor, 28, 'transparent'),
                ],
                own.mapMarkerShadow,
              ),
              color: token('color-foreground-on-primary'),
              fontSize: product(own.mapMarkerSize, 0.42),
              fontVariantNumeric: 'tabular-nums',
              rotate: 'none',
              scale: 'none',
            },
          ),
        ]),
      ]),
      on({ before: 'point' }, [web([rule({ cluster: true }, { content: 'none' })])]),
      on({ after: 'point' }, [web([rule({ cluster: true }, { content: 'none' })])]),
      /* **A fanned place's leg**, back to the spot it shares with the
         others, so a ring of places pressed out of one cluster still says
         where they all are. Drawn from the host, which stands where the place
         now does, under its point; the connector writes how long it is and
         which way it points. */
      on({ before: 'host' }, [
        web([
          rule(
            { fanned: true },
            {
              own: {
                mapMarkerLegInk: mix(token('color-foreground'), 55, token('color-surface')),
                mapMarkerLegDot: product(token('border-thick'), 1.75),
              },
              /* The line, and a dot at its far end where every leg meets,
                 which is the spot itself: legs alone met in a crosshair that
                 marked nothing. */
              background: list(
                fn(
                  'radial-gradient',
                  ['circle', 'at', difference('100%', own.mapMarkerLegDot), '50%'],
                  [own.mapMarkerLegInk, own.mapMarkerLegDot],
                  ['transparent', sum(own.mapMarkerLegDot, token('border-thin'))],
                ),
                [
                  fn('linear-gradient', own.mapMarkerLegInk, own.mapMarkerLegInk),
                  0,
                  '50%',
                  '/',
                  '100%',
                  token('border-thick'),
                  'no-repeat',
                ],
              ),
              /* Room for the dot's soft edge, which a box its own size cut
                 square. */
              blockSize: product(sum(own.mapMarkerLegDot, token('border-thin')), 2),
              content: '""',
              inlineSize: sum(own.mapMarkerLeg, own.mapMarkerLegDot),
              left: 0,
              position: 'absolute',
              rotate: own.mapMarkerLegAngle,
              top: 0,
              transformOrigin: [0, '50%'],
              translate: [0, '-50%'],
            },
          ),
        ]),
      ]),
      on('host', [
        /* Out of the way while another marker stands for it. */
        web([rule({ clustered: true }, { display: 'none' })]),
        /* **Separation: how the point stands off the map.** Absent is an
           edge in the surface, a halo of its own color, and a little lift.
           `outlined` is the edge alone, `elevated` lifts it further, as an
           elevated card is, `filled` is a wider wash of its own color with no
           edge, and `plain` the bare point. A pin takes the same. */
        rule(
          { separation: 'outlined' },
          { own: { mapMarkerHalo: noShadow, mapMarkerShadow: noShadow } },
        ),
        rule({ separation: 'elevated' }, { own: { mapMarkerShadow: token('shadow-md') } }),
        rule(
          { separation: 'filled' },
          {
            own: {
              mapMarkerEdge: 'transparent',
              mapMarkerHalo: [
                0,
                0,
                0,
                product(own.mapMarkerSize, 0.3),
                mix(own.mapMarkerColor, 22, 'transparent'),
              ],
              mapMarkerShadow: noShadow,
            },
          },
        ),
        rule(
          { separation: 'plain' },
          {
            own: {
              mapMarkerEdge: 'transparent',
              mapMarkerHalo: noShadow,
              mapMarkerShadow: noShadow,
            },
          },
        ),
      ]),
      /* The name beside the point, shown while the marker is pointed at or
         focused. **Hidden by opacity and never by `display`**: it is the
         button's name, and a name taken out of the tree is a button a screen
         reader calls "button". */
      on({ part: 'label', exact: true }, [
        rule({
          /* **A floating surface**, lying over the map the way the frame's
             controls do, so it answers to the same separation they do. */
          background: token('color-surface-overlay'),
          border: [hook.labelBorderWidth, 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: hook.labelShadow,
          color: token('color-foreground'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          opacity: 0,
          padding: [token('space-2xs'), token('space-xs')],
          whiteSpace: 'nowrap',
          web: {
            pointerEvents: 'none',
            transition: ['opacity', token('duration-fast'), token('easing-standard')],
          },
        }),
        /* **Its names wrap**, a cluster's being a list: a line as long as
           twelve places' names ran off the map. As wide as the names, up to a
           measure, and only then wrapped: left to shrink, a label beside the
           point wrapped at every word. */
        web([
          rule(
            { cluster: true },
            { inlineSize: 'max-content', maxInlineSize: '16rem', whiteSpace: 'normal' },
          ),
        ]),
        /* **Material is the name's ground**, as it is the controls' on the
           frame: glass lets the map through under a blur, frosted turns the
           pair up, and transparent leaves the name on the map with its halo
           of nothing. */
        rule(
          { material: 'glass' },
          { backdropFilter: token('material-backdrop'), background: token('material-panel') },
        ),
        rule(
          { material: 'frosted' },
          {
            backdropFilter: fn('blur', token('material-blur-lg')),
            background: token('material-translucent-strong'),
          },
        ),
        rule({ material: 'transparent' }, { backdropFilter: 'none', background: 'transparent' }),
        /* hover stays on touch: a tap is how a name comes up on a phone, and
           every name at rest would cover the map. */
        web([
          rule(
            [{ within: { host: { hover: true } } }, { within: { marker: { focusVisible: true } } }],
            {
              opacity: 1,
            },
          ),
        ]),
        /* A phone has no share of the box to move by, so the name stands
           after the point, centered on it by half its own height. */
        native([
          rule({
            insetInlineStart: sum(own.mapMarkerSize, token('space-xs')),
            marginBlockStart: quotient(
              sum(product(token('text-sm'), 1.5), product(token('space-2xs'), 2)),
              '-2',
            ),
            position: 'absolute',
            top: product(own.mapMarkerSize, 0.5),
          }),
        ]),
      ]),
      on('point', [
        web([
          /* hover stays on touch: the point grows with the name a tap brings
             up. */
          rule(
            [{ within: { host: { hover: true } } }, { within: { marker: { focusVisible: true } } }],
            {
              transform: fn('scale', 1.15),
            },
          ),
          /* **Focus rings the point where its halo was**, so one band
             surrounds it, a pin's teardrop as well. */
          rule(
            { within: { marker: { focusVisible: true } } },
            {
              boxShadow: own.mapMarkerShadow,
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ]),
      ]),
      on({ before: 'point' }, [
        web([
          rule({ within: { marker: { focusVisible: true } } }, { boxShadow: own.mapMarkerShadow }),
        ]),
      ]),
      on('host', [
        rule(
          { tone: 'accent' },
          {
            own: {
              mapMarkerColor: token('color-accent'),
              mapMarkerFill: token('color-accent-surface'),
              mapMarkerInk: hook.ink(token('color-foreground-on-accent')),
            },
          },
        ),
        rule(
          { tone: 'danger' },
          {
            own: {
              mapMarkerColor: token('color-danger'),
              mapMarkerFill: token('color-danger-surface'),
              mapMarkerInk: hook.ink(token('color-foreground-on-status')),
            },
          },
        ),
        rule(
          { tone: 'info' },
          {
            own: {
              mapMarkerColor: token('color-info'),
              mapMarkerFill: token('color-info-surface'),
              mapMarkerInk: hook.ink(token('color-foreground-on-status')),
            },
          },
        ),
        /* Muted ink has no fill of its own to carry white, and is muted
           text's contrast against the surface either way round, so the
           letter is the surface. */
        rule(
          { tone: 'neutral' },
          {
            own: {
              mapMarkerColor: token('color-foreground-muted'),
              mapMarkerFill: token('color-foreground-muted'),
              mapMarkerInk: hook.ink(token('color-surface')),
            },
          },
        ),
        rule(
          { tone: 'success' },
          {
            own: {
              mapMarkerColor: token('color-success'),
              mapMarkerFill: token('color-success-surface'),
              mapMarkerInk: hook.ink(token('color-foreground-on-status')),
            },
          },
        ),
        /* **Warning fills its point with the solid warning fill under the
           page's color**, as a solid warning Button, Tag, and Badge do, since
           the point carries a dot or a letter: white on a deep amber in light
           and black on a bright amber in dark. `warning-surface` measured
           #906106 under white in dark, 3.90:1 on the page, and the mark's
           #b86d00 carries white at 4.02. */
        rule(
          { tone: 'warning' },
          {
            own: {
              mapMarkerColor: token('color-warning'),
              mapMarkerFill: token('color-warning-solid'),
              mapMarkerInk: hook.ink(token('color-background')),
            },
          },
        ),
        /* **A place already passed is muted, not faded**, the way the route
           behind the traveler is quieter: its point and letter in the muted
           ink, which still reads on the map, where a see-through point let
           the streets through its letter. After the tones, so it quiets a
           toned place as well, and the name says it too, so the color is
           never the only way to tell. */
        rule(
          { passed: true },
          {
            own: {
              mapMarkerColor: token('color-foreground-muted'),
              mapMarkerFill: token('color-foreground-muted'),
              mapMarkerHalo: noShadow,
              mapMarkerInk: token('color-surface'),
              mapMarkerShadow: noShadow,
            },
          },
        ),
      ]),
      on({ part: 'label', exact: true }, [
        web([rule({ reducedMotion: true }, { transition: 'none' })]),
      ]),
      on('point', [web([rule({ reducedMotion: true }, { transition: 'none' })])]),
      /* Forced colors paint every background the page's Canvas color, and a
         point is a background, so a place lost its color and its fill while
         the map under it, a canvas forced colors leave alone, kept every one
         of its own. The point keeps the colors it was given for that map,
         its pin and its tip with it. */
      on('point', [web([rule({ forcedColors: true }, { forcedColorAdjust: 'none' })])]),
      /* **A press brings the name up on a phone**, where a finger cannot
         point at the marker: the marker pressed last holds the frame's one
         stop, and its point grows with its name, as the web's does on hover. */
      on({ part: 'label', exact: true }, [native([rule({ 'data-shown': true }, { opacity: 1 })])]),
      on('point', [native([rule({ 'data-shown': true }, { transform: 'scale(1.15)' })])]),
    ]
  },
)
