import { difference, fn, list, measured, native, token, web } from '../../../style.js'
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
    own: { navigationItemDisplay: null, navigationItemFloor: null, navigationItemJustify: null },
    stylesheet: 'navigation/root/navigation-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const ruled = hook.ruleColor
    return [
      on('host', [
        rule({ display: 'block' }),
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
          /* Long navigation scrolls inside the bar instead of widening the page. */
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
      /* Behind the destinations and out of flow, so moving it reflows nothing. */
      on('indicator', [
        rule({
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
            borderRadius: hook.indicatorRadius(difference(token('radii-sm'), token('border-thin'))),
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
      ]),
    ]
  },
)
