import { difference, fn, measured, quotient, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Tabs' strip at its edges: a row of tabs wider than its box fades the edge with
 * more behind it, as Table does, where a browser runs a scroll timeline and no
 * scroll buttons stand there; and under a coarse pointer the strip takes a
 * finger's height without moving the words. Tabs' table takes it in where it
 * stands in its cascade, and declares `tabs-edges`.
 */
export default fragment(
  'tabs-edges',
  {
    parts: ['tabs'],
    own: { tabsFade: null },
    props: ['marker', 'orientation', 'scrollControls'],
  },
  ({ keyframes, on, own, rule }) => [
    on('tabs', [
      web([
        rule(
          { orientation: { not: 'vertical' }, scrollControls: false },
          {
            maskImage: fn(
              'linear-gradient',
              own.tabsFade,
              'transparent',
              ['#000', measured('_tabs-fade-start', '0rem')],
              ['#000', difference('100%', measured('_tabs-fade-end', '0rem'))],
              'transparent',
            ),
            own: { tabsFade: 'to right' },
          },
        ),
        rule({ dir: 'rtl' }, { own: { tabsFade: 'to left' } }),
        rule(
          {
            orientation: { not: 'vertical' },
            scrollControls: false,
            supports: '(animation-timeline: scroll())',
          },
          {
            animation: ['tabs-edges', 'linear', 'both'],
            animationTimeline: fn('scroll', 'self inline'),
          },
        ),
        rule(
          { orientation: { not: 'vertical' }, reducedMotion: true, scrollControls: false },
          { animation: 'none' },
        ),
        /* A finger's height, with the rule kept under the words. */
        rule(
          { coarsePointer: true, marker: { not: 'segmented' }, orientation: { not: 'vertical' } },
          {
            backgroundPosition: ['left', 0, 'bottom', token('space-xs')],
            marginBlock: quotient(token('space-xs'), '-1'),
            paddingBlock: token('space-xs'),
          },
        ),
        rule(
          { coarsePointer: true, marker: 'segmented' },
          { blockSize: fn('max', token('size-control'), token('size-target')) },
        ),
      ]),
    ]),
    keyframes('tabs-edges', {
      '0%': { '--_tabs-fade-end': token('space-xl'), '--_tabs-fade-start': '0rem' },
      '5%, 95%': { '--_tabs-fade-end': token('space-xl'), '--_tabs-fade-start': token('space-xl') },
      '100%': { '--_tabs-fade-end': '0rem', '--_tabs-fade-start': token('space-xl') },
    }),
  ],
)
