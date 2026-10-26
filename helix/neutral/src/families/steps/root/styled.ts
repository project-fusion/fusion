import { difference, fn, measured, native, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Steps' styled tier, which writes
 * `helix/styled/src/steps/root/steps-root.generated.css`.
 *
 * **The arrangement reaches each step as private values**, since a step's
 * own sheet can match only its own host: the tracks its mark and its name
 * take, the size of the box the mark sits in, and where each half of the
 * line that joins it to its neighbors starts and how far it runs. A row
 * hands each step an equal share, so the marks sit at even intervals. Down a
 * column, the name sits beside its mark, and the current stage opens under
 * it.
 *
 * **A phone draws the halves from values of its own**: an inset from each
 * edge where the web adds a percentage and a length, which a view cannot
 * resolve. It counts the steps from the sequence, as it counts a list's
 * rows.
 *
 * **`numeric` marks each step with its number**, in ink: a digit carries no
 * meaning a color could agree with.
 */
export default styles(
  root,
  {
    prefix: 'steps',
    hooks: {
      connectorInset: token('space-2xs'),
      gap: token('space-md'),
      markerSize: token('size-icon'),
      progressColor: token('color-success'),
      progressThickness: token('border-thick'),
      progressTrackColor: token('color-border'),
    },
    own: [
      'steps-body-align',
      'steps-body-basis',
      'steps-body-column',
      'steps-body-grow',
      'steps-body-row',
      'steps-columns',
      'steps-connector-inset',
      'steps-content',
      'steps-count',
      'steps-flow',
      'steps-ink-complete',
      'steps-ink-current',
      'steps-lead-block-size',
      'steps-lead-block-start',
      'steps-lead-bottom',
      'steps-lead-end',
      'steps-lead-height',
      'steps-lead-inline-size',
      'steps-lead-inline-start',
      'steps-lead-start',
      'steps-lead-top',
      'steps-lead-width',
      'steps-m',
      'steps-mark',
      'steps-mark-box',
      'steps-marker-color',
      'steps-marker-column',
      'steps-marker-justify',
      'steps-marker-weight',
      'steps-rail-margin',
      'steps-row-gap',
      'steps-trail-block-size',
      'steps-trail-block-start',
      'steps-trail-bottom',
      'steps-trail-end',
      'steps-trail-height',
      'steps-trail-inline-size',
      'steps-trail-inline-start',
      'steps-trail-start',
      'steps-trail-top',
      'steps-trail-width',
    ],
    stylesheet: 'steps/root/steps-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        counterReset: 'helix-step',
        display: 'flex',
        /* So a progress bar a page shows takes a line of its own. */
        flexWrap: 'wrap',
        gap: hook.gap,
        own: {
          m: hook.markerSize,
          markBox: own.m,
          /* Air either side of every mark, so the line arrives at it. */
          connectorInset: hook.connectorInset,
          columns: 'minmax(0, 1fr)',
          markerColumn: 1,
          markerJustify: 'center',
          bodyColumn: 1,
          bodyRow: 2,
          bodyAlign: 'center',
          rowGap: token('space-xs'),
          content: 'none',
          leadInlineStart: quotient(hook.gap, '-2'),
          leadInlineSize: difference(
            difference(sum('50%', quotient(hook.gap, 2)), quotient(own.markBox, 2)),
            own.connectorInset,
          ),
          leadBlockStart: quotient(own.markBox, 2),
          leadBlockSize: token('border-thin'),
          trailInlineStart: sum('50%', quotient(own.markBox, 2), own.connectorInset),
          trailInlineSize: difference(
            difference(sum('50%', quotient(hook.gap, 2)), quotient(own.markBox, 2)),
            own.connectorInset,
          ),
          trailBlockStart: quotient(own.markBox, 2),
          trailBlockSize: token('border-thin'),
        },
      }),
      /* Down a column, the name beside its mark, and both halves of the line
         run again: above the mark to half the gap over it, and below it to
         half the gap under. */
      rule(
        { orientation: 'vertical' },
        {
          flexDirection: 'column',
          own: {
            markBox: token('size-control-tight'),
            columns: 'auto minmax(0, 1fr)',
            markerJustify: 'start',
            bodyColumn: 2,
            bodyRow: 1,
            bodyAlign: 'start',
            rowGap: token('space-2xs'),
            content: 'grid',
            leadInlineStart: quotient(own.markBox, 2),
            leadInlineSize: token('border-thin'),
            leadBlockStart: quotient(hook.gap, '-2'),
            leadBlockSize: quotient(hook.gap, 2),
            trailInlineStart: quotient(own.markBox, 2),
            trailInlineSize: token('border-thin'),
            trailBlockStart: own.markBox,
            trailBlockSize: sum(difference('100%', own.markBox), quotient(hook.gap, 2)),
          },
        },
      ),
      /* Numbers, where the order is the point: ink on the digits, a step
         darker on the current one, and a lighter weight ahead. */
      rule(
        { variant: 'numeric' },
        {
          own: {
            mark: 'none',
            count: fn('counter', 'helix-step'),
            markerColor: token('color-foreground-muted'),
            markerWeight: token('weight-regular'),
            inkComplete: token('color-foreground-muted'),
            inkCurrent: token('color-foreground'),
          },
        },
      ),
      /* Where a phone draws the halves of the line, as insets from the step's
         edges: in a row, from half the gap before the step to the middle,
         short of the mark, and from the middle to half the gap past it. */
      native([
        rule({
          own: {
            flow: 'column',
            bodyBasis: 'auto',
            bodyGrow: 0,
            leadTop: quotient(own.markBox, 2),
            leadBottom: 'auto',
            leadStart: quotient(hook.gap, '-2'),
            leadEnd: '50%',
            leadWidth: 'auto',
            leadHeight: token('border-thin'),
            trailTop: quotient(own.markBox, 2),
            trailBottom: 'auto',
            trailStart: '50%',
            trailEnd: quotient(hook.gap, '-2'),
            trailWidth: 'auto',
            trailHeight: token('border-thin'),
            railMargin: sum(quotient(own.markBox, 2), own.connectorInset),
          },
        }),
        /* Down a column, from half the gap above the step to its top, and from
         under the mark to half the gap below the step. */
        rule(
          { orientation: 'vertical' },
          {
            own: {
              flow: 'row',
              bodyBasis: 0,
              bodyGrow: 1,
              leadTop: quotient(hook.gap, '-2'),
              leadStart: quotient(own.markBox, 2),
              leadEnd: 'auto',
              leadWidth: token('border-thin'),
              leadHeight: quotient(hook.gap, 2),
              trailTop: own.markBox,
              trailBottom: quotient(hook.gap, '-2'),
              trailStart: quotient(own.markBox, 2),
              trailEnd: 'auto',
              trailWidth: token('border-thin'),
              trailHeight: 'auto',
              railMargin: 0,
            },
          },
        ),
      ]),
      /* Where a process reached, which is a fact and not a control. */
      rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
    ]),
    /* How far through the sequence is: a bar, once a page gives the part a
       `display`. Last, across the whole row or column. */
    on('progress', [
      rule({
        backgroundColor: hook.progressTrackColor,
        backgroundImage: fn(
          'linear-gradient',
          'to right',
          [hook.progressColor, measured('steps-progress', '0%')],
          ['transparent', 0],
        ),
        blockSize: hook.progressThickness,
        borderRadius: token('radii-full'),
        flex: [0, 0, '100%'],
        order: 1,
      }),
      rule({ orientation: 'vertical' }, { flex: 'none', inlineSize: '100%' }),
    ]),
    on({ part: 'progress', selector: '[part="progress"]:dir(rtl)' }, [
      web([
        rule({
          backgroundImage: fn(
            'linear-gradient',
            'to left',
            [hook.progressColor, measured('steps-progress', '0%')],
            ['transparent', 0],
          ),
        }),
      ]),
    ]),
    /* A row hands each step an equal share, whatever the names measure. */
    on({ slotted: '*' }, [
      rule({ orientation: { not: 'vertical' } }, { flex: [1, 1, 0], minInlineSize: 0 }),
      /* A phone counts each step as the sequence draws it, and hands each its
         own number. */
      native([
        rule({ counterIncrement: 'helix-step' }),
        rule({ variant: 'numeric' }, { own: { count: fn('counter', 'helix-step') } }),
      ]),
    ]),
  ],
)
