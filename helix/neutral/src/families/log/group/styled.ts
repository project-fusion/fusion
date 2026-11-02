import {
  difference,
  first,
  fn,
  measured,
  native,
  product,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/* The column of numbers, as a line of the log sizes it, which the caret stands in. */
const numbers = fn('max', token('size-icon-sm'), product(measured('log-digits', 2), '1ch'))

/**
 * One step of a log, in its styled tier. **The heading is chrome rather than
 * output**, so it is set in the sans face, on one line, as wide as the box.
 *
 * **In a plain log the row's wash reaches a step past its text** on either side,
 * so the mark and the heading stay on the edge the text around the log starts on.
 *
 * **A shut step's caret points along the line, and turns down as it opens.** It
 * stands in the column of line numbers, against its end edge as the numbers are,
 * so the status and the heading start where every line's text does. **In a plain
 * log it follows the heading instead**, a step smaller and a step closer, as a
 * disclosure in running text does.
 *
 * **A step holding lines, in a plain log, holds them on a surface** that scrolls
 * after `--log-step-max-block-size`, the one box in a plain log, since an output
 * is the part of an agent's work a reader scans rather than reads. **It fades
 * toward an edge with more past it** on the web, by a mask a scroll timeline
 * drives, off under reduced motion.
 *
 * **A shut step's lines are hidden until a search finds them** on the web, which
 * keeps the box and draws nothing in it. A phone draws no content while it is
 * shut.
 */
export default styles(
  group,
  {
    prefix: 'log',
    hooks: {
      fontFamily: token('font-mono'),
      fontSize: token('text-xs'),
      lineHeight: token('leading-normal'),
      paddingInline: token('space-md'),
      scrollbarThumbColor: token('scrollbar-thumb-color'),
      scrollbarTrackColor: token('scrollbar-track-color'),
    },
    own: {
      logCaretEnd: null,
      logCaretOrder: null,
      logCaretSize: null,
      logCaretStart: null,
      logDurationStart: null,
      logHeadingWeight: null,
      logLineInset: null,
      logNestIndent: null,
      logRowColor: null,
      logRowInset: null,
      logRowRadius: null,
      logStepFade: null,
      logStepLineInset: null,
      logStepMarginBlock: null,
      logStepMaxBlockSize: null,
      logStepOverflow: null,
      logStepPaddingBlock: null,
      logStepRadius: null,
      logStepRule: null,
      logStepRuleStart: null,
      logStepStart: null,
      logStepSurface: null,
    },
    stylesheet: 'log/group/log-group.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      /* The size the web inherits through the log's shadow root. */
      native([rule({ fontSize: hook.fontSize, lineHeight: hook.lineHeight })]),
      rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
    ]),
    on('summary', [
      rule({
        all: 'unset',
        boxSizing: 'border-box',
        alignItems: 'center',
        borderRadius: first(own.logRowRadius, token('radii-none')),
        color: first(own.logRowColor, token('color-foreground')),
        columnGap: token('space-xs'),
        display: 'flex',
        fontFamily: token('font-sans'),
        fontWeight: first(own.logHeadingWeight, token('weight-medium')),
        inlineSize: sum('100%', product(first(own.logRowInset, '0px'), '2')),
        marginInline: product(first(own.logRowInset, '0px'), '-1'),
        paddingBlock: token('space-2xs'),
        paddingInline: first(own.logRowInset, hook.paddingInline),
        transitionDuration: token('duration-fast'),
        transitionProperty: 'background-color, color',
        transitionTimingFunction: token('easing-standard'),
        web: { cursor: 'pointer', whiteSpace: 'nowrap' },
      }),
      /* As wide as the box, while the lines beside it run past its edge. */
      native([rule({ flexDirection: 'row', maxInlineSize: measured('log-frame', '100%') })]),
      /* Rows sit against each other, so a box reaching past a row would take the
         press from the row beside it. On a touch screen the row itself reaches
         the target. */
      rule({ coarsePointer: true }, { minBlockSize: token('size-target') }),
      rule(
        { hover: true },
        {
          backgroundColor: token('color-hover'),
          color: token('color-foreground'),
        },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
    ]),
    on('mark', [
      rule({
        blockSize: first(own.logCaretSize, token('size-icon-sm')),
        color: token('color-foreground-subtle'),
        flex: 'none',
        fontFamily: hook.fontFamily,
        inlineSize: first(own.logCaretSize, token('size-icon-sm')),
        marginInlineEnd: first(own.logCaretEnd, difference(token('space-md'), token('space-xs'))),
        marginInlineStart: first(own.logCaretStart, difference(numbers, token('size-icon-sm'))),
        order: first(own.logCaretOrder, 0),
        rotate: '-90deg',
        transitionDuration: token('duration-fast'),
        transitionProperty: 'color, rotate',
        transitionTimingFunction: token('easing-standard'),
      }),
      rule({ dir: 'rtl' }, { rotate: '90deg' }),
      rule({ open: true }, { rotate: 'none' }),
      /* A step with nothing in it has nothing to open, so it draws no caret, while
         its heading keeps its place. */
      rule({ empty: true }, { visibility: 'hidden' }),
    ]),
    on({ part: 'mark', selector: '[part="summary"]:hover [part="mark"]' }, [
      web([rule({ color: token('color-foreground-muted') })]),
    ]),
    on('status', [
      rule({
        blockSize: token('size-icon-sm'),
        color: token('color-foreground-muted'),
        flex: 'none',
        inlineSize: token('size-icon-sm'),
      }),
      rule({ status: 'done' }, { color: token('color-success') }),
      rule({ status: 'failed' }, { color: token('color-danger') }),
      rule({ status: 'running' }, { color: token('color-info') }),
    ]),
    on('heading', [
      rule({
        minInlineSize: 0,
        overflow: 'hidden',
        web: { textOverflow: 'ellipsis' },
      }),
      native([rule({ flexShrink: 1 })]),
    ]),
    on('duration', [
      rule({
        color: token('color-foreground-muted'),
        flex: 'none',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: token('weight-regular'),
        marginInlineStart: first(own.logDurationStart, 'auto'),
      }),
      native([rule({ part: { hidden: true } }, { display: 'none' })]),
    ]),
    on({ region: 'default', slotted: 'helix-log-group' }, [
      web([
        rule({
          marginInlineStart: first(own.logNestIndent, sum(numbers, token('space-md'))),
        }),
      ]),
    ]),
    on('content', [
      rule({ empty: true }, { display: 'none' }),
      rule(
        { steps: true },
        {
          /* Lines written among the steps start where the steps' marks do. */
          borderInlineStart: first(own.logStepRule, 'none'),
          marginInlineStart: first(own.logStepRuleStart, token('space-none')),
          own: { logLineInset: own.logNestIndent },
        },
      ),
      rule(
        { steps: false },
        {
          backgroundColor: first(own.logStepSurface, 'transparent'),
          borderRadius: first(own.logStepRadius, token('radii-none')),
          marginBlock: first(own.logStepMarginBlock, token('space-none')),
          marginInlineStart: first(own.logStepStart, token('space-none')),
          maxBlockSize: first(own.logStepMaxBlockSize, 'none'),
          overflow: first(own.logStepOverflow, 'visible'),
          paddingBlock: first(own.logStepPaddingBlock, token('space-none')),
          own: { logLineInset: own.logStepLineInset },
          web: {
            overscrollBehavior: 'contain',
            scrollbarColor: [hook.scrollbarThumbColor, hook.scrollbarTrackColor],
            scrollbarWidth: 'thin',
          },
        },
      ),
      web([
        rule(
          { steps: false, supports: '(animation-timeline: scroll())' },
          {
            animationFillMode: 'both',
            animationName: first(own.logStepFade, 'none'),
            animationTimeline: 'scroll(self block)',
            animationTimingFunction: 'linear',
          },
        ),
        rule({ reducedMotion: true, steps: false }, { animation: 'none' }),
        rule({ print: true }, { maxBlockSize: 'none', overflow: 'visible' }),
        /* The box draws nothing while the step is shut. Last, so it outranks the
           surface's rules above, which select as strongly. */
        rule(
          { part: { hidden: true } },
          {
            animation: 'none',
            backgroundColor: 'transparent',
            border: 'none',
            margin: '0',
            maxBlockSize: 'none',
            padding: '0',
          },
        ),
      ]),
      native([rule({ open: false }, { display: 'none' })]),
    ]),
    keyframes('log-step-fade', {
      '0%': {
        maskImage: fn(
          'linear-gradient',
          'to bottom',
          ['#000', difference('100%', token('space-lg'))],
          'transparent',
        ),
      },
      '1%, 99%': {
        maskImage: fn(
          'linear-gradient',
          'to bottom',
          'transparent',
          ['#000', token('space-lg')],
          ['#000', difference('100%', token('space-lg'))],
          'transparent',
        ),
      },
      '100%': {
        maskImage: fn('linear-gradient', 'to bottom', 'transparent', ['#000', token('space-lg')]),
      },
    }),
  ],
)
