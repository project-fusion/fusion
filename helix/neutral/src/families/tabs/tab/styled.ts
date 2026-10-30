import { difference, first, list, mix, product, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import tab from './headless.js'

/**
 * A tab's styled tier.
 *
 * **Every private value a tab reads comes from the tab set**, which sets them
 * all for its default and overrides what a variant changes. The fallbacks are
 * what a tab would look like with no set around it. That arrangement does not
 * ship, so they are the plainest values that draw a tab.
 */
export default styles(
  tab,
  {
    prefix: 'tabs-tab',
    hooks: ({ own }) => ({
      blockSize: token('size-control'),
      color: token('color-foreground-muted'),
      disabledOpacity: 0.5,
      dismissColor: 'currentColor',
      fontSize: token('text-control'),
      fontWeight: token('weight-medium'),
      hoverBackgroundColor: mix(token('color-foreground'), 5, 'transparent'),
      hoverColor: token('color-foreground'),
      maxInlineSize: 'none',
      paddingInline: token('space-sm'),
      radius: first(own.tabRadius, token('radii-none')),
      selectedBackgroundColor: first(own.tabSelectedSurface, 'transparent'),
      selectedColor: token('color-foreground'),
    }),
    own: {
      tabHeight: null,
      tabInlineSize: 'auto',
      tabJustify: 'center',
      tabRadius: null,
      tabSelectedShadow: 'none',
      tabSelectedSurface: null,
      tabsDismissRest: null,
    },
    stylesheet: 'tabs/tab/tab.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [rule({ display: 'inline-flex', maxInlineSize: hook.maxInlineSize })]),
    on('tab', [
      /* A label longer than the tab may be ends in an ellipsis, as a tag's does.
         Only once a page caps a tab: unset, a tab is its label's width, so a strip
         with more than fits scrolls rather than squeezing every name. */
      rule({ maxInlineSize: '100%', minInlineSize: 0 }),
      rule({
        alignItems: 'center',
        backgroundColor: 'transparent',
        /* The height a control is. Left to its own text plus whatever padding the
           variant asks for, a tab comes out at 31px beside a 40px button and a
           toolbar looks assembled from parts.

           Through a private value, because a variant that puts a frame around the
           row has to hand the tab a share of the frame, which the whole control
           height would overflow. `segmented` does exactly that. */
        blockSize: first(own.tabHeight, hook.blockSize),
        border: 'none',
        /* Transparent always. The mark that says which tab is current is one
           element in the strip, which travels from tab to tab. The width is kept
           so the box is the same either way. */
        borderBlockEnd: [token('border-thick'), 'solid', 'transparent'],
        borderRadius: hook.radius,
        color: hook.color,
        web: { cursor: 'pointer', font: 'inherit' },
        /* The control text, so a tab in a `data-density` region follows it as the
           controls beside it do; it is `text-sm` at rest. */
        fontSize: hook.fontSize,
        fontWeight: hook.fontWeight,
        display: 'inline-flex',
        /* A tab set in a column makes each tab as wide as the column, its words at
           the start. */
        inlineSize: own.tabInlineSize,
        justifyContent: own.tabJustify,
        /* The transparent edge at the bottom is matched at the top, so what the tab
           centers is centered on the whole tab. A button's own padding goes with it:
           1px at each end in Chromium, and 2px over 3px in WebKit, which put the
           label half a pixel higher there. */
        paddingBlock: [token('border-thick'), 0],
        paddingInline: hook.paddingInline,
        /* A tab with an `href` is an anchor, and reads as a tab all the same. */
        textDecoration: 'none',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['border-color', token('duration-normal'), token('easing-emphasized')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
        whiteSpace: 'nowrap',
      }),
      /* A wash under the pointer, as well as a darker label.

         Darkening the label alone is the quietest answer a control can give, and
         it is invisible on a tab already at full foreground: the selected tab, and
         every tab in the sandbox's own chrome, would answer the pointer with
         nothing at all. The same five percent wash the nav bar uses, so a row of
         tabs and a row of navigation behave alike. */
      rule(
        { hover: true, disabled: false },
        { backgroundColor: hook.hoverBackgroundColor, color: hook.hoverColor },
      ),
      rule(
        { selected: true },
        {
          backgroundColor: hook.selectedBackgroundColor,
          boxShadow: own.tabSelectedShadow,
          color: hook.selectedColor,
        },
      ),
      rule({ disabled: true }, { web: { cursor: 'not-allowed' }, opacity: hook.disabledOpacity }),
      /* Inset, because the tab sits against the list's own rule and an outset ring
         would be clipped by the scroll container. */
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
    ]),
    on('label', [
      rule({
        display: 'block',
        minInlineSize: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }),
      /* **The label is centered on its capitals.** Trimmed to its cap height and
         given back half the leading at each end, the label box is one line tall as
         before, with the capitals in its middle. Centering the line box put them
         where the face's ascent and descent did: 0.25px high at 12px in Chromium. */
      web([
        rule(
          { supports: '(text-box: trim-both cap alphabetic)' },
          {
            paddingBlock: quotient(difference('1lh', '1cap'), 2),
            textBox: 'trim-both cap alphabetic',
          },
        ),
      ]),
    ]),
    on('dismiss', [
      /* The close mark of a dismissible tab, after its label, sized to the text. */
      rule({
        alignItems: 'center',
        borderRadius: token('radii-sm'),
        color: hook.dismissColor,
        display: 'inline-flex',
        marginInline: [token('space-2xs'), product(token('space-2xs'), '-1')],
        /* Out of sight at rest only where the set asks, with `dismiss-marks`, and
           still holding its room, so the label does not move as it comes and goes. */
        opacity: own.tabsDismissRest(1),
        padding: token('space-none'),
        transition: ['opacity', token('duration-fast'), token('easing-standard')],
      }),
      /* The mark shows on the current tab, under the pointer, and while the tab
         holds focus. A phone has no pointer, and draws it on the current tab. */
      rule({ selected: true }, { opacity: 1 }),
      rule({ hover: true }, { backgroundColor: mix(token('color-foreground'), 10, 'transparent') }),
      web([rule({ within: { host: ['hover', 'focusWithin'] } }, { opacity: 1 })]),
    ]),
    on('dismiss-mark', [rule({ blockSize: '1em', inlineSize: '1em' })]),
    on({ region: 'dismiss-icon', slotted: '*' }, [
      rule({ '--icon-size': '1em', blockSize: '1em', inlineSize: '1em' }),
    ]),
  ],
)
