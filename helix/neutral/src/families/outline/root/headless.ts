import {
  bind,
  box,
  event,
  field,
  headless,
  pressable,
  prop,
  region,
  repeat,
  sections,
  text,
} from '../../../tree.js'

/**
 * Outline's headless tier: links to the sections of a page, with the link
 * of the section being read marked.
 *
 * **The web reads the page's own links.** The links are the anchors passed
 * in, each a fragment of the page, and the web element finds each section by
 * the id its link names.
 *
 * **A phone draws a link for each section the page registers.** A phone has
 * no document to find a section in by its id, so each section registers its
 * view with `useSection` or as an Outline Section, under its id, its words
 * and its level, and the outline draws a link for each, in the order they
 * were drawn. A press on a link scrolls to its section, at once or gliding
 * as `behavior` says. On the web, an outline with no links passed in draws
 * a link for each Outline Section on the page.
 *
 * **The link of the section being read is marked**, `aria-current` on the
 * web and the current location on a phone: the last section whose top has
 * passed the reading line, `offset` below the top of what the sections
 * scroll in, or under `marks="visible"` every section with part of it on
 * screen. `activate` is sent as that changes, with the section's id as
 * `value`.
 *
 * **`follow` keeps the marked link in view** in a rail that scrolls on its
 * own: a phone gives each link a ref of its own and scrolls the scroll view
 * around the links, never the one the sections scroll in.
 *
 * **The mark travels to the marked link**, measured from the link's box on
 * both platforms, and on a phone moved by the motion driver.
 *
 * **The web's**: `scrollToSection()`.
 *
 * **Held to `helix-outline`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('outline', {
  events: [event('activate', { detail: ['value'] })],
  props: [
    prop('behavior', ['auto', 'instant', 'smooth'], { default: 'auto' }),
    prop('follow', 'boolean', { default: false }),
    prop('label', 'string', { default: 'On this page' }),
    prop('marks', ['reading', 'visible'], { default: 'reading' }),
    prop('offset', 'number', { default: 0 }),
  ],
  sections: sections({
    behavior: 'behavior',
    changes: 'activate',
    follow: 'follow',
    link: 'link',
    list: 'sections',
    mark: 'indicator',
    marks: 'marks',
    offset: 'offset',
  }),
  states: ['settled'],
  tree: [
    box('heading', {}, [region('heading')]),
    box('nav', { label: bind('label'), labelledby: 'heading', role: 'navigation' }, [
      region('default', { platform: 'web' }),
      /* A phone's link for each section the page registers. */
      repeat('links', { each: bind('sections'), key: 'id' }, [
        pressable(
          'link',
          {
            also: {
              'link-current': field('marked'),
              'link-depth-2': field('depth-2'),
              'link-depth-3': field('depth-3'),
              'link-depth-4': field('depth-4'),
              'link-depth-5': field('depth-5'),
              'link-depth-6': field('depth-6'),
            },
            current: field('current'),
            href: field('href'),
            platform: 'native',
          },
          [text('link-words', { says: field('label') })],
        ),
      ]),
      box('indicator', { decorative: true }, [region('indicator')]),
    ]),
  ],
})
