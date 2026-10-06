import { describe, expect, test } from 'bun:test'
import { qrName } from './name.js'

describe('the name of a code', () => {
  test('is its label where it has one', () => {
    expect(qrName('Our site', 'https://fusion.dev', 'QR code')).toBe('Our site')
  })

  test('is the word and the address for a web address with no label', () => {
    expect(qrName('', 'https://fusion.dev/helix', 'QR code')).toBe(
      'QR code, https://fusion.dev/helix',
    )
    expect(qrName('  ', ' HTTP://example.com ', 'Code QR')).toBe('Code QR, HTTP://example.com')
  })

  /* The value as the name read a secret aloud. */
  test('is the word alone for any other value, so a secret in it is never read', () => {
    expect(qrName('', 'otpauth://totp/Acme:ada?secret=JBSWY3DPEHPK3PXP', 'QR code')).toBe('QR code')
    expect(qrName('', 'WIFI:T:WPA;S:Office;P:hunter2;;', 'QR code')).toBe('QR code')
    expect(qrName('', 'https://fusion.dev and more', 'QR code')).toBe('QR code')
    expect(qrName('', '', 'QR code')).toBe('QR code')
  })
})
