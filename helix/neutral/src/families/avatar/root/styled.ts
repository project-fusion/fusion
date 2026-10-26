import { oneOf } from '../../../render.js'
import { fn, inherited, native, product, token } from '../../../style.js'
import { styles } from '../../../table.js'
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
    hooks: {
      backgroundColor: token('color-surface-raised'),
      color: token('color-foreground'),
      fontWeight: token('weight-medium'),
      size: null,
    },
    own: ['avatar-size'],
    props: { shape: oneOf(['circle', 'rounded']), size: oneOf(['sm', 'md', 'lg']) },
    stylesheet: 'avatar/root/avatar-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        blockSize: own.size,
        borderRadius: token('radii-full'),
        color: hook.color,
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
      rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
    ]),
    on({ region: 'default', slotted: '*' }, [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'cover' }),
      native([
        rule(
          [
            { state: 'loaded' },
            { state: { loading: true, waiting: true } },
            { state: { delays: false, loading: true } },
          ],
          { display: 'none' },
        ),
      ]),
    ]),
    on('image', [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'cover' }),
      /* A phone lays the picture over the initials, as the web draws one in
         place of the other. */
      native([
        rule({ inset: 0, position: 'absolute' }),
        rule([{ error: true }, { state: { delays: true, loading: true, waiting: false } }], {
          display: 'none',
        }),
      ]),
    ]),
    on('initials', [
      rule({
        fontSize: product(own.size, 0.4),
        fontWeight: hook.fontWeight,
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
      native([
        rule({ fontSize: fn('min', product(own.size, 0.4)) }),
        rule(
          [
            { loaded: true },
            { state: { loading: true, waiting: true } },
            { state: { delays: false, loading: true } },
          ],
          { display: 'none' },
        ),
      ]),
    ]),
  ],
)
