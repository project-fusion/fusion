import { describe, expect, test } from 'bun:test'
import { displayName, startCase, tierOf } from './naming.js'

describe('naming', () => {
  test('a slug becomes words', () => {
    expect(startCase('app-header')).toBe('App Header')
    expect(startCase('button')).toBe('Button')
  })

  test('an initialism stays an initialism', () => {
    /* `qr` capitalised at the first letter gives `Qr`, which is a word nobody
       says. The slug is lower case because a URL is, so what the name came from
       has to be put back by name. */
    expect(startCase('qr-code')).toBe('QR Code')
    expect(startCase('api-key')).toBe('API Key')
  })

  test('and a short word that is not one is left alone', () => {
    // Guessing from length would turn every two-letter word into shouting.
    expect(startCase('is-open')).toBe('Is Open')
    expect(startCase('go-to-page')).toBe('Go To Page')
  })

  test('a tag drops its prefix, and its tier', () => {
    expect(displayName('helix-app-header')).toBe('App Header')
    expect(displayName('helix-headless-card')).toBe('Card')
    expect(displayName('helix-qr-code')).toBe('QR Code')
  })

  test('the tier is read from the prefix, not from a manifest', () => {
    expect(tierOf('helix-headless-card')).toBe('headless')
    expect(tierOf('helix-card')).toBe('styled')
  })
})
