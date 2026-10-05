import { describe, expect, test } from 'bun:test'
import { reactNativeProp, reactPropFor } from './react-bridge.js'

describe('the prop React reads for a relayed native event', () => {
  test('is the name with its first letter raised, for a single word', () => {
    expect(reactNativeProp('error')).toBe('onError')
    expect(reactNativeProp('seeked')).toBe('onSeeked')
  })

  /* `onTimeupdate` is no prop React has, so a consumer writing React's own
     `onTimeUpdate` on a player was never bound on a hydrated page. */
  test('is React’s own spelling for two words run together', () => {
    expect(
      [
        'canplay',
        'canplaythrough',
        'durationchange',
        'loadeddata',
        'loadedmetadata',
        'loadstart',
        'ratechange',
        'scrollend',
        'timeupdate',
        'volumechange',
      ].map(reactNativeProp),
    ).toEqual([
      'onCanPlay',
      'onCanPlayThrough',
      'onDurationChange',
      'onLoadedData',
      'onLoadedMetadata',
      'onLoadStart',
      'onRateChange',
      'onScrollEnd',
      'onTimeUpdate',
      'onVolumeChange',
    ])
  })

  test('is what the bridge binds for a relay that does not bubble', () => {
    expect(reactPropFor(new Event('timeupdate'))).toBe('onTimeUpdate')
    expect(reactPropFor(new Event('volumechange'))).toBe('onVolumeChange')
    // A bubbling relay already reaches React's root listener.
    expect(reactPropFor(new Event('timeupdate', { bubbles: true }))).toBeUndefined()
    // One of ours is bound verbatim.
    expect(reactPropFor(new Event('helix-end'))).toBe('onhelix-end')
  })
})
