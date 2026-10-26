import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import {
  difference,
  first,
  list,
  measured,
  native,
  product,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import group from './headless.js'

/**
 * Toggle Group's styled tier, which writes
 * `helix/styled/src/toggle/group/toggle-group.generated.css`.
 *
 * **The host is the stack**: a label, the row that holds the track, and one
 * line under it. The track gives its toggles the row's height and its corners
 * through private values, `toggle-height` and `toggle-radius`, which each
 * toggle reads.
 *
 * **One indicator travels to the chosen toggle**, measured from its box.
 * Where several can be pressed, it stays hidden and each pressed toggle
 * carries the indicator's fill. On the web that is a `::slotted()` rule on
 * the toggle's state; a phone's toggle reads the fill from private values the
 * track sets, as it reads the hover reset only a group has.
 */
export default styles(
  group,
  {
    prefix: 'toggle-group',
    hooks: ({ own }) => ({
      backgroundColor: token('color-surface-sunken'),
      borderColor: token('color-border'),
      indicatorColor: own.indicatorSurface,
      indicatorShadow: token('shadow-sm'),
      itemRadius: null,
      radius: token('radii-sm'),
    }),
    own: [
      'indicator-surface',
      'toggle-height',
      'toggle-hover-surface',
      'toggle-pressed-shadow',
      'toggle-pressed-surface',
      'toggle-radius',
    ],
    props: [prop('separation', ['outlined', 'plain'])],
    stylesheet: 'toggle/group/toggle-group.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(field),
    include(fieldStacked),
    on('host', [
      rule({ display: 'inline-flex', flexDirection: 'column', gap: token('space-2xs') }),
      rule({ 'label-placement': 'start' }, { alignItems: 'start' }),
    ]),
    /* The label inside the track, with a rule after it. Ahead of the rule,
       which is the track's `::before` on the web, and ahead of the toggles. The
       padding is what held the word up, so it goes, and the word centers on
       the toggles' words. */
    on('label', [
      rule(
        { 'label-placement': 'start' },
        {
          alignSelf: 'center',
          marginBlock: 0,
          order: '-2',
          paddingBlock: 0,
          paddingInlineStart: token('space-xs'),
          whiteSpace: 'nowrap',
        },
      ),
    ]),
    /* The rule, on the track: sixty percent of the row the toggles fill,
       which is a length where the track's own height is not. */
    on({ before: 'track' }, [
      web([
        rule(
          { 'label-placement': 'start' },
          {
            alignSelf: 'center',
            backgroundColor: token('color-border'),
            blockSize: product(own.toggleHeight, 0.6),
            content: '""',
            flex: 'none',
            inlineSize: token('border-thin'),
            marginInline: token('space-xs'),
            order: '-1',
          },
        ),
      ]),
    ]),
    on('track', [
      rule({
        display: 'inline-flex',
        /* It grows inside the row, which is always what holds it. */
        flex: '1 1 auto',
        position: 'relative',
        /* It wraps, so a group with more labels than room keeps every toggle
           in reach. */
        alignContent: 'flex-start',
        flexWrap: 'wrap',
        /* The height of a control, as a floor: a wrapped track is two rows. */
        minBlockSize: token('size-control'),
        padding: token('space-2xs'),
        own: {
          toggleHeight: difference(token('size-control'), product(token('space-2xs'), 2)),
          /* No track, so nothing to be concentric with. */
          toggleRadius: hook.itemRadius(token('radii-sm')),
          /* And no groove either, which decides the indicator's color. */
          indicatorSurface: token('color-surface-raised'),
        },
      }),
      /* A framed track, concentric: the outer radius less the border. */
      rule([{ separation: false }, { separation: 'outlined' }], {
        backgroundColor: hook.backgroundColor,
        border: [token('border-thin'), 'solid', hook.borderColor],
        borderRadius: hook.radius,
        own: {
          toggleRadius: hook.itemRadius(difference(hook.radius, token('border-thin'))),
          /* The border joins the padding in what the row gives back. */
          toggleHeight: difference(
            token('size-control'),
            product(sum(token('space-2xs'), token('border-thin')), 2),
          ),
          /* A groove, so the indicator is over it. */
          indicatorSurface: token('color-surface-overlay'),
        },
      }),
      /* Wrong, and the strip says so. */
      rule(
        { invalid: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-danger')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      /* A column: the toggles stack at their own height and the track does not wrap. */
      rule(
        { orientation: 'vertical' },
        { alignItems: 'stretch', flexDirection: 'column', flexWrap: 'nowrap' },
      ),
      /* What a phone's toggle reads of the group: no wash under a finger, since
         the indicator is the one surface, and, where several can be pressed,
         the indicator's fill on each pressed toggle. */
      native([
        rule({ own: { toggleHoverSurface: 'transparent' } }),
        rule(
          { 'selection-mode': 'multiple' },
          {
            own: {
              togglePressedSurface: first(hook.indicatorColor, own.indicatorSurface),
              togglePressedShadow: hook.indicatorShadow,
            },
          },
        ),
      ]),
    ]),
    /* The toggles share the row, each at its own width and the row's height. */
    on({ slotted: 'helix-toggle' }, [
      rule({ blockSize: own.toggleHeight, flex: '1 1 auto' }),
      rule({ orientation: 'vertical' }, { flex: '0 0 auto' }),
    ]),
    /* The marker's look, which a pressed toggle shares where several can be
       pressed, since one marker cannot travel to two places. */
    on('indicator', [
      rule({
        backgroundColor: first(hook.indicatorColor, own.indicatorSurface),
        /* The track always sets it, and the marker and the items inherit it there. */
        borderRadius: own.toggleRadius,
        boxShadow: hook.indicatorShadow,
      }),
      /* One marker that travels. */
      rule({
        blockSize: measured('indicator-block-size', 0),
        inlineSize: measured('indicator-inline-size', 0),
        insetBlockStart: 0,
        insetInlineStart: 0,
        position: 'absolute',
        translate: [measured('indicator-x', 0), measured('indicator-y', 0)],
        transition: list(
          ['translate', token('duration-normal'), token('easing-emphasized')],
          ['inline-size', token('duration-normal'), token('easing-emphasized')],
          ['opacity', token('duration-fast'), token('easing-standard')],
        ),
        zIndex: token('layer-base'),
      }),
      /* Hidden until it has somewhere to be. */
      rule({ part: { 'data-placed': false } }, { opacity: 0 }),
    ]),
    on(
      {
        part: 'host',
        selector: ':host([selection-mode="multiple"]) ::slotted(helix-toggle:state(pressed))',
      },
      [
        web([
          rule({
            backgroundColor: first(hook.indicatorColor, own.indicatorSurface),
            borderRadius: own.toggleRadius,
            boxShadow: hook.indicatorShadow,
          }),
        ]),
      ],
    ),
    /* The row that holds the track and whatever flanks it. */
    on('row', [rule({ alignItems: 'center', display: 'flex', gap: token('space-sm') })]),
    /* A phone's rule after an inline label, as a box of its own. */
    on('rule', [
      native([
        rule({
          alignSelf: 'center',
          backgroundColor: token('color-border'),
          blockSize: product(own.toggleHeight, 0.6),
          flex: 'none',
          inlineSize: token('border-thin'),
          marginInline: token('space-xs'),
        }),
      ]),
    ]),
  ],
)
