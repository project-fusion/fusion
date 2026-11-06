import { oneOf } from '../../../render.js'
import { fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Heatmap's styled tier.
 *
 * **A cell is a square with a tone in it**, the quietest ground the palette
 * has where it has none, so a gap reads as a period with nothing in it. The
 * named tones are the theme's status colors, and `1` to `5` a ramp of one hue
 * walked toward the ground at even steps, from the primary's active weight,
 * so a busy week reads apart from a quiet one. A cell's corners are half of
 * `radii-sm`, a fraction of a box so small.
 *
 * **Two axes, because a square is a contribution graph's shape and not a
 * status page's.** `--heatmap-cell-size` sizes both, and
 * `--heatmap-cell-inline-size` and `--heatmap-cell-height` each one, as a
 * status page draws its bars tall and thin.
 *
 * **The web lays the cells out in a grid that flows by column**, a track the
 * size of a cell so the weeks stand together, and the host a grid of one
 * column as wide as the strip, so the footer annotates the picture and not
 * the box. A phone stands each cell where core places it, in a strip as large
 * as the cells it draws, with the footer at least as wide.
 *
 * **Emphasis and material, as every chart reads them.** `outlined` is a
 * cell's edge in its tone over a fill faded toward the page, and `subtle` a
 * faint wash under the same edge, a ring inside the cell so it keeps its
 * size. `glass` and `frosted` let a share of the paint through. A phone mixes
 * the same colors at the same shares in its machine.
 *
 * **Rings mark what a reader is on**: the cell the keys or a finger rest on
 * takes an outline in the foreground's color, and a selected cell an inset
 * ring in the selection's color, over any tone.
 *
 * **Web only:** the ring under a hovering pointer, the ring drawn inside the
 * cell where the strip has no gap, printing, and forced colors.
 */
export default styles(
  root,
  {
    prefix: 'heatmap',
    hooks: {
      cellHeight: null,
      cellInlineSize: null,
      cellRadius: product(token('radii-sm'), 0.5),
      cellSize: '0.75rem',
      gap: token('space-2xs'),
      selectedColor: token('color-primary'),
      selectedWidth: token('border-thick'),
      tone1: mix(token('color-primary-active'), 20, token('color-surface-sunken')),
      tone2: mix(token('color-primary-active'), 40, token('color-surface-sunken')),
      tone3: mix(token('color-primary-active'), 60, token('color-surface-sunken')),
      tone4: mix(token('color-primary-active'), 80, token('color-surface-sunken')),
      tone5: token('color-primary-active'),
      toneAccent: token('color-accent'),
      toneDanger: token('color-danger'),
      toneInfo: token('color-info'),
      toneMuted: token('color-surface-sunken'),
      tonePrimary: token('color-primary'),
      toneSuccess: token('color-success'),
      toneWarning: token('color-warning'),
    },
    own: {
      heatmapArea: null,
      heatmapFill: null,
      heatmapPaint: null,
      heatmapThrough: null,
    },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
    },
    stylesheet: 'heatmap/root/heatmap-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const width = hook.cellInlineSize(hook.cellSize)
    const height = hook.cellHeight(hook.cellSize)
    const paint = own.heatmapPaint(token('color-surface-sunken'))
    const through = own.heatmapThrough(1)
    const ring = [token('border-thin'), 'solid', token('color-foreground')]
    const inside = product(token('border-thin'), '-1')
    const edged = [
      { emphasis: 'outlined', also: { 'cell-selected': false } },
      { emphasis: 'subtle', also: { 'cell-selected': false } },
    ] as const
    return [
      /* A grid of one column, as wide as the strip, so the footer is too. */
      on('host', [
        web([
          rule({
            display: 'grid',
            gridTemplateColumns: fn('minmax', 0, 'max-content'),
          }),
        ]),
        native([rule({ alignItems: 'flex-start', display: 'flex', flexDirection: 'column' })]),
      ]),
      /* A track the size of a cell, filled down each column and then across. */
      on('strip', [
        rule({ position: 'relative' }),
        web([
          rule({
            display: 'grid',
            gap: hook.gap,
            gridAutoColumns: width,
            gridAutoFlow: 'column',
            gridTemplateRows: fn('repeat', measured('heatmap-rows', 1), height),
            justifyContent: 'start',
          }),
        ]),
        native([
          rule({
            blockSize: measured('heatmap-strip-height'),
            inlineSize: measured('heatmap-strip-width'),
          }),
        ]),
      ]),
      on('cell', [
        rule({ borderRadius: hook.cellRadius }),
        web([
          rule({
            own: { heatmapPaint: measured('heatmap-tone', token('color-surface-sunken')) },
            backgroundColor: fn(
              'color-mix',
              'in oklab',
              [own.heatmapFill(paint), product(product(own.heatmapArea(1), through), '100%')],
              'transparent',
            ),
            inlineSize: width,
          }),
          /* What each tone a cell names is worth, which a page sets through its hook. */
          rule({ 'data-tone': '1' }, { own: { heatmapPaint: hook.tone1 } }),
          rule({ 'data-tone': '2' }, { own: { heatmapPaint: hook.tone2 } }),
          rule({ 'data-tone': '3' }, { own: { heatmapPaint: hook.tone3 } }),
          rule({ 'data-tone': '4' }, { own: { heatmapPaint: hook.tone4 } }),
          rule({ 'data-tone': '5' }, { own: { heatmapPaint: hook.tone5 } }),
          rule({ 'data-tone': 'accent' }, { own: { heatmapPaint: hook.toneAccent } }),
          rule({ 'data-tone': 'danger' }, { own: { heatmapPaint: hook.toneDanger } }),
          rule({ 'data-tone': 'info' }, { own: { heatmapPaint: hook.toneInfo } }),
          rule({ 'data-tone': 'muted' }, { own: { heatmapPaint: hook.toneMuted } }),
          rule({ 'data-tone': 'primary' }, { own: { heatmapPaint: hook.tonePrimary } }),
          rule({ 'data-tone': 'success' }, { own: { heatmapPaint: hook.toneSuccess } }),
          rule({ 'data-tone': 'warning' }, { own: { heatmapPaint: hook.toneWarning } }),
        ]),
        /* Where core stands it, in its paint, as large as the strip's cells. */
        native([
          rule({
            backgroundColor: measured('heatmap-fill', token('color-surface-sunken')),
            blockSize: measured('heatmap-cell-height'),
            inlineSize: measured('heatmap-cell-width'),
            left: measured('heatmap-x'),
            position: 'absolute',
            top: measured('heatmap-y'),
          }),
        ]),
        /* The edge in the cell's tone under `outlined` and `subtle`, but on a selected cell. */
        web([
          rule(edged, {
            boxShadow: [
              'inset',
              0,
              0,
              0,
              token('border-thin'),
              fn('color-mix', 'in oklab', [paint, product(through, '100%')], 'transparent'),
            ],
          }),
          rule(
            { emphasis: 'outlined' },
            { own: { heatmapFill: mix(paint, 60, token('color-background')) } },
          ),
          rule({ emphasis: 'subtle' }, { own: { heatmapArea: 0.2 } }),
          rule(
            { material: 'glass' },
            { own: { heatmapThrough: product(0.62, token('material-opacity')) } },
          ),
          rule(
            { material: 'frosted' },
            { own: { heatmapThrough: product(0.88, token('material-opacity')) } },
          ),
        ]),
        native([
          rule(edged, {
            boxShadow: [
              'inset',
              0,
              0,
              0,
              token('border-thin'),
              measured('heatmap-ring', token('color-border')),
            ],
          }),
        ]),
      ]),
      /* The bubble hangs off a point with no size, which takes no pointer. */
      on('mark', [
        rule({ blockSize: '1px', inlineSize: '1px', pointerEvents: 'none' }),
        web([rule({ position: 'absolute' })]),
      ]),
      on('tooltip-anchor', [
        web([rule({ inset: 0, pointerEvents: 'none', position: 'absolute' })]),
      ]),
      /* A phone's bubble stands at the point of the strip where the mark is. */
      on('tooltip-trigger', [
        native([
          rule({
            blockSize: '1px',
            inlineSize: '1px',
            left: measured('chart-mark-x'),
            pointerEvents: 'none',
            position: 'absolute',
            top: measured('chart-mark-y'),
          }),
        ]),
      ]),
      /* Quieter by the bubble's own ink, never a page color. */
      on('tooltip-label', [
        rule({ fontWeight: token('weight-medium'), opacity: 0.72 }),
        web([rule({ display: 'block' })]),
      ]),
      /* Name and value on one line, the value at the end so a column of them lines up. */
      on('tooltip-cell', [
        rule({
          alignItems: 'baseline',
          display: 'flex',
          gap: token('space-sm'),
          justifyContent: 'space-between',
        }),
        native([rule({ flexDirection: 'row' })]),
      ]),
      on(
        ['tooltip-label', 'tooltip-cell'],
        [
          native([
            rule({
              color: token('color-foreground-inverse'),
              fontFamily: token('font-sans'),
              fontSize: token('text-xs'),
            }),
          ]),
        ],
      ),
      on('tooltip-name', [rule({ opacity: 0.72 })]),
      on('tooltip-value', [
        rule({ fontVariantNumeric: 'tabular-nums', fontWeight: token('weight-medium') }),
      ]),
      /* The ring a hovering pointer puts on a cell, outside its box so the cell does not move. */
      on('cell', [
        web([
          rule(
            { canHover: true, hover: true },
            { outline: ring, outlineOffset: token('border-thin') },
          ),
        ]),
      ]),
      on(
        { part: 'cell', selector: ':host [part~="strip"]:not([data-spaced]) [part~="cell"]:hover' },
        [web([rule({ canHover: true }, { outlineOffset: inside })])],
      ),
      /* The same ring on the cell the reading rests on. */
      on('cell', [
        rule(
          { also: { 'cell-active': true } },
          { outline: ring, outlineOffset: token('border-thin') },
        ),
      ]),
      /* Inside the cell where the strip has no gap for it. */
      on(
        {
          part: 'cell',
          selector: ':host [part~="strip"]:not([data-spaced]) [part~="cell-active"]',
        },
        [web([rule({ outlineOffset: inside })])],
      ),
      /* A selected cell: an inset ring in the selection color, over any tone. */
      on('cell', [
        rule(
          { also: { 'cell-selected': true } },
          { boxShadow: ['inset', 0, 0, 0, hook.selectedWidth, hook.selectedColor] },
        ),
      ]),
      /* The strip takes focus once it has cells to read, and draws the ring. */
      on('strip', [
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      on('tooltip-cell', [
        rule({ also: { 'tooltip-cell-current': true } }, { fontWeight: token('weight-medium') }),
      ]),
      /* The readout, the overview, the selection's count, and the table are said and not shown. */
      on(
        ['live', 'overview', 'selection', 'table'],
        [
          web([
            rule({
              blockSize: '1px',
              clipPath: 'inset(50%)',
              inlineSize: '1px',
              margin: token('space-none'),
              overflow: 'hidden',
              position: 'absolute',
              whiteSpace: 'nowrap',
            }),
          ]),
        ],
      ),
      /* Three slots under the strip: the middle takes the room, the ends at the strip's edges. */
      on('footer', [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          gap: token('space-xs'),
          paddingBlockStart: token('space-xs'),
        }),
        web([
          rule({
            alignItems: 'baseline',
            display: 'grid',
            gridTemplateColumns: ['auto', fn('minmax', 0, '1fr'), 'auto'],
          }),
          rule({ part: { 'data-empty': true } }, { display: 'none' }),
        ]),
        native([
          rule({
            display: 'flex',
            flexDirection: 'row',
            maxInlineSize: '100%',
            minInlineSize: measured('heatmap-strip-width'),
          }),
        ]),
      ]),
      /* The middle takes the room and wraps inside the window, as the web's track stops at the box. */
      on('summary', [
        rule({ textAlign: 'center' }),
        native([rule({ flexGrow: 1, flexShrink: 1 })]),
      ]),
      on('end', [rule({ textAlign: 'end' })]),
      on(['start', 'end'], [native([rule({ flexShrink: 0 })])]),
      /* Under the strip, in place of the cells. */
      on(
        ['empty', 'error', 'loading'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            textAlign: 'center',
          }),
        ],
      ),
      /* The readings did not load: news to act on, in the danger ink. */
      on('error', [rule({ color: token('color-danger') })]),
      /* Printed, a hairline makes the cells countable whatever the fills come out like. */
      on('cell', [
        web([
          rule(
            { print: true },
            {
              outline: [token('border-thin'), 'solid', token('color-border')],
              outlineOffset: inside,
            },
          ),
        ]),
      ]),
      /* Forced colors keep the tones, bound by a hairline, the reading and a selection in Highlight. */
      on('cell', [
        web([
          rule(
            { forcedColors: true },
            {
              forcedColorAdjust: 'none',
              outline: [token('border-thin'), 'solid', 'CanvasText'],
              outlineOffset: inside,
            },
          ),
          rule(
            { forcedColors: true, also: { 'cell-active': true } },
            {
              outline: [token('border-thick'), 'solid', 'Highlight'],
              outlineOffset: token('border-thin'),
            },
          ),
          rule(
            { forcedColors: true, also: { 'cell-selected': true } },
            { boxShadow: ['inset', 0, 0, 0, token('border-thick'), 'Highlight'] },
          ),
        ]),
      ]),
    ]
  },
)
