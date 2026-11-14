import { oneOf } from '../../../render.js'
import {
  difference,
  first,
  fn,
  inherited,
  list,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Map's styled tier: the frame, its column of controls over the map, the
 * layers menu beside the column, and the credit.
 *
 * **The web's controls are Icon Buttons**, whose hooks these rules set, laid
 * over the map by the shared viewport sheet. **A phone draws each control
 * itself**, a raised square a finger's target across, in the same column and
 * the compass's arrows round it, the web's named areas lowered to lines.
 *
 * **Web only:** the idle fade, printing, forced colors, the focus rings, the
 * renderer's box, the gesture hints, fullscreen and the previews on the
 * map-type cards.
 */
export default styles(
  root,
  {
    prefix: 'map',
    hooks: {
      attributionBorderColor: token('color-border'),
      attributionColor: token('color-foreground-muted'),
      attributionFontSize: token('text-xs'),
      backgroundColor: token('color-surface-sunken'),
      blockSize: '24rem',
      borderColor: token('color-border'),
      chosenColor: token('color-primary-surface'),
      layersMenuGap: token('space-sm'),
      layersMenuInlineSize: fn('min', product(token('size-control-lg'), 6), '70vw'),
      layersMenuPadding: token('space-sm'),
      needleNorthColor: token('color-danger'),
      needleSouthColor: token('color-foreground-muted'),
      needleTurn: '0deg',
      radius: token('radii-md'),
    },
    own: { mapZoomOutEdge: null },
    props: {
      creditPlacement: oneOf(['bottom-end', 'bottom-start']),
      fill: false,
      material: oneOf(['frosted', 'glass', 'transparent']),
    },
    stylesheet: 'map/root/map-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const ground = first(
      inherited('viewport-control-background-color'),
      token('color-surface-overlay'),
    )
    /* A phone's compass: an arrow's side, three quarters of a tight
       control; where an arrow stands centered on the compass's side; and
       where the column after the compass starts. */
    const arrow = product(token('size-control-tight'), 0.75)
    const middle = sum(arrow, quotient(difference(token('size-target'), arrow), 2))
    const far = sum(arrow, token('size-target'))
    const arrows = [
      'rotate-left',
      'pan-up',
      'rotate-right',
      'pan-start',
      'pan-end',
      'pan-down',
    ] as const
    const hidden = {
      blockSize: '1px',
      clipPath: fn('inset', '50%'),
      inlineSize: '1px',
      margin: token('space-none'),
      overflow: 'hidden',
      padding: token('space-none'),
      position: 'absolute',
      whiteSpace: 'nowrap',
    } as const
    return [
      /* The host draws nothing: the region inside it is the frame. */
      on('host', [
        web([rule({ display: 'contents' })]),
        /* **A phone's host is a box**, so with `fill` it covers the
           container itself, and the region covers the host. */
        native([rule({ fill: true }, { inset: 0, position: 'absolute' })]),
      ]),
      on('region', [
        rule({
          backgroundColor: hook.backgroundColor,
          blockSize: hook.blockSize,
          border: [token('border-thin'), 'solid', hook.borderColor],
          /* `md`, the container corner every framed region takes. */
          borderRadius: hook.radius,
          boxSizing: 'border-box',
          display: web('grid'),
          overflow: 'hidden',
          position: 'relative',
          web: { gridTemplateRows: ['auto', '1fr', 'auto', 'auto'] },
        }),
        /* A phone's grid with a share of a fixed height draws no rows, so
           the frame is a column there, the map taking what the rest leave. */
        native([rule({ display: 'flex', flexDirection: 'column' })]),
        /* **Covering the container, for a map behind a page's own
           content**, such as a hero whose words decide its height. A height
           from the region could not follow them: a percentage resolves
           against a parent with no height of its own, and a fixed one let
           the words run out of the hero at one width and leave a gap at
           another. Positioned instead, against whatever the page positioned,
           which is the one thing a backdrop asks of its container. No frame,
           since the container's edge is the map's. A size container, so what
           measures against the map's height has one to measure. */
        rule(
          { fill: true },
          {
            blockSize: web('auto'),
            border: 'none',
            borderRadius: token('radii-none'),
            inset: 0,
            position: 'absolute',
            web: { containerType: 'size' },
          },
        ),
        /* The region takes keyboard focus for its arrow keys, and the ring
           sits inside it so the edge of the page or a clipping parent cannot
           cut it. */
        web([
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
        ]),
      ]),
      /* **A stacking context of its own**, so what is raised over the map, a
         live position over the places it passes, is raised within the map
         and never over the frame's own controls beside it. */
      on('viewport', [
        rule({
          minBlockSize: 0,
          overflow: 'hidden',
          position: 'relative',
          web: { isolation: 'isolate' },
        }),
        /* A phone's map takes the room the rest of the frame leaves, and
           keeps a least height of its own at the largest text sizes. */
        native([rule({ flexBasis: 0, flexGrow: 1, flexShrink: 1, minBlockSize: '12rem' })]),
      ]),
      on('drawing', [native([rule({ inset: 0, position: 'absolute' })])]),
      /* **The routes and areas, said rather than shown.** The renderer draws
         them for a reader who can see the map, and this list names them for
         one who cannot, which is the part of it a sighted reader would only
         read twice. Off the screen and in the tree, the way a chart's
         summary is; a page that wants it seen, as a legend, gives it a box
         through `::part(layers)`. */
      on('layers', [rule({ ...hidden })]),
      /* What changed, heard and not seen. */
      on('live', [native([rule({ ...hidden })])]),
      /* Written out: whatever was slotted fills the box it was given, but for
         the markers and positions, which stand on their places over it and
         take no box at all. */
      on(
        {
          part: 'viewport',
          selector:
            '[part="viewport"] ::slotted(:not(helix-map-marker, helix-map-points, helix-map-position))',
        },
        [web([rule({ blockSize: '100%', inlineSize: '100%' })])],
      ),
      /* **The chrome fades and the controls do not.** A reader who has gone
         still has not stopped needing the only controls this frame offers,
         and a map whose zoom buttons vanish under an idle timer is a map a
         keyboard reader has to wake up before operating. The idle state is
         for what a consumer slotted around it. */
      on({ slotted: '[slot="header"]' }, [
        web([
          rule(
            { idle: true },
            {
              opacity: 0,
              transition: ['opacity', token('duration-fast'), token('easing-standard')],
            },
          ),
        ]),
      ]),
      on({ slotted: '[slot="footer"]' }, [
        web([
          rule(
            { idle: true },
            {
              opacity: 0,
              transition: ['opacity', token('duration-fast'), token('easing-standard')],
            },
          ),
        ]),
      ]),
      /* Whoever the tiles belong to, small and legible and never hidden: most
         tile licenses require the credit to be visible, so no state here
         takes it away. **A hairline above it, the way `Command`'s footer and
         the sandbox status bar mark a chrome strip at the foot of a bounded
         region.** It earns one here twice over: the credit sits directly
         under tile imagery that can be any color, and quiet text on a busy
         map reads as part of the map it is crediting. The header takes none,
         because what a consumer slots there is theirs and a rule we drew
         would fight their own. **A block, whatever was slotted**, so the
         hairline is the strip's width. A credit is written in a `helix-text`
         or a `<small>`, both inline, and an inline box's border ran under
         the words and stopped. */
      on({ slotted: '[slot="attribution"]' }, [
        web([
          rule({
            borderBlockStart: [token('border-thin'), 'solid', hook.attributionBorderColor],
            color: hook.attributionColor,
            display: 'block',
            fontSize: hook.attributionFontSize,
            padding: [token('space-2xs'), token('space-xs')],
          }),
          rule(
            { creditPlacement: true },
            {
              backdropFilter: token('material-backdrop'),
              /* The one glass coverage. At the translucent 30% the credit's
                 muted text read over whatever the map drew under it. */
              backgroundColor: token('material-panel'),
              borderBlockStart: 'none',
              borderRadius: token('radii-sm'),
              color: hook.attributionColor,
              overflow: 'hidden',
              padding: [token('space-none'), token('space-xs')],
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          ),
        ]),
      ]),
      /* **The credit in a corner over the map**, for a map the width of the
         page, under which a strip the width of the page ran to two lines.
         Compact and on one line, the whole of it on hover or on focus, which
         reaches it from the keyboard through its links, the form
         OpenStreetMap's guidance accepts for a credit that has to stay out of
         the way. Never hidden: most tile licenses require it seen. */
      on('attribution', [
        native([
          rule({
            borderBlockStart: [token('border-thin'), 'solid', hook.attributionBorderColor],
            color: hook.attributionColor,
            fontSize: hook.attributionFontSize,
            padding: [token('space-2xs'), token('space-xs')],
          }),
        ]),
        rule(
          { creditPlacement: true },
          {
            insetBlockEnd: token('space-2xs'),
            maxInlineSize: web(difference('100%', product(token('space-2xs'), 2))),
            position: 'absolute',
          },
        ),
        rule({ creditPlacement: 'bottom-end' }, { insetInlineEnd: token('space-2xs') }),
        rule({ creditPlacement: 'bottom-start' }, { insetInlineStart: token('space-2xs') }),
        native([
          rule(
            { creditPlacement: true },
            {
              backgroundColor: token('material-panel'),
              borderBlockStartWidth: 0,
              borderRadius: token('radii-sm'),
              overflow: 'hidden',
              padding: [token('space-none'), token('space-xs')],
            },
          ),
        ]),
      ]),
      /* Written out: the whole credit while it is pointed at or holds the
         focus. */
      on(
        {
          part: 'attribution',
          selector:
            ':host([credit-placement]) [part="attribution"]:is(:hover, :focus-within) ::slotted([slot="attribution"])',
        },
        [web([rule({ whiteSpace: 'normal' })])],
      ),
      /* **One column, read top to bottom**: fullscreen, layers, 3D, zoom,
         and the compass last, each centered over the compass, which is the
         widest. The surface's pad grid is a board's; a map's arrows are
         round its compass. */
      on('controls', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          /* **In the map's row**, which an absolutely placed child of a grid
             takes as its box: a corner is then the map's corner, and a
             bottom corner sits above the credit rather than over it. Both
             lines named, since an `auto` end line for such a child is the
             frame's edge and not the row's. */
          web: { gridColumn: '1 / -1', gridRow: '2 / 3' },
        }),
        /* **Printed as it stands rather than hidden.** A map is the content
           of the page it is on often enough that dropping it would be the
           surprising answer, and the controls are the part that means
           nothing on paper. */
        web([rule({ print: true }, { display: 'none' })]),
        /* A phone stands the column in the map's corner, the one the
           placement names. */
        native([
          rule({
            gap: token('space-2xs'),
            insetBlockStart: token('space-sm'),
            insetInlineEnd: token('space-sm'),
            position: 'absolute',
          }),
          rule(
            { controlsPlacement: 'top-start' },
            { insetBlock: [token('space-sm'), 'auto'], insetInline: [token('space-sm'), 'auto'] },
          ),
          rule(
            { controlsPlacement: 'bottom-end' },
            { insetBlock: ['auto', token('space-sm')], insetInline: ['auto', token('space-sm')] },
          ),
          rule(
            { controlsPlacement: 'bottom-start' },
            { insetBlock: ['auto', token('space-sm')], insetInline: [token('space-sm'), 'auto'] },
          ),
        ]),
      ]),
      /* Each control a raised square a finger's target across, its glyph
         half its side, as the shared viewport controls are drawn. */
      on(
        ['layers-toggle', 'tilt', 'zoom-in', 'zoom-out', 'face-north', ...arrows],
        [
          native([
            rule({
              alignItems: 'center',
              backgroundColor: ground,
              blockSize: token('size-target'),
              borderColor: token('color-border'),
              borderRadius: token('radii-sm'),
              borderStyle: 'solid',
              borderWidth: token('border-floating'),
              boxShadow: token('shadow-floating'),
              color: token('color-foreground'),
              display: 'flex',
              inlineSize: token('size-target'),
              justifyContent: 'center',
              '--icon-size': product(token('size-target'), 0.5),
            }),
          ]),
        ],
      ),
      /* **Material is the controls' ground on a phone**, as the web hands it
         to each Icon Button: glass and frosted let the map through, and
         transparent has no ground. The compass's bare arrows keep theirs. */
      on(
        ['layers-toggle', 'tilt', 'zoom-in', 'zoom-out', 'face-north'],
        [
          native([
            rule({ material: 'glass' }, { backgroundColor: token('material-panel') }),
            rule(
              { material: 'frosted' },
              { backgroundColor: token('material-translucent-strong') },
            ),
            rule(
              { material: 'transparent' },
              { backgroundColor: 'transparent', boxShadow: 'none' },
            ),
          ]),
        ],
      ),
      /* **Zoom in and out are one piece**, square where they meet, through
         the corner hooks a group stacking down hands a button, and the edge
         between them is zoom in's: zoom out takes the floating edge on its
         other three sides, and the lift the pair shares. */
      on('zoom-in', [
        web([
          rule(
            { within: 'controls' },
            {
              '--button-radius-end-end': token('radii-none'),
              '--button-radius-end-start': token('radii-none'),
            },
          ),
        ]),
        native([
          rule({
            borderEndEndRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
          }),
        ]),
      ]),
      on('zoom-out', [
        web([
          rule(
            { within: 'controls' },
            {
              own: { mapZoomOutEdge: token('border-floating') },
              '--button-radius-start-end': token('radii-none'),
              '--button-radius-start-start': token('radii-none'),
              '--icon-button-border-width': [0, token('border-floating'), token('border-floating')],
              '--icon-button-shadow': token('shadow-floating'),
              marginBlockStart: product('-1', token('space-2xs')),
            },
          ),
        ]),
        native([
          rule({
            borderBlockStartWidth: 0,
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
            marginBlockStart: product('-1', token('space-2xs')),
          }),
        ]),
      ]),
      /* Written out: with no edge on top, zoom out's box is a pixel shorter
         above its glyph than below it, and the minus sat half a pixel high:
         7.5 from the top of a 32 pixel button. A margin of the missing edge
         puts it back on the middle. */
      on({ part: 'zoom-out', selector: '[part="controls"] [part="zoom-out"] [data-glyph]' }, [
        web([rule({ marginBlockStart: own.mapZoomOutEdge })]),
      ]),
      /* Written out: **the compass's own icon is the needle's size**, where
         the shared sheet gives every other control's icon the size of its
         glyph. */
      on({ part: 'face-north', selector: '[part="controls"] [part="face-north"] ::slotted(*)' }, [
        web([
          rule({
            '--icon-size': token('size-icon-md'),
            blockSize: token('size-icon-md'),
            inlineSize: token('size-icon-md'),
          }),
        ]),
      ]),
      on('tilt', [rule({ fontSize: token('text-xs'), fontWeight: token('weight-semibold') })]),
      /* Written out: **pressed while the map is tilted**, in the brand's
         fill, so the one toggle among the buttons says which view is
         showing. */
      on({ part: 'tilt', selector: '[part="tilt"][aria-pressed="true"]' }, [
        web([
          rule({
            '--icon-button-background-color': hook.chosenColor,
            '--icon-button-background-color-hover': token('color-primary-surface-hover'),
            '--icon-button-border-color': hook.chosenColor,
            '--icon-button-foreground-color': token('color-foreground-on-primary'),
          }),
          /* **Each pressed and chosen state in a system color.** Forced
             colors replace the brand fill and the ring these states are
             drawn in with the same button and border colors as the rest, so
             the tilted map, the chosen map type and the shown layers looked
             exactly like their opposites. `Highlight` is the platform's color
             for a choice. */
          rule(
            { forcedColors: true },
            { backgroundColor: 'Highlight', color: 'HighlightText', forcedColorAdjust: 'none' },
          ),
        ]),
      ]),
      on('tilt', [
        native([
          rule(
            { tilted: true },
            {
              backgroundColor: hook.chosenColor,
              borderColor: hook.chosenColor,
              color: token('color-foreground-on-primary'),
            },
          ),
        ]),
      ]),
      /* **The arrows ring the compass**, where a page adds them: up, down,
         and the sides for panning, and the top corners for turning. The
         compass takes the corner every button in the column takes. */
      on('compass', [
        rule({
          borderRadius: token('radii-sm'),
          display: 'grid',
          web: {
            gridTemplateAreas: ['"rotl up rotr"', '"start north end"', '". down ."'],
            placeItems: 'center',
          },
        }),
        /* **The areas as places on a phone**, whose grid lays out only one
           region: the compass in the middle, the room an arrow takes on each
           side of it where the compass holds arrows, and each arrow stood in
           its cell. Turning alone takes no row under the compass. */
        native([
          rule({ display: 'flex', flexGrow: 0, flexShrink: 0, position: 'relative' }),
          rule({ holds: { 'rotate-left': true } }, { padding: [arrow, arrow, 0] }),
          rule({ holds: { 'pan-up': true } }, { padding: arrow }),
          /* **A panel behind the arrows**, where a page asks for them, so
             they read as one control with the compass. */
          rule([{ holds: { 'pan-up': true } }, { holds: { 'rotate-left': true } }], {
            backgroundColor: ground,
            boxShadow: list(token('shadow-floating'), [
              0,
              0,
              0,
              token('border-floating'),
              token('color-border'),
            ]),
          }),
        ]),
      ]),
      on('rotate-left', [
        web([rule({ gridArea: 'rotl' })]),
        native([rule({ insetBlockStart: 0, insetInlineStart: 0, position: 'absolute' })]),
      ]),
      on('rotate-right', [
        web([rule({ gridArea: 'rotr' })]),
        native([rule({ insetBlockStart: 0, insetInlineStart: far, position: 'absolute' })]),
      ]),
      on('face-north', [web([rule({ gridArea: 'north' })])]),
      on('pan-up', [
        native([rule({ insetBlockStart: 0, insetInlineStart: middle, position: 'absolute' })]),
      ]),
      on('pan-start', [
        native([rule({ insetBlockStart: middle, insetInlineStart: 0, position: 'absolute' })]),
      ]),
      on('pan-end', [
        native([rule({ insetBlockStart: middle, insetInlineStart: far, position: 'absolute' })]),
      ]),
      on('pan-down', [
        native([rule({ insetBlockStart: far, insetInlineStart: middle, position: 'absolute' })]),
      ]),
      /* Written out: the arrows are small and bare on the disc: not raised,
         and no ground, even one the page set for the rest of the controls.
         Three quarters of the column's button on an even pixel, 24 at the
         default, and a glyph half that, so each arrow centers on a whole
         pixel at every density. */
      on({ part: 'compass', selector: '[part="compass"] > :not([part="face-north"])' }, [
        web([
          rule({
            '--icon-button-background-color': 'transparent',
            '--icon-button-size': fn('round', product(token('size-control-tight'), 0.75), '2px'),
            '--_viewport-glyph-size': fn(
              'round',
              quotient(inherited('icon-button-size'), 2),
              '2px',
            ),
          }),
        ]),
      ]),
      on(arrows, [
        native([
          rule({
            backgroundColor: 'transparent',
            blockSize: product(token('size-control-tight'), 0.75),
            borderWidth: 0,
            boxShadow: 'none',
            inlineSize: product(token('size-control-tight'), 0.75),
            '--icon-size': product(token('size-control-tight'), 0.375),
          }),
        ]),
      ]),
      /* Written out: **a panel behind the arrows**, where a page asks for
         them, so they read as one control with the compass. The compass alone
         is one round button. Only a child with a part counts: each button's
         tooltip beside it has none, and draws nothing, so a compass alone
         stays one round button. */
      on({ part: 'compass', selector: '[part="compass"]:has(> [part]:not([part="face-north"]))' }, [
        web([
          rule({
            backgroundColor: ground,
            boxShadow: list(token('shadow-floating'), [
              0,
              0,
              0,
              token('border-floating'),
              token('color-border'),
            ]),
          }),
        ]),
      ]),
      /* The needle turns with the map: north in the danger red a compass
         paints its north in, south in the ink. */
      on('needle', [
        rule({
          blockSize: token('size-icon-md'),
          inlineSize: token('size-icon-md'),
          transform: fn('rotate', hook.needleTurn),
        }),
      ]),
      /* Written out: each end of the needle, which the web's icon draws. */
      on({ part: 'needle', selector: '[part="needle"] [data-end="north"]' }, [
        web([rule({ fill: hook.needleNorthColor })]),
      ]),
      on({ part: 'needle', selector: '[part="needle"] [data-end="south"]' }, [
        web([rule({ fill: hook.needleSouthColor })]),
      ]),
      on('needle-north', [native([rule({ fill: hook.needleNorthColor })])]),
      on('needle-south', [native([rule({ fill: hook.needleSouthColor })])]),
      /* **The menu opens beside the column**, level with its top, on the
         side away from the edge the column sits on, as close to it as the
         buttons are to each other. */
      on('layers-menu', [
        rule({
          backgroundColor: ground,
          border: [token('border-floating'), 'solid', token('color-border-floating')],
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-floating'),
          color: token('color-foreground'),
          display: web('grid'),
          gap: hook.layersMenuGap,
          insetBlockStart: 0,
          insetInlineEnd: web(sum('100%', token('space-2xs'))),
          /* **No taller than the map, and scrolled past that.** The frame
             clips what overflows it, so a map of imagery and eight layers cut
             its last tiles off, and they stayed focusable where nobody could
             see them. */
          maxBlockSize: difference(hook.blockSize, product(token('space-sm'), 2)),
          padding: hook.layersMenuPadding,
          position: 'absolute',
          web: {
            /* The frame's words, as a panel holds them, rather than the face
               and size the shared sheet gives each control's glyph. */
            fontFamily: 'inherit',
            fontSize: 'inherit',
            overflowY: 'auto',
          },
        }),
        /* Six large controls across, and no wider than most of a narrow
           window. */
        web([rule({ inlineSize: hook.layersMenuInlineSize })]),
        web([
          rule(
            { fill: true },
            { maxBlockSize: difference('100cqb', product(token('space-sm'), 2)) },
          ),
        ]),
        rule({ hidden: true }, { display: 'none' }),
        rule({ controlsPlacement: ['bottom-start', 'bottom-end'] }, { insetBlock: ['auto', 0] }),
        web([
          rule(
            { controlsPlacement: ['top-start', 'bottom-start'] },
            { insetInline: [sum('100%', token('space-2xs')), 'auto'] },
          ),
        ]),
        /* A phone stands the menu a share of the column away, and a gap
           past that, at a width of its own. */
        native([
          rule({
            flexDirection: 'column',
            inlineSize: hook.layersMenuInlineSize('15rem'),
            insetInlineEnd: '100%',
            marginInlineEnd: token('space-2xs'),
          }),
          rule(
            { controlsPlacement: ['top-start', 'bottom-start'] },
            {
              insetInlineEnd: 'auto',
              insetInlineStart: '100%',
              marginInlineEnd: 0,
              marginInlineStart: token('space-2xs'),
            },
          ),
        ]),
      ]),
      /* **The map types first, three across**: a picture of the map over its
         name, the chosen one ringed in the brand. The radio button is there
         for the keyboard and a screen reader, and the card is what is seen.
         **The layers under them, the same size as the map types**: three
         across, each an icon in a box the size of a card's picture, its name
         under it, and the box ringed in the brand while the layer is shown. */
      on(
        ['map-types', 'layer-choices'],
        [
          rule({
            display: web('grid'),
            gap: token('space-xs'),
            web: { gridTemplateColumns: fn('repeat', 3, '1fr') },
          }),
          native([rule({ flexDirection: 'row', flexWrap: 'wrap' })]),
        ],
      ),
      on('map-type', [
        rule({
          color: token('color-foreground-muted'),
          display: web('grid'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          gap: token('space-2xs'),
          position: 'relative',
          web: { cursor: 'pointer', justifyItems: 'center' },
        }),
      ]),
      on({ part: 'map-type', inner: 'input' }, [
        web([
          rule({
            blockSize: '1px',
            inlineSize: '1px',
            margin: 0,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }),
        ]),
      ]),
      on(
        ['map-type-preview', 'layer-icon'],
        [
          rule({
            aspectRatio: '4 / 3',
            backgroundColor: token('color-surface-sunken'),
            border: [token('border-thick'), 'solid', 'transparent'],
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            display: web('block'),
            inlineSize: '100%',
          }),
        ],
      ),
      on('map-type-preview', [rule({ web: { objectFit: 'cover' } })]),
      on('layer-icon', [rule({ padding: token('space-sm') })]),
      on('map-type', [web([rule({ hover: true }, { color: token('color-foreground') })])]),
      /* Written out: the card whose radio button is chosen, which the card
         holds. */
      on({ part: 'map-type', selector: '[part="map-type"]:has(input:checked)' }, [
        web([
          rule({ color: token('color-foreground') }),
          rule(
            { forcedColors: true },
            {
              outline: [token('border-thick'), 'solid', 'Highlight'],
              outlineOffset: token('space-2xs'),
            },
          ),
        ]),
      ]),
      on(
        {
          part: 'map-type-preview',
          selector: '[part="map-type"]:has(input:checked) [part="map-type-preview"]',
        },
        [web([rule({ borderColor: hook.chosenColor })])],
      ),
      on(
        {
          part: 'map-type-preview',
          selector: '[part="map-type"]:has(input:focus-visible) [part="map-type-preview"]',
        },
        [
          web([
            rule({
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            }),
          ]),
        ],
      ),
      /* The tile is the card's shape, and none of a control button's own
         ground. A native button, so it says its face and its pointer for
         itself. */
      on('layer-choice', [
        rule(
          { within: 'layers-menu' },
          {
            backgroundColor: 'transparent',
            blockSize: 'auto',
            border: 0,
            boxShadow: 'none',
            color: token('color-foreground-muted'),
            display: web('grid'),
            fontFamily: token('font-sans'),
            fontSize: token('text-xs'),
            gap: token('space-2xs'),
            inlineSize: 'auto',
            padding: 0,
            textAlign: 'center',
            web: { alignContent: 'start', cursor: 'pointer', justifyItems: 'center' },
          },
        ),
        web([
          rule(
            { within: 'layers-menu', hover: true },
            { backgroundColor: 'transparent', color: token('color-foreground') },
          ),
          rule({ within: 'layers-menu', focusVisible: true }, { outline: 'none' }),
        ]),
      ]),
      /* Written out: the tile of a layer that is shown, which the button
         says by its pressed state. */
      on(
        {
          part: 'layer-choice',
          selector: '[part="layers-menu"] [part="layer-choice"][aria-pressed="true"]',
        },
        [
          web([
            rule({ backgroundColor: 'transparent', color: token('color-foreground') }),
            rule(
              { forcedColors: true },
              {
                outline: [token('border-thick'), 'solid', 'Highlight'],
                outlineOffset: token('space-2xs'),
              },
            ),
          ]),
        ],
      ),
      on(
        {
          part: 'layer-icon',
          selector: '[part="layer-choice"][aria-pressed="true"] [part="layer-icon"]',
        },
        [web([rule({ borderColor: hook.chosenColor })])],
      ),
      on('layer-icon', [
        web([
          rule(
            { within: { 'layer-choice': { focusVisible: true } } },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ]),
      ]),
      /* A phone lays each card and tile out as a column, a third of the menu
         across. */
      on(
        ['map-type', 'layer-choice'],
        [
          native([
            rule({
              alignItems: 'center',
              display: 'flex',
              flexBasis: '30%',
              flexDirection: 'column',
              flexGrow: 0,
              flexShrink: 0,
            }),
          ]),
        ],
      ),
      /* **The chosen map type and each shown layer on a phone**, in the
         foreground and ringed in the brand, as the web's cards are. */
      on('map-type', [
        native([rule({ 'data-chosen': true }, { color: token('color-foreground') })]),
      ]),
      on('layer-choice', [
        native([rule({ 'data-shown': true }, { color: token('color-foreground') })]),
      ]),
      on('map-type-preview', [
        native([rule({ 'data-chosen': true }, { borderColor: hook.chosenColor })]),
      ]),
      on('layer-icon', [native([rule({ 'data-shown': true }, { borderColor: hook.chosenColor })])]),
    ]
  },
)
