import { headless, oneOf, Path, Slot, Svg, View } from '../../../render.js'
import { derive } from '../../../tree.js'

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
  props: {
    addressLabel: '{code}, {address}',
    codeLabel: 'QR code',
    correction: oneOf(['H', 'L', 'M', 'Q']),
    label: '',
    shape: oneOf(['dots', 'rounded', 'square']),
    value: '',
  },
  events: {
    error: { arrives: true, bare: true, follows: 'overflowed' },
  },
  states: ['overflow', 'settled'],
  derived: {
    drawn: derive('qr-code-drawn'),
    finders: derive('qr-code-finders'),
    modules: derive('qr-code-modules'),
    name: derive('qr-code-name'),
    overflow: derive('qr-code-overflow'),
    overflowed: derive('qr-code-overflowed'),
  },
  render: ({ derived, slots }) => (
    <>
      {derived.drawn && (
        <Svg
          label={derived.name}
          part="code"
          role="img"
          viewBox="0 0 100 100"
        >
          <Path
            d={derived.modules}
            part="modules"
          />
          <Path
            d={derived.finders}
            part="finders"
          />
        </Svg>
      )}
      {derived.overflow && (
        <View part="fallback">
          <Slot name="fallback" />
        </View>
      )}
      <View
        hidden={!slots.logo}
        part="logo"
      >
        <Slot name="logo" />
      </View>
    </>
  ),
})
