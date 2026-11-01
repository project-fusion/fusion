import { token } from '../style.js'
import { fragment } from '../table.js'

/**
 * What a collection says when its rows did not load: the same line as
 * `collection-state`, in the danger ink, since it is news you act on. A family
 * writes its own color hook and inset over this.
 */
export default fragment(
  'collection-error',
  {
    parts: ['error'],
    own: { collectionInsetBlock: null, collectionInsetInline: null },
  },
  ({ on, own, rule }) => [
    on('error', [
      rule({
        color: token('color-danger'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        margin: token('space-none'),
        paddingBlock: own.collectionInsetBlock(token('space-md')),
        paddingInline: own.collectionInsetInline(token('space-sm')),
        textAlign: 'center',
      }),
    ]),
  ],
)
