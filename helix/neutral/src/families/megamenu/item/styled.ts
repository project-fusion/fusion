import { difference, list, native, product, quotient, token } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A megamenu item's styled tier.
 *
 * **An item with an icon or a line about it draws what the
 * `data-megamenu-item` recipe gives a link of your own**: the icon before
 * the name and the line, the name strong and the line quiet, darkening
 * under the pointer. Rows touch, so the band between two names belongs to
 * one of them. **A destination with no icon keeps a dot before its name**,
 * reserved on every row so the column holds still and filled, breathing,
 * while it is the page.
 *
 * **An item that holds its name alone is a plain link of the panel**, as
 * the recipe draws a link in a group with no `data-megamenu-item`: muted,
 * at full strength under the pointer and while it is the page. Neither
 * shape washes behind the pointer, as the panel's recipes take the bar's
 * wash away.
 */
export default styles(
  item,
  { prefix: 'megamenu-item', stylesheet: 'megamenu/item/megamenu-item.generated.css' },
  ({ keyframes, on, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      /* Rows touch: the pull is the whole gap between them. */
      rule(
        [
          { child: 'later', filled: 'description' },
          { child: 'later', filled: 'icon' },
        ],
        { marginBlockStart: product(token('space-xs'), '-1') },
      ),
    ]),
    on('link', [
      rule({
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: token('radii-sm'),
        color: token('color-foreground-muted'),
        web: { cursor: 'pointer' },
        display: 'flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
        justifyContent: 'start',
        minBlockSize: token('size-control-sm'),
        padding: [token('space-xs'), token('space-sm')],
        textDecoration: 'none',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
        whiteSpace: 'normal',
      }),
      /* A destination with a name and a sentence about it. */
      rule([{ filled: 'description' }, { filled: 'icon' }], {
        alignItems: 'start',
        color: token('color-foreground'),
        columnGap: token('space-sm'),
        display: 'grid',
        gridTemplateColumns: ['auto', 'minmax(0, 1fr)'],
        padding: token('space-sm'),
        rowGap: token('space-2xs'),
        transition: list(['background-color', token('duration-fast'), token('easing-standard')]),
      }),
      /* A phone stands the icon or the dot beside the words, which hold
         the name over the line about it. */
      native([
        rule([{ filled: 'description' }, { filled: 'icon' }], {
          display: 'flex',
          flexDirection: 'row',
        }),
      ]),
      rule({ hover: true }, { color: token('color-foreground') }),
      rule(
        { current: 'page' },
        { color: token('color-foreground'), fontWeight: token('weight-semibold') },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('name', [
      rule([{ filled: 'description' }, { filled: 'icon' }], {
        fontSize: token('text-sm'),
        fontWeight: token('weight-semibold'),
        gridColumn: 2,
      }),
    ]),
    on('words', [
      native([
        rule({
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          flexShrink: 1,
          gap: token('space-2xs'),
          minInlineSize: 0,
        }),
      ]),
    ]),
    /* No color of its own. */
    on({ region: 'icon', slotted: '*' }, [
      rule({ '--icon-size': token('size-icon-lg'), gridColumn: 1, gridRow: [1, '/', 'span', 2] }),
    ]),
    /* Regular, and quiet until the pointer is on the row. */
    on({ region: 'description', slotted: '*' }, [
      rule({
        color: token('color-foreground-muted'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-regular'),
        gridColumn: 2,
        margin: token('space-none'),
      }),
      rule({ within: { link: { hover: true } } }, { color: token('color-foreground') }),
    ]),
    /* Where you are, marked rather than filled, before the name and reserved
       on every row without an icon so the column holds still. */
    on({ before: 'link' }, [
      rule(
        { filled: { description: true, icon: false } },
        {
          alignSelf: 'center',
          backgroundColor: 'transparent',
          blockSize: token('space-xs'),
          borderRadius: token('radii-full'),
          content: '""',
          gridColumn: 1,
          gridRow: 1,
          inlineSize: token('space-xs'),
        },
      ),
      /* A phone's row centers nothing on the name's line, so the dot is set
         down by half the room the line has around it. */
      native([
        rule(
          { filled: { description: true, icon: false } },
          {
            alignSelf: 'flex-start',
            marginBlockStart: quotient(
              difference(product(token('text-sm'), token('leading-normal')), token('space-xs')),
              2,
            ),
          },
        ),
      ]),
      rule(
        { current: 'page', filled: { description: true, icon: false } },
        {
          animation: ['megamenu-current-dot', '4s', token('easing-standard'), 'infinite'],
          backgroundColor: token('color-primary'),
        },
      ),
      /* Still under reduced motion. */
      rule(
        { current: 'page', filled: { description: true, icon: false }, reducedMotion: true },
        { animation: 'none' },
      ),
    ]),
    /* Interior-only, so 0% and 100% resolve to the resting dot. */
    keyframes('megamenu-current-dot', { '50%': { opacity: 0.45, scale: 0.78 } }),
  ],
)
