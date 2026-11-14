import viewportControls from '../../../fragments/viewport-controls.js'
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
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Graph's styled tier: the drawing with its controls, and the list of notes
 * beside it, which moves below the drawing where the frame is narrower than
 * 40rem. The selected note leads the list on a surface of its own, and the
 * notes linked to it are named by how they link. With `no-panel` the drawing
 * takes the whole frame, and a button among the controls opens the search
 * and the list over its end.
 *
 * **The web keeps the shared viewport sheet** for the controls, their
 * corner, the gesture hint and fullscreen, which Map and Canvas read too; a
 * phone takes the same from the `viewport-controls` fragment. **A phone
 * draws the picture**: each link and note in the color core's picture names,
 * worked out from the theme as the snapshot's `color-mix()` writes it, and
 * the names as words over the drawing.
 *
 * **Web only:** the renderer's box, the layout's settling and its stop
 * button, fullscreen, the gestures a page shares, printing, and forced
 * colors.
 */
export default styles(
  root,
  {
    prefix: 'graph',
    hooks: {
      backgroundColor: token('color-surface-sunken'),
      blockSize: '32rem',
      borderColor: token('color-border'),
      noteHoverColor: token('color-hover'),
      notePaddingInline: token('space-xs'),
      noteRelationColor: token('color-foreground-muted'),
      noteSelectedBackgroundColor: token('color-surface-sunken'),
      noteSelectedWeight: token('weight-semibold'),
      noteText: token('text-sm'),
      panelBackgroundColor: token('color-surface'),
      panelColor: token('color-foreground'),
      panelSize: '18rem',
    },
    own: { graphSwatch: null, graphWash: null },
    stylesheet: 'graph/root/graph-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const controlGround = first(
      inherited('viewport-control-background-color'),
      token('color-surface-overlay'),
    )
    return [
      include(viewportControls),
      on('host', [web([rule({ display: 'contents' })])]),
      /* **A frame of its own**, and its own size container: the list moves
         below the drawing where the frame is narrow, whatever the page is. */
      on('region', [
        rule({
          backgroundColor: hook.backgroundColor,
          blockSize: hook.blockSize,
          border: [token('border-thin'), 'solid', hook.borderColor],
          borderRadius: token('radii-md'),
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateRows: ['auto', 'minmax(0, 1fr)', 'auto'],
          overflow: 'hidden',
          position: 'relative',
          web: { containerType: 'inline-size' },
        }),
      ]),
      on('body', [
        rule({
          display: 'grid',
          gridTemplateColumns: ['minmax(0, 1fr)', hook.panelSize],
          minBlockSize: 0,
        }),
      ]),
      on('stage', [
        rule({ isolation: 'isolate', minBlockSize: 0, overflow: 'hidden', position: 'relative' }),
      ]),
      on('viewport', [rule({ inset: 0, position: 'absolute' })]),
      on({ part: 'viewport', selector: '[part="viewport"] ::slotted(*)' }, [
        web([rule({ blockSize: '100%', inlineSize: '100%' })]),
      ]),
      on('panel', [
        rule({
          backgroundColor: hook.panelBackgroundColor,
          borderInlineStart: [token('border-thin'), 'solid', token('color-border')],
          color: hook.panelColor,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: ['auto', 'minmax(0, 1fr)'],
          minBlockSize: 0,
        }),
      ]),
      /* **Below the drawing where the frame is narrow**, the drawing above it
         still there to point at. */
      on('body', [
        rule(
          { inlineSize: { below: '40rem' } },
          {
            gridTemplateColumns: 'minmax(0, 1fr)',
            gridTemplateRows: ['minmax(0, 3fr)', 'minmax(0, 2fr)'],
          },
        ),
      ]),
      on('panel', [
        rule(
          { inlineSize: { below: '40rem' } },
          {
            borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
            borderInlineStart: 'none',
          },
        ),
      ]),
      /* **A phone lays the frame out in flex boxes**, the grid's rows and
         columns as shares: the header, the body taking the rest, and the
         footer; the drawing beside the list, or three fifths of the body
         above the list's two where the frame is narrow; and in the panel the
         search over the list, which takes the rest. */
      on('region', [native([rule({ display: 'flex', flexDirection: 'column' })])]),
      on('body', [
        native([
          rule({ display: 'flex', flexBasis: 0, flexDirection: 'row', flexGrow: 1, flexShrink: 1 }),
          rule({ inlineSize: { below: '40rem' } }, { flexDirection: 'column' }),
        ]),
      ]),
      /* **The drawing keeps its room at a large text size**, where the frame's
         height becomes the least it is and grows with the list: the drawing
         holds nothing that sizes it. */
      on('stage', [
        native([rule({ flexBasis: 0, flexGrow: 1, flexShrink: 1, minBlockSize: '16rem' })]),
      ]),
      on('panel', [
        native([
          rule({ display: 'flex', flexDirection: 'column', inlineSize: hook.panelSize }),
          rule(
            { inlineSize: { below: '40rem' } },
            { flexBasis: 0, flexGrow: 2, flexShrink: 1, inlineSize: 'auto' },
          ),
        ]),
      ]),
      on('stage', [native([rule({ inlineSize: { below: '40rem' } }, { flexGrow: 3 })])]),
      on('list', [
        native([
          rule({ flexBasis: 0, flexGrow: 1, flexShrink: 1 }),
          rule({ empty: true }, { display: 'none' }),
        ]),
      ]),
      /* **With `no-panel` the drawing takes the frame**, the search and the
         list open over its end, on the floating surface a menu opens on. */
      on('body', [
        rule(
          { noPanel: true },
          {
            gridTemplateColumns: 'minmax(0, 1fr)',
            gridTemplateRows: 'minmax(0, 1fr)',
            position: 'relative',
          },
        ),
      ]),
      on('panel', [
        rule(
          { noPanel: true },
          {
            border: [token('border-floating'), 'solid', token('color-border')],
            borderRadius: token('radii-sm'),
            boxShadow: token('shadow-floating'),
            inlineSize: fn(
              'min',
              hook.panelSize,
              difference('100%', product(token('space-sm'), 2)),
            ),
            insetBlock: token('space-sm'),
            insetInlineEnd: token('space-sm'),
            overflow: 'hidden',
            position: 'absolute',
            zIndex: token('layer-raised'),
          },
        ),
        rule({ noPanel: true, hidden: true }, { display: 'none' }),
      ]),
      on(
        {
          part: 'controls',
          selector:
            ':host([no-panel]) [part="body"]:has([part="panel"]:not([hidden])) [part="controls"]',
        },
        [
          web([
            rule({
              insetInlineEnd: sum(fn('min', hook.panelSize, '100%'), product(token('space-sm'), 2)),
            }),
          ]),
        ],
      ),
      on('notes-toggle', [web([rule({ gridArea: 'notes' })])]),
      on({ part: 'notes-toggle', inner: 'svg' }, [
        web([rule({ blockSize: '1em', inlineSize: '1em' })]),
      ]),
      /* Written out: the cluster's areas with the notes button, which the
         shared viewport sheet lays out without it, as that sheet asks. */
      on(
        {
          part: 'controls',
          selector: '[part="controls"]:has([part="notes-toggle"]):not(:has([part="pan-up"]))',
        },
        [web([rule({ gridTemplateAreas: ['"zoomin"', '"zoomout"', '"notes"', '"full"'] })])],
      ),
      on(
        {
          part: 'controls',
          selector: '[part="controls"]:has([part="notes-toggle"]):has([part="pan-up"])',
        },
        [
          web([
            rule({
              gridTemplateAreas: [
                '".      up    .      zoomin"',
                '"start  .     end    zoomout"',
                '".      down  .      notes"',
                '".      .     .      full"',
              ],
            }),
          ]),
        ],
      ),
      /* **The legend over the drawing**, at the start of its foot, clear of
         the controls' column at its end, wrapping upward where its groups are
         many. */
      on('legend', [
        rule({
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
          insetBlockEnd: token('space-sm'),
          insetInlineStart: token('space-sm'),
          maxInlineSize: web(
            difference(difference('100%', product(token('space-sm'), 3)), token('size-control-sm')),
          ),
          position: 'absolute',
        }),
        /* One row that scrolls where the frame is narrow, padded by the space
           it is moved in by, so the shadows and the focus ring are whole. */
        rule(
          { inlineSize: { below: '40rem' } },
          {
            flexWrap: 'nowrap',
            insetBlockEnd: difference(token('space-sm'), token('space-2xs')),
            insetInlineStart: difference(token('space-sm'), token('space-2xs')),
            overflowX: 'auto',
            padding: token('space-2xs'),
            web: { scrollbarWidth: 'none' },
          },
        ),
        rule({ controlsPlacement: 'bottom-start' }, { insetInline: ['auto', token('space-sm')] }),
      ]),
      /* **Each group a button in its color**, raised over the drawing as
         one of the frame's own controls. */
      on('legend-item', [
        rule({
          alignItems: 'center',
          backgroundColor: controlGround,
          blockSize: token('size-control-tight'),
          border: [token('border-floating'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-floating'),
          color: token('color-foreground'),
          display: 'inline-flex',
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontWeight: token('weight-medium'),
          gap: token('space-2xs'),
          paddingInline: token('space-xs'),
          whiteSpace: 'nowrap',
          web: { cursor: 'pointer' },
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        web([rule({ position: 'relative' })]),
      ]),
      /* **A press as tall as the target** on a touch screen, from a
         transparent box, so nothing drawn moves. */
      on({ after: 'legend-item' }, [
        web([
          rule({
            content: '""',
            insetBlock: quotient(difference(token('size-target'), '100%'), '-2'),
            insetInline: token('space-none'),
            position: 'absolute',
          }),
        ]),
      ]),
      /* Written out: each group's mark in the series color at its place
         among the groups' names, as `connectGraph` hands the colors out. A
         phone's machine writes each group's color on its button. */
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 1)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-1'), token('color-series-9')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 2)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-2'), token('color-series-10')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 3)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-3'), token('color-series-11')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 4)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-4'), token('color-series-12')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 5)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-5'), token('color-series-13')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 6)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-6'), token('color-series-14')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 7)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-7'), token('color-series-15')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 8)' }, [
        web([
          rule({
            own: {
              graphSwatch: fn('light-dark', token('color-series-8'), token('color-series-16')),
            },
          }),
        ]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 9)' }, [
        web([rule({ own: { graphSwatch: token('color-series-9') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 10)' }, [
        web([rule({ own: { graphSwatch: token('color-series-10') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 11)' }, [
        web([rule({ own: { graphSwatch: token('color-series-11') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 12)' }, [
        web([rule({ own: { graphSwatch: token('color-series-12') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 13)' }, [
        web([rule({ own: { graphSwatch: token('color-series-13') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 14)' }, [
        web([rule({ own: { graphSwatch: token('color-series-14') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 15)' }, [
        web([rule({ own: { graphSwatch: token('color-series-15') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 16)' }, [
        web([rule({ own: { graphSwatch: token('color-series-16') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 17)' }, [
        web([rule({ own: { graphSwatch: token('color-series-17') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 18)' }, [
        web([rule({ own: { graphSwatch: token('color-series-18') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 19)' }, [
        web([rule({ own: { graphSwatch: token('color-series-19') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 20)' }, [
        web([rule({ own: { graphSwatch: token('color-series-20') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 21)' }, [
        web([rule({ own: { graphSwatch: token('color-series-21') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 22)' }, [
        web([rule({ own: { graphSwatch: token('color-series-22') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 23)' }, [
        web([rule({ own: { graphSwatch: token('color-series-23') } })]),
      ]),
      on({ part: 'legend-item', selector: '[part~="legend-item"]:nth-child(24n + 24)' }, [
        web([rule({ own: { graphSwatch: token('color-series-24') } })]),
      ]),
      on('legend-swatch', [
        native([
          rule({ own: { graphSwatch: measured('graph-swatch', token('color-foreground-muted')) } }),
        ]),
      ]),
      on('legend-item', [
        rule({ 'data-tone': 'accent' }, { own: { graphSwatch: token('color-accent') } }),
        rule({ 'data-tone': 'danger' }, { own: { graphSwatch: token('color-danger') } }),
        rule({ 'data-tone': 'info' }, { own: { graphSwatch: token('color-info') } }),
        rule({ 'data-tone': 'neutral' }, { own: { graphSwatch: token('color-foreground-muted') } }),
        rule({ 'data-tone': 'primary' }, { own: { graphSwatch: token('color-primary') } }),
        rule({ 'data-tone': 'success' }, { own: { graphSwatch: token('color-success') } }),
        rule({ 'data-tone': 'warning' }, { own: { graphSwatch: token('color-warning-mark') } }),
      ]),
      on('legend-swatch', [
        rule({
          blockSize: token('space-xs'),
          border: [token('border-thin'), 'solid', own.graphSwatch(token('color-foreground-muted'))],
          borderRadius: token('radii-full'),
          boxSizing: 'border-box',
          backgroundColor: own.graphSwatch(token('color-foreground-muted')),
          flex: [0, 0, 'auto'],
          inlineSize: token('space-xs'),
        }),
      ]),
      /* **A hidden group's mark is a ring**, and its name steps back. */
      on('legend-item', [
        rule({ also: { 'legend-item-hidden': true } }, { color: token('color-foreground-muted') }),
      ]),
      on(
        {
          part: 'legend-swatch',
          selector: '[part~="legend-item-hidden"] [part="legend-swatch"]',
        },
        [web([rule({ backgroundColor: 'transparent' })])],
      ),
      /* A phone's machine writes a hidden group's fill as transparent. */
      on('legend-swatch', [
        native([rule({ backgroundColor: measured('graph-swatch-fill', own.graphSwatch) })]),
      ]),
      /* **The search**: a magnifier, a field with no box of its own, and
         the count at the end. */
      on('search', [
        rule({
          alignItems: 'center',
          borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
          display: 'flex',
          gap: token('space-2xs'),
          padding: token('space-2xs'),
          paddingInlineStart: token('space-xs'),
        }),
      ]),
      on('filter-icon', [
        rule({
          alignItems: 'center',
          color: token('color-foreground-subtle'),
          display: 'inline-flex',
          flex: [0, 0, 'auto'],
        }),
      ]),
      on({ part: 'filter-icon', inner: 'svg' }, [
        web([
          rule({
            '--icon-size': token('size-icon-tight'),
            blockSize: token('size-icon-tight'),
            inlineSize: token('size-icon-tight'),
          }),
        ]),
      ]),
      on('filter-mark', [
        native([
          rule({
            '--icon-size': token('size-icon-tight'),
            blockSize: token('size-icon-tight'),
            inlineSize: token('size-icon-tight'),
          }),
        ]),
      ]),
      on({ part: 'filter-icon', selector: 'slot[name="filter-icon"]::slotted(*)' }, [
        web([
          rule({
            '--icon-size': token('size-icon-tight'),
            blockSize: token('size-icon-tight'),
            inlineSize: token('size-icon-tight'),
          }),
        ]),
      ]),
      on('search-field', [
        rule({
          appearance: 'none',
          backgroundColor: 'transparent',
          blockSize: token('size-control-tight'),
          border: 'none',
          boxSizing: 'border-box',
          color: token('color-foreground'),
          flex: [1, 1, 'auto'],
          fontFamily: token('font-sans'),
          fontSize: web(fn('max', token('text-field-min'), token('text-sm'))),
          fontWeight: token('weight-medium'),
          minInlineSize: 0,
          paddingInline: token('space-2xs'),
        }),
        rule({ focusVisible: true }, { outline: 'none' }),
      ]),
      on({ placeholder: 'search-field' }, [
        rule({ color: token('color-foreground-muted'), fontWeight: token('weight-regular') }),
      ]),
      on({ part: 'search', selector: '[part="search"]:has([part="search-field"]:focus-visible)' }, [
        web([
          rule({
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          }),
        ]),
      ]),
      on('list', [
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      on('count', [
        rule({
          color: token('color-foreground-muted'),
          flex: [0, 0, 'auto'],
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          paddingInlineEnd: difference(token('space-xs'), token('space-2xs')),
        }),
      ]),
      on(
        ['empty', 'loading'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontSize: token('text-sm'),
            gridArea: web('2 / 1'),
            padding: token('space-sm'),
          }),
        ],
      ),
      on('list', [
        rule({
          minBlockSize: 0,
          overflowY: web('auto'),
          overscrollBehavior: web('contain'),
          paddingBlock: token('space-2xs'),
        }),
      ]),
      /* **One line a note**, its name at the start and how it stands to the
         selected note at the end. */
      on('note', [
        rule({
          alignItems: 'center',
          boxSizing: 'border-box',
          display: 'flex',
          fontSize: hook.noteText,
          gap: token('space-sm'),
          minBlockSize: token('size-control-tight'),
          paddingBlock: token('space-2xs'),
          paddingInline: hook.notePaddingInline,
          userSelect: web('none'),
          web: { cursor: 'pointer' },
        }),
        rule(
          { hover: true },
          {
            own: { graphWash: hook.noteHoverColor },
            backgroundImage: web(fn('linear-gradient', own.graphWash, own.graphWash)),
          },
        ),
      ]),
      on(
        {
          part: 'note',
          selector:
            '[part="list"]:focus-visible [part~="note-cursor"], [part="search"]:has([aria-activedescendant]) ~ [part="list"] [part~="note-cursor"]',
        },
        [
          web([
            rule({
              own: { graphWash: hook.noteHoverColor },
              backgroundImage: fn('linear-gradient', own.graphWash, own.graphWash),
            }),
          ]),
        ],
      ),
      on('note-name', [
        rule({
          flex: [0, 1, 'auto'],
          maxInlineSize: '70%',
          minInlineSize: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      on('note-relation', [
        rule({
          color: hook.noteRelationColor,
          flex: [1, 1, 0],
          fontSize: token('text-xs'),
          minInlineSize: 0,
          overflow: 'hidden',
          textAlign: 'end',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      on('note', [
        rule(
          { also: { 'note-selected': true } },
          { backgroundColor: hook.noteSelectedBackgroundColor },
        ),
      ]),
      on({ part: 'note-name', selector: '[part~="note-selected"] [part="note-name"]' }, [
        web([
          rule({
            fontWeight: hook.noteSelectedWeight,
          }),
        ]),
      ]),
      on('note-name', [
        native([rule({ 'data-selected': true }, { fontWeight: hook.noteSelectedWeight })]),
      ]),
      on(['header', 'footer'], [rule({ minInlineSize: 0 })]),
      on('legend-item', [
        web([
          rule({ forcedColors: true, also: { 'legend-item-hidden': true } }, { color: 'GrayText' }),
        ]),
      ]),
      on('legend-swatch', [web([rule({ forcedColors: true }, { forcedColorAdjust: 'none' })])]),
      on(
        {
          part: 'note',
          selector:
            '[part="list"]:focus-visible [part~="note-cursor"], [part="search"]:has([aria-activedescendant]) ~ [part="list"] [part~="note-cursor"]',
        },
        [
          web([
            rule(
              { forcedColors: true },
              {
                outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
                outlineOffset: product(token('size-focus-offset'), '-1'),
              },
            ),
          ]),
        ],
      ),
      on(
        {
          part: 'note',
          selector: '[part~="note-selected"], [part~="note-selected"] [part="note-relation"]',
        },
        [
          web([
            rule(
              { forcedColors: true },
              { backgroundColor: 'Highlight', color: 'HighlightText', forcedColorAdjust: 'none' },
            ),
          ]),
        ],
      ),
      on('region', [
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      on('host', [web([rule({ print: true }, { printColorAdjust: 'economy' })])]),
      /* **While a layout runs unseen** the drawing waits hidden and the
         `settling` part says why the box is empty. */
      on(
        {
          part: 'viewport',
          selector: ':host(:state(settling-unseen)) [part="viewport"] ::slotted(*)',
        },
        [web([rule({ visibility: 'hidden' })])],
      ),
      on('settling', [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          insetBlockStart: '50%',
          insetInline: 0,
          position: 'absolute',
          textAlign: 'center',
          translate: [0, '-50%'],
        }),
      ]),
      on('stop-layout', [
        rule({
          backgroundColor: controlGround,
          border: [token('border-floating'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-floating'),
          color: token('color-foreground'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          insetBlockEnd: token('space-sm'),
          insetInlineStart: token('space-sm'),
          minBlockSize: token('size-control-sm'),
          paddingInline: token('space-sm'),
          position: 'absolute',
          zIndex: token('layer-raised'),
          web: { cursor: 'pointer' },
        }),
        rule(
          { hover: true },
          { backgroundColor: mix(token('color-foreground'), 10, controlGround) },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* A phone's picture: the box it fills, each link and note in the
         colors the machine works out from core's picture, and the names as
         words over it at the places core gives them. */
      on('drawing-box', [native([rule({ inset: 0, position: 'absolute' })])]),
      on('drawing', [native([rule({ blockSize: '100%', inlineSize: '100%' })])]),
      on('link', [
        native([
          rule({
            fill: 'none',
            stroke: measured('graph-ink', token('color-border')),
            strokeLinecap: 'round',
            strokeWidth: measured('graph-line', 1),
          }),
        ]),
      ]),
      on('mark', [
        native([
          rule({
            fill: measured('graph-fill', 'none'),
            fillOpacity: measured('graph-fill-opacity', 1),
            stroke: measured('graph-ink', 'none'),
            strokeWidth: measured('graph-line', 0),
          }),
        ]),
      ]),
      on(
        ['region-name', 'note-label'],
        [
          native([
            /* On a plate of the ground, so the links behind a name leave it
               whole, as the web's stroke of the ground under its letters does. */
            rule({
              backgroundColor: hook.backgroundColor,
              borderRadius: token('radii-sm'),
              fontFamily: token('font-sans'),
              left: measured('graph-label-x'),
              lineHeight: 1,
              pointerEvents: 'none',
              position: 'absolute',
              top: measured('graph-label-y'),
              whiteSpace: 'nowrap',
            }),
          ]),
        ],
      ),
      on('note-label', [
        native([
          rule({
            color: measured('graph-label-ink', token('color-foreground-muted')),
            fontSize: '12px',
            fontWeight: 500,
            translate: [0, '-50%'],
          }),
          rule({ also: { 'note-label-strong': true } }, { fontSize: '13px', fontWeight: 600 }),
        ]),
      ]),
      on('region-name', [
        native([
          rule({
            color: measured('graph-label-ink', token('color-foreground-muted')),
            fontSize: '11px',
            fontWeight: 650,
            letterSpacing: '0.02em',
            opacity: measured('graph-label-fade', 1),
            translate: ['-50%', '-50%'],
          }),
        ]),
      ]),
    ]
  },
)
