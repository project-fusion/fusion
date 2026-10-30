import { oneOf } from '../../../render.js'
import { native, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * A description list's styled tier.
 *
 * **The list is a grid, and each item a subgrid of it**, so a label and its
 * value stay one element while every label lines up with every other. One
 * track by default, where each item stacks its label over its value, and two
 * under `direction="row"`, the labels as wide as the longest.
 *
 * **Beside falls back to over when there is no room**, measured against the
 * list's own width: below 22rem a label column leaves the values a sliver.
 *
 * **A phone has no grid.** The list is a column of its items, and each item
 * lays its label beside its value under `direction="row"`, as the list tells
 * it through a private value. Each item is still a subgrid, so the runtime
 * gives every label the width of the widest, as the web's label column does.
 */
export default styles(
  root,
  {
    prefix: 'description-list',
    hooks: {
      columnGap: token('space-lg'),
      dividerColor: token('color-border'),
      dividerWidth: token('border-thin'),
      gap: null,
      labelWidth: 'max-content',
    },
    own: {
      descriptionListColumnGap: null,
      descriptionListDirection: null,
      descriptionListGap: null,
      descriptionListValueAlign: null,
      descriptionListValueFigures: null,
    },
    props: { divided: false, justify: oneOf(['between']), width: oneOf(['auto']) },
    stylesheet: 'description-list/root/description-list-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ web: { containerType: 'inline-size' }, display: 'block' }),
      /* A phone has no inheritance through a slot, so the host holds the gap
         its rule between pairs reads, as the list holds it on the web. */
      native([
        rule({ own: { descriptionListGap: hook.gap(token('space-md')) } }),
        rule({ direction: 'row' }, { own: { descriptionListGap: hook.gap(token('space-sm')) } }),
        rule(
          { direction: 'row', inlineSize: { below: '22rem' } },
          { own: { descriptionListGap: hook.gap(token('space-md')) } },
        ),
      ]),
      /* As wide as the widest pair, and no longer a container: containment
         sizes an element as though it were empty. */
      rule(
        { width: 'auto' },
        { web: { containerType: 'normal' }, inlineSize: 'fit-content', maxInlineSize: '100%' },
      ),
      /* Values on the end edge, which the list hands its items. */
      rule(
        { direction: 'row', justify: 'between' },
        { own: { descriptionListValueAlign: 'end', descriptionListValueFigures: 'tabular-nums' } },
      ),
    ]),
    /* The gap between pairs is one private value, so the rule `divided`
       draws sits in the middle of it whichever default is in force. */
    on('list', [
      rule({
        display: 'grid',
        gap: own.descriptionListGap,
        margin: 0,
        own: { descriptionListGap: hook.gap(token('space-md')) },
      }),
      rule(
        { direction: 'row' },
        {
          columnGap: hook.columnGap,
          gridTemplateColumns: [hook.labelWidth, 'minmax(0, 1fr)'],
          rowGap: own.descriptionListGap,
          own: { descriptionListGap: hook.gap(token('space-sm')) },
        },
      ),
      rule(
        { direction: 'row', inlineSize: { below: '22rem' } },
        {
          gridTemplateColumns: 'minmax(0, 1fr)',
          rowGap: own.descriptionListGap,
          own: { descriptionListGap: hook.gap(token('space-md')) },
        },
      ),
      /* A phone's list is a column of its items, which lay out beside. */
      native([
        rule(
          { direction: 'row' },
          {
            gridTemplateColumns: 'minmax(0, 1fr)',
            own: { descriptionListDirection: 'row', descriptionListColumnGap: hook.columnGap },
          },
        ),
        rule(
          { direction: 'row', inlineSize: { below: '22rem' } },
          { own: { descriptionListDirection: 'column' } },
        ),
      ]),
    ]),
    /* A rule between pairs, in the middle of the gap. */
    on({ slotted: '*' }, [
      rule(
        { child: 'later', divided: true },
        {
          borderBlockStart: [hook.dividerWidth, 'solid', hook.dividerColor],
          paddingBlockStart: own.descriptionListGap,
        },
      ),
    ]),
  ],
)
