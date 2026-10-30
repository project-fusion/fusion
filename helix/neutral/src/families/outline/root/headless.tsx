import { headless, oneOf, Pressable, Repeat, Slot, Text, View } from '../../../render.js'
import { derive } from '../../../tree.js'

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
 * **Held to `helix-outline`.** `helix system check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('outline', {
  props: {
    behavior: oneOf(['auto', 'instant', 'smooth'], 'auto'),
    fallbackLabel: 'On this page',
    follow: false,
    label: '',
    marks: oneOf(['reading', 'visible'], 'reading'),
    offset: 0,
    variant: oneOf(['rail']),
  },
  events: {
    activate: ['value'],
  },
  states: ['open', 'settled'],
  derived: {
    name: derive('outline-name'),
  },
  sections: {
    follow: 'follow',
    indicator: 'indicator',
    link: 'link',
    list: 'sections',
    marks: 'marks',
    offset: 'offset',
    onChange: 'activate',
    scrollBehavior: 'behavior',
  },
  render: ({ derived, entry, sections }) => (
    <>
      {/* The rail the web's element draws under `variant="rail"`: its ticks follow
          the links passed in, and its surface wraps the heading and the links. */}
      <View
        ariaHidden
        part="ticks"
        platform="web"
      >
        <View
          part="tick"
          platform="web"
        />
      </View>
      <View
        part="surface"
        platform="web"
      />
      <View part="heading">
        <Slot name="heading" />
      </View>
      <View
        label={derived.name}
        labelledby="heading"
        part="nav"
        role="navigation"
      >
        <Slot platform="web" />
        {/* A phone's link for each section the page registers. */}
        <Repeat
          each={sections.list}
          key="id"
          part="links"
        >
          <Pressable
            also={{
              'link-current': entry.marked,
              'link-depth-2': entry['depth-2'],
              'link-depth-3': entry['depth-3'],
              'link-depth-4': entry['depth-4'],
              'link-depth-5': entry['depth-5'],
              'link-depth-6': entry['depth-6'],
            }}
            current={entry.current}
            href={entry.href}
            part="link"
            platform="native"
          >
            <Text part="link-words">{entry.label}</Text>
          </Pressable>
        </Repeat>
        <View
          ariaHidden
          part="indicator"
        >
          <Slot name="indicator" />
        </View>
      </View>
    </>
  ),
})
