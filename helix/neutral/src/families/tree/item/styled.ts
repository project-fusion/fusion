import {
  difference,
  first,
  fit,
  fn,
  list,
  measured,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * One node of a tree, in its styled tier.
 *
 * **Indent is the level times one hook**, so a node moved to another depth
 * re-indents with no nested rule, and the step is the gutter a chevron sits in.
 *
 * **A leaf holds the space a chevron would take, so siblings share a column**,
 * only where a chevron stands on that side.
 *
 * **The row's height comes from its line, never from its tallest child**, so a
 * link 24 tall in `end` leaves every row the same height.
 *
 * **A branch that names its list keeps the row's height, its hover, and its
 * press**, since a branch with no `href` toggles from anywhere in its row.
 *
 * **A chevron turns rather than changing glyph**: opening a branch is a short
 * movement, not a substitution.
 *
 * **A branch opens to its children's own height.** The web moves the group's
 * one grid row, which reaches the height without measuring it, and a phone
 * measures what the group holds and moves to that.
 */
export default styles(
  item,
  {
    prefix: 'tree',
    hooks: {
      checkboxBackgroundColor: token('color-background'),
      checkboxBorderColor: null,
      checkboxMarkColor: token('color-foreground'),
      checkboxSize: null,
      chevronGap: token('space-none'),
      chevronOrder: '0',
      chevronSize: token('size-icon-tight'),
      draggingOpacity: 0.5,
      dropIndicatorColor: token('color-primary'),
      dropIndicatorSize: token('border-thick'),
      gap: token('space-2xs'),
      gripColor: token('color-foreground-subtle'),
      indent: null,
      rowCheckedBackgroundColor: 'transparent',
      rowCheckedColor: null,
      rowColor: token('color-foreground-muted'),
      rowDisabledOpacity: 0.5,
      rowHoverBackgroundColor: token('color-surface-raised'),
      rowHoverColor: token('color-foreground'),
      rowRadius: token('radii-sm'),
      rowSelectedBackgroundColor: token('color-surface-sunken'),
      rowSelectedColor: token('color-foreground'),
      rowSize: token('size-control-tight'),
    },
    own: {
      treeChevron: null,
      treeHeadingInk: null,
      treeHeadingText: null,
      treeHeadingTracking: null,
      treeLabelFlex: null,
      treeNestedText: null,
      treePad: null,
      treeReserve: null,
      treeRowFill: null,
      treeRowInk: null,
      treeText: null,
    },
    stylesheet: 'tree/item/tree-item.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => {
    const step = first(hook.indent, sum(own.treeChevron, token('space-2xs')))
    const inset = sum(token('space-xs'), product(difference(measured('tree-level', 1), 1), step))
    const size = first(hook.checkboxSize, own.treeChevron)
    /* An icon passed in the chevron's place is sized, colored and turned the same way. */
    const turned = [
      rule({ transform: 'rotate(-90deg)' }),
      rule({ dir: 'rtl' }, { transform: 'rotate(90deg)' }),
      rule({ open: true }, { transform: 'rotate(0deg)' }),
    ]
    const breathes = [
      web([
        rule(
          { loading: true },
          {
            animation: [
              'tree-loading',
              token('duration-slow'),
              token('easing-standard'),
              'infinite',
              'alternate',
            ],
          },
        ),
        rule({ loading: true, reducedMotion: true }, { animation: 'none' }),
      ]),
    ]
    return [
      on('host', [
        rule({
          display: 'block',
          own: {
            treeChevron: hook.chevronSize,
            /* From the target size, so `md` is exactly `space-xs`, and a
               `data-density="sm"` region's rows keep up with its controls. */
            treePad: quotient(difference(token('size-control-tight'), '1rem'), 2),
          },
        }),
      ]),
      on('item', [
        rule({ borderRadius: token('radii-sm') }),
        web([rule({ outline: 'none' })]),
        rule({ dragging: true }, { opacity: hook.draggingOpacity }),
        web([rule({ dropBefore: true }, { position: 'relative' })]),
        web([rule({ dropAfter: true }, { position: 'relative' })]),
      ]),
      on('row', [
        rule({
          /* `center`, never `stretch`: the row's height must not come from its
             tallest child. */
          alignItems: 'center',
          /* Through a private, so a checked row takes a fill only where a page
             asks for one, and the hover below still wins over it. */
          backgroundColor: own.treeRowFill('transparent'),
          borderRadius: hook.rowRadius,
          color: first(own.treeRowInk, hook.rowColor),
          display: 'flex',
          /* The row's own size, which the tree's `nesting` decides. */
          fontSize: first(own.treeText, token('text-control')),
          fontWeight: token('weight-medium'),
          gap: token('space-2xs'),
          /* A hair between rows, on the row, or a parent's under its last child's
             adds up. */
          marginBlockEnd: hook.gap,
          minBlockSize: hook.rowSize,
          paddingBlock: own.treePad,
          paddingInline: token('space-xs'),
          paddingInlineStart: inset,
          web: {
            /* One line plus the padding, floored at the target size. */
            blockSize: fn('max', hook.rowSize, sum('1lh', product(own.treePad, 2))),
            cursor: 'pointer',
            transition: ['background-color', token('duration-fast'), token('easing-standard')],
            userSelect: 'none',
          },
        }),
        /* A leaf holds the space a chevron would take, where one stands on that
           side. Siblings line up, and children indent. */
        web([
          rule(
            { holds: { toggle: false } },
            {
              paddingInlineStart: sum(
                inset,
                own.treeReserve(sum(own.treeChevron, token('space-2xs'))),
              ),
            },
          ),
          /* A parent reads as a parent: at `nesting="heading"` the three
             properties the rail heading adds, handed down by the tree. */
          rule(
            { holds: { toggle: true } },
            {
              color: first(own.treeRowInk, own.treeHeadingInk, hook.rowColor),
              fontSize: first(own.treeHeadingText, own.treeText, token('text-control')),
              letterSpacing: own.treeHeadingTracking(token('tracking-normal')),
            },
          ),
          rule(
            { hover: true },
            { backgroundColor: hook.rowHoverBackgroundColor, color: hook.rowHoverColor },
          ),
        ]),
        /* A surface, not the accent. */
        rule(
          { selected: true },
          { backgroundColor: hook.rowSelectedBackgroundColor, color: hook.rowSelectedColor },
        ),
        /* A checked row is marked by its box alone, unless a page asks for more. */
        web([
          rule(
            { checked: true },
            {
              own: {
                treeRowFill: hook.rowCheckedBackgroundColor,
                treeRowInk: hook.rowCheckedColor,
              },
            },
          ),
        ]),
        native([
          rule({ checked: true }, { backgroundColor: hook.rowCheckedBackgroundColor }),
          /* What the web hands down as custom properties, a phone's item reads
             from the tree it joins. */
          rule(
            { part: { 'data-reserved': true } },
            { paddingInlineStart: sum(inset, sum(own.treeChevron, token('space-2xs'))) },
          ),
          rule({ part: { 'data-subordinate': true } }, { fontSize: token('text-xs') }),
          rule(
            { part: { 'data-heading': true } },
            {
              color: token('color-foreground-muted'),
              fontSize: token('text-xs'),
              letterSpacing: token('tracking-wide'),
            },
          ),
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
          rule({ part: { 'data-disabled': true } }, { opacity: hook.rowDisabledOpacity }),
        ]),
      ]),
      /* The step a `subordinate` tree takes, one whatever the depth, since the
         type scale holds a single step below a row and a tree holds any number
         of depths. */
      on({ region: 'children', slotted: '*' }, [
        web([rule({ own: { treeText: first(own.treeNestedText, token('text-control')) } })]),
      ]),
      /* Both, because `href` moves which element the tab stop is on: without one
         the wrapper is the `treeitem`, with one the row is. */
      /* Written out: the ring is on the row while the part around it holds focus. */
      on(
        {
          part: 'row',
          selector: '[part="item"]:focus-visible [part="row"], [part="row"]:focus-visible',
        },
        [
          web([
            rule({
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            }),
          ]),
        ],
      ),
      /* Written out: the vocabulary names no tag of a part, and a row that is a
         link is still a row. */
      on({ part: 'row', selector: 'a[part="row"]' }, [web([rule({ textDecoration: 'none' })])]),
      /* A fixed width, not `1em`: the gutter a chevron sits in is what a row
         without one has to reserve, and siblings of two sizes must line up. */
      on('toggle', [
        rule({
          alignSelf: 'center',
          blockSize: own.treeChevron,
          color: token('color-foreground-subtle'),
          flex: '0 0 auto',
          inlineSize: own.treeChevron,
          marginInlineStart: hook.chevronGap,
          transition: ['transform', token('duration-fast'), token('easing-standard')],
          web: { order: hook.chevronOrder },
        }),
        ...turned,
        ...breathes,
      ]),
      keyframes('tree-loading', { to: { opacity: 0.3 } }),
      /* The label takes the room, and the name is what gives way when the rail
         is narrow. */
      on('label', [
        rule({
          flex: '1',
          minInlineSize: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          web: { alignSelf: 'stretch' },
        }),
        native([rule({ part: { 'data-tight': true } }, { flex: '0 1 auto' })]),
      ]),
      /* Written out: a branch's label under `chevron-placement="label"` is its
         content's width, so the chevron follows it. */
      on({ part: 'label', selector: '[part="row"]:has([part="toggle"]) [part="label"]' }, [
        web([rule({ flex: own.treeLabelFlex('1') })]),
      ]),
      /* And a link fills the label rather than sitting inside it. */
      on({ region: 'default', slotted: 'a' }, [
        web([rule({ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' })]),
      ]),
      on({ region: ['start', 'end'], slotted: '*' }, [rule({ flex: '0 0 auto' })]),
      /* Whatever is at the end goes to the far side of the row. */
      on({ region: 'end' }, [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-2xs'),
          marginInlineStart: 'auto',
          web: { order: 1 },
        }),
      ]),
      /* A mark beside the name reads as being about the name. */
      on({ region: 'start', slotted: '*' }, [rule({ color: token('color-foreground-subtle') })]),
      /* Opening a branch is a movement. A closed branch's children are hidden
         until found, through `content-visibility`, which holds while the rows
         close, so the children fold away with them. No `display: none`, which
         the browser's find does not search. */
      on('group', [
        web([
          rule({
            display: 'grid',
            gridTemplateRows: fit(1),
            transition: list(
              ['grid-template-rows', token('duration-fast'), token('easing-standard')],
              ['content-visibility', token('duration-fast'), 'allow-discrete'],
            ),
          }),
          rule({ part: { hidden: true } }, { gridTemplateRows: fit(0) }),
          rule({ startingStyle: true, part: { hidden: false } }, { gridTemplateRows: fit(0) }),
        ]),
        native([
          rule({
            display: 'grid',
            gridTemplateRows: fit(0),
            transition: ['grid-template-rows', token('duration-fast'), token('easing-standard')],
          }),
          rule({ open: true }, { gridTemplateRows: fit(1) }),
        ]),
      ]),
      on('group-inner', [native([rule({ minBlockSize: 0, overflow: 'hidden' })])]),
      on({ part: 'group', inner: '> slot' }, [
        web([rule({ display: 'block', minBlockSize: 0, overflow: 'hidden' })]),
      ]),
      on({ region: 'chevron', slotted: '*' }, [
        rule({
          alignSelf: 'center',
          blockSize: own.treeChevron,
          color: token('color-foreground-subtle'),
          flex: '0 0 auto',
          inlineSize: own.treeChevron,
          marginInlineStart: hook.chevronGap,
          transition: ['transform', token('duration-fast'), token('easing-standard')],
          web: { order: hook.chevronOrder },
        }),
        ...turned,
        ...breathes,
      ]),
      /* The check mark: the checkbox's own box, at the size of the chevron. */
      on('checkbox', [
        rule({
          web: { display: 'grid', placeItems: 'center' },
          alignSelf: 'center',
          backgroundColor: hook.checkboxBackgroundColor,
          blockSize: size,
          border: [
            token('border-thin'),
            'solid',
            first(hook.checkboxBorderColor, token('color-border')),
          ],
          borderRadius: token('radii-sm'),
          color: hook.checkboxMarkColor,
          flex: '0 0 auto',
          inlineSize: size,
        }),
        native([rule({ alignItems: 'center', justifyContent: 'center' })]),
        rule(
          { also: { 'checkbox-checked': true } },
          { borderColor: first(hook.checkboxBorderColor, token('color-foreground')) },
        ),
        rule(
          { also: { 'checkbox-mixed': true } },
          { borderColor: first(hook.checkboxBorderColor, token('color-foreground')) },
        ),
      ]),
      on({ part: 'checkbox', inner: 'svg' }, [
        web([rule({ blockSize: '80%', inlineSize: '80%' })]),
      ]),
      on('checkbox-glyph', [native([rule({ blockSize: '80%', inlineSize: '80%' })])]),
      /* The grip, at the far end of the row. `touch-action: none`, so a drag on a
         phone moves the item and does not scroll the page. */
      on('grip', [
        rule({
          alignItems: 'center',
          color: hook.gripColor,
          flex: '0 0 auto',
          web: { cursor: 'grab', display: 'inline-flex', order: 3, touchAction: 'none' },
        }),
        web([rule({ active: true }, { cursor: 'grabbing' })]),
      ]),
      on('grip-mark', [rule({ blockSize: own.treeChevron, inlineSize: own.treeChevron })]),
      /* The line where a held item would land, drawn over the rows and laid over
         the edge so nothing moves. On the node, so an open branch lands before or
         after all of its children. */
      on({ before: 'item' }, [
        web([
          rule(
            { dropBefore: true },
            {
              backgroundColor: hook.dropIndicatorColor,
              blockSize: hook.dropIndicatorSize,
              content: '""',
              insetBlockStart: 0,
              insetInline: 0,
              pointerEvents: 'none',
              position: 'absolute',
              zIndex: 1,
            },
          ),
        ]),
      ]),
      on({ after: 'item' }, [
        web([
          rule(
            { dropAfter: true },
            {
              backgroundColor: hook.dropIndicatorColor,
              blockSize: hook.dropIndicatorSize,
              content: '""',
              insetBlockEnd: 0,
              insetInline: 0,
              pointerEvents: 'none',
              position: 'absolute',
              zIndex: 1,
            },
          ),
        ]),
      ]),
      /* A phone draws that line as the row's own inset shadow, since its views
         have no pseudo-elements. */
      on('row', [
        native([
          rule(
            { dropBefore: true },
            {
              boxShadow: ['inset', '0', hook.dropIndicatorSize, '0', '0', hook.dropIndicatorColor],
            },
          ),
          rule(
            { dropAfter: true },
            {
              boxShadow: [
                'inset',
                '0',
                product(hook.dropIndicatorSize, '-1'),
                '0',
                '0',
                hook.dropIndicatorColor,
              ],
            },
          ),
        ]),
        /* A row out of play is seen and reached, and does nothing under the
           pointer. */
        web([
          rule({ has: 'disabled' }, { cursor: 'not-allowed', opacity: hook.rowDisabledOpacity }),
          rule(
            { has: 'disabled', hover: true },
            { backgroundColor: 'transparent', color: hook.rowColor },
          ),
        ]),
      ]),
    ]
  },
)
