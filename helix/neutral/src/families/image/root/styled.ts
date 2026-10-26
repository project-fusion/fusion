import { oneOf } from '../../../render.js'
import { first, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
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
    hooks: {
      aspect: null,
      fadeDuration: token('duration-normal'),
      fallbackBackgroundColor: null,
      fallbackColor: token('color-foreground-muted'),
      fit: 'cover',
      placeholderColor: token('color-surface-sunken'),
      position: 'center',
      radius: token('radii-md'),
    },
    props: { shape: oneOf(['rounded']) },
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
      native([rule({ aspectRatio: hook.aspect('16 / 9'), inlineSize: '100%' })]),
      rule({ shape: 'rounded' }, { borderRadius: hook.radius }),
      rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
    ]),
    on('image', [
      rule({
        blockSize: '100%',
        display: 'block',
        inlineSize: '100%',
        objectFit: hook.fit,
        web: { objectPosition: hook.position },
        opacity: 0,
        transition: ['opacity', hook.fadeDuration, token('easing-standard')],
      }),
      native([
        rule({ loaded: true }, { opacity: 1 }),
        /* A failed picture lies over the box rather than sizing it, since a
         phone resolves its full height against the room the page has. */
        rule({ error: true }, { inset: 0, position: 'absolute' }),
      ]),
    ]),
    /* **A picture that fails has no size to give the box**, so the box is 16
       by 9 until `--image-aspect` says otherwise, and holds the fallback, on
       both platforms. */
    /* Written out: a condition reads no attribute the web element writes on its own host. */
    on({ part: 'host', selector: ':host([data-status="error"])' }, [
      web([rule({ aspectRatio: hook.aspect('16 / 9') })]),
    ]),
    /* Written out: a condition reads no attribute the web element writes on its own host. */
    on({ part: 'image', selector: ':host([data-status="loaded"]) [part="image"]' }, [
      web([rule({ opacity: 1 })]),
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
      rule({ backgroundColor: hook.placeholderColor }),
      /* Shown only while the picture is on its way and the wait is over. */
      native([rule([{ loaded: true }, { error: true }, { waiting: true }], { display: 'none' })]),
    ]),
    on('fallback', [
      rule({
        backgroundColor: first(hook.fallbackBackgroundColor, hook.placeholderColor),
        color: hook.fallbackColor,
      }),
      native([rule({ error: false }, { display: 'none' })]),
    ]),
    /* `hidden` hides nothing an author gave a display to, so the stand-ins
       say it again. */
    on('placeholder', [web([rule({ part: { hidden: true } }, { display: 'none' })])]),
    on('fallback', [web([rule({ part: { hidden: true } }, { display: 'none' })])]),
    /* A slotted placeholder fills the box rather than sitting in its middle. */
    on({ region: 'placeholder', slotted: '*' }, [rule({ blockSize: '100%', inlineSize: '100%' })]),
  ],
)
