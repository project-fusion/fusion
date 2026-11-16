import {
  difference,
  fn,
  hookOf,
  list,
  measured,
  mix,
  native,
  product,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import navigation from './headless.js'

/**
 * A navigation's styled tier.
 *
 * **One mark moves to the current destination**, placed by measurement: the
 * root measures the current destination and sets `--indicator-x`,
 * `--indicator-y` and its size, and the rules below draw the mark there as
 * each marker wants it. Unset, a pill on the destination; `underlined`, a
 * bar on a rule under the row; `segmented`, a raised pill in a sunken track.
 *
 * **The navigation hands its items their layout through private values**:
 * down a column an item fills the column and reads from its start, and in a
 * segmented track it takes the track's height. The page's own links read
 * the same from the `data-navigation-item` recipe, which is the web's.
 */
export default styles(
  navigation,
  {
    prefix: 'navigation',
    hooks: {
      blockSize: null,
      gap: token('space-2xs'),
      indicatorColor: null,
      indicatorRadius: null,
      indicatorShadow: null,
      indicatorThickness: token('border-thick'),
      ruleColor: token('color-border'),
    },
    own: {
      navigationFade: null,
      navigationItemDisplay: null,
      navigationItemFloor: null,
      navigationItemJustify: null,
    },
    stylesheet: 'navigation/root/navigation-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => {
    const ruled = hook.ruleColor
    /* The overflow button reads a Navigation Item's hooks, so it matches the
       destinations beside it. */
    const washed = {
      backgroundColor: hookOf(
        'navigation-item',
        'hover-background-color',
        mix(token('color-foreground'), 5, 'transparent'),
      ),
      color: hookOf('navigation-item', 'hover-color', token('color-foreground')),
    }
    const tight = {
      blockSize: token('size-icon-tight'),
      flex: '0 0 auto',
      inlineSize: token('size-icon-tight'),
    }
    const glyph = {
      blockSize: token('size-icon'),
      flex: '0 0 auto',
      inlineSize: token('size-icon'),
    }
    return [
      on('host', [
        rule({ display: 'block' }),
        /* In App Header's middle region the host yields to the region, so
           the row can measure what does not fit and fold it. */
        web([rule({ minInlineSize: 0 })]),
        /* Down a column an item fills it and reads from its start, as every
           sidebar's does. */
        rule(
          { orientation: 'vertical' },
          { own: { navigationItemDisplay: 'flex', navigationItemJustify: 'start' } },
        ),
        /* Inside a segmented track the items take the track's height, which
           is under the floor an item keeps in a bar. */
        rule({ marker: 'segmented' }, { own: { navigationItemFloor: 0 } }),
        /* Print: the bar, and the mark under it marks a page nobody is on. */
        rule({ print: true }, { display: 'none' }),
      ]),
      on('nav', [
        rule({
          alignItems: 'center',
          /* The fixed step, because it is the floor the items take, and the
             bar and its items have to agree. */
          blockSize: hook.blockSize(token('size-control-sm')),
          display: 'flex',
          gap: hook.gap,
          /* Long navigation folds into the overflow menu, or scrolls under
             `overflow="scroll"`, instead of widening the page. Folding
             measures this box, so its width is the host's. */
          minInlineSize: 0,
          overflowX: 'auto',
          /* The marker is positioned against this. */
          position: 'relative',
        }),
        /* A column, as tall as its destinations, each the column's width. */
        rule(
          { orientation: 'vertical' },
          {
            alignItems: 'stretch',
            blockSize: 'auto',
            flexDirection: 'column',
            overflowX: 'visible',
          },
        ),
        /* Underlined: a rule under the row, a background so it takes no room. */
        rule(
          { marker: 'underlined' },
          {
            backgroundImage: fn('linear-gradient', ruled, ruled),
            backgroundPosition: 'bottom',
            backgroundRepeat: 'repeat-x',
            backgroundSize: ['100%', token('border-thin')],
          },
        ),
        /* Segmented: the pill in a sunken, framed track, a control's height. */
        rule(
          { marker: 'segmented' },
          {
            backgroundColor: token('color-surface-sunken'),
            blockSize: hook.blockSize(token('size-control')),
            border: [token('border-thin'), 'solid', token('color-border')],
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            inlineSize: 'fit-content',
            maxInlineSize: '100%',
            padding: token('space-2xs'),
          },
        ),
        /* Down a column the rule stands along the inline end. */
        rule(
          { orientation: 'vertical', marker: 'underlined' },
          {
            backgroundPosition: 'right',
            backgroundRepeat: 'repeat-y',
            backgroundSize: [token('border-thin'), '100%'],
          },
        ),
        rule({ orientation: 'vertical', marker: 'segmented' }, { blockSize: 'auto' }),
        /* The bar scrolls, so on a touch screen it takes the target's height,
           and a link fills it. */
        rule(
          { coarsePointer: true, orientation: { not: 'vertical' } },
          { blockSize: hook.blockSize(token('size-target')) },
        ),
        /* The bar says when it scrolls, under `overflow="scroll"`, or where
           even a folded row does not fit: the edge with more behind it fades,
           as Table's does. A bar that fits is never masked. */
        web([
          rule({
            own: { navigationFade: 'to right' },
            maskImage: fn(
              'linear-gradient',
              own.navigationFade,
              'transparent',
              ['#000', measured('_navigation-fade-start', '0rem')],
              ['#000', difference('100%', measured('_navigation-fade-end', '0rem'))],
              'transparent',
            ),
          }),
          rule({ dir: 'rtl' }, { own: { navigationFade: 'to left' } }),
          rule(
            { supports: '(animation-timeline: scroll())' },
            {
              animation: ['navigation-edges', 'linear', 'both'],
              animationTimeline: fn('scroll', 'self inline'),
            },
          ),
          rule({ reducedMotion: true }, { animation: 'none' }),
        ]),
        /* The rule is a background, which has no logical position, so it
           moves to the left by hand in a right-to-left column. */
        rule(
          { dir: 'rtl', orientation: 'vertical', marker: 'underlined' },
          { backgroundPosition: 'left' },
        ),
      ]),
      /* A list of destinations lays out as bare links do: the list is the
         row, or the column, and its items lose their bullets. */
      on({ slotted: ':is(ul, ol, [role="list"])' }, [
        web([
          rule({
            alignItems: 'center',
            blockSize: '100%',
            display: 'flex',
            gap: hook.gap,
            listStyle: 'none',
            margin: token('space-none'),
            padding: token('space-none'),
          }),
          rule(
            { orientation: 'vertical' },
            { alignItems: 'stretch', blockSize: 'auto', flexDirection: 'column' },
          ),
        ]),
      ]),
      /* **A destination that folded takes no room on the row.** Important,
         because the base layer gives every link in the bar a `display`, and
         the page's rules outrank this sheet's for what is slotted. */
      on({ slotted: '[hidden]' }, [web([rule({ display: 'none !important' })])]),
      /* **The overflow button stands in the row as a destination does**: the
         same height, words, weight, and hover, with a caret after the words. */
      on('overflow', [
        web([
          rule({ alignItems: 'center', blockSize: '100%', display: 'flex', flex: '0 0 auto' }),
          rule({ part: { hidden: true } }, { display: 'none' }),
        ]),
      ]),
      on({ part: 'more', inner: '[hidden]' }, [web([rule({ display: 'none' })])]),
      on('more', [
        web([
          rule({
            alignItems: 'center',
            background: 'none',
            blockSize: '100%',
            border: 'none',
            borderRadius: hookOf('navigation-item', 'radius', token('radii-sm')),
            color: hookOf('navigation-item', 'color', token('color-foreground-muted')),
            cursor: 'pointer',
            display: 'inline-flex',
            fontFamily: token('font-sans'),
            fontSize: hookOf('navigation-item', 'font-size', token('text-sm')),
            fontWeight: hookOf('navigation-item', 'font-weight', token('weight-medium')),
            gap: token('space-2xs'),
            minBlockSize: token('size-control-sm'),
            paddingBlock: token('space-none'),
            paddingInline: [
              hookOf('navigation-item', 'padding-inline', token('space-sm')),
              token('space-xs'),
            ],
            position: 'relative',
            transition: list(
              ['background-color', token('duration-fast'), token('easing-standard')],
              ['color', token('duration-fast'), token('easing-standard')],
            ),
            whiteSpace: 'nowrap',
            zIndex: token('layer-raised'),
          }),
          rule({ hover: true }, washed),
        ]),
      ]),
      /* Open, the button keeps the wash it takes under the pointer. */
      on({ part: 'more', selector: ':host [part="more"]:where([aria-expanded="true"])' }, [
        web([rule(washed)]),
      ]),
      on('more', [
        web([
          rule({ active: true }, { backgroundColor: token('color-press') }),
          /* Naming the current destination, it reads as the current one does. */
          rule(
            { part: { 'data-current': true } },
            {
              color: hookOf('navigation-item', 'current-color', token('color-foreground')),
              fontWeight: hookOf(
                'navigation-item',
                'current-font-weight',
                token('weight-semibold'),
              ),
            },
          ),
          /* The ring turns inward, as a link's does, because the bar has no
             room to draw it outside. */
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
          /* Too narrow for words, the button is a square around a glyph, as
             App Header's toggle is. */
          rule(
            { part: { 'data-compact': true } },
            {
              inlineSize: token('size-control-sm'),
              justifyContent: 'center',
              paddingInline: token('space-none'),
            },
          ),
        ]),
      ]),
      on('more-mark', [web([rule(tight)])]),
      on({ region: 'more-icon', slotted: '*' }, [web([rule(tight)])]),
      on('more-glyph', [web([rule(glyph)])]),
      on({ region: 'menu-icon', slotted: '*' }, [web([rule(glyph)])]),
      /* Behind the destinations and out of flow, so moving it reflows nothing. */
      on('indicator', [
        rule({
          /* **A `surface-sunken` pill**, a step past the 5% wash a link takes
             under the pointer. The selected wash was tried in its place, since
             the pill measures 1.05:1 on a dark glass header, and the owner
             chose the pill from before the rounds, November 10, 2026. */
          backgroundColor: hook.indicatorColor(token('color-surface-sunken')),
          blockSize: measured('indicator-block-size', 0),
          borderRadius: hook.indicatorRadius(token('radii-sm')),
          boxShadow: hook.indicatorShadow('none'),
          inlineSize: measured('indicator-inline-size', 0),
          insetBlockStart: '50%',
          insetInlineStart: 0,
          opacity: 0,
          position: 'absolute',
          translate: [measured('indicator-x', 0), '-50%'],
          transition: list(
            ['translate', token('duration-normal'), token('easing-emphasized')],
            ['inline-size', token('duration-normal'), token('easing-emphasized')],
            ['opacity', token('duration-fast'), token('easing-standard')],
          ),
          zIndex: token('layer-base'),
        }),
        /* Hidden until it has somewhere to be, so it fades in rather than
           sliding from a wrong place on first paint. */
        rule({ part: { 'data-placed': true } }, { opacity: 1 }),
        /* Forced colors paint every fill Canvas: the mark keeps a Highlight
           edge, and an underline is a Highlight bar. */
        web([
          rule({ forcedColors: true }, { border: [token('border-thick'), 'solid', 'Highlight'] }),
        ]),
        /* A phone's mark travels by the measured place alone, so it stands at
           the destination's top where the web centers it on the bar. Each
           destination fills the bar, so the two are one place. */
        native([
          rule(
            { orientation: false, marker: { not: 'underlined' } },
            {
              insetBlockStart: 0,
              translate: [measured('indicator-x', 0), measured('indicator-y', 0)],
            },
          ),
        ]),
        rule(
          { orientation: 'vertical' },
          {
            insetBlockStart: 0,
            translate: [measured('indicator-x', 0), measured('indicator-y', 0)],
          },
        ),
        /* Underlined: a bar on the rule, where `Tabs` draws its own. */
        rule(
          { marker: 'underlined' },
          {
            backgroundColor: hook.indicatorColor(token('color-primary')),
            blockSize: hook.indicatorThickness,
            borderRadius: hook.indicatorRadius(token('radii-none')),
            insetBlockEnd: 0,
            insetBlockStart: 'auto',
            translate: [measured('indicator-x', 0), 0],
          },
        ),
        /* Segmented: a raised pill in the track, `Tabs`' token for token. */
        rule(
          { marker: 'segmented' },
          {
            backgroundColor: hook.indicatorColor(token('color-surface-overlay')),
            /* Toggle Group's thumb corner, as segmented Tabs take it. */
            borderRadius: hook.indicatorRadius(token('radii-inset')),
            boxShadow: hook.indicatorShadow(token('shadow-sm')),
          },
        ),
        /* Down a column the bar stands along the inline end, which logical
           insets carry to the left in a right-to-left document. */
        rule(
          { orientation: 'vertical', marker: 'underlined' },
          {
            blockSize: measured('indicator-block-size', 0),
            inlineSize: hook.indicatorThickness,
            insetBlockStart: 0,
            insetInlineEnd: 0,
            insetInlineStart: 'auto',
            translate: [0, measured('indicator-y', 0)],
          },
        ),
        web([
          rule(
            { forcedColors: true, marker: 'underlined' },
            { backgroundColor: 'Highlight', border: 'none', forcedColorAdjust: 'none' },
          ),
        ]),
      ]),
      keyframes('navigation-edges', {
        '0%': { '--_navigation-fade-end': token('space-xl'), '--_navigation-fade-start': '0rem' },
        '5%, 95%': {
          '--_navigation-fade-end': token('space-xl'),
          '--_navigation-fade-start': token('space-xl'),
        },
        '100%': { '--_navigation-fade-end': '0rem', '--_navigation-fade-start': token('space-xl') },
      }),
    ]
  },
)
