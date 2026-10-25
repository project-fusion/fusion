import { bind, box, delay, event, headless, image, prop, region } from '../../../tree.js'

/**
 * Image's headless tier: a picture that shows a placeholder while it loads
 * and a fallback if it fails.
 *
 * **The picture's load machine says where it stands**: `loading`, then
 * `loaded` or `error`, and a new `src` starts it over. The element sends
 * `load` and `error` under the platform's own names. With no `src`, the
 * picture stands `loading`, as the web element does.
 *
 * **The placeholder waits out `placeholder-delay`**, so a picture that
 * arrives inside the wait never shows one, and a new `src` waits again. Both
 * platforms run core's one `delay`. The placeholder is hidden from screen
 * readers; the fallback is read once the picture fails, after its `alt`.
 *
 * **What the browser fetches is the web's**: `srcset`, `sizes`, `loading`,
 * `decoding`, `fetchpriority`, `crossorigin` and `referrerpolicy`. A phone
 * draws the one `src`.
 */
export default headless('image', {
  delay: delay({ after: 'placeholder-delay', again: 'src', waiting: 'waiting' }),
  events: [event('error', { bare: true }), event('load', { bare: true })],
  props: [
    prop('alt', 'string'),
    prop('crossorigin', ['anonymous', 'use-credentials'], { platform: 'web' }),
    prop('decoding', ['async', 'auto', 'sync'], { default: 'async', platform: 'web' }),
    prop('fetchpriority', ['auto', 'high', 'low'], { default: 'auto', platform: 'web' }),
    prop('loading', ['eager', 'lazy'], { platform: 'web' }),
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    prop('placeholder-delay', 'number', { default: 0 }),
    prop('referrerpolicy', 'string', { default: '', platform: 'web' }),
    prop('sizes', 'string', { default: '', platform: 'web' }),
    prop('src', 'string', { default: '' }),
    prop('srcset', 'string', { default: '', platform: 'web' }),
  ],
  states: ['error', 'loaded', 'loading', 'settled', 'waiting'],
  tree: [
    image('image', { alt: bind('alt'), fails: 'error', loads: 'load', src: bind('src') }),
    box('placeholder', { decorative: true }, [region('placeholder')]),
    /* Drawn only once the picture fails, so a screen reader reaches it then. */
    box('fallback', {}, [region('fallback')]),
  ],
})
