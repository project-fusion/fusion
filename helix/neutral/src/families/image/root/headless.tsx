import { bare, headless, Image, oneOf, Slot, string, View, web } from '../../../render.js'

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
  props: {
    alt: string(),
    crossorigin: web(oneOf(['anonymous', 'use-credentials'])),
    decoding: web(oneOf(['async', 'auto', 'sync'], 'async')),
    fetchpriority: web(oneOf(['auto', 'high', 'low'], 'auto')),
    loading: web(oneOf(['eager', 'lazy'])),
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    placeholderDelay: 0,
    referrerpolicy: web(''),
    sizes: web(''),
    src: '',
    srcset: web(''),
  },
  events: {
    error: bare(),
    load: bare(),
  },
  states: ['error', 'loaded', 'loading', 'settled', 'waiting'],
  delay: { duration: 'placeholderDelay', pending: 'waiting', restartOn: 'src' },
  render: ({ props }) => (
    <>
      <Image
        alt={props.alt}
        onError="error"
        onLoad="load"
        part="image"
        src={props.src}
      />
      <View
        ariaHidden
        part="placeholder"
      >
        <Slot name="placeholder" />
      </View>
      {/* Drawn only once the picture fails, so a screen reader reaches it then. */}
      <View part="fallback">
        <Slot name="fallback" />
      </View>
    </>
  ),
})
