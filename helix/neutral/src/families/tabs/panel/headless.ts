import { bind, box, event, headless, item, not, prop, region } from '../../../tree.js'

/**
 * A tab panel's headless tier.
 *
 * **A panel is an item of its tab set that never chooses.** It shows while
 * its tab is chosen, and a hidden panel stays mounted, so what was typed into
 * it is there when the reader comes back.
 */
export default headless('tab-panel', {
  events: [event('load')],
  item: item('tabs'),
  props: [
    prop('lazy', 'boolean', { default: false }),
    prop('selected', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
    /* The words of the tab that opens it, which the set passes on. */
    prop('label', 'string', { attribute: false }),
  ],
  states: ['loaded', 'selected', 'settled'],
  /* Under `lazy`, the content is drawn the first time the panel shows, and
     stays. */
  tree: [
    box('panel', { hidden: not('selected'), label: bind('label'), role: 'tabpanel' }, [
      region('default', { lazy: bind('lazy') }),
    ]),
  ],
})
