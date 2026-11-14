import { token } from '../style.js'
import { fragment } from '../table.js'

/**
 * What a collection says in place of its rows: what the shared collection state
 * sheet holds, for a family whose table writes its stylesheet. Quiet and centered,
 * since neither line is content.
 *
 * **The inset is two private values, and each family's own**, since where a line
 * sits is a fact about the box it sits in. A family sets them on the parts or on
 * the host, `collection-inset-block` and `collection-inset-inline`.
 */
export default fragment(
  'collection-state',
  {
    parts: ['empty', 'loading'],
    own: { collectionInsetBlock: null, collectionInsetInline: null },
  },
  ({ on, own, rule }) => [
    on(
      ['empty', 'loading'],
      [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          margin: token('space-none'),
          paddingBlock: own.collectionInsetBlock(token('space-md')),
          paddingInline: own.collectionInsetInline(token('space-sm')),
          textAlign: 'center',
        }),
      ],
    ),
  ],
)
