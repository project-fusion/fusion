import { difference, fn, measured, native, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Steps' styled tier.
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
    own: {
      stepsBodyAlign: null,
      stepsBodyBasis: null,
      stepsBodyColumn: null,
      stepsBodyGrow: null,
      stepsBodyRow: null,
      stepsColumns: null,
      stepsConnectorInset: null,
      stepsContent: null,
      stepsCount: null,
      stepsFlow: null,
      stepsInkComplete: null,
      stepsInkCurrent: null,
      stepsLeadBlockSize: null,
      stepsLeadBlockStart: null,
      stepsLeadBottom: null,
      stepsLeadEnd: null,
      stepsLeadHeight: null,
      stepsLeadInlineSize: null,
      stepsLeadInlineStart: null,
      stepsLeadStart: null,
      stepsLeadTop: null,
      stepsLeadWidth: null,
      stepsM: null,
      stepsMark: null,
      stepsMarkBox: null,
      stepsMarkerColor: null,
      stepsMarkerColumn: null,
      stepsMarkerJustify: null,
      stepsMarkerWeight: null,
      stepsRailMargin: null,
      stepsRowGap: null,
      stepsTrailBlockSize: null,
      stepsTrailBlockStart: null,
      stepsTrailBottom: null,
      stepsTrailEnd: null,
      stepsTrailHeight: null,
      stepsTrailInlineSize: null,
      stepsTrailInlineStart: null,
      stepsTrailStart: null,
      stepsTrailTop: null,
      stepsTrailWidth: null,
    },
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
          stepsM: hook.markerSize,
          stepsMarkBox: own.stepsM,
          /* Air either side of every mark, so the line arrives at it. */
          stepsConnectorInset: hook.connectorInset,
          stepsColumns: 'minmax(0, 1fr)',
          stepsMarkerColumn: 1,
          stepsMarkerJustify: 'center',
          stepsBodyColumn: 1,
          stepsBodyRow: 2,
          stepsBodyAlign: 'center',
          stepsRowGap: token('space-xs'),
          stepsContent: 'none',
          stepsLeadInlineStart: quotient(hook.gap, '-2'),
          stepsLeadInlineSize: difference(
            difference(sum('50%', quotient(hook.gap, 2)), quotient(own.stepsMarkBox, 2)),
            own.stepsConnectorInset,
          ),
          stepsLeadBlockStart: quotient(own.stepsMarkBox, 2),
          stepsLeadBlockSize: token('border-thin'),
          stepsTrailInlineStart: sum('50%', quotient(own.stepsMarkBox, 2), own.stepsConnectorInset),
          stepsTrailInlineSize: difference(
            difference(sum('50%', quotient(hook.gap, 2)), quotient(own.stepsMarkBox, 2)),
            own.stepsConnectorInset,
          ),
          stepsTrailBlockStart: quotient(own.stepsMarkBox, 2),
          stepsTrailBlockSize: token('border-thin'),
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
            stepsMarkBox: token('size-control-tight'),
            stepsColumns: 'auto minmax(0, 1fr)',
            stepsMarkerJustify: 'start',
            stepsBodyColumn: 2,
            stepsBodyRow: 1,
            stepsBodyAlign: 'start',
            stepsRowGap: token('space-2xs'),
            stepsContent: 'grid',
            stepsLeadInlineStart: quotient(own.stepsMarkBox, 2),
            stepsLeadInlineSize: token('border-thin'),
            stepsLeadBlockStart: quotient(hook.gap, '-2'),
            stepsLeadBlockSize: quotient(hook.gap, 2),
            stepsTrailInlineStart: quotient(own.stepsMarkBox, 2),
            stepsTrailInlineSize: token('border-thin'),
            stepsTrailBlockStart: own.stepsMarkBox,
            stepsTrailBlockSize: sum(difference('100%', own.stepsMarkBox), quotient(hook.gap, 2)),
          },
        },
      ),
      /* Numbers, where the order is the point: ink on the digits, a step
         darker on the current one, and a lighter weight ahead. */
      rule(
        { marker: 'numeric' },
        {
          own: {
            stepsMark: 'none',
            stepsCount: fn('counter', 'helix-step'),
            stepsMarkerColor: token('color-foreground-muted'),
            stepsMarkerWeight: token('weight-regular'),
            stepsInkComplete: token('color-foreground-muted'),
            stepsInkCurrent: token('color-foreground'),
          },
        },
      ),
      /* Where a phone draws the halves of the line, as insets from the step's
         edges: in a row, from half the gap before the step to the middle,
         short of the mark, and from the middle to half the gap past it. */
      native([
        rule({
          own: {
            stepsFlow: 'column',
            stepsBodyBasis: 'auto',
            stepsBodyGrow: 0,
            stepsLeadTop: quotient(own.stepsMarkBox, 2),
            stepsLeadBottom: 'auto',
            stepsLeadStart: quotient(hook.gap, '-2'),
            stepsLeadEnd: '50%',
            stepsLeadWidth: 'auto',
            stepsLeadHeight: token('border-thin'),
            stepsTrailTop: quotient(own.stepsMarkBox, 2),
            stepsTrailBottom: 'auto',
            stepsTrailStart: '50%',
            stepsTrailEnd: quotient(hook.gap, '-2'),
            stepsTrailWidth: 'auto',
            stepsTrailHeight: token('border-thin'),
            stepsRailMargin: sum(quotient(own.stepsMarkBox, 2), own.stepsConnectorInset),
          },
        }),
        /* Down a column, from half the gap above the step to its top, and from
         under the mark to half the gap below the step. */
        rule(
          { orientation: 'vertical' },
          {
            own: {
              stepsFlow: 'row',
              stepsBodyBasis: 0,
              stepsBodyGrow: 1,
              stepsLeadTop: quotient(hook.gap, '-2'),
              stepsLeadStart: quotient(own.stepsMarkBox, 2),
              stepsLeadEnd: 'auto',
              stepsLeadWidth: token('border-thin'),
              stepsLeadHeight: quotient(hook.gap, 2),
              stepsTrailTop: own.stepsMarkBox,
              stepsTrailBottom: quotient(hook.gap, '-2'),
              stepsTrailStart: quotient(own.stepsMarkBox, 2),
              stepsTrailEnd: 'auto',
              stepsTrailWidth: token('border-thin'),
              stepsTrailHeight: 'auto',
              stepsRailMargin: 0,
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
    /* Written out: `dir` reads the host's direction, and this reads the part's own. */
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
        rule({ marker: 'numeric' }, { own: { stepsCount: fn('counter', 'helix-step') } }),
      ]),
    ]),
  ],
)
