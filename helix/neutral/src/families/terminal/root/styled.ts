import { oneOf } from '../../../render.js'
import { fn, measured, mix, native, product, scheme, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import terminal from './headless.js'

/**
 * Terminal's styled tier: a bordered box on the page's ground, a header strip
 * for the name and the controls, and a status line once the process exits. It
 * is 24rem tall unless `fill` is set or `--terminal-block-size` says otherwise.
 *
 * **The theme the screen is drawn in, set on the host.** The hues are Log's, so
 * a program's output reads the same in a log and a terminal side by side: red
 * is danger, green success, yellow warning, blue info, magenta the color for a
 * call, and cyan blue mixed with green. A bright hue is its hue mixed a
 * quarter of the way to the ink. The four grays keep their order from dark to
 * light in each mode, since a terminal paints them as grounds too.
 *
 * **Four rows, each named**, because a hidden grid item leaves the grid. A
 * phone stands the same four in a column, the screen taking what is left.
 *
 * **The header and the status line are dense by nature, and say so once**, as
 * Toolbar does: a control a page puts in the header takes the size the
 * built-in ones have. The find bar sits under the header on its fill, its
 * field on the screen's ground.
 *
 * **A phone's screen is lines of runs**, each run in its ANSI color by name or
 * any other through `--terminal-run-color`, the cursor a block in the cursor
 * color, and each match of a search on the match ground, the current one on
 * its own. The field that takes the reader's keys stands under the screen,
 * unseen. The bell is one beat of the ink over the screen.
 *
 * On paper the screen prints as drawn, and the controls, the find bar, and
 * Restart do not.
 */
export default styles(
  terminal,
  {
    prefix: 'terminal',
    hooks: {
      activeMatchBackgroundColor: token('color-warning'),
      activeMatchBorderColor: token('color-warning'),
      ansiBlack: token('color-foreground'),
      ansiBlue: token('color-info'),
      ansiBrightBlack: token('color-foreground'),
      ansiBrightBlue: token('color-info'),
      ansiBrightCyan: token('color-info'),
      ansiBrightGreen: token('color-success'),
      ansiBrightMagenta: token('color-syntax-callable'),
      ansiBrightRed: token('color-danger'),
      ansiBrightWhite: token('color-foreground-subtle'),
      ansiBrightYellow: token('color-warning'),
      ansiCyan: token('color-info'),
      ansiGreen: token('color-success'),
      ansiMagenta: token('color-syntax-callable'),
      ansiRed: token('color-danger'),
      ansiWhite: token('color-foreground-subtle'),
      ansiYellow: token('color-warning'),
      backgroundColor: token('color-background'),
      color: token('color-foreground'),
      cursorColor: token('color-primary'),
      matchBackgroundColor: token('color-warning'),
      blockSize: '24rem',
      borderColor: token('color-border'),
      fontFamily: token('font-mono'),
      fontSize: token('text-sm'),
      headerBackgroundColor: token('color-surface-raised'),
      padding: [token('space-xs'), token('space-sm')],
      radius: token('radii-md'),
    },
    props: {
      fill: false,
      separation: oneOf(['plain']),
    },
    stylesheet: 'terminal/root/terminal-root.generated.css',
  },
  ({ hook, on, rule }) => {
    /* A line in the frame's own edge, or the edge a page sets. */
    const edge = [token('border-thin'), 'solid', hook.borderColor]
    const dense = {
      '--helix-size-checkbox': token('size-checkbox-sm'),
      '--helix-size-checkbox-loose': fn('round', product(token('size-checkbox'), 1.2), '1px'),
      '--helix-size-checkbox-tight': fn('round', product(token('size-checkbox'), 0.8), '1px'),
      '--helix-size-icon': token('size-icon-sm'),
      '--helix-size-icon-loose': fn('round', product(token('size-icon'), 1.2), '2px'),
      '--helix-size-icon-tight': fn('round', product(token('size-icon'), 0.8), '2px'),
      '--helix-size-control': token('size-control-sm'),
      '--helix-size-control-loose': fn('round', product(token('size-control'), 1.2), '1px'),
      '--helix-size-control-tight': fn('round', product(token('size-control'), 0.8), '1px'),
      '--helix-size-switch': token('size-switch-sm'),
      '--helix-text-control': token('text-control-sm'),
      '--helix-space-control': token('space-sm'),
      '--helix-text-field': token('text-sm'),
      '--helix-text-field-label': token('text-xs'),
      '--helix-space-field': token('space-xs'),
      '--helix-space-row-bleed': token('space-2xs'),
      '--helix-size-tag': token('size-tag-sm'),
      alignItems: 'center',
      backgroundColor: hook.headerBackgroundColor,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      gap: token('space-2xs'),
      minInlineSize: 0,
      paddingBlock: token('space-2xs'),
      paddingInline: [token('space-sm'), token('space-2xs')],
    } as const
    return [
      on('host', [
        rule({
          '--terminal-active-match-background-color': mix(
            token('color-warning'),
            45,
            hook.backgroundColor,
          ),
          '--terminal-active-match-border-color': token('color-warning'),
          '--terminal-ansi-black': scheme(token('color-foreground'), token('color-border')),
          '--terminal-ansi-blue': token('color-info'),
          '--terminal-ansi-bright-black': token('color-foreground-muted'),
          '--terminal-ansi-bright-blue': mix(hook.ansiBlue, 75, token('color-foreground')),
          '--terminal-ansi-bright-cyan': mix(hook.ansiCyan, 75, token('color-foreground')),
          '--terminal-ansi-bright-green': mix(hook.ansiGreen, 75, token('color-foreground')),
          '--terminal-ansi-bright-magenta': mix(hook.ansiMagenta, 75, token('color-foreground')),
          '--terminal-ansi-bright-red': mix(hook.ansiRed, 75, token('color-foreground')),
          '--terminal-ansi-bright-white': scheme(token('color-border'), token('color-foreground')),
          '--terminal-ansi-bright-yellow': mix(hook.ansiYellow, 75, token('color-foreground')),
          '--terminal-ansi-cyan': mix(token('color-info'), 50, token('color-success')),
          '--terminal-ansi-green': token('color-success'),
          '--terminal-ansi-magenta': token('color-syntax-callable'),
          '--terminal-ansi-red': token('color-danger'),
          '--terminal-ansi-white': scheme(
            token('color-foreground-subtle'),
            mix(token('color-foreground-muted'), 50, token('color-foreground')),
          ),
          '--terminal-ansi-yellow': token('color-warning'),
          '--terminal-background-color': token('color-background'),
          '--terminal-color': token('color-foreground'),
          '--terminal-cursor-color': token('color-primary'),
          '--terminal-match-background-color': mix(
            token('color-warning'),
            22,
            hook.backgroundColor,
          ),
          display: 'flex',
          flexDirection: 'column',
        }),
        rule({ fill: true }, { inset: 0, position: 'absolute' }),
      ]),
      on({ part: 'host', selector: ':host(:fullscreen)' }, [web([rule({ display: 'block' })])]),
      on('region', [
        rule({
          backgroundColor: hook.backgroundColor,
          blockSize: hook.blockSize,
          flex: [1, 1, 'auto'],
          minBlockSize: 0,
          boxShadow: token('shadow-surface'),
          border: [token('border-surface'), 'solid', hook.borderColor],
          borderRadius: hook.radius,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
          web: {
            display: 'grid',
            gridTemplateRows: '[header] auto [find] auto [viewport] minmax(0, 1fr) [status] auto',
          },
        }),
        native([rule({ display: 'flex', flexDirection: 'column' })]),
        rule({ fill: true }, { blockSize: '100%' }),
        web([rule({ fullscreen: true }, { blockSize: '100%' })]),
        rule({ separation: 'plain' }, { border: 'none', borderRadius: token('radii-none') }),
        web([rule({ fullscreen: true }, { border: 'none', borderRadius: token('radii-none') })]),
      ]),
      on(['header', 'status'], [rule(dense)]),
      on('header', [
        rule({
          gridRow: 'header',
          borderBlockEnd: edge,
          minBlockSize: sum(token('size-control'), product(token('space-2xs'), 2)),
        }),
      ]),
      on(['header', 'status'], [rule({ part: { hidden: true } }, { display: 'none' })]),
      on('label', [
        rule({
          color: token('color-foreground'),
          display: 'block',
          flex: [1, 1, 'auto'],
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          minInlineSize: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      /* A phone's name is words in a region with no box of its own, so its
         words grow, and push the controls to the end, as the web's name does. */
      on('label-text', [
        native([
          rule({
            color: token('color-foreground'),
            flex: [1, 0, 'auto'],
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            fontWeight: token('weight-medium'),
            maxInlineSize: '60%',
          }),
        ]),
      ]),
      on('actions', [web([rule({ display: 'contents' })])]),
      on('controls', [rule({ flex: [0, 0, 'auto'] })]),
      on('exit-actions', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flex: [0, 0, 'auto'],
          flexDirection: 'row',
          gap: token('space-2xs'),
        }),
      ]),
      on('find-toggle', [
        rule(
          { findOpen: true },
          {
            '--icon-button-background-color': token('color-selected'),
            '--icon-button-foreground-color': token('color-foreground'),
          },
        ),
      ]),
      on('fullscreen', [
        rule(
          { fullscreen: true },
          {
            '--icon-button-background-color': token('color-selected'),
            '--icon-button-foreground-color': token('color-foreground'),
          },
        ),
      ]),
      on('find', [
        rule({
          gridRow: 'find',
        }),
      ]),
      on('viewport', [
        rule({
          gridRow: 'viewport',
          color: hook.color,
          fontFamily: hook.fontFamily,
          fontSize: hook.fontSize,
          minBlockSize: 0,
          padding: hook.padding,
          position: 'relative',
          web: { overflow: 'auto' },
        }),
        native([rule({ flex: [1, 1, 0], overflow: 'hidden' })]),
      ]),
      on({ region: 'default', slotted: '*' }, [
        web([rule({ blockSize: '100%', inlineSize: '100%' })]),
      ]),
      on({ part: 'viewport', selector: '[part="viewport"]::after' }, [
        web([
          rule({
            backgroundColor: token('color-foreground'),
            content: '""',
            inset: 0,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
            transition: ['opacity', token('duration-fast'), token('easing-standard')],
          }),
          rule({ reducedMotion: true }, { transition: 'none' }),
        ]),
      ]),
      on({ part: 'viewport', selector: ':host(:state(bell)) [part="viewport"]::after' }, [
        web([rule({ opacity: 0.08, transition: 'none' })]),
      ]),
      on('status', [
        rule({
          gridRow: 'status',
          borderBlockStart: edge,
          color: token('color-foreground-muted'),
          flexWrap: 'wrap',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          gap: [token('space-xs'), token('space-sm')],
          paddingInline: token('space-sm'),
        }),
      ]),
      on({ part: 'status', selector: '[part="status"] > span' }, [
        web([rule({ flex: [1, 1, '16rem'], minInlineSize: 0 })]),
      ]),
      on('status-text', [
        native([
          rule({
            color: token('color-foreground-muted'),
            flex: [1, 1, '16rem'],
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            minInlineSize: 0,
          }),
        ]),
      ]),
      on('restart', [rule({ '--button-border-color': hook.borderColor })]),
      on(
        ['controls', 'find', 'restart', 'exit-actions'],
        [rule({ print: true }, { display: 'none' })],
      ),

      /* A phone's own parts: its find bar, its screen, its field, its bell. */
      on('search', [
        native([
          rule({
            ...dense,
            borderBlockEnd: edge,
          }),
          rule({ part: { hidden: true } }, { display: 'none' }),
        ]),
      ]),
      on('search-field', [
        native([
          rule({
            backgroundColor: hook.backgroundColor,
            border: [token('border-thin'), 'solid', hook.borderColor],
            borderRadius: token('radii-sm'),
            color: token('color-foreground'),
            flex: [1, 1, 0],
            fontFamily: token('font-sans'),
            fontSize: fn('max', token('text-field-min'), token('text-sm')),
            minBlockSize: token('size-control-sm'),
            minInlineSize: 0,
            paddingInline: token('space-xs'),
          }),
        ]),
      ]),
      on('search-count', [
        native([
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-xs'),
          }),
        ]),
      ]),
      on('line', [
        native([
          rule({
            color: hook.color,
            fontFamily: hook.fontFamily,
            fontSize: hook.fontSize,
            lineHeight: token('leading-tight'),
            whiteSpace: 'pre',
          }),
        ]),
      ]),
      on('run', [
        native([
          rule({
            backgroundColor: measured('terminal-run-background-color', 'transparent'),
            color: measured('terminal-run-color', 'inherit'),
          }),
          rule({ also: { 'run-bold': true } }, { fontWeight: token('weight-semibold') }),
          rule({ also: { 'run-dim': true } }, { opacity: token('opacity-quiet') }),
          rule({ also: { 'run-italic': true } }, { fontStyle: 'italic' }),
          rule({ also: { 'run-underline': true } }, { textDecorationLine: 'underline' }),
          rule({ also: { 'run-strike': true } }, { textDecorationLine: 'line-through' }),
          rule(
            { also: { 'run-strike': true, 'run-underline': true } },
            { textDecorationLine: 'underline line-through' },
          ),
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
          rule({ part: { 'data-color': 'foreground' } }, { color: hook.color }),
          rule({ part: { 'data-color': 'background' } }, { color: hook.backgroundColor }),
          rule({ part: { 'data-background': 'black' } }, { backgroundColor: hook.ansiBlack }),
          rule({ part: { 'data-background': 'red' } }, { backgroundColor: hook.ansiRed }),
          rule({ part: { 'data-background': 'green' } }, { backgroundColor: hook.ansiGreen }),
          rule({ part: { 'data-background': 'yellow' } }, { backgroundColor: hook.ansiYellow }),
          rule({ part: { 'data-background': 'blue' } }, { backgroundColor: hook.ansiBlue }),
          rule({ part: { 'data-background': 'magenta' } }, { backgroundColor: hook.ansiMagenta }),
          rule({ part: { 'data-background': 'cyan' } }, { backgroundColor: hook.ansiCyan }),
          rule({ part: { 'data-background': 'white' } }, { backgroundColor: hook.ansiWhite }),
          rule(
            { part: { 'data-background': 'bright-black' } },
            { backgroundColor: hook.ansiBrightBlack },
          ),
          rule(
            { part: { 'data-background': 'bright-red' } },
            { backgroundColor: hook.ansiBrightRed },
          ),
          rule(
            { part: { 'data-background': 'bright-green' } },
            { backgroundColor: hook.ansiBrightGreen },
          ),
          rule(
            { part: { 'data-background': 'bright-yellow' } },
            { backgroundColor: hook.ansiBrightYellow },
          ),
          rule(
            { part: { 'data-background': 'bright-blue' } },
            { backgroundColor: hook.ansiBrightBlue },
          ),
          rule(
            { part: { 'data-background': 'bright-magenta' } },
            { backgroundColor: hook.ansiBrightMagenta },
          ),
          rule(
            { part: { 'data-background': 'bright-cyan' } },
            { backgroundColor: hook.ansiBrightCyan },
          ),
          rule(
            { part: { 'data-background': 'bright-white' } },
            { backgroundColor: hook.ansiBrightWhite },
          ),
          rule({ part: { 'data-background': 'foreground' } }, { backgroundColor: hook.color }),
          rule(
            { part: { 'data-background': 'background' } },
            { backgroundColor: hook.backgroundColor },
          ),
          rule({ part: { 'data-match': true } }, { backgroundColor: hook.matchBackgroundColor }),
          rule(
            { part: { 'data-current': true } },
            {
              backgroundColor: hook.activeMatchBackgroundColor,
              textDecorationColor: hook.activeMatchBorderColor,
              textDecorationLine: 'underline',
            },
          ),
          rule(
            { part: { 'data-cursor': true } },
            {
              backgroundColor: hook.cursorColor,
              color: hook.backgroundColor,
            },
          ),
        ]),
      ]),
      on('input', [
        native([
          rule({
            blockSize: '1px',
            bottom: 0,
            inlineSize: '1px',
            left: 0,
            opacity: 0.01,
            position: 'absolute',
          }),
        ]),
      ]),
      on('probe', [
        native([
          rule({
            fontFamily: hook.fontFamily,
            fontSize: hook.fontSize,
            left: 0,
            lineHeight: token('leading-tight'),
            opacity: 0,
            position: 'absolute',
            top: 0,
            whiteSpace: 'pre',
          }),
        ]),
      ]),
      on('flash', [
        native([
          rule({
            backgroundColor: token('color-foreground'),
            inset: 0,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }),
          rule({ bell: true }, { opacity: 0.08 }),
        ]),
      ]),
    ]
  },
)
