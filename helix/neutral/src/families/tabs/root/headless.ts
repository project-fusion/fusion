import {
  bind,
  box,
  collection,
  event,
  headless,
  pressable,
  prop,
  region,
  when,
} from '../../../tree.js'

/**
 * A tab set's headless tier: what it takes, what it sends, and its parts.
 *
 * **The set holds which tab is chosen, and its tabs and panels join it.** A
 * tab and a panel are items of the set's collection, paired by `value`: the
 * web element reads its children for them, and a native one is joined by
 * them through a context, in render order.
 *
 * **The indicator marks the chosen tab.** It is measured from the chosen
 * tab's box, which sets `indicator-x`, `indicator-y`, and its size, and
 * `data-placed` once it has been placed.
 *
 * **Held to `helix-tabs`.** `helix family check` compares the props, events,
 * states, regions, and parts with what the manifest says the element has.
 */
export default headless('tabs', {
  collection: collection({
    after: 'activate',
    before: 'before-activate',
    chosen: 'active',
    initial: 'default-active',
    /* **The keys come round from the last tab, and choose where they
       arrive**, as the web's tab set does, unless the set is manual. */
    keys: { chooses: true, wrap: true },
    manual: 'manual',
  }),
  events: [
    event('activate', { detail: ['previous', 'value'] }),
    event('before-activate', { cancelable: true, detail: ['value'] }),
    /* A tab's choice, which reaches the set before the set acts on it. */
    event('select', { cancelable: true, detail: ['value'] }),
  ],
  props: [
    prop('active', 'string'),
    prop('default-active', 'string', { default: '' }),
    prop('label', 'string', { default: 'Tabs' }),
    prop('manual', 'boolean', { default: false }),
    prop('orientation', ['horizontal', 'vertical']),
    prop('scroll-controls', 'boolean', { default: false }),
    prop('variant', ['segmented', 'underlined']),
  ],
  states: ['settled'],
  tree: [
    box('tabs', { label: bind('label'), orientation: bind('orientation'), role: 'tablist' }, [
      /* For a pointer, and hidden from screen readers, which reach every tab
           with the list's own keys. Each is drawn while the strip has more
           past its end. */
      when(
        'scroll-controls',
        pressable('scroll-start', { decorative: true, scrolls: 'start' }, [
          region('scroll-start-icon', {}, [
            box('scroll-start-mark', { decorative: true, glyph: 'caret-start' }),
          ]),
        ]),
      ),
      region('default'),
      box('indicator', { decorative: true, marks: 'chosen' }, [region('indicator')]),
      when(
        'scroll-controls',
        pressable('scroll-end', { decorative: true, scrolls: 'end' }, [
          region('scroll-end-icon', {}, [
            box('scroll-end-mark', { decorative: true, glyph: 'caret-end' }),
          ]),
        ]),
      ),
    ]),
    box('panels', {}, [region('panels')]),
  ],
})
