import { first, fn, measured, mix, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import line from './headless.js'

/* The column of numbers, never narrower than a step's caret, which stands in it
   on a heading row, so a heading's status starts where the text does. */
const numbers = fn('max', token('size-icon-sm'), product(measured('log-digits', 2), '1ch'))

/**
 * One line of a log, in its styled tier.
 *
 * **Each line is as wide as its text, and at least as wide as the box**, so a row
 * with a background reaches as far as the longest line.
 *
 * **The numbers are one column**, right-aligned to the widest the log holds, and
 * are not copied with the text. Muted rather than subtle, because a number stands
 * on the band of an error or a marked line too: the subtle ink measured 4.09:1 on
 * the marked band and 4.45:1 on the error band, under the 4.5:1 the muted ink
 * clears on both.
 *
 * **The text of a warning or an error is deepened toward the foreground**, as
 * Button deepens a label on a wash of its own tone: the band under it is a wash
 * of the color it is written in. Measured in Chromium on October 10, 2026, across
 * the shipped theme and 34 the theme engine derives, the bare tone read as low as
 * 3.89:1 on its band. Mixed 78% toward the foreground, the lowest is 4.92:1.
 *
 * **A selected line takes a tint of the info color**, as a code host draws a
 * selection. Not the primary the marked band uses: in a neutral theme the primary
 * is near black, and a fifth of it swallowed the red of an error line under it.
 *
 * **A color a run names is an ANSI color the log sets from the theme**, by a rule
 * for each on a phone, since the web's element writes the custom property itself.
 */
export default styles(
  line,
  {
    prefix: 'log',
    hooks: {
      ansiBackground: null,
      ansiBlack: null,
      ansiBlue: null,
      ansiBrightBlack: null,
      ansiBrightBlue: null,
      ansiBrightCyan: null,
      ansiBrightGreen: null,
      ansiBrightMagenta: null,
      ansiBrightRed: null,
      ansiBrightWhite: null,
      ansiBrightYellow: null,
      ansiCyan: null,
      ansiForeground: null,
      ansiGreen: null,
      ansiMagenta: null,
      ansiRed: null,
      ansiWhite: null,
      ansiYellow: null,
      color: token('color-foreground'),
      errorColor: token('color-danger'),
      fontFamily: token('font-mono'),
      fontSize: token('text-xs'),
      lineHeight: token('leading-normal'),
      markBackgroundColor: mix(token('color-primary'), 12, 'transparent'),
      matchBackgroundColor: token('color-warning-surface'),
      paddingInline: token('space-md'),
      selectedBackgroundColor: mix(token('color-info'), 14, 'transparent'),
      warnColor: token('color-warning'),
    },
    own: {
      logLineInset: null,
      logLineSize: null,
      logWhiteSpace: null,
      logWrapIndent: null,
    },
    stylesheet: 'log/line/log-line.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      /* The face the web inherits through the log's shadow root. */
      native([
        rule({
          color: hook.color,
          fontFamily: hook.fontFamily,
          fontSize: hook.fontSize,
          lineHeight: hook.lineHeight,
        }),
        rule({ filtered: true }, { display: 'none' }),
      ]),
    ]),
    on('line', [
      rule({
        columnGap: token('space-md'),
        display: 'flex',
        minInlineSize: '100%',
        paddingInline: hook.paddingInline,
        web: { inlineSize: first(own.logLineSize, 'max-content') },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ hover: true }, { backgroundColor: token('color-hover') }),
      rule({ print: true }, { web: { printColorAdjust: 'exact' } }),
      /* A line in a step keeps a step from the end of the surface it stands on. */
      rule(
        { also: { 'line-grouped': true } },
        { paddingInlineEnd: first(own.logLineInset, hook.paddingInline) },
      ),
    ]),
    /* **A line in a step with no number starts where the step's heading does**,
       past the caret's gutter, as a numbered line's text does past its number. */
    on({ part: 'line', selector: '[part~="line-grouped"]:not(:has(> [part="number"]))' }, [
      web([
        rule({
          paddingInlineStart: first(
            own.logLineInset,
            sum(hook.paddingInline, numbers, token('space-md')),
          ),
        }),
      ]),
    ]),
    /* A phone's line says the same with a flag, where the web reads what it holds. */
    on('line', [
      native([
        rule(
          { part: { 'data-unnumbered': true } },
          {
            paddingInlineStart: first(
              own.logLineInset,
              sum(hook.paddingInline, numbers, token('space-md')),
            ),
          },
        ),
      ]),
    ]),
    /* **Heard and not drawn**: a line's level in words, which its color already
       shows, and a folded line's count in words, which the number shows. The
       standard clip, so both stay in the accessibility tree. */
    on(
      ['level', 'count-label'],
      [
        rule({
          blockSize: '1px',
          inlineSize: '1px',
          overflow: 'hidden',
          position: 'absolute',
          web: { clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
        }),
      ],
    ),
    /* **A folded line's count** after its text, in a pill a step quieter than the
       text, as a browser's console draws one. */
    on('count', [
      rule({
        alignSelf: 'center',
        backgroundColor: mix(token('color-foreground'), 10, 'transparent'),
        borderRadius: token('radii-full'),
        color: token('color-foreground-muted'),
        flex: 'none',
        fontSize: token('text-xs'),
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.4,
        paddingInline: token('space-xs'),
      }),
      native([rule({ part: { hidden: true } }, { display: 'none' })]),
    ]),
    /* A number that is a button wears nothing of a button's own. The reset has no
       weight, so the number's rule below still sets everything it names. */
    on({ part: 'number', selector: ':where(button[part="number"])' }, [
      web([rule({ all: 'unset', boxSizing: 'border-box' })]),
    ]),
    on('number', [
      rule({
        color: token('color-foreground-muted'),
        flex: 'none',
        fontVariantNumeric: 'tabular-nums',
        minInlineSize: numbers,
        textAlign: 'end',
        textDecoration: 'none',
        web: { userSelect: 'none' },
      }),
    ]),
    on({ part: 'number', selector: 'a[part="number"]:hover, button[part="number"]:hover' }, [
      web([rule({ color: token('color-foreground'), cursor: 'pointer' })]),
    ]),
    on({ part: 'number', selector: 'a[part="number"]:hover' }, [
      web([rule({ textDecoration: 'underline' })]),
    ]),
    on(
      {
        part: 'number',
        selector: 'a[part="number"]:focus-visible, button[part="number"]:focus-visible',
      },
      [
        web([
          rule({
            borderRadius: token('radii-sm'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          }),
        ]),
      ],
    ),
    on('number', [
      native([
        rule(
          { focusVisible: true },
          {
            borderRadius: token('radii-sm'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
    ]),
    on('time', [
      rule({
        color: token('color-foreground-muted'),
        flex: 'none',
        fontVariantNumeric: 'tabular-nums',
        web: { userSelect: 'none' },
      }),
      native([rule({ part: { hidden: true } }, { display: 'none' })]),
    ]),
    /* In a plain log a line that wraps hangs its rest two characters in, so on a
       narrow surface each line still reads as one where the next begins. */
    on('text', [
      rule({
        flex: '1 1 auto',
        minInlineSize: 0,
        paddingInlineStart: first(own.logWrapIndent, 0),
        textIndent: product(first(own.logWrapIndent, 0), '-1'),
        web: {
          overflowWrap: 'anywhere',
          whiteSpace: first(own.logWhiteSpace, 'pre'),
        },
      }),
      native([rule({ part: { 'data-unwrapped': true } }, { whiteSpace: 'nowrap' })]),
    ]),
    on('line', [
      rule({ also: { 'line-debug': true } }, { color: token('color-foreground-muted') }),
      rule(
        { also: { 'line-warn': true } },
        {
          backgroundColor: mix(hook.warnColor, 10, 'transparent'),
          color: mix(hook.warnColor, 78, token('color-foreground')),
        },
      ),
      rule(
        { also: { 'line-error': true } },
        {
          backgroundColor: mix(hook.errorColor, 10, 'transparent'),
          color: mix(hook.errorColor, 78, token('color-foreground')),
        },
      ),
      /* A marked line keeps the color of its level and takes the band Code Block
         draws behind the lines it marks. */
      rule({ also: { 'line-marked': true } }, { backgroundColor: hook.markBackgroundColor }),
      rule({ also: { 'line-selected': true } }, { backgroundColor: hook.selectedBackgroundColor }),
    ]),
    on({ part: 'number', selector: '[part~="line-selected"] > [part="number"]' }, [
      web([rule({ color: token('color-foreground') })]),
    ]),
    on('number', [
      native([rule({ part: { 'data-selected': true } }, { color: token('color-foreground') })]),
    ]),
    on('run', [
      rule({
        backgroundColor: measured('log-run-background-color', 'transparent'),
        color: measured('log-run-color', 'inherit'),
      }),
      rule({ also: { 'run-bold': true } }, { fontWeight: token('weight-semibold') }),
      rule({ also: { 'run-dim': true } }, { opacity: 0.7 }),
      rule({ also: { 'run-italic': true } }, { fontStyle: 'italic' }),
      rule({ also: { 'run-underline': true } }, { textDecorationLine: 'underline' }),
      rule({ also: { 'run-strike': true } }, { textDecorationLine: 'line-through' }),
      rule(
        { also: { 'run-strike': true, 'run-underline': true } },
        { textDecorationLine: 'underline line-through' },
      ),
      native([
        rule({ part: { 'data-color': 'black' } }, { color: hook.ansiBlack }),
        rule({ part: { 'data-color': 'red' } }, { color: hook.ansiRed }),
        rule({ part: { 'data-color': 'green' } }, { color: hook.ansiGreen }),
        rule({ part: { 'data-color': 'yellow' } }, { color: hook.ansiYellow }),
        rule({ part: { 'data-color': 'blue' } }, { color: hook.ansiBlue }),
        rule({ part: { 'data-color': 'magenta' } }, { color: hook.ansiMagenta }),
        rule({ part: { 'data-color': 'cyan' } }, { color: hook.ansiCyan }),
        rule({ part: { 'data-color': 'white' } }, { color: hook.ansiWhite }),
        rule({ part: { 'data-color': 'bright-black' } }, { color: hook.ansiBrightBlack }),
        rule({ part: { 'data-color': 'bright-red' } }, { color: hook.ansiBrightRed }),
        rule({ part: { 'data-color': 'bright-green' } }, { color: hook.ansiBrightGreen }),
        rule({ part: { 'data-color': 'bright-yellow' } }, { color: hook.ansiBrightYellow }),
        rule({ part: { 'data-color': 'bright-blue' } }, { color: hook.ansiBrightBlue }),
        rule({ part: { 'data-color': 'bright-magenta' } }, { color: hook.ansiBrightMagenta }),
        rule({ part: { 'data-color': 'bright-cyan' } }, { color: hook.ansiBrightCyan }),
        rule({ part: { 'data-color': 'bright-white' } }, { color: hook.ansiBrightWhite }),
        rule({ part: { 'data-color': 'foreground' } }, { color: hook.ansiForeground }),
        rule({ part: { 'data-color': 'background' } }, { color: hook.ansiBackground }),
        rule({ part: { 'data-background': 'black' } }, { backgroundColor: hook.ansiBlack }),
        rule({ part: { 'data-background': 'red' } }, { backgroundColor: hook.ansiRed }),
        rule({ part: { 'data-background': 'green' } }, { backgroundColor: hook.ansiGreen }),
        rule({ part: { 'data-background': 'yellow' } }, { backgroundColor: hook.ansiYellow }),
        rule({ part: { 'data-background': 'blue' } }, { backgroundColor: hook.ansiBlue }),
        rule({ part: { 'data-background': 'magenta' } }, { backgroundColor: hook.ansiMagenta }),
        rule({ part: { 'data-background': 'cyan' } }, { backgroundColor: hook.ansiCyan }),
        rule({ part: { 'data-background': 'white' } }, { backgroundColor: hook.ansiWhite }),
        rule(
          { part: { 'data-background': 'foreground' } },
          { backgroundColor: hook.ansiForeground },
        ),
        rule(
          { part: { 'data-background': 'background' } },
          { backgroundColor: hook.ansiBackground },
        ),
        rule({ part: { 'data-match': true } }, { backgroundColor: hook.matchBackgroundColor }),
      ]),
    ]),
    on('match', [
      rule({
        backgroundColor: hook.matchBackgroundColor,
        borderRadius: token('radii-sm'),
        color: 'inherit',
      }),
    ]),
  ],
)
