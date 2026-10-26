import {
  bare,
  headless,
  Image,
  number,
  oneOf,
  Slot,
  string,
  Text,
  View,
  web,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

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
  props: {
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    fallbackDelay: number(),
    initials: string(),
    loading: web(oneOf(['eager', 'lazy'])),
    name: '',
    src: '',
  },
  events: {
    error: bare(),
    load: bare(),
  },
  states: ['error', 'loaded', 'loading', 'settled', 'waiting'],
  derived: {
    delays: derive('avatar-delays'),
    spokenRole: derive('avatar-role'),
  },
  delay: { duration: 'fallbackDelay', pending: 'waiting', restartOn: 'src' },
  host: { label: bind('name'), role: bind('spokenRole') },
  render: ({ props }) => (
    <>
      <Slot>
        <View
          ariaHidden
          part="initials"
        >
          <Text part="initials-words">{derive('avatar-initials')}</Text>
        </View>
      </Slot>
      {/* Drawn only with a source, as the web draws no picture without one. */}
      {props.src && (
        <Image
          alt=""
          empty="error"
          fails="error"
          loads="load"
          part="image"
          src={props.src}
        />
      )}
    </>
  ),
})
