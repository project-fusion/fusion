import {
  bind,
  box,
  derive,
  event,
  headless,
  live,
  prop,
  region,
  text,
  unless,
  when,
} from '../../../tree.js'

/**
 * Progress's headless tier: how far along a task is, as a bar or a ring.
 *
 * **The host is the progress bar**, named by `label`, or by the words of
 * its `label` region, which a phone draws above the bar and reads as the
 * name. Its reading is the value held inside the range and the words it is
 * read as: `value-text`, the words written on the bar, or the reading as a
 * percentage, in `format-options` where they say another style. An
 * indeterminate bar has no reading of its own.
 *
 * **The fill is a share of the track**, which the web element writes as
 * `--progress-fraction` on the parts that read it: the whole track while
 * indeterminate, where the fill is the segment that travels. Words in the
 * default region are drawn on the bar, or in the middle of the ring.
 *
 * **Arriving at `max` is news**: the bar sends `complete` with the value it
 * arrived at, and says `complete-label` in its live region. A bar that starts
 * full, or is indeterminate, has not arrived.
 */
export default headless('progress', {
  derived: {
    complete: derive('progress-complete'),
    content: bind('default'),
    fraction: derive('progress-fraction'),
    name: derive('progress-name'),
    'reading-max': derive('progress-max'),
    'reading-min': derive('progress-min'),
    'reading-now': derive('progress-now'),
    'reading-said': derive('progress-said'),
    'reading-text': derive('progress-text'),
  },
  events: [
    event('complete', { detail: ['value'], follows: 'complete', gives: { value: 'reading-max' } }),
  ],
  host: {
    label: bind('name'),
    role: 'progressbar',
    valuemax: bind('reading-max'),
    valuemin: bind('reading-min'),
    valuenow: bind('reading-now'),
    valuetext: bind('reading-said'),
  },
  props: [
    prop('complete-label', 'string', { default: 'Complete' }),
    /* JSON on the web's attribute, such as `{"style":"unit","unit":"megabyte"}`. */
    prop('format-options', 'object'),
    prop('indeterminate', 'boolean', { default: false }),
    prop('fallback-label', 'string', { default: 'Progress' }),
    prop('label', 'string', { default: '' }),
    prop('locale', 'string', { default: '' }),
    prop('max', 'number'),
    prop('min', 'number'),
    prop('shape', ['ring']),
    prop('show-value', 'boolean', { default: false }),
    prop('value', 'number'),
    prop('value-text', 'string', { default: '' }),
  ],
  states: ['complete', 'content', 'settled'],
  tree: [
    region('label', { names: true }),
    unless(
      'shape',
      box('track', {}, [
        box('indicator', { '--progress-fraction': bind('fraction') }),
        box('content', { '--progress-fraction': bind('fraction'), decorative: true }, [
          region('default'),
        ]),
        /* The words again, over the fill and cut where it ends, in the ink
           made for it: a phone's way of drawing them in two inks, which the
           web clips a gradient to the glyphs for. */
        box(
          'content-fill',
          { '--progress-fraction': bind('fraction'), decorative: true, platform: 'native' },
          [region('default')],
        ),
      ]),
    ),
    when(
      'shape',
      box('track', { decorative: true, viewBox: 'none' }, [
        box('groove', { shape: 'circle' }),
        box('indicator', {
          '--progress-fraction': bind('fraction'),
          pathLength: 100,
          shape: 'circle',
        }),
      ]),
    ),
    when(
      'shape',
      box('content', { '--progress-fraction': bind('fraction'), decorative: true }, [
        region('default'),
      ]),
    ),
    when(
      'show-value',
      unless(
        'indeterminate',
        box('value', { decorative: true }, [text('reading', { says: bind('reading-text') })]),
      ),
    ),
    live('live', { follows: bind('complete'), says: bind('complete-label') }),
  ],
})
