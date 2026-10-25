import { bind, box, delay, derive, headless, not, prop, region, unless } from '../../../tree.js'

/**
 * Loader's headless tier: work of unknown length in progress.
 *
 * **The host is a busy progress bar named by `label`**, with no reading,
 * since a loader claims no proportion. It draws a track and an arc that
 * turns, and a `mark` at the center for a logo, which stays still.
 *
 * **`delay` keeps quick work from flashing a loader.** While the wait runs,
 * the loader is `waiting`: its drawing keeps its box and is not drawn, and a
 * screen reader hears nothing. The web and a phone run core's one `delay`.
 *
 * **The loader can stand in for what it wraps.** The `content` region keeps
 * its box, hidden and inert, while the work runs. While `idle`, the loader
 * draws nothing of its own, has no role and is not busy, and the content
 * shows. Clearing `idle` starts `delay` again.
 *
 * **`for`, which marks a region of the page busy by its id, is the web's**:
 * a phone's components name no other component by id.
 */
export default headless('loader', {
  delay: delay({ after: 'delay', restarts: 'idle', waiting: 'waiting' }),
  derived: {
    'spoken-label': derive('loader-name'),
    'spoken-role': derive('loader-role'),
  },
  events: [],
  host: {
    busy: not('idle'),
    decorative: bind('waiting'),
    label: bind('spoken-label'),
    role: bind('spoken-role'),
  },
  props: [
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    prop('delay', 'number', { default: 0 }),
    prop('for', 'string', { default: '', platform: 'web' }),
    prop('idle', 'boolean', { default: false }),
    prop('label', 'string', { default: 'Loading' }),
  ],
  states: ['settled', 'waiting'],
  tree: [
    box('content', { inert: not('idle') }, [region('content')]),
    unless(
      'idle',
      box('svg', { decorative: true, viewBox: '0 0 24 24' }, [
        box('track', { cx: 12, cy: 12, r: 10, shape: 'circle' }),
        box('indicator', { cx: 12, cy: 12, r: 10, shape: 'circle' }),
      ]),
    ),
    unless('idle', box('mark', { decorative: true }, [region('default')])),
  ],
})
