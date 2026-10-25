import { token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Image's styled tier, which writes
 * `helix/styled/src/image/root/image-root.generated.css`.
 *
 * **The box is the element's, and the picture fills it**, fitted by
 * `--image-fit`. The placeholder and the fallback each cover the box exactly,
 * because they stand in for it.
 *
 * **A failed picture is a box with its fallback**, 16 by 9 where nothing
 * sizes it.
 *
 * **The picture arrives rather than appears**: unseen while it loads, and
 * faded in once it has. A failed picture stays unseen, and keeps its `alt`
 * for a screen reader as a broken picture does.
 *
 * **The web reads `data-status`**, which the element writes beside its
 * states, since an engine without custom states records none, and its
 * stand-ins carry `hidden`. A phone reads the load machine's states.
 * `--image-position` is the web's, since a phone's picture has no
 * `object-position`.
 */
export default styles(
  root,
  {
    prefix: 'image',
    hooks: [
      'aspect',
      'fade-duration',
      'fallback-background-color',
      'fallback-color',
      'fit',
      'placeholder-color',
      'position',
      'radius',
    ],
    props: [prop('shape', ['rounded'])],
    stylesheet: 'image/root/image-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        aspectRatio: hook.aspect('auto'),
        display: 'block',
        overflow: 'hidden',
        position: 'relative',
      }),
      /* A phone's picture has no size of its own to give the box, and a phone
         reads no page stylesheet to size it, so its box spans the line at
         16 / 9 until `--image-aspect` says otherwise. */
      rule({ platform: 'native' }, { aspectRatio: hook.aspect('16 / 9'), inlineSize: '100%' }),
      rule({ shape: 'rounded' }, { borderRadius: hook.radius(token('radii-md')) }),
      rule({ print: true }, { printColorAdjust: web('economy') }),
    ]),
    on('image', [
      rule({
        blockSize: '100%',
        display: 'block',
        inlineSize: '100%',
        objectFit: hook.fit('cover'),
        objectPosition: web(hook.position('center')),
        opacity: 0,
        transition: [
          'opacity',
          hook.fadeDuration(token('duration-normal')),
          token('easing-standard'),
        ],
      }),
      rule({ platform: 'native', state: 'loaded' }, { opacity: 1 }),
      /* A failed picture lies over the box rather than sizing it, since a
         phone resolves its full height against the room the page has. */
      rule({ platform: 'native', state: 'error' }, { inset: 0, position: 'absolute' }),
    ]),
    /* **A picture that fails has no size to give the box**, so the box is 16
       by 9 until `--image-aspect` says otherwise, and holds the fallback, on
       both platforms. */
    on({ part: 'host', selector: ':host([data-status="error"])' }, [
      rule({ platform: 'web' }, { aspectRatio: hook.aspect('16 / 9') }),
    ]),
    on({ part: 'image', selector: ':host([data-status="loaded"]) [part="image"]' }, [
      rule({ platform: 'web' }, { opacity: 1 }),
    ]),
    on(
      ['placeholder', 'fallback'],
      [
        rule({
          alignItems: 'center',
          display: 'flex',
          inset: 0,
          justifyContent: 'center',
          position: 'absolute',
        }),
      ],
    ),
    on('placeholder', [
      rule({ backgroundColor: hook.placeholderColor(token('color-surface-sunken')) }),
      /* Shown only while the picture is on its way and the wait is over. */
      rule(
        [
          { platform: 'native', state: 'loaded' },
          { platform: 'native', state: 'error' },
          { platform: 'native', state: 'waiting' },
        ],
        { display: 'none' },
      ),
    ]),
    on('fallback', [
      rule({
        backgroundColor: hook.fallbackBackgroundColor(
          hook.placeholderColor(token('color-surface-sunken')),
        ),
        color: hook.fallbackColor(token('color-foreground-muted')),
      }),
      rule({ platform: 'native', state: { error: false } }, { display: 'none' }),
    ]),
    /* `hidden` hides nothing an author gave a display to, so the stand-ins
       say it again. */
    on({ part: 'placeholder', selector: ':host [part="placeholder"][hidden]' }, [
      rule({ platform: 'web' }, { display: 'none' }),
    ]),
    on({ part: 'fallback', selector: ':host [part="fallback"][hidden]' }, [
      rule({ platform: 'web' }, { display: 'none' }),
    ]),
    /* A slotted placeholder fills the box rather than sitting in its middle. */
    on({ region: 'placeholder', slotted: '*' }, [rule({ blockSize: '100%', inlineSize: '100%' })]),
  ],
)
