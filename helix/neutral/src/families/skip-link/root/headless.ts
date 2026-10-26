import { bind, derive, headless, pressable, prop, region, text } from '../../../tree.js'

/**
 * A skip link's headless tier: a link at the start of a page that moves
 * keyboard focus past the header to the main content.
 *
 * **The web's alone.** A skip link answers a page whose header every
 * keyboard user tabs through before the content. A phone's screen has no
 * such page: VoiceOver and TalkBack move by headings and containers, and a
 * hardware keyboard moves between an app's focus groups, which already step
 * past a navigation bar. So a phone's `HelixSkipLink` draws nothing, and a
 * universal app's shared screens can write it for the web.
 *
 * **Held to `helix-skip-link`.** `helix family check` compares the props,
 * the states, the region, and the part with what the manifest says the
 * element has.
 */
export default headless('skip-link', {
  derived: { words: derive('skip-link-words') },
  events: [],
  platform: 'web',
  props: [
    prop('href', 'string', { default: '#main' }),
    prop('fallback-label', 'string', { default: 'Skip to content' }),
    prop('label', 'string', { default: '' }),
  ],
  states: ['settled'],
  tree: [
    pressable('link', { href: bind('href') }, [
      region('default', {}, [text('label-words', { says: bind('words') })]),
    ]),
  ],
})
