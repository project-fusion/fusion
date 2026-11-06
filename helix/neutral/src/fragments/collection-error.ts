import { token } from '../style.js'
import { fragment } from '../table.js'

/**
 * What a collection says when its rows did not load: the same line as
 * `collection-state`, except that each family writes its own color hook in the
 * danger ink, since it is news you act on, and its own inset.
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
