import { native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import sandbox from './headless.js'

/**
 * Sandbox's styled tier.
 *
 * **Three rows: a bar, the body, a bar**, each region placed rather than left
 * to auto-placement. A phone stacks the same pieces in a column.
 *
 * **The dividers are said once for both splitters** and inherited across
 * their shadow boundaries, which is what the hooks are for. The nested
 * splitter fills the pane it is slotted into and has to be told, since a
 * splitter sized to its contents took an iframe's 150px intrinsic height, and
 * so did its divider. The panel's divider with no panel under it draws
 * nothing and takes nothing.
 *
 * **The file tabs sit over the source**, the shown file under them: muted
 * words with a line under the chosen tab in the primary ink, and a dot after
 * a file whose pane holds an edit. A file not shown is hidden, which the
 * attribute alone does not win against a pane's own `display`.
 *
 * **The preview carries its own ground**, since it can be set to a color mode
 * other than the page's, and anything else passed in as the preview takes the
 * inset its frame gives a document. On paper the whole of it is chrome, and
 * none of it prints.
 */
export default styles(
  sandbox,
  {
    prefix: 'sandbox',
    hooks: {
      grab: token('space-2xs'),
      minBlockSize: '20rem',
      separatorColor: token('color-border'),
    },
    stylesheet: 'sandbox/root/sandbox-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const ground = {
      backgroundColor: token('color-background'),
      color: token('color-foreground'),
    }
    return [
      on('host', [
        rule({
          backgroundColor: token('color-background'),
          web: { display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto' },
          minBlockSize: hook.minBlockSize,
          overflow: 'hidden',
        }),
        native([rule({ display: 'flex', flexDirection: 'column' })]),
        rule({ print: true }, { display: 'none' }),
      ]),
      on({ region: 'toolbar', slotted: '*' }, [web([rule({ gridRow: 1 })])]),
      on('body', [rule({ gridRow: 2 })]),
      on({ region: 'status', slotted: '*' }, [web([rule({ gridRow: 3 })])]),
      on(
        ['body', 'panes'],
        [
          rule({
            '--splitter-color': hook.separatorColor,
            '--splitter-target': product(hook.grab, '2'),
            minBlockSize: 0,
            minInlineSize: 0,
          }),
        ],
      ),
      on('panes', [rule({ blockSize: '100%' })]),
      on(
        {
          part: 'body',
          selector:
            '[part="body"]:not([data-panel])::part(corner), [part="body"]:not([data-panel])::part(separator)',
        },
        [web([rule({ display: 'none' })])],
      ),
      on('pane', [
        web([rule({ blockSize: '100%' })]),
        rule({ minBlockSize: 0, minInlineSize: 0, overflow: 'hidden' }),
        web([
          rule(
            { part: { 'data-files': true } },
            { display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' },
          ),
        ]),
        native([rule({ part: { 'data-preview': true } }, ground)]),
        /* A phone's panes stack as the web's do in a narrow window, the line
           between them where the web's divider stands. */
        native([
          rule(
            { part: { 'data-lead': true } },
            { borderBlockEnd: [token('border-thin'), 'solid', hook.separatorColor] },
          ),
        ]),
      ]),
      on('files', [
        rule({
          borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
          display: 'flex',
          flexDirection: 'row',
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          overflowX: 'auto',
        }),
      ]),
      on('file', [
        rule({
          backgroundColor: 'transparent',
          border: 'none',
          borderBlockEnd: [token('border-thick'), 'solid', 'transparent'],
          color: token('color-foreground-muted'),
          web: { cursor: 'pointer', font: 'inherit' },
          padding: [token('space-xs'), token('space-sm')],
          whiteSpace: 'nowrap',
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        native([
          rule(
            { part: { 'data-selected': true } },
            { borderBlockEndColor: token('color-primary'), color: token('color-foreground') },
          ),
        ]),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      on({ part: 'file', selector: '[part~="file"][aria-selected="true"]' }, [
        web([
          rule({ borderBlockEndColor: token('color-primary'), color: token('color-foreground') }),
        ]),
      ]),
      on({ part: 'file', selector: '[part~="file-modified"]::after' }, [
        web([
          rule({
            backgroundColor: 'currentcolor',
            blockSize: token('space-xs'),
            borderRadius: token('radii-full'),
            content: '""',
            display: 'inline-block',
            inlineSize: token('space-xs'),
            marginInlineStart: token('space-xs'),
            verticalAlign: 'middle',
          }),
        ]),
      ]),
      on({ part: 'pane', selector: '[data-files] > [role="tabpanel"]' }, [
        web([rule({ minBlockSize: 0 })]),
      ]),
      on({ slotted: '[hidden]' }, [web([rule({ display: 'none' })])]),
      on('panel', [
        web([rule({ blockSize: '100%' })]),
        rule({ minBlockSize: 0, overflow: 'hidden' }),
        native([
          rule(
            { filled: 'panel' },
            { borderBlockStart: [token('border-thin'), 'solid', hook.separatorColor] },
          ),
        ]),
      ]),
      on({ region: 'panel', slotted: '*' }, [web([rule({ blockSize: '100%', minBlockSize: 0 })])]),
      on({ slotted: 'helix-sandbox-preview' }, [
        web([rule({ ...ground, blockSize: '100%', display: 'block' })]),
      ]),
      on({ region: 'preview', slotted: ':not(helix-sandbox-preview)' }, [
        web([
          rule({
            ...ground,
            blockSize: '100%',
            boxSizing: 'border-box',
            display: 'block',
            padding: token('space-md'),
          }),
        ]),
      ]),
      /* A phone's preview is what the region holds, with the inset a frame
         gives a document. */
      on({ region: 'preview' }, [native([rule({ padding: token('space-md') })])]),
    ]
  },
)
