import { first, fn, inherited, mix, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import log from './headless.js'

const edge = [token('border-thin'), 'solid'] as const

/**
 * Log's styled tier: a bordered box in the monospaced face, at the size of the
 * page's small text, that scrolls after 30rem.
 *
 * **The sixteen ANSI colors come from the theme**, so a program's red is the
 * theme's danger and its green the theme's success. A bright color is its color
 * mixed a quarter of the way to the ink: a program that writes red and bright red
 * side by side means two things, and a theme has one red, so the second is drawn
 * from it, as cyan is mixed from blue and green. Toward the ink, so it is lighter
 * in dark mode and darker in light, and further from the ground in both. The
 * quiet grays are one gray, the muted ink.
 *
 * **Four rows, each named**, because a hidden grid item leaves the grid and the
 * rows below it would move up a track with that track's sizing. Only the lines
 * scroll. A phone stands the same four in a column, the lines taking what is left.
 *
 * **Plain is a log with nothing of its own around it.** The lines start on the
 * edge the text around them starts on, and the log is as tall as what it holds,
 * since a box that scrolls inside a transcript that scrolls is a trap for the
 * wheel. A step reads as a row of an agent's work, from the values it sets.
 *
 * **A line longer than the box wraps under `wrap`**, and a phone's box scrolls one
 * way only there. The spaces are kept on each line's text and not on the box:
 * kept on the box, the white space between the lines a page writes as children
 * drew a blank row between each pair.
 *
 * **The controls in the toolbar are a step down**, as the actions in Chat's header
 * are: they are the log's chrome rather than its subject.
 *
 * **The way back sits over the lines**, as Chat places it, so offering it moves
 * nothing a reader is reading.
 *
 * **What a collection says instead of rows is `shared/collection/state`'s on the
 * web**, and its rules are written here again for a phone, which adopts no sheet.
 */
export default styles(
  log,
  {
    prefix: 'log',
    hooks: {
      backgroundColor: token('color-background'),
      borderColor: token('color-border'),
      color: token('color-foreground'),
      fontFamily: token('font-mono'),
      fontSize: token('text-xs'),
      lineHeight: token('leading-normal'),
      maxBlockSize: '30rem',
      paddingInline: token('space-md'),
      radius: token('radii-md'),
      scrollbarThumbColor: token('scrollbar-thumb-color'),
      scrollbarTrackColor: token('scrollbar-track-color'),
      stepMaxBlockSize: '20rem',
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
      logCaretEnd: null,
      logCaretOrder: null,
      logCaretSize: null,
      logCaretStart: null,
      logDurationStart: null,
      logHeadingWeight: null,
      logLineSize: null,
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
      logWhiteSpace: null,
      logWrapIndent: null,
    },
    stylesheet: 'log/root/log-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        '--log-ansi-background': hook.backgroundColor,
        '--log-ansi-black': token('color-foreground'),
        '--log-ansi-blue': token('color-info'),
        '--log-ansi-bright-black': token('color-foreground-muted'),
        '--log-ansi-bright-blue': mix(inherited('log-ansi-blue'), 75, token('color-foreground')),
        '--log-ansi-bright-cyan': mix(inherited('log-ansi-cyan'), 75, token('color-foreground')),
        '--log-ansi-bright-green': mix(inherited('log-ansi-green'), 75, token('color-foreground')),
        '--log-ansi-bright-magenta': mix(
          inherited('log-ansi-magenta'),
          75,
          token('color-foreground'),
        ),
        '--log-ansi-bright-red': mix(inherited('log-ansi-red'), 75, token('color-foreground')),
        '--log-ansi-bright-white': token('color-foreground'),
        '--log-ansi-bright-yellow': mix(
          inherited('log-ansi-yellow'),
          75,
          token('color-foreground'),
        ),
        '--log-ansi-cyan': mix(token('color-info'), 50, token('color-success')),
        '--log-ansi-foreground': hook.color,
        '--log-ansi-green': token('color-success'),
        '--log-ansi-magenta': token('color-syntax-callable'),
        '--log-ansi-red': token('color-danger'),
        '--log-ansi-white': token('color-foreground-muted'),
        '--log-ansi-yellow': token('color-warning'),
        backgroundColor: hook.backgroundColor,
        border: [token('border-surface'), 'solid', hook.borderColor],
        borderRadius: hook.radius,
        boxShadow: token('shadow-surface'),
        color: hook.color,
        display: 'grid',
        fontFamily: hook.fontFamily,
        fontSize: hook.fontSize,
        lineHeight: hook.lineHeight,
        maxBlockSize: hook.maxBlockSize,
        minBlockSize: 0,
        overflow: 'hidden',
        web: {
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
          tabSize: 4,
        },
      }),
      rule(
        { separation: 'plain' },
        {
          '--log-padding-inline': token('space-none'),
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: token('radii-none'),
          color: hook.color('inherit'),
          maxBlockSize: hook.maxBlockSize('none'),
          overflow: 'visible',
          own: {
            /* Each duration right after its heading, since across a wide turn the
               far edge is a screen away from the step it times. */
            logCaretEnd: token('space-none'),
            logCaretOrder: 1,
            logCaretSize: product(token('size-icon-sm'), '0.75'),
            logCaretStart: product(token('space-2xs'), '-1'),
            logDurationStart: token('space-xs'),
            logHeadingWeight: token('weight-regular'),
            logNestIndent: sum(product(token('size-icon-sm'), '0.5'), token('space-xs')),
            logRowColor: 'currentColor',
            logRowInset: token('space-2xs'),
            logRowRadius: token('radii-sm'),
            logStepFade: 'log-step-fade',
            logStepLineInset: token('space-sm'),
            logStepMarginBlock: [token('space-2xs'), token('space-xs')],
            logStepMaxBlockSize: hook.stepMaxBlockSize,
            logStepOverflow: 'auto',
            logStepPaddingBlock: token('space-xs'),
            logStepRadius: token('radii-md'),
            logStepRule: [...edge, hook.borderColor],
            logStepRuleStart: sum(
              product(token('size-icon-sm'), '0.5'),
              product(token('border-thin'), '-1'),
            ),
            logStepStart: sum(token('size-icon-sm'), token('space-xs')),
            logStepSurface: token('color-well'),
            logWrapIndent: '2ch',
          },
        },
      ),
      rule({ wrap: true }, { own: { logLineSize: 'auto', logWhiteSpace: 'pre-wrap' } }),
      rule({ print: true }, { maxBlockSize: 'none' }),
      native([rule({ flexDirection: 'column' })]),
    ]),
    on({ part: 'toolbar', slotted: '*' }, [
      rule({
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': product(token('size-control'), '1.2'),
        '--helix-size-control-tight': fn('round', product(token('size-control'), '0.8'), '1px'),
        '--helix-size-checkbox': token('size-checkbox-sm'),
        '--helix-size-checkbox-loose': product(token('size-checkbox'), '1.2'),
        '--helix-size-checkbox-tight': product(token('size-checkbox'), '0.8'),
        '--helix-size-switch': token('size-switch-sm'),
        '--helix-size-tag': token('size-tag-sm'),
        '--helix-text-control': token('text-control-sm'),
        '--helix-space-control': token('space-sm'),
        '--helix-text-field': token('text-sm'),
        '--helix-text-field-label': token('text-xs'),
        '--helix-space-field': token('space-xs'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
        '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
        borderBlockEnd: [...edge, hook.borderColor],
        fontFamily: token('font-sans'),
        paddingBlock: token('space-xs'),
        paddingInline: hook.paddingInline,
        web: { gridRow: 1 },
      }),
    ]),
    /* What was let go, said once at the top, in the voice of the chrome rather than
       of the output. */
    on('dropped', [
      rule({
        backgroundColor: token('color-surface-sunken'),
        borderBlockEnd: [...edge, hook.borderColor],
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        margin: token('space-none'),
        paddingBlock: token('space-2xs'),
        paddingInline: hook.paddingInline,
        web: { gridRow: 2 },
      }),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    /* The scrollport takes the treatment Scroll Area settled on: `thin`, and the
       shared scrollbar colors after this family's own hooks. */
    on('log', [
      rule({
        paddingBlock: token('space-xs'),
        web: {
          gridRow: 3,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          scrollbarColor: [hook.scrollbarThumbColor, hook.scrollbarTrackColor],
          scrollbarWidth: 'thin',
        },
      }),
      rule(
        { separation: 'plain' },
        {
          marginInline: product(own.logRowInset, '-1'),
          paddingBlock: token('space-none'),
          paddingInline: own.logRowInset,
        },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      web([rule({ print: true }, { overflow: 'visible' })]),
      /* The lines take what is left of the box. A log from data has a list of its
         own in it, and lines passed in scroll in the part. */
      native([
        rule({ flexGrow: 1, flexShrink: 1, minBlockSize: 0 }),
        rule({ part: { 'data-scrolls': true } }, { overflow: 'auto' }),
        rule(
          { part: { 'data-scrolls': true }, wrap: true },
          { overflowX: 'hidden', overflowY: 'auto' },
        ),
      ]),
    ]),
    /* A row drawn from data keeps every line's width, so a row with a background
       reaches as far as the longest line rather than the edge of the box. */
    on('row', [
      rule({
        minInlineSize: '100%',
        web: { inlineSize: first(own.logLineSize, 'max-content') },
      }),
    ]),
    on('resume', [
      rule({
        marginBlockStart: sum(product(token('space-xl'), '-1'), product(token('space-xs'), '-1')),
        paddingBlockEnd: token('space-xs'),
        pointerEvents: 'none',
        position: 'relative',
        web: { display: 'grid', gridRow: 4, justifyItems: 'center' },
      }),
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          /* The button inside still takes a press, as the web's `auto` gives it. */
          pointerEvents: 'box-none',
        }),
      ]),
      rule({ part: { hidden: true } }, { display: 'none' }),
      rule({ print: true }, { display: 'none' }),
    ]),
    on({ part: 'resume', selector: '[part="resume"] > *' }, [
      web([rule({ pointerEvents: 'auto' })]),
    ]),
    on({ region: 'resume', slotted: '*' }, [
      rule({
        border: [token('border-floating'), 'solid', hook.borderColor],
        boxShadow: token('shadow-floating'),
      }),
    ]),
    on('resume-button', [
      rule({
        all: 'unset',
        boxSizing: 'border-box',
        alignItems: 'center',
        backgroundColor: token('color-surface-raised'),
        blockSize: token('size-control-sm'),
        border: [token('border-floating'), 'solid', hook.borderColor],
        borderRadius: token('radii-sm'),
        boxShadow: token('shadow-floating'),
        color: token('color-foreground'),
        display: 'inline-flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        gap: token('space-2xs'),
        lineHeight: token('leading-tight'),
        paddingInline: token('space-sm'),
        web: { cursor: 'pointer', whiteSpace: 'nowrap' },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule(
        { hover: true },
        { backgroundColor: mix(token('color-foreground'), 6, token('color-surface-raised')) },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('resume-mark', [
      rule({
        blockSize: token('size-icon-sm'),
        display: 'inline-flex',
        inlineSize: token('size-icon-sm'),
      }),
    ]),
    on({ part: 'resume-mark', inner: 'svg' }, [
      web([rule({ blockSize: '100%', inlineSize: '100%' })]),
    ]),
    on(
      ['empty', 'loading'],
      [
        rule({
          own: {
            collectionInsetBlock: token('space-lg'),
            collectionInsetInline: token('space-md'),
          },
        }),
        native([
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            paddingBlock: own.collectionInsetBlock,
            paddingInline: own.collectionInsetInline,
            textAlign: 'center',
          }),
        ]),
      ],
    ),
  ],
)
