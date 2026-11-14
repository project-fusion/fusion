import { oneOf } from '../../../render.js'
import {
  difference,
  first,
  fn,
  inherited,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import node from './headless.js'

/**
 * Canvas Node's styled tier.
 *
 * **The card is the host**, placed by the board in the document's own
 * coordinates, physical on every page since the coordinates are. Its color
 * is a custom one the page writes, its tone, or the border where it has
 * neither; an untoned card's edge is a wash of the ink, which steps off any
 * ground the board puts under it. `separation` says how the card stands off
 * the board, outlined at rest, and `material` lets the ruling show through.
 * A group is a dashed well behind its cards, with its name above it.
 *
 * **Selected, the card's own edge turns the accent**, an outline over its
 * border. A shape is a radius, and a diamond is drawn by its outline, which a
 * phone draws as a vector shape of its own.
 *
 * **Web only:** the points, the corners and the grip an editable card shows
 * under a pointer or the focus, the ring a connection's target takes, and
 * forced colors.
 */
export default styles(
  node,
  {
    prefix: 'canvas-node',
    hooks: {
      backgroundColor: null,
      color: null,
      fontSize: token('text-sm'),
      padding: token('space-sm'),
      radius: token('radii-md'),
      shadow: 'none',
    },
    own: {
      canvasCardBlockSize: null,
      canvasCardColor: null,
      canvasCardEdge: null,
      canvasCardHookFill: null,
      canvasCardInlineSize: null,
      canvasCardTone: null,
      canvasCardWash: null,
      canvasCardX: null,
      canvasCardY: null,
      canvasHandleColor: null,
      headingInk: null,
    },
    props: {
      material: oneOf(['frosted', 'glass', 'transparent']),
      separation: oneOf(['elevated', 'filled', 'outlined', 'plain']),
    },
    stylesheet: 'canvas/node/canvas-node.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const selectedColor = first(inherited('canvas-selected-color'), token('color-accent'))
    const connectColor = first(inherited('canvas-connect-color'), token('color-accent'))
    const handleSize = first(inherited('canvas-handle-size'), '0.625rem')
    const gripSize = first(inherited('canvas-grip-size'), '0.5rem')
    const moveInset = first(inherited('canvas-move-inset'), token('space-xs'))
    return [
      /* **The card is the host, because the board places the host.** The
         board writes the card's corner and size into a sheet of the card's
         own, read here; zero is where an unplaced card sits. */
      on('host', [
        rule({
          own: {
            canvasCardX: '0px',
            canvasCardY: '0px',
            canvasCardInlineSize: 'auto',
            canvasCardBlockSize: 'auto',
            headingInk: token('color-foreground'),
            canvasCardTone: token('color-border'),
            canvasCardColor: hook.color(own.canvasCardTone),
            canvasCardWash: mix(token('color-foreground'), 10, 'transparent'),
            canvasCardHookFill: mix(hook.color, 16, token('color-surface')),
            canvasCardEdge: hook.color(own.canvasCardWash),
            canvasHandleColor: own.canvasCardColor,
          },
          backgroundColor: hook.backgroundColor(token('color-surface')),
          blockSize: web(own.canvasCardBlockSize),
          boxShadow: hook.shadow,
          border: [token('border-thin'), 'solid', own.canvasCardEdge],
          borderRadius: hook.radius,
          boxSizing: 'border-box',
          color: token('color-foreground'),
          display: 'block',
          fontFamily: token('font-sans'),
          fontSize: hook.fontSize,
          inlineSize: web(own.canvasCardInlineSize),
          left: web(own.canvasCardX),
          top: web(own.canvasCardY),
          overflow: 'visible',
          position: 'absolute',
          zIndex: token('layer-raised'),
        }),
        /* **A group is a box behind its cards, not a card**: a well with a
           dashed edge, under the cards placed inside it. */
        rule(
          { group: true },
          {
            backgroundColor: token('color-well'),
            borderStyle: 'dashed',
            overflow: 'visible',
            zIndex: token('layer-base'),
          },
        ),
        rule({ tone: 'accent' }, { own: { canvasCardTone: token('color-accent') } }),
        rule({ tone: 'danger' }, { own: { canvasCardTone: token('color-danger') } }),
        rule({ tone: 'info' }, { own: { canvasCardTone: token('color-info') } }),
        rule({ tone: 'primary' }, { own: { canvasCardTone: token('color-primary') } }),
        rule({ tone: 'success' }, { own: { canvasCardTone: token('color-success') } }),
        rule({ tone: 'warning' }, { own: { canvasCardTone: token('color-warning') } }),
      ]),
      /* A toned card that is not neutral takes its tone as its edge; one with
         no tone, or the neutral one, has a border too faint for something a
         reader grabs, so its handles take the muted ink. */
      on('host', [
        rule(
          [
            { tone: 'accent' },
            { tone: 'danger' },
            { tone: 'info' },
            { tone: 'primary' },
            { tone: 'success' },
            { tone: 'warning' },
          ],
          { own: { canvasCardEdge: own.canvasCardColor } },
        ),
        rule([{ tone: false }, { tone: 'neutral' }], {
          own: { canvasHandleColor: hook.color(token('color-foreground-muted')) },
        }),
      ]),
      on('host', [
        rule({ selected: true }, { own: { canvasHandleColor: selectedColor } }),
        rule({ target: true }, { own: { canvasHandleColor: connectColor } }),
      ]),
      /* **Separation says how a card stands off the board**, and outlined is
         where it rests. */
      on('host', [
        rule(
          { separation: 'outlined', group: false },
          { backgroundColor: hook.backgroundColor('transparent') },
        ),
        rule(
          { separation: 'filled', group: false },
          {
            backgroundColor: mix(own.canvasCardColor, 16, token('color-surface')),
            borderColor: 'transparent',
          },
        ),
        rule(
          { separation: 'elevated', group: false },
          {
            '--canvas-node-shadow': token('shadow-md'),
            backgroundColor: hook.backgroundColor(
              scheme(token('color-surface'), token('color-surface-raised')),
            ),
          },
        ),
        rule(
          { separation: 'plain', group: false },
          { backgroundColor: 'transparent', borderColor: 'transparent' },
        ),
        /* **Glass is a pair**: a filter behind a translucent ground, so the
           ruling shows through. */
        rule(
          { material: 'glass', group: false },
          {
            own: { canvasCardWash: token('material-border') },
            backdropFilter: token('material-backdrop'),
            backgroundColor: token('material-panel'),
          },
        ),
        rule(
          { material: 'frosted', group: false },
          {
            own: { canvasCardWash: token('material-border') },
            backdropFilter: fn('blur', token('material-blur-lg')),
            backgroundColor: token('material-translucent-strong'),
          },
        ),
        rule(
          { material: 'transparent', group: false },
          { backdropFilter: 'none', backgroundColor: 'transparent' },
        ),
        /* **Shapes a box can draw are a radius.** */
        rule({ shape: 'square', group: false }, { borderRadius: token('radii-none') }),
        rule({ shape: 'pill', group: false }, { borderRadius: token('radii-full') }),
        rule({ shape: 'circle', group: false }, { borderRadius: '50%' }),
        /* **A diamond is drawn, not bordered**: the box gives up its ground,
           its edge, its filter and its lift to the outline. */
        rule(
          { shape: 'diamond', group: false },
          {
            '--canvas-node-shadow': 'none',
            backdropFilter: 'none',
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
        ),
        /* **A filled card with no color takes the filled wash**, a color
           the page sets through the hook still tinting it. Last, as the
           hand-written sheet's more particular selector placed it. */
        rule(
          [
            { separation: 'filled', group: false, tone: false },
            { separation: 'filled', group: false, tone: 'neutral' },
          ],
          { backgroundColor: first(own.canvasCardHookFill, token('color-surface-filled')) },
        ),
        /* **Selected, until the reader selects something else or nothing**,
           on the card's own edge. */
        rule(
          { selected: true },
          {
            outline: [token('border-thick'), 'solid', selectedColor],
            outlineOffset: product(token('border-thin'), '-1'),
          },
        ),
        rule({ target: true }, { boxShadow: [0, 0, 0, token('border-thick'), connectColor] }),
        rule(
          [
            { shape: 'diamond', selected: true },
            { shape: 'diamond', target: true },
          ],
          { boxShadow: 'none', outline: 'none' },
        ),
        /* Before it is placed, a card is a card in the flow. */
        web([rule({ placed: false }, { position: 'static' })]),
      ]),
      /* A phone places the card on the plane from the board's numbers. */
      on('host', [
        native([
          rule({
            blockSize: measured('_canvas-card-block-size'),
            inlineSize: measured('_canvas-card-inline-size'),
            left: measured('_canvas-card-x', '0px'),
            top: measured('_canvas-card-y', '0px'),
          }),
        ]),
      ]),
      on('host', [
        web([
          rule(
            { forcedColors: true, target: true },
            {
              outline: [token('border-thick'), 'solid', 'Highlight'],
              outlineOffset: token('space-2xs'),
            },
          ),
        ]),
      ]),
      /* **Centered down the card, and still read from the start across it.** */
      on('node', [
        rule({
          blockSize: '100%',
          borderRadius: 'inherit',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          justifyContent: 'center',
          overflow: 'hidden',
          padding: hook.padding,
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule({ group: true }, { display: 'block', overflow: 'visible', position: 'relative' }),
        rule(
          [
            { shape: 'pill', group: false },
            { shape: 'circle', group: false },
          ],
          { alignItems: 'center', paddingInline: '15%', textAlign: 'center' },
        ),
        rule(
          { shape: 'diamond', group: false },
          {
            alignItems: 'center',
            paddingInline: '22%',
            position: 'relative',
            textAlign: 'center',
          },
        ),
      ]),
      /* **A group's name sits above its box, not inside it.** */
      on({ before: 'node' }, [
        web([
          rule(
            { group: true },
            {
              color: token('color-foreground-muted'),
              content: fn('attr', 'aria-label'),
              fontSize: token('text-xs'),
              insetBlockEnd: '100%',
              insetInlineStart: 0,
              paddingBlockEnd: token('space-2xs'),
              position: 'absolute',
            },
          ),
        ]),
      ]),
      on('group-name', [
        native([
          rule({
            bottom: '100%',
            color: token('color-foreground-muted'),
            fontSize: token('text-xs'),
            left: 0,
            paddingBlockEnd: token('space-2xs'),
            position: 'absolute',
          }),
        ]),
      ]),
      on({ region: 'description', slotted: '*' }, [
        rule({ color: token('color-foreground-muted'), fontSize: token('text-xs') }),
      ]),
      /* **The diamond's outline**, over the border box so its points are
         the middles of the sides. */
      on('outline', [
        rule({
          blockSize: sum('100%', product(token('border-thin'), 2)),
          inlineSize: sum('100%', product(token('border-thin'), 2)),
          left: product(token('border-thin'), '-1'),
          overflow: 'visible',
          pointerEvents: 'none',
          position: 'absolute',
          top: product(token('border-thin'), '-1'),
        }),
        /* A phone stretches the vector by its four edges, a length past the
           box on each side, where a sum of a share and a length has no
           size. */
        native([
          rule({
            blockSize: 'auto',
            bottom: product(token('border-thin'), '-1'),
            inlineSize: 'auto',
            right: product(token('border-thin'), '-1'),
          }),
        ]),
      ]),
      on({ part: 'outline', inner: 'polygon' }, [
        web([
          rule({
            fill: hook.backgroundColor(token('color-surface')),
            stroke: own.canvasCardEdge,
            strokeWidth: token('border-thin'),
          }),
          rule({ shape: 'diamond', material: 'glass' }, { fill: token('material-panel') }),
          rule(
            { shape: 'diamond', material: 'frosted' },
            { fill: token('material-translucent-strong') },
          ),
          rule({ shape: 'diamond', material: 'transparent' }, { fill: 'transparent' }),
          rule(
            { shape: 'diamond', separation: 'filled' },
            {
              fill: mix(own.canvasCardColor, 16, token('color-surface')),
              stroke: 'transparent',
            },
          ),
          rule(
            [
              { shape: 'diamond', separation: 'filled', tone: false },
              { shape: 'diamond', separation: 'filled', tone: 'neutral' },
            ],
            { fill: first(own.canvasCardHookFill, token('color-surface-filled')) },
          ),
          rule(
            { shape: 'diamond', separation: 'plain' },
            { fill: 'transparent', stroke: 'transparent' },
          ),
          rule(
            [
              { shape: 'diamond', selected: true },
              { shape: 'diamond', target: true },
            ],
            { stroke: token('color-accent'), strokeWidth: token('border-thick') },
          ),
        ]),
      ]),
      on('outline-shape', [
        native([
          rule({
            fill: hook.backgroundColor(token('color-surface')),
            stroke: own.canvasCardEdge,
            strokeWidth: token('border-thin'),
            vectorEffect: 'non-scaling-stroke',
          }),
          rule({ material: 'glass' }, { fill: token('material-panel') }),
          rule({ material: 'frosted' }, { fill: token('material-translucent-strong') }),
          rule({ material: 'transparent' }, { fill: 'transparent' }),
          rule(
            { separation: 'filled' },
            {
              fill: mix(own.canvasCardColor, 16, token('color-surface')),
              stroke: 'transparent',
            },
          ),
          rule(
            [
              { separation: 'filled', tone: false },
              { separation: 'filled', tone: 'neutral' },
            ],
            { fill: first(own.canvasCardHookFill, token('color-surface-filled')) },
          ),
          rule({ separation: 'plain' }, { fill: 'transparent', stroke: 'transparent' }),
          rule(
            { selected: true },
            { stroke: token('color-accent'), strokeWidth: token('border-thick') },
          ),
        ]),
      ]),
      /* **A point on each side, shown where the hand or the focus is**, the
         web's on an editable card. */
      on('handle', [
        web([
          rule({
            backgroundColor: token('color-surface'),
            blockSize: handleSize,
            border: [token('border-thick'), 'solid', own.canvasHandleColor],
            borderRadius: token('radii-full'),
            boxSizing: 'border-box',
            cursor: 'crosshair',
            inlineSize: handleSize,
            opacity: 0,
            position: 'absolute',
            transform: fn('translate', '-50%', '-50%'),
            transition: ['opacity', token('duration-fast'), token('easing-standard')],
          }),
        ]),
      ]),
      on({ after: 'handle' }, [
        web([
          rule({ content: '""', inset: product(token('space-sm'), '-1'), position: 'absolute' }),
        ]),
      ]),
      on('handle', [
        web([
          rule(
            [
              { within: { host: { hover: true } } },
              { within: { host: { focusWithin: true } } },
              { candidate: true },
            ],
            { opacity: 1 },
          ),
          rule({ target: true }, { backgroundColor: own.canvasHandleColor }),
          rule({ reducedMotion: true }, { transition: 'none' }),
        ]),
      ]),
      on('handle-top', [web([rule({ left: '50%', top: 0 })])]),
      on('handle-right', [web([rule({ left: '100%', top: '50%' })])]),
      on('handle-bottom', [web([rule({ left: '50%', top: '100%' })])]),
      on('handle-left', [web([rule({ left: 0, top: '50%' })])]),
      /* **The corners a selected card is resized from**, small squares. */
      on('grip', [
        web([
          rule({
            backgroundColor: token('color-surface'),
            blockSize: gripSize,
            border: [token('border-thin'), 'solid', selectedColor],
            boxSizing: 'border-box',
            inlineSize: gripSize,
            position: 'absolute',
            transform: fn('translate', '-50%', '-50%'),
          }),
        ]),
      ]),
      on({ after: 'grip' }, [
        web([
          rule({ content: '""', inset: product(token('space-2xs'), '-1'), position: 'absolute' }),
        ]),
      ]),
      /* Written out: a finger's reach on an editable card that holds the
         focus, around a point and a corner. */
      on(
        {
          part: 'handle',
          selector:
            ':host(:focus-within) [part~="handle"]::after, :host(:focus-within) [part~="grip"]::after',
        },
        [
          web([
            rule(
              { coarsePointer: true },
              {
                inset: quotient(difference(token('size-target'), '100%'), '-2'),
              },
            ),
          ]),
        ],
      ),
      on('grip-top-left', [web([rule({ cursor: 'nwse-resize', left: 0, top: 0 })])]),
      on('grip-top-right', [web([rule({ cursor: 'nesw-resize', left: '100%', top: 0 })])]),
      on('grip-bottom-right', [web([rule({ cursor: 'nwse-resize', left: '100%', top: '100%' })])]),
      on('grip-bottom-left', [web([rule({ cursor: 'nesw-resize', left: 0, top: '100%' })])]),
      /* **The grip a selected card is moved by without dragging it.** */
      on('move', [
        web([
          rule({
            backgroundImage: fn(
              'radial-gradient',
              'circle',
              ['currentColor', '1px'],
              ['transparent', '1.25px'],
            ),
            backgroundSize: ['50%', quotient('100%', 3)],
            blockSize: first(inherited('canvas-move-block-size'), '0.75rem'),
            color: token('color-foreground-subtle'),
            cursor: 'move',
            inlineSize: first(inherited('canvas-move-inline-size'), '0.5rem'),
            insetBlockStart: moveInset,
            insetInlineStart: moveInset,
            opacity: 0,
            position: 'absolute',
            transition: ['opacity', token('duration-fast'), token('easing-standard')],
          }),
        ]),
      ]),
      on({ after: 'move' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference('1.5rem', '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('move', [
        web([
          rule(
            [{ within: { host: { hover: true } } }, { within: { host: { focusWithin: true } } }],
            {
              opacity: 1,
            },
          ),
          rule({ hover: true }, { color: selectedColor }),
          rule([{ shape: 'pill' }, { shape: 'circle' }, { shape: 'diamond' }], {
            insetBlockStart: product(moveInset, 2),
            insetInline: 0,
            marginInline: 'auto',
          }),
        ]),
      ]),
    ]
  },
)
