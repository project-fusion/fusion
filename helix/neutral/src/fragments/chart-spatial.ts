import { measured, native, product, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * What the spatial charts draw alike on a phone: the box the drawing fills,
 * inset from the plot, its grid, the ring on the reading, and its numbers and
 * names, words standing at the places core gives them, `--spatial-label-x`
 * and `--spatial-label-y` of the box, each centered there as the web's text
 * is. A name stands on a plate of the ground so the box's lines behind it
 * leave it whole, as the web's stroke of the ground under its letters does.
 *
 * **A phone's alone, for now.** The web sets the same from the shared
 * `chart/spatial.css`, which the spatial charts not yet written once also
 * read, so a family that takes this in keeps importing that sheet on the web.
 */
export default fragment(
  'chart-spatial',
  {
    parts: ['axis-name', 'drawing', 'fallback', 'grid', 'host', 'ring', 'tick'],
    props: ['separation'],
  },
  ({ on, rule }) => [
    on('host', [native([rule({ position: 'relative' })])]),
    on('fallback', [
      native([
        rule({ fontSize: token('text-xs'), inset: token('space-md'), position: 'absolute' }),
      ]),
    ]),
    on('drawing', [native([rule({ inset: 0, position: 'absolute' })])]),
    on('grid', [
      native([
        rule({
          fill: 'none',
          opacity: 0.35,
          stroke: token('color-foreground-muted'),
          strokeWidth: token('border-thin'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
    ]),
    on('ring', [
      native([
        rule({
          fill: 'none',
          pointerEvents: 'none',
          stroke: token('color-foreground'),
          strokeWidth: token('border-thick'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
    ]),
    on(
      ['tick', 'axis-name'],
      [
        native([
          rule({
            fontFamily: token('font-sans'),
            fontSize: measured('spatial-label-size', token('text-xs')),
            left: measured('spatial-label-x'),
            lineHeight: 1,
            pointerEvents: 'none',
            position: 'absolute',
            top: measured('spatial-label-y'),
            translate: ['-50%', '-50%'],
            whiteSpace: 'nowrap',
          }),
        ]),
      ],
    ),
    on('tick', [
      native([
        rule({
          color: token('color-foreground-muted'),
          fontVariantNumeric: 'tabular-nums',
          fontWeight: token('weight-medium'),
        }),
      ]),
    ]),
    /* A name, on a plate of the ground. */
    on('axis-name', [
      native([
        rule({
          backgroundColor: token('color-background'),
          borderRadius: token('radii-sm'),
          color: token('color-foreground'),
          fontWeight: token('weight-semibold'),
          paddingInline: product(token('text-xs'), 0.125),
        }),
        rule({ separation: 'filled' }, { backgroundColor: token('color-surface-filled') }),
      ]),
    ]),
  ],
)
