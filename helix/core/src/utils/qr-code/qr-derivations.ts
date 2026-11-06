/**
 * QR Code's derivations: what a phone draws of a code from its props, as
 * the web element draws it. A phone's vector is a hundred units square, so
 * each path is scaled from modules into it, with the quiet zone around.
 */
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { textOf } from '../number-format/props.js'
import { QR_QUIET, type QrCorrection, type QrStyle, qrModules, qrPath } from './qr-code.js'

/** The units a phone's vector is drawn in, on each side. */
const UNITS = 100

const LEVELS: ReadonlySet<string> = new Set(['H', 'L', 'M', 'Q'])
const STYLES: ReadonlySet<string> = new Set(['dots', 'rounded', 'square'])

/** Whether a region was passed something. */
const holds = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== false && value !== ''

/** The level a code is encoded at: `correction`, or `H` where it holds a logo, and `M` otherwise. */
const levelOf = (props: DerivationProps): QrCorrection => {
  const set = textOf(props.correction)
  return LEVELS.has(set) ? (set as QrCorrection) : holds(props.logo) ? 'H' : 'M'
}

/** The code's modules, or nothing where it has no value or the value does not fit. */
const modulesOf = (props: DerivationProps) => {
  const value = textOf(props.value)
  return value === '' ? undefined : qrModules(value, levelOf(props))
}

/** One path of the code, in a hundred units with the quiet zone around. */
const pathOf = (props: DerivationProps, only: 'body' | 'finders'): string | undefined => {
  const matrix = modulesOf(props)
  if (matrix === undefined) {
    return undefined
  }
  const shape = textOf(props.shape)
  const style = only === 'finders' || !STYLES.has(shape) ? 'square' : (shape as QrStyle)
  return qrPath(matrix, style, only, {
    offset: QR_QUIET,
    scale: UNITS / (matrix.length + QR_QUIET * 2),
  })
}

/** `qr-code-modules`: the path of the code's body, in the shape `shape` names. */
export const qrCodeModules: Derivation = (props) => pathOf(props, 'body')

/** `qr-code-finders`: the path of the three corner squares, drawn square. */
export const qrCodeFinders: Derivation = (props) => pathOf(props, 'finders')

/** `qr-code-drawn`: whether there is a code to draw, a value that fits. */
export const qrCodeIsDrawn: Derivation = (props) => modulesOf(props) !== undefined

/** `qr-code-overflow`: whether the value is too long for a code, so the fallback shows. */
export const qrCodeIsOverflow: Derivation = (props) =>
  textOf(props.value) !== '' && modulesOf(props) === undefined

/**
 * `qr-code-overflowed`: the level and the value that did not fit, while the
 * value is too long, and `false` while it fits. An event that follows it is
 * sent once for each value and level that overflows, as the web sends
 * `error` when a value too long is replaced by another, or the level changes
 * while it overflows.
 */
export const qrCodeOverflowed: Derivation = (props) =>
  qrCodeIsOverflow(props) === true ? `${levelOf(props)}:${textOf(props.value)}` : false

/**
 * `qr-code-name`: what the code is read as: its `label`, or with none its
 * `code-label`, with the address after it where the value is a web address,
 * in `address-label`. Any other value is never read, since it may carry a
 * secret.
 */
export const qrCodeName: Derivation = (props) => {
  const label = textOf(props.label).trim()
  if (label !== '') {
    return label
  }
  const word = textOf(props['code-label']) || 'QR code'
  const address = textOf(props.value).trim()
  if (!/^https?:\/\/\S+$/iu.test(address)) {
    return word
  }
  const sentence = textOf(props['address-label']) || '{code}, {address}'
  return sentence.replace('{code}', word).replace('{address}', address)
}
