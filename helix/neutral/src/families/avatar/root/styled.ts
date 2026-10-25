import { fn, inherited, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Avatar's styled tier, which writes
 * `helix/styled/src/avatar/root/avatar-root.generated.css`.
 *
 * **A circle of the avatar size token**, or a rounded square, filled with
 * the raised surface: gray, not a brand tint, since an avatar with no
 * picture is a placeholder for a person, and raised separates from the page
 * in both schemes. The picture fills it, and initials are sized against it,
 * so one rule covers every size.
 *
 * **The web draws the picture or the initials from its state**, and a phone
 * hides the one it does not draw: the picture once it fails, and the
 * initials while the picture is loaded, while `fallback-delay` holds them
 * back, and while a picture with no delay is on its way.
 */
export default styles(
  root,
  {
    prefix: 'avatar',
    hooks: ['background-color', 'color', 'font-weight', 'size'],
    own: ['avatar-size'],
    props: [prop('shape', ['circle', 'rounded']), prop('size', ['sm', 'md', 'lg'])],
    stylesheet: 'avatar/root/avatar-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor(token('color-surface-raised')),
        blockSize: own.size,
        borderRadius: token('radii-full'),
        color: hook.color(token('color-foreground')),
        display: 'inline-flex',
        flex: '0 0 auto',
        inlineSize: own.size,
        justifyContent: 'center',
        overflow: 'hidden',
        own: { size: hook.size(token('size-avatar')) },
      }),
      rule({ size: 'sm' }, { own: { size: hook.size(token('size-avatar-sm')) } }),
      rule({ size: 'lg' }, { own: { size: hook.size(token('size-avatar-lg')) } }),
      rule({ shape: 'rounded' }, { borderRadius: token('radii-md') }),
      rule({ print: true }, { printColorAdjust: web('economy') }),
    ]),
    on({ region: 'default', slotted: '*' }, [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'cover' }),
      rule(
        [
          { platform: 'native', state: 'loaded' },
          { platform: 'native', state: { loading: true, waiting: true } },
          { platform: 'native', state: { delays: false, loading: true } },
        ],
        { display: 'none' },
      ),
    ]),
    on('image', [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'cover' }),
      /* A phone lays the picture over the initials, as the web draws one in
         place of the other. */
      rule({ platform: 'native' }, { inset: 0, position: 'absolute' }),
      rule(
        [
          { platform: 'native', state: 'error' },
          { platform: 'native', state: { delays: true, loading: true, waiting: false } },
        ],
        { display: 'none' },
      ),
    ]),
    on('initials', [
      rule({
        fontSize: product(own.size, 0.4),
        fontWeight: hook.fontWeight(token('weight-medium')),
        letterSpacing: token('tracking-wide'),
        lineHeight: 1,
        /* Clear of the avatar that overlaps this one in a group, by the
           share of it the group says the next one covers. */
        marginInlineEnd: product(own.size, inherited('_avatar-group-clear', 0)),
        userSelect: 'none',
      }),
      /* A phone's circle is space, which stops growing at the largest
         standard text size, so the initials, a share of it, stop there too
         and fit it at every size, as the web's grow with their circle.
         `min()` of one length is that length in space's points. */
      rule({ platform: 'native' }, { fontSize: fn('min', product(own.size, 0.4)) }),
      rule(
        [
          { platform: 'native', state: 'loaded' },
          { platform: 'native', state: { loading: true, waiting: true } },
          { platform: 'native', state: { delays: false, loading: true } },
        ],
        { display: 'none' },
      ),
    ]),
  ],
)
