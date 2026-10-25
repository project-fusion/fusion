import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  not,
  pick,
  pressable,
  prop,
  region,
  toggle,
  unless,
  when,
} from '../../../tree.js'

/**
 * An accordion section's headless tier: a trigger inside a heading, and the
 * content it opens and closes.
 *
 * **A press on the trigger opens or closes the section**, asking
 * `before-open` or `before-close` first, either of which a handler can
 * refuse. Its detail is `open`, the state the section would leave. The
 * trigger says it is expanded or collapsed, never checked. Used alone, with
 * no accordion around it, a section is a disclosure.
 *
 * **Closed content stays drawn**, so it can move as it opens and closes and
 * its words are in the page: `hidden="until-found"` and `inert` on the web,
 * and on a phone drawn with no press and nothing a screen reader reaches.
 *
 * **Open content is a region named by the summary**, so a screen reader
 * lists it among the page's regions. Under the accordion's `single`, the
 * open section's trigger is disabled to a screen reader, since a press
 * cannot close it, and keeps its stop.
 *
 * **`toggle` is sent once the section stands the other way**, however it
 * came to: a press, the page writing `open`, or the accordion closing it as
 * another opens. Its detail is `newState` and `oldState`, `open` or
 * `closed`.
 *
 * **The chevron turns with the section**, at the end of the trigger, at its
 * start under `chevron-placement="start"`, and not at all under `none`. An
 * icon passed into `chevron` takes its place.
 *
 * **The web's**: find in page and `hidden-until-found`, a `name` that makes
 * sections anywhere on the page one set, as `<details name>` does, the
 * content's height written as `--accordion-content-height`, and the
 * heading's level. React Native gives a view no heading level, so a phone
 * announces a heading with none, and `heading-level` is the web's.
 *
 * **Held to `helix-accordion-item`.** `helix family check` compares the
 * props, the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('accordion-item', {
  derived: {
    'chevron-none': derive('accordion-chevron-none'),
    'chevron-start': derive('accordion-chevron-start'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  item: item('accordion'),
  props: [
    prop('chevron-placement', ['auto', 'start', 'end', 'none']),
    prop('default-open', 'boolean', { default: false }),
    prop('disabled', 'boolean', { default: false }),
    prop('heading-level', 'number'),
    prop('open', 'boolean'),
    /* Find in page and a group by name across the page, which a phone has none of. */
    prop('hidden-until-found', 'boolean', { platform: 'web' }),
    prop('name', 'string', { platform: 'web' }),
  ],
  states: ['closing', 'open', 'settled'],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    box('container', {}, [
      box('heading', { level: bind('heading-level'), role: 'heading' }, [
        pressable(
          'trigger',
          { disabled: bind('disabled'), expanded: bind('open'), role: 'button', toggles: true },
          [
            when(
              'chevron-start',
              region('chevron', {}, [box('chevron', { decorative: true, glyph: 'caret-down' })]),
            ),
            region('summary'),
            unless(
              'chevron-none',
              unless(
                'chevron-start',
                region('chevron', {}, [box('chevron', { decorative: true, glyph: 'caret-down' })]),
              ),
            ),
          ],
        ),
      ]),
      box(
        'content',
        {
          closed: not('open'),
          labelledby: 'summary',
          role: pick('open', { true: 'region' }, ''),
        },
        [box('content-inner', {}, [region('default')])],
      ),
    ]),
  ],
})
