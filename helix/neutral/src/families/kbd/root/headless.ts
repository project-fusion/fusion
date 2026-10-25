import {
  box,
  derive,
  event,
  field,
  headless,
  prop,
  region,
  repeat,
  text,
  unless,
  when,
  wrap,
} from '../../../tree.js'

/**
 * Kbd's headless tier: a keyboard key or chord, set inline with text.
 *
 * **One key, or the chord `keys` names.** The label passed in is the key,
 * and `keys` draws a chord in the reader's keyboard's own glyphs: `⌘K` on an
 * Apple keyboard, including an iPhone's or an iPad's, and `Ctrl+K`
 * elsewhere. A chord drawn in glyphs is said in words, `Command K`, on both
 * platforms. A phone announces the key as a keyboard key.
 *
 * **`caps` draws a key per key**, each a `key` part with a `separator` part
 * between two where the platform writes one. Where the chord is said in
 * words, it is said whole on both platforms: the web hides its keys, and a
 * phone's key is one element named by the words.
 *
 * **The shortcut is the web's so far.** `within` listens for the chord and
 * sends `helix-shortcut`, and `for` and `activate` write the chord onto the
 * control it works and focus or press that control, each found by id. A phone
 * draws the key and listens for nothing: its components name no other
 * component by id, and a chord from an iPad's keyboard reaches a component
 * only through the keys module of a development build.
 */
export default headless('kbd', {
  events: [event('shortcut', { cancelable: true, detail: ['keys'], platform: 'web' })],
  props: [
    prop('activate', ['click', 'focus'], { platform: 'web' }),
    prop('caps', 'boolean', { default: false }),
    prop('for', 'string', { default: '', platform: 'web' }),
    /* JSON on the web's attribute, such as `{"mod":"Command"}`. */
    prop('key-labels', 'string'),
    prop('keys', 'string', { default: '' }),
    prop('within', ['control', 'document'], { platform: 'web' }),
  ],
  states: ['settled'],
  tree: [
    box('kbd', { element: 'key', label: derive('kbd-words') }, [
      region('default'),
      unless(
        'caps',
        when('keys', text('chord', { label: derive('kbd-words'), says: derive('kbd-keys') })),
      ),
      /* Only a chord `keys` names is drawn as caps: with no `keys`, the web
         draws the label passed in, under `caps` or not. */
      when(
        'caps',
        when(
          'keys',
          repeat('cap', { each: derive('kbd-key-list'), key: 'at' }, [
            /* Drawn only where the platform writes a separator: none before the
             first key, and none between two glyphs on an Apple keyboard. */
            wrap('separator', { while: field('separator') }, [
              text('plus', { decorative: true, says: field('separator') }),
            ]),
            box('key', {}, [text('label', { label: field('said'), says: field('key') })]),
          ]),
        ),
      ),
    ]),
  ],
})
