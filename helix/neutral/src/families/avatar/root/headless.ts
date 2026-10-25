import {
  bind,
  box,
  delay,
  derive,
  event,
  headless,
  image,
  prop,
  region,
  text,
  when,
} from '../../../tree.js'

/**
 * Avatar's headless tier: a person or an entity, as a picture or as
 * initials.
 *
 * **The host is an image named by `name`**, and has no role without one.
 * The picture and the initials are hidden from screen readers, since the
 * host carries the name.
 *
 * **The picture's load machine says where it stands**: `loading`, then
 * `loaded` or `error`, and with no `src` the avatar stands in `error`, so
 * the initials show. What is passed in replaces the initials.
 *
 * **`fallback-delay` holds the initials back** while a picture is on its
 * way, so a fast one never flashes them: the avatar is `waiting` while the
 * wait runs, and a new `src` waits again. Once it is over, the initials
 * stand in until the picture arrives. With no delay, a picture on its way
 * shows nothing in its place.
 */
export default headless('avatar', {
  delay: delay({ after: 'fallback-delay', again: 'src', waiting: 'waiting' }),
  derived: {
    delays: derive('avatar-delays'),
    'spoken-role': derive('avatar-role'),
  },
  events: [event('error', { bare: true }), event('load', { bare: true })],
  host: { label: bind('name'), role: bind('spoken-role') },
  props: [
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    prop('fallback-delay', 'number'),
    prop('initials', 'string'),
    prop('loading', ['eager', 'lazy'], { platform: 'web' }),
    prop('name', 'string', { default: '' }),
    prop('src', 'string', { default: '' }),
  ],
  states: ['error', 'loaded', 'loading', 'settled', 'waiting'],
  tree: [
    region('default', {}, [
      box('initials', { decorative: true }, [
        text('initials-words', { says: derive('avatar-initials') }),
      ]),
    ]),
    /* Drawn only with a source, as the web draws no picture without one. */
    when(
      'src',
      image('image', { alt: '', empty: 'error', fails: 'error', loads: 'load', src: bind('src') }),
    ),
  ],
})
