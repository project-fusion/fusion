import { bind, box, derive, event, headless, not, prop, region, when } from '../../../tree.js'

/**
 * QR Code's headless tier: a scannable code for a short piece of text.
 *
 * **The code is a picture with a name**: its `label`, or with none its
 * `code-label`, with the value after it where the value is a web address.
 * Any other value is never read, since it may carry a secret. It is drawn as
 * two paths, the body in the `shape` it names and the three corner squares
 * always square, inside a quiet zone of four modules.
 *
 * **The level is `correction`, or `H` while the `logo` region holds a
 * mark**, and `M` otherwise. A value too long for the level draws no code:
 * the element is in `overflow`, sends `error`, and shows its `fallback`,
 * on the first render too, and again for each other value or level that
 * does not fit.
 *
 * **Saving the code as a file is the web's**: `toSvg()`, `toPng()` and
 * `download()` read the drawn page.
 */
export default headless('qr-code', {
  derived: {
    drawn: derive('qr-code-drawn'),
    finders: derive('qr-code-finders'),
    modules: derive('qr-code-modules'),
    name: derive('qr-code-name'),
    overflow: derive('qr-code-overflow'),
    overflowed: derive('qr-code-overflowed'),
  },
  events: [event('error', { arrives: true, bare: true, follows: 'overflowed' })],
  props: [
    prop('address-label', 'string', { default: '{code}, {address}' }),
    prop('code-label', 'string', { default: 'QR code' }),
    prop('correction', ['H', 'L', 'M', 'Q']),
    prop('label', 'string', { default: '' }),
    prop('shape', ['dots', 'rounded', 'square']),
    prop('value', 'string', { default: '' }),
  ],
  states: ['overflow', 'settled'],
  tree: [
    when(
      'drawn',
      box('code', { label: bind('name'), role: 'img', viewBox: '0 0 100 100' }, [
        box('modules', { d: bind('modules'), shape: 'path' }),
        box('finders', { d: bind('finders'), shape: 'path' }),
      ]),
    ),
    when('overflow', box('fallback', {}, [region('fallback')])),
    box('logo', { hidden: not('logo') }, [region('logo')]),
  ],
})
