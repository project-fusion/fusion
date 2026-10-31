import { native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import tree from './headless.js'

/**
 * A tree's styled tier: quiet, with no rules between rows and no fill but on
 * the selected item, so the labels are easy to scan.
 *
 * **What the tree decides is handed to its items.** Where the chevron stands
 * and what a deeper level means are facts about the list, and only an item can
 * tell a branch from a leaf or a nested row from a top-level one. The web hands
 * them down as custom properties, and a phone's items read them from the tree
 * they join.
 *
 * **What a collection says instead of rows is the shared sheet's on the web**,
 * and a phone draws the same two lines from the rules here.
 */
export default styles(
  tree,
  {
    prefix: 'tree',
    hooks: {
      dragPreviewBackgroundColor: token('color-surface-raised'),
      dragPreviewBorderColor: token('color-border'),
      dragPreviewBorderWidth: token('border-floating'),
      dragPreviewOpacity: 0.9,
      dragPreviewRadius: token('radii-sm'),
      dragPreviewShadow: token('shadow-floating'),
    },
    own: {
      treeHeadingInk: null,
      treeHeadingText: null,
      treeHeadingTracking: null,
      treeLabelFlex: null,
      treeNestedText: null,
      treeReserve: null,
    },
    stylesheet: 'tree/root/tree-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      web([
        rule({ '--tree-chevron-order': '0' }),
        /* The placement, handed down as numbers the item can use. Past the `end`
           region, which sits at `order: 1` with an auto margin of its own: two
           auto margins on one line split the free space, and the chevron comes
           to rest halfway along the row. A leaf reserves nothing at the start,
           because nothing is there. */
        rule(
          { chevronPlacement: 'end' },
          {
            '--tree-chevron-gap': token('space-none'),
            '--tree-chevron-order': '2',
            own: { treeReserve: token('space-none') },
          },
        ),
        /* Against the branch's name: after the label's order of 0 and ahead of
           the `end` region's 1. A branch's label stops taking the free space,
           which the `end` region's auto margin then takes instead. */
        rule(
          { chevronPlacement: 'label' },
          {
            '--tree-chevron-gap': token('space-none'),
            '--tree-chevron-order': '1',
            own: { treeLabelFlex: '0 1 auto', treeReserve: token('space-none') },
          },
        ),
        /* Depth is a change of kind here, so a nested row drops a step down the
           type scale. */
        rule({ nesting: 'subordinate' }, { own: { treeNestedText: token('text-xs') } }),
        /* Here the change is at the parent: a branch is the name of the list it
           holds, so it takes `Text`'s `label` recipe and its children keep the
           size every other row has. */
        rule(
          { nesting: 'heading' },
          {
            own: {
              treeHeadingInk: token('color-foreground-muted'),
              treeHeadingText: token('text-xs'),
              treeHeadingTracking: token('tracking-wide'),
            },
          },
        ),
        /* Print: a structure, and printing it flat loses the structure. */
        rule({ print: true }, { printColorAdjust: 'economy' }),
      ]),
    ]),
    on('tree', [
      rule({ display: 'flex', flexDirection: 'column' }),
      /* Rows that are already there stay, and dim, while a new set arrives. */
      rule({ loading: true }, { opacity: 0.5 }),
    ]),
    /* The copy of a row a pointer drags, drawn in the top layer and raised over
       the page while the row itself stays in place, faded. It has no transition,
       so it follows the pointer with nothing animated, whatever the reader's
       motion setting. */
    on('drag-preview', [
      rule({
        backgroundColor: hook.dragPreviewBackgroundColor,
        border: [hook.dragPreviewBorderWidth, 'solid', hook.dragPreviewBorderColor],
        borderRadius: hook.dragPreviewRadius,
        boxShadow: hook.dragPreviewShadow,
        opacity: hook.dragPreviewOpacity,
      }),
    ]),
    on(
      ['empty', 'loading'],
      [
        native([
          rule({
            color: token('color-foreground-muted'),
            fontSize: token('text-sm'),
            paddingBlock: token('space-sm'),
            paddingInline: token('space-md'),
            textAlign: 'center',
          }),
        ]),
      ],
    ),
  ],
)
