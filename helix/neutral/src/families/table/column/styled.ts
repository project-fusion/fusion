import {
  difference,
  first,
  list,
  measured,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import column from './headless.js'

/**
 * One column of a table, in its styled tier: a header cell, with the same rule
 * and inset as the cells below it, so the heading and its column read as one
 * line down the table.
 *
 * **Weight and color carry the heading, not capitals or a smaller size.** The
 * caption treatment is a step smaller than the column it names, which reads as
 * a footnote to its own data.
 *
 * **Taller than a row**, because the header is a band rather than the first row
 * of data.
 *
 * **Each `--_table-heading-*` is a data table's hooks, relayed.** That table's
 * sheet can reach the column element and not the box inside it, so it sets these
 * on the column and they inherit in here. Unset, each falls back to what a
 * heading is in either table.
 *
 * **The heading's words are the button**, so a sortable heading looks exactly
 * like one that is not until a pointer or a keyboard reaches it.
 *
 * **The heading goes to the edge its values go to**, so `Size` sits over digits
 * set to the end rather than at the start above them.
 *
 * **A grip is quiet until held**, and a separator is a strip on the edge, wider
 * than the line it draws, because a one pixel target is one nobody can grab.
 * The strip stands inside the heading's end padding: straddling the boundary, it
 * covered the next heading's grip and pushed the last column out past the
 * table's scroll box.
 */
export default styles(
  column,
  {
    prefix: 'table',
    hooks: {
      paddingBlock: null,
      ruleColor: token('color-border'),
    },
    own: {
      tableHeadingBackgroundColor: null,
      tableHeadingLayer: null,
      tableHeadingPosition: null,
    },
    stylesheet: 'table/column/table-column.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const ring = [
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]
    return [
      on('host', [web([rule({ display: 'contents' })]), native([rule({ flexGrow: 1 })])]),
      on('column', [
        rule({
          alignItems: 'center',
          backgroundColor: own.tableHeadingBackgroundColor('transparent'),
          borderBlockEnd: [
            token('border-thin'),
            'solid',
            measured('_table-heading-rule-color', hook.ruleColor),
          ],
          boxSizing: 'border-box',
          color: measured('_table-heading-color', token('color-foreground-muted')),
          display: 'flex',
          fontFamily: token('font-sans'),
          fontSize: measured('_table-heading-text', token('text-control')),
          fontWeight: token('weight-semibold'),
          minBlockSize: token('size-control-loose'),
          minInlineSize: 0,
          paddingBlock: measured(
            '_table-heading-padding-block',
            first(hook.paddingBlock, token('space-none')),
          ),
          paddingInline: measured(
            '_table-heading-padding-inline',
            list([token('space-none'), token('space-md')]),
          ),
          web: {
            insetBlockStart: 0,
            position: own.tableHeadingPosition('relative'),
            zIndex: own.tableHeadingLayer('auto'),
          },
        }),
        native([rule({ flexDirection: 'row', flexGrow: 1 })]),
        rule({ textAlign: 'center' }, { justifyContent: 'center' }),
        rule({ textAlign: 'end' }, { justifyContent: 'flex-end' }),
        web([
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
        ]),
      ]),
      on('sort', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          alignItems: 'center',
          boxSizing: 'border-box',
          display: 'inline-flex',
          flex: '1',
          gap: token('space-2xs'),
          minInlineSize: 0,
          position: 'relative',
        }),
        rule({ textAlign: 'center' }, { justifyContent: 'center' }),
        rule({ textAlign: 'end' }, { justifyContent: 'flex-end' }),
        web([rule({ hover: true }, { color: token('color-foreground') })]),
        web(ring),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. */
      on({ after: 'sort' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      /* Written out: the vocabulary names no last of a kind. The last heading ends
         on the rule with the values under it. */
      on({ part: 'column', selector: ':host(:last-of-type) [part="column"]' }, [
        web([
          rule({
            paddingInline: measured('_table-heading-padding-inline', token('space-none')),
          }),
        ]),
      ]),
      on('grip', [
        rule({
          web: { all: 'unset', cursor: 'grab', touchAction: 'none' },
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          flex: 'none',
          marginInlineEnd: token('space-2xs'),
        }),
        web([rule({ active: true }, { cursor: 'grabbing' })]),
        web(ring),
      ]),
      /* The row's and the list item's grip, which the heading's smaller type
         would otherwise draw a pixel smaller. */
      on('grip-mark', [
        rule({ blockSize: token('text-control'), inlineSize: token('text-control') }),
      ]),
      on('resizer', [
        rule({
          inlineSize: token('space-sm'),
          insetBlock: 0,
          insetInlineEnd: 0,
          position: 'absolute',
          web: { cursor: 'col-resize', touchAction: 'none' },
        }),
        web(ring),
      ]),
      on({ after: 'resizer' }, [
        web([
          rule({
            borderInlineEnd: [token('border-thin'), 'solid', 'transparent'],
            content: '""',
            insetBlock: token('space-xs'),
            insetInlineEnd: 0,
            position: 'absolute',
          }),
          rule({ hover: true }, { borderInlineEndColor: token('color-foreground-muted') }),
          rule({ focusVisible: true }, { borderInlineEndColor: token('color-foreground-muted') }),
        ]),
      ]),
    ]
  },
)
