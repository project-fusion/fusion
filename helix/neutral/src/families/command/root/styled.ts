import visuallyHidden from '../../../fragments/visually-hidden.js'
import { oneOf } from '../../../render.js'
import { difference, fn, hookOf, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Command's styled tier.
 *
 * **The palette is the dialog's own box**, a fifth of the window down, as wide as
 * `size` and never wider than the window less a margin, with no padding: the list
 * fills it. **The filter field is the top of the panel**, edge to edge, with one
 * rule under it, and **the list has no fill or edge of its own**. Rows get more room
 * than a listbox gives them, moved by the density around. **`inline` draws the
 * palette as its own surface** in the page, with no shadow. Print leaves it out.
 */
export default styles(
  root,
  {
    prefix: 'command',
    hooks: {
      listSize: '22rem',
      radius: token('radii-sm'),
      size: '40rem',
    },
    props: { material: oneOf(['frosted', 'glass']) },
    own: { commandRow: null },
    stylesheet: 'command/root/command-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const padding = hookOf('option', 'padding')
    const edge = [token('border-thin'), 'solid', token('color-border')] as const
    return [
      on('live', [rule([visuallyHidden])]),
      /* A fifth of the window down, and not less: at 12vh the panel hung off the
         browser's chrome on a laptop. */
      on('dialog-surface', [
        rule({
          alignSelf: 'start',
          inlineSize: fn('min', hook.size, difference('100vw', product(token('space-xl'), 2))),
          marginBlockStart: '20vh',
          padding: token('space-none'),
        }),
        /* The web's `align-self` on a box in the top layer moves it down the window,
           where a phone's moves it across, so a phone places it from the top itself
           and keeps it in the middle across. */
        native([
          rule({
            alignSelf: 'center',
            insetBlockStart: '20vh',
            marginBlockStart: token('space-none'),
            position: 'absolute',
          }),
        ]),
      ]),
      /* One text column down the whole panel, and the dialog's corners unless a page
         sets the palette's. */
      on('host', [
        rule({
          '--option-padding': token('space-sm'),
          '--dialog-radius': hook.radius,
          own: { commandRow: token('space-sm') },
          '--option-block-padding': own.commandRow,
        }),
      ]),
      /* Rows move with the density around, which the web reads from the nearest
         `data-density`. */
      on(
        {
          part: 'host',
          selector: ':host([data-density="sm"]), :host(:where([data-density="sm"] *))',
        },
        [web([rule({ own: { commandRow: token('space-2xs') } })])],
      ),
      on(
        {
          part: 'host',
          selector: ':host([data-density="lg"]), :host(:where([data-density="lg"] *))',
        },
        [web([rule({ own: { commandRow: token('space-md') } })])],
      ),
      /* The list fills the panel, which is already the surface. */
      on('listbox', [
        rule({
          '--listbox-background-color': 'transparent',
          border: web('none'),
          display: web('block'),
        }),
      ]),
      /* Tall enough to be worth scanning and short enough to stay a panel, with more
         air at its ends than a listbox gives itself. */
      on('listbox-items', [
        rule({
          backgroundColor: 'transparent',
          border: 'none',
          maxBlockSize: hook.listSize,
          paddingBlock: token('space-xs'),
        }),
      ]),
      /* The search is the first thing in the panel, edge to edge. */
      on('listbox-search', [rule({ borderBlockEnd: edge, padding })]),
      on('listbox-search-field', [
        rule({ fontSize: fn('max', token('text-field-min'), token('text-md')) }),
      ]),
      /* The keys a reader can press, under the list, in the same column. */
      on('footer', [
        rule({
          alignItems: 'center',
          borderBlockStart: edge,
          color: token('color-foreground-muted'),
          display: 'flex',
          fontSize: token('text-xs'),
          gap: token('space-sm'),
          paddingBlock: token('space-xs'),
          paddingInline: padding,
        }),
        /* In the dialog it is the dialog's footer, whose slot sets its content at the
           end on the web: a phone draws no slot, so the row says it itself. */
        native([
          rule({ justifyContent: 'flex-end' }),
          rule({ has: 'inline' }, { justifyContent: 'flex-start' }),
        ]),
      ]),
      on({ part: 'footer', selector: '[part="footer"][hidden]' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* In the page, the palette is its own surface, and not floating. */
      on('host', [
        rule(
          { has: 'inline' },
          {
            backgroundColor: token('color-surface'),
            border: edge,
            borderRadius: token('radii-sm'),
            display: web('block'),
            inlineSize: fn('min', hook.size, '100%'),
            overflow: 'hidden',
          },
        ),
        rule({ print: true }, { display: 'none' }),
      ]),
    ]
  },
)
