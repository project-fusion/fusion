import { el, type Scenario } from '../format.js'

/*
 * The scenarios of QR Code, which sends `error` as a value too long to
 * draw arrives.
 */

/** More characters than a code holds at any level. */
const LONG = 'x'.repeat(4000)

/** QR Codes: a value too long sends `error` once, and again only after a value that fits. */
export const QR_CODE: readonly Scenario[] = [
  {
    family: 'qr-code',
    intents: [
      { kind: 'set', prop: 'value', value: LONG },
      { kind: 'set', prop: 'value', value: 'https://fusion.dev' },
      { kind: 'set', prop: 'value', value: `${LONG}y` },
    ],
    name: 'sends error as a value too long arrives, and again only after one that fits',
    setup: el('helix-qr-code', { correction: 'H', value: 'https://fusion.dev' }),
  },
]
