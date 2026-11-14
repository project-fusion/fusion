import { first, inherited, native, product, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The controls a pan-and-zoom surface draws over itself on a phone: the
 * cluster in its corner, each control a raised square with the theme's
 * floating edge and lift, as large as a finger's target, and its glyph half
 * its side.
 *
 * **Named areas lowered to lines.** The web's shared `viewport.css` lays the
 * cluster out by named grid areas, `up`, `start`, `end`, `down`, then a
 * column for `zoomin`, `zoomout`, the family's own controls, and `full`, and
 * a phone's grid places cells by line, so each area is written here as the
 * column and row it names: the pad in the first three columns where it is
 * drawn, and the zoom stack in the column after it, which a zoom control
 * knows by its place among the controls, after the pad's four.
 *
 * **A phone's alone, for now.** The web keeps importing the shared sheet,
 * which Map and Canvas read as well.
 */
export default fragment(
  'viewport-controls',
  {
    parts: ['controls', 'pan-down', 'pan-end', 'pan-start', 'pan-up', 'zoom-in', 'zoom-out'],
    props: ['controlsPlacement'],
  },
  ({ on, rule }) => [
    on('controls', [
      native([
        rule({
          display: 'grid',
          gap: token('space-2xs'),
          gridTemplateColumns: 'auto',
          insetBlockStart: token('space-sm'),
          insetInlineEnd: token('space-sm'),
          position: 'absolute',
        }),
        /* The pad's three columns, and the zoom stack's after them. */
        rule(
          { holds: { 'pan-up': true } },
          { gridTemplateColumns: ['auto', 'auto', 'auto', 'auto'] },
        ),
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
    /* Each control a raised square a finger's target across. */
    on(
      ['pan-up', 'pan-start', 'pan-end', 'pan-down', 'zoom-in', 'zoom-out'],
      [
        native([
          rule({
            alignItems: 'center',
            backgroundColor: first(
              inherited('viewport-control-background-color'),
              token('color-surface-overlay'),
            ),
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
    /* The areas as lines: the pad around an empty middle. */
    on('pan-up', [native([rule({ gridColumn: 2, gridRow: 1 })])]),
    on('pan-start', [native([rule({ gridColumn: 1, gridRow: 2 })])]),
    on('pan-end', [native([rule({ gridColumn: 3, gridRow: 2 })])]),
    on('pan-down', [native([rule({ gridColumn: 2, gridRow: 3 })])]),
    on('zoom-in', [
      native([rule({ gridColumn: 1, gridRow: 1 }), rule({ nth: 5 }, { gridColumn: 4 })]),
    ]),
    on('zoom-out', [
      native([rule({ gridColumn: 1, gridRow: 2 }), rule({ nth: 6 }, { gridColumn: 4 })]),
    ]),
  ],
)
