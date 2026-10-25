import {
  difference,
  fn,
  list,
  measured,
  mix,
  product,
  quotient,
  sum,
  token,
} from '../../../style.js'
import { styles } from '../../../table.js'
import outline from './headless.js'

/**
 * Outline's styled tier, which writes
 * `helix/styled/src/outline/root/outline-root.generated.css`.
 *
 * **A rule runs down the leading edge**, a background on the navigation in
 * the rail's middle, and the mark that moves to the marked link runs along
 * it.
 *
 * **The web styles the anchors passed in**, by their own attributes,
 * `aria-current` and `data-level`, with selectors written out. **A phone
 * styles the links it draws** with the same values: each is `link-current`
 * while its section is marked, and `link-depth-2` to `link-depth-6` at its
 * depth. The mark travels on a phone as well, placed from the marked link's
 * box.
 */
export default styles(
  outline,
  {
    prefix: 'outline',
    hooks: [
      'heading-color',
      'indent',
      'indicator-color',
      'link-color',
      'link-current-color',
      'link-current-weight',
      'link-font-size',
      'link-hover-background-color',
      'link-hover-color',
      'link-padding-block',
      'link-padding-inline',
      'link-radius',
      'rail',
      'rule-color',
    ],
    own: ['mark-width'],
    stylesheet: 'outline/root/outline-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const rail = hook.rail(token('space-2xs'))
    const ruleColor = hook.ruleColor(token('color-border'))
    const padding = hook.linkPaddingInline(token('space-sm'))
    const indent = hook.indent(token('space-sm'))
    const spring = [token('duration-normal'), token('easing-spring')]
    const link = {
      borderRadius: hook.linkRadius(token('radii-sm')),
      color: hook.linkColor(token('color-foreground-muted')),
      fontSize: hook.linkFontSize(token('text-xs')),
      fontWeight: token('weight-medium'),
      lineHeight: token('leading-normal'),
      paddingBlock: hook.linkPaddingBlock(token('space-2xs')),
      paddingInline: padding,
      textDecoration: 'none',
      transition: list(
        ['background-color', token('duration-fast'), token('easing-standard')],
        ['color', token('duration-fast'), token('easing-standard')],
      ),
    }
    const current = {
      color: hook.linkCurrentColor(token('color-foreground')),
      fontWeight: hook.linkCurrentWeight(token('weight-semibold')),
    }
    const level2 = { paddingInlineStart: sum(padding, indent) }
    const level3 = { paddingInlineStart: sum(padding, product(2, indent)) }
    const level4 = { paddingInlineStart: sum(padding, product(3, indent)) }
    const level5 = { paddingInlineStart: sum(padding, product(4, indent)) }
    const level6 = { paddingInlineStart: sum(padding, product(5, indent)) }
    return [
      on('host', [
        rule({ '--outline-rail': token('space-2xs'), display: 'block' }),
        /* Print: a table of contents, which is what paper invented. */
        rule({ print: true }, { printColorAdjust: 'economy' }),
      ]),
      /* The rule is a background rather than a border, so the mark drawn over
         it covers no box edge. */
      on('nav', [
        rule({
          backgroundImage: fn('linear-gradient', ruleColor, ruleColor),
          backgroundPosition: [quotient(difference(hook.rail(), token('border-thin')), 2), 0],
          backgroundRepeat: 'repeat-y',
          backgroundSize: [token('border-thin'), '100%'],
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }),
      ]),
      /* The mark that travels: it springs, and the height trails it. */
      on('indicator', [
        rule({
          own: { markWidth: token('border-thin') },
          backgroundColor: hook.indicatorColor(token('color-primary')),
          blockSize: measured('indicator-block-size', 0),
          borderRadius: token('radii-full'),
          inlineSize: own.markWidth,
          insetBlockStart: 0,
          insetInlineStart: quotient(difference(hook.rail(), own.markWidth), 2),
          opacity: 0,
          position: 'absolute',
          translate: [0, measured('indicator-y', 0)],
          transition: list(
            ['translate', ...spring],
            ['block-size', token('duration-slow'), token('easing-decelerate')],
            ['inline-size', token('duration-normal'), token('easing-standard')],
            ['inset-inline-start', token('duration-normal'), token('easing-standard')],
            ['opacity', token('duration-fast'), token('easing-standard')],
          ),
        }),
        rule({ part: { 'data-placed': true } }, { opacity: 1 }),
        rule(
          { part: { 'data-moving': false }, within: { host: { hover: true } } },
          { own: { markWidth: token('border-thick') } },
        ),
        /* Widest while it is on its way, and quick about getting there. Only
           once settled: before then transitions are off, so a move has no
           `transitionend` and `data-moving` stays for the controller's
           one-second guard, a swell with no travel. A page whose stylesheet
           arrived after the first placement drew the wide mark at rest. */
        rule(
          { part: { 'data-moving': true }, state: 'settled' },
          {
            own: { markWidth: hook.rail() },
            transition: list(
              ['translate', ...spring],
              ['block-size', token('duration-slow'), token('easing-decelerate')],
              ['inline-size', token('duration-fast'), token('easing-decelerate')],
              ['inset-inline-start', token('duration-fast'), token('easing-decelerate')],
              ['opacity', token('duration-fast'), token('easing-standard')],
            ),
          },
        ),
      ]),
      /* The links passed in on the web. */
      on({ part: 'nav', selector: '::slotted(a)' }, [
        rule({ platform: 'web' }, { ...link, marginInlineStart: hook.rail(token('border-thick')) }),
      ]),
      on({ part: 'nav', selector: '::slotted(a):hover' }, [
        rule(
          { platform: 'web' },
          {
            backgroundColor: hook.linkHoverBackgroundColor(
              mix(token('color-foreground'), 5, 'transparent'),
            ),
            color: hook.linkHoverColor(token('color-foreground')),
            textDecoration: 'none',
          },
        ),
      ]),
      on({ part: 'nav', selector: '::slotted(a[aria-current])' }, [
        rule({ platform: 'web' }, current),
      ]),
      on({ part: 'nav', selector: '::slotted(a[data-level="2"])' }, [
        rule({ platform: 'web' }, level2),
      ]),
      on({ part: 'nav', selector: '::slotted(a[data-level="3"])' }, [
        rule({ platform: 'web' }, level3),
      ]),
      on({ part: 'nav', selector: '::slotted(a[data-level="4"])' }, [
        rule({ platform: 'web' }, level4),
      ]),
      on({ part: 'nav', selector: '::slotted(a[data-level="5"])' }, [
        rule({ platform: 'web' }, level5),
      ]),
      on({ part: 'nav', selector: '::slotted(a[data-level="6"])' }, [
        rule({ platform: 'web' }, level6),
      ]),
      /* The links a phone draws, with the same values. */
      on('link', [
        rule({ platform: 'native' }, { ...link, marginInlineStart: rail, position: 'relative' }),
        rule({ also: { 'link-current': true }, platform: 'native' }, current),
        rule({ also: { 'link-depth-2': true }, platform: 'native' }, level2),
        rule({ also: { 'link-depth-3': true }, platform: 'native' }, level3),
        rule({ also: { 'link-depth-4': true }, platform: 'native' }, level4),
        rule({ also: { 'link-depth-5': true }, platform: 'native' }, level5),
        rule({ also: { 'link-depth-6': true }, platform: 'native' }, level6),
      ]),
      /* The heading above the links, set like them and a step heavier, its
         text lined up with theirs past the rail. */
      on({ region: 'heading', slotted: '*' }, [
        rule({
          color: hook.headingColor(token('color-foreground')),
          fontSize: token('text-xs'),
          fontWeight: token('weight-semibold'),
          lineHeight: token('leading-normal'),
          marginBlock: [0, token('space-xs')],
          marginInline: 0,
          paddingInlineStart: sum(hook.rail(), padding),
        }),
      ]),
    ]
  },
)
