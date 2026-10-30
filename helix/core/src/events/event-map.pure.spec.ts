import { describe, expect, test } from 'bun:test'
import { helixEventNames } from './names.js'

/* Core's map keeps the events more than one family sends. Each name below is
   sent by one family, which types it by its own augmentation, so this package
   alone has none of them: the directive fails the typecheck if a name comes
   back into the map. */
const named = (name: keyof HTMLElementEventMap): string => name

describe('the events a family sends by itself', () => {
  test('are not in the event map of the package every family shares', () => {
    // @ts-expect-error helix-scrolled is sent by App Header alone
    const appHeader = named('helix-scrolled')
    // @ts-expect-error helix-aura-fallback is sent by Aura alone
    const aura = named('helix-aura-fallback')
    // @ts-expect-error helix-press is sent by Button alone
    const button = named('helix-press')
    // @ts-expect-error helix-canvas-pan is sent by Canvas alone
    const canvas = named('helix-canvas-pan')
    // @ts-expect-error helix-send is sent by Chat alone
    const chat = named('helix-send')
    // @ts-expect-error helix-sample-start is sent by Color Picker alone
    const colorPicker = named('helix-sample-start')
    // @ts-expect-error helix-create is sent by Combobox alone
    const combobox = named('helix-create')
    // @ts-expect-error helix-before-follow is sent by Data Table alone
    const dataTable = named('helix-before-follow')
    // @ts-expect-error helix-device-tap is sent by Device Screen alone
    const deviceScreen = named('helix-device-tap')
    // @ts-expect-error helix-reject is sent by File Input alone
    const fileInput = named('helix-reject')
    // @ts-expect-error helix-facet is sent by Filter Input alone
    const filterInput = named('helix-facet')
    // @ts-expect-error helix-graph-ready is sent by Graph alone
    const graph = named('helix-graph-ready')
    // @ts-expect-error helix-shortcut is sent by Kbd alone
    const kbd = named('helix-shortcut')
    // @ts-expect-error helix-action is sent by List alone
    const list = named('helix-action')
    // @ts-expect-error helix-map-zoom is sent by Map alone
    const map = named('helix-map-zoom')
    // @ts-expect-error helix-band is sent by Meter alone
    const meter = named('helix-band')
    // @ts-expect-error helix-read is sent by Notifications alone
    const notifications = named('helix-read')
    // @ts-expect-error helix-preview is sent by Rating alone
    const rating = named('helix-preview')
    // @ts-expect-error helix-caret is sent by Sandbox alone
    const sandbox = named('helix-caret')
    // @ts-expect-error helix-collapse is sent by Splitter alone
    const splitter = named('helix-collapse')
    // @ts-expect-error helix-strands-fallback is sent by Strands alone
    const strands = named('helix-strands-fallback')
    // @ts-expect-error helix-before-expand is sent by Table alone
    const table = named('helix-before-expand')
    // @ts-expect-error helix-terminal-bell is sent by Terminal alone
    const terminal = named('helix-terminal-bell')
    // @ts-expect-error helix-tour-ask is sent by Tour alone
    const tour = named('helix-tour-ask')
    // @ts-expect-error helix-next is sent by Video alone
    const video = named('helix-next')
    // @ts-expect-error helix-end is sent by Video Playlist alone
    const videoPlaylist = named('helix-end')
    // @ts-expect-error helix-range-change is sent by Virtual List alone
    const virtualList = named('helix-range-change')
    expect([
      appHeader,
      aura,
      button,
      canvas,
      chat,
      colorPicker,
      combobox,
      dataTable,
      deviceScreen,
      fileInput,
      filterInput,
      graph,
      kbd,
      list,
      map,
      meter,
      notifications,
      rating,
      sandbox,
      splitter,
      strands,
      table,
      terminal,
      tour,
      video,
      videoPlaylist,
      virtualList,
    ]).toHaveLength(27)
  })

  test('are not in the names core lists until their family loads', () => {
    expect(helixEventNames.has('helix-reject')).toBe(false)
    expect(helixEventNames.has('helix-before-open')).toBe(true)
  })
})
