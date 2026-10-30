import {
  difference,
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import outline from './headless.js'

/**
 * Outline's styled tier.
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
    hooks: {
      headingColor: token('color-foreground'),
      indent: token('space-sm'),
      indicatorColor: token('color-primary'),
      linkColor: token('color-foreground-muted'),
      linkCurrentColor: token('color-foreground'),
      linkCurrentWeight: token('weight-semibold'),
      linkFontSize: token('text-xs'),
      linkHoverBackgroundColor: mix(token('color-foreground'), 5, 'transparent'),
      linkHoverColor: token('color-foreground'),
      linkPaddingBlock: token('space-2xs'),
      linkPaddingInline: token('space-sm'),
      linkRadius: token('radii-sm'),
      rail: null,
      ruleColor: token('color-border'),
      surfaceBackdrop: fn('blur', token('material-blur-lg')),
      surfaceBackgroundColor: token('material-translucent-strong'),
      surfaceMaxInlineSize: '20rem',
      tickColor: mix(token('color-foreground-muted'), 55, 'transparent'),
      tickCurrentColor: token('color-primary'),
      tickGap: token('space-xs'),
      tickLength: token('size-icon-loose'),
    },
    own: { boost: null, length: null, markWidth: null },
    stylesheet: 'outline/root/outline-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const rail = hook.rail(token('space-2xs'))
    const ruleColor = hook.ruleColor
    const padding = hook.linkPaddingInline
    const indent = hook.indent
    const spring = [token('duration-normal'), token('easing-spring')]
    const link = {
      borderRadius: hook.linkRadius,
      color: hook.linkColor,
      fontSize: hook.linkFontSize,
      fontWeight: token('weight-medium'),
      lineHeight: token('leading-normal'),
      paddingBlock: hook.linkPaddingBlock,
      paddingInline: padding,
      textDecoration: 'none',
      transition: list(
        ['background-color', token('duration-fast'), token('easing-standard')],
        ['color', token('duration-fast'), token('easing-standard')],
      ),
    }
    const current = {
      color: hook.linkCurrentColor,
      fontWeight: hook.linkCurrentWeight,
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
          backgroundColor: hook.indicatorColor,
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
          { part: { 'data-moving': true }, settled: true },
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
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a)' }, [
        web([rule({ ...link, marginInlineStart: hook.rail(token('border-thick')) })]),
      ]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a):hover' }, [
        web([
          rule({
            backgroundColor: hook.linkHoverBackgroundColor,
            color: hook.linkHoverColor,
            textDecoration: 'none',
          }),
        ]),
      ]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[aria-current])' }, [web([rule(current)])]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[data-level="2"])' }, [web([rule(level2)])]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[data-level="3"])' }, [web([rule(level3)])]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[data-level="4"])' }, [web([rule(level4)])]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[data-level="5"])' }, [web([rule(level5)])]),
      /* Written out: a rule on a link passed in reads no attribute and no interaction of the link. */
      on({ part: 'nav', selector: '::slotted(a[data-level="6"])' }, [web([rule(level6)])]),
      /* The links a phone draws, with the same values. */
      on('link', [
        native([
          rule({ ...link, marginInlineStart: rail, position: 'relative' }),
          rule({ also: { 'link-current': true } }, current),
          rule({ also: { 'link-depth-2': true } }, level2),
          rule({ also: { 'link-depth-3': true } }, level3),
          rule({ also: { 'link-depth-4': true } }, level4),
          rule({ also: { 'link-depth-5': true } }, level5),
          rule({ also: { 'link-depth-6': true } }, level6),
        ]),
      ]),
      /* The heading above the links, set like them and a step heavier, its
         text lined up with theirs past the rail. */
      on({ region: 'heading', slotted: '*' }, [
        rule({
          color: hook.headingColor,
          fontSize: token('text-xs'),
          fontWeight: token('weight-semibold'),
          lineHeight: token('leading-normal'),
          marginBlock: [0, token('space-xs')],
          marginInline: 0,
          paddingInlineStart: sum(hook.rail(), padding),
        }),
      ]),
      /* **The rail**, the web's alone: a slim column of ticks at the edge of a
         long scroll. The host is as wide as the longest tick and the surface
         opens over it toward the leading edge, so the ticks stay where they were
         while the titles appear. */
      on('host', [
        web([
          rule(
            { variant: 'rail' },
            {
              own: { length: hook.tickLength },
              inlineSize: product(own.length, 1.5),
              position: 'relative',
            },
          ),
          /* The titles are the contents on paper, and the ticks mean nothing there. */
          rule({ print: true, variant: 'rail' }, { inlineSize: 'auto' }),
        ]),
      ]),
      on('ticks', [
        web([
          rule(
            { variant: 'rail' },
            {
              alignItems: 'flex-end',
              display: 'flex',
              flexDirection: 'column',
              gap: hook.tickGap,
            },
          ),
          /* The surface is translucent, so the ticks it covers would show through it. */
          rule({ open: true, variant: 'rail' }, { visibility: 'hidden' }),
          rule({ print: true, variant: 'rail' }, { display: 'none' }),
        ]),
      ]),
      /* Each deeper level is a shorter tick: the length over 1, 1.5, 2, 2.5... */
      on('tick', [
        web([
          rule(
            { variant: 'rail' },
            {
              own: { boost: 1 },
              backgroundColor: hook.tickColor,
              blockSize: token('border-thick'),
              borderRadius: token('radii-full'),
              inlineSize: quotient(
                product(hook.tickLength, own.boost),
                sum(1, product(difference(measured('outline-depth', 1), 1), 0.5)),
              ),
            },
          ),
          rule(
            { part: { 'data-current': true }, variant: 'rail' },
            {
              own: { boost: 1.5 },
              backgroundColor: hook.tickCurrentColor,
            },
          ),
        ]),
      ]),
      /* Over the rail, hidden until the pointer or focus is in the outline. Never
         `display: none`, which would take the links out of the tab order and make
         focus unable to open it. */
      on('surface', [
        web([
          rule(
            { variant: 'rail' },
            {
              backdropFilter: hook.surfaceBackdrop,
              backgroundColor: hook.surfaceBackgroundColor,
              border: [token('border-floating'), 'solid', token('color-border')],
              borderRadius: token('radii-sm'),
              boxShadow: token('shadow-floating'),
              boxSizing: 'border-box',
              inlineSize: 'max-content',
              insetBlockStart: 0,
              insetInlineEnd: 0,
              maxInlineSize: hook.surfaceMaxInlineSize,
              opacity: 0,
              padding: token('space-sm'),
              pointerEvents: 'none',
              position: 'absolute',
              transition: list(['opacity', token('duration-fast'), token('easing-standard')]),
              zIndex: token('layer-raised'),
            },
          ),
          rule({ open: true, variant: 'rail' }, { opacity: 1, pointerEvents: 'auto' }),
          rule({ reducedMotion: true, variant: 'rail' }, { transition: 'none' }),
          rule(
            { print: true, variant: 'rail' },
            {
              backdropFilter: 'none',
              backgroundColor: 'transparent',
              border: 0,
              boxShadow: 'none',
              opacity: 1,
              padding: 0,
              pointerEvents: 'auto',
              position: 'static',
            },
          ),
        ]),
      ]),
      /* One line each, cut with an ellipsis where the surface runs out. */
      on({ part: 'nav', selector: '::slotted(a)' }, [
        web([
          rule(
            { variant: 'rail' },
            {
              minInlineSize: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          ),
        ]),
      ]),
    ]
  },
)
