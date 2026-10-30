import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixScrolledEvent } from '../app-header/events/index.js'
import type { HelixPressEvent } from '../button/events/index.js'
import type {
  HelixBeforeMoveEvent,
  HelixBeforePasteEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixConnectEvent,
  HelixMoveEvent,
  HelixPastedEvent,
  HelixReconnectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
} from '../canvas/events/index.js'
import type {
  HelixHistoryEvent,
  HelixSendEvent,
  HelixStopEvent,
  HelixTypingEvent,
} from '../chat/events/index.js'
import type { HelixSampleEndEvent, HelixSampleStartEvent } from '../color-picker/events/index.js'
import type { HelixCreateEvent } from '../combobox/events/index.js'
import type { HelixBeforeFollowEvent, HelixFollowEvent } from '../data-table/events/index.js'
import type {
  HelixDeviceButtonEvent,
  HelixDeviceKeyEvent,
  HelixDeviceScreenshotEvent,
  HelixDeviceScrollEvent,
  HelixDeviceSwipeEvent,
  HelixDeviceTapEvent,
  HelixDeviceTextEvent,
  HelixDeviceTouchEvent,
} from '../device-screen/events/index.js'
import type { HelixRejectEvent } from '../file-input/events/index.js'
import type { HelixBeforeFacetEvent, HelixFacetEvent } from '../filter-input/events/index.js'
import type {
  HelixBeforeGraphFilterEvent,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
} from '../graph/events/index.js'
import type { HelixShortcutEvent } from '../kbd/events/index.js'
import type { HelixActionEvent } from '../list/events/index.js'
import type {
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
} from '../map/events/index.js'
import type { HelixBandEvent } from '../meter/events/index.js'
import type { HelixBeforeReadEvent, HelixReadEvent } from '../notifications/events/index.js'
import type { HelixPreviewEvent } from '../rating/events/index.js'
import type { HelixBeforeCollapseEvent, HelixCollapseEvent } from '../splitter/events/index.js'
import type { HelixBeforeExpandEvent } from '../table/events/index.js'
import type {
  HelixTerminalBellEvent,
  HelixTerminalInputEvent,
  HelixTerminalLinkEvent,
  HelixTerminalResizeEvent,
  HelixTerminalRestartEvent,
  HelixTerminalTitleEvent,
} from '../terminal/events/index.js'
import type { HelixTourAskEvent, HelixTourStatusEvent } from '../tour/events/index.js'
import type { HelixNextEvent, HelixPreviousEvent } from '../video/events/index.js'
import type { HelixEndEvent } from '../video-playlist/events/index.js'
import type { HelixRangeChangeEvent } from '../virtual-list/events/index.js'

/* What a family's events fold into `HTMLElementEventMap` is its own augmentation
   in `<family>/events/index.ts`, so this is the one place that reads them all
   through `addEventListener`: a name that fell out of a family's registry types
   its listener as a plain `Event`, which has no `detail`, and the typecheck
   fails here. */
const seen: unknown[] = []

const listenToEveryEvent = (): void => {
  /* app-header */
  {
    const element = document.createElement('helix-headless-app-header')
    element.addEventListener('helix-scrolled', (event) => {
      const detail: HelixScrolledEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* button */
  {
    const element = document.createElement('helix-headless-button')
    element.addEventListener('helix-press', (event) => {
      const detail: HelixPressEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* canvas */
  {
    const element = document.createElement('helix-headless-canvas')
    element.addEventListener('helix-before-move', (event) => {
      const detail: HelixBeforeMoveEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-before-paste', (event) => {
      const detail: HelixBeforePasteEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-before-reconnect', (event) => {
      const detail: HelixBeforeReconnectEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-before-relabel', (event) => {
      const detail: HelixBeforeRelabelEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-canvas-edit', (event) => {
      const detail: HelixCanvasEditEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-canvas-pan', (event) => {
      const detail: HelixCanvasPanEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-canvas-view', (event) => {
      const detail: HelixCanvasViewEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-canvas-zoom', (event) => {
      const detail: HelixCanvasZoomEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-connect', (event) => {
      const detail: HelixConnectEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-move', (event) => {
      const detail: HelixMoveEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-pasted', (event) => {
      const detail: HelixPastedEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-reconnect', (event) => {
      const detail: HelixReconnectEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-relabel', (event) => {
      const detail: HelixRelabelEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-remove', (event) => {
      const detail: HelixRemoveEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* chat */
  {
    const element = document.createElement('helix-headless-chat')
    element.addEventListener('helix-history', (event) => {
      const detail: HelixHistoryEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-send', (event) => {
      const detail: HelixSendEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-stop', (event) => {
      const typed: HelixStopEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-typing', (event) => {
      const detail: HelixTypingEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* color-picker */
  {
    const element = document.createElement('helix-headless-color-picker')
    element.addEventListener('helix-sample-end', (event) => {
      const typed: HelixSampleEndEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-sample-start', (event) => {
      const typed: HelixSampleStartEvent = event
      seen.push(typed)
    })
  }
  /* combobox */
  {
    const element = document.createElement('helix-headless-combobox')
    element.addEventListener('helix-create', (event) => {
      const detail: HelixCreateEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* data table */
  {
    const element = document.createElement('helix-headless-data-table')
    element.addEventListener('helix-before-follow', (event) => {
      const detail: HelixBeforeFollowEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-follow', (event) => {
      const detail: HelixFollowEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* device-screen */
  {
    const element = document.createElement('helix-headless-device-screen')
    element.addEventListener('helix-device-button', (event) => {
      const detail: HelixDeviceButtonEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-key', (event) => {
      const detail: HelixDeviceKeyEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-screenshot', (event) => {
      const typed: HelixDeviceScreenshotEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-device-scroll', (event) => {
      const detail: HelixDeviceScrollEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-swipe', (event) => {
      const detail: HelixDeviceSwipeEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-tap', (event) => {
      const detail: HelixDeviceTapEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-text', (event) => {
      const detail: HelixDeviceTextEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-device-touch', (event) => {
      const detail: HelixDeviceTouchEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* file-input */
  {
    const element = document.createElement('helix-headless-file-input')
    element.addEventListener('helix-reject', (event) => {
      const detail: HelixRejectEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* filter-input */
  {
    const element = document.createElement('helix-headless-filter-input')
    element.addEventListener('helix-before-facet', (event) => {
      const detail: HelixBeforeFacetEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-facet', (event) => {
      const detail: HelixFacetEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* graph */
  {
    const element = document.createElement('helix-headless-graph')
    element.addEventListener('helix-before-graph-filter', (event) => {
      const detail: HelixBeforeGraphFilterEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-filter', (event) => {
      const detail: HelixGraphFilterEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-layout', (event) => {
      const detail: HelixGraphLayoutEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-pan', (event) => {
      const detail: HelixGraphPanEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-part-change', (event) => {
      const detail: HelixGraphPartChangeEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-ready', (event) => {
      const typed: HelixGraphReadyEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-graph-signal', (event) => {
      const detail: HelixGraphSignalEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-graph-zoom', (event) => {
      const detail: HelixGraphZoomEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* kbd */
  {
    const element = document.createElement('helix-headless-kbd')
    element.addEventListener('helix-shortcut', (event) => {
      const detail: HelixShortcutEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* list */
  {
    const element = document.createElement('helix-headless-list')
    element.addEventListener('helix-action', (event) => {
      const typed: HelixActionEvent = event
      seen.push(typed)
    })
  }
  /* map */
  {
    const element = document.createElement('helix-headless-map')
    element.addEventListener('helix-map-cluster', (event) => {
      const detail: HelixMapClusterEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-map-pan', (event) => {
      const detail: HelixMapPanEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-map-part-change', (event) => {
      const detail: HelixMapPartChangeEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-map-ready', (event) => {
      const typed: HelixMapReadyEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-map-rotate', (event) => {
      const detail: HelixMapRotateEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-map-tilt', (event) => {
      const detail: HelixMapTiltEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-map-zoom', (event) => {
      const detail: HelixMapZoomEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* meter */
  {
    const element = document.createElement('helix-headless-meter')
    element.addEventListener('helix-band', (event) => {
      const detail: HelixBandEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* notifications */
  {
    const element = document.createElement('helix-headless-notifications')
    element.addEventListener('helix-before-read', (event) => {
      const detail: HelixBeforeReadEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-read', (event) => {
      const detail: HelixReadEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* rating */
  {
    const element = document.createElement('helix-headless-rating')
    element.addEventListener('helix-preview', (event) => {
      const detail: HelixPreviewEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* splitter */
  {
    const element = document.createElement('helix-headless-splitter')
    element.addEventListener('helix-before-collapse', (event) => {
      const detail: HelixBeforeCollapseEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-collapse', (event) => {
      const detail: HelixCollapseEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* table */
  {
    const element = document.createElement('helix-headless-table')
    element.addEventListener('helix-before-expand', (event) => {
      const detail: HelixBeforeExpandEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* terminal */
  {
    const element = document.createElement('helix-headless-terminal')
    element.addEventListener('helix-terminal-bell', (event) => {
      const typed: HelixTerminalBellEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-terminal-input', (event) => {
      const detail: HelixTerminalInputEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-terminal-link', (event) => {
      const detail: HelixTerminalLinkEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-terminal-resize', (event) => {
      const detail: HelixTerminalResizeEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-terminal-restart', (event) => {
      const typed: HelixTerminalRestartEvent = event
      seen.push(typed)
    })
    element.addEventListener('helix-terminal-title', (event) => {
      const detail: HelixTerminalTitleEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* tour */
  {
    const element = document.createElement('helix-headless-tour')
    element.addEventListener('helix-tour-ask', (event) => {
      const detail: HelixTourAskEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-tour-status', (event) => {
      const detail: HelixTourStatusEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* video */
  {
    const element = document.createElement('helix-headless-video')
    element.addEventListener('helix-next', (event) => {
      const detail: HelixNextEvent['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-previous', (event) => {
      const detail: HelixPreviousEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
  /* video-playlist */
  {
    const element = document.createElement('helix-headless-video-playlist')
    element.addEventListener('helix-end', (event) => {
      const typed: HelixEndEvent = event
      seen.push(typed)
    })
  }
  /* virtual-list */
  {
    const element = document.createElement('helix-headless-virtual-list')
    element.addEventListener('helix-range-change', (event) => {
      const detail: HelixRangeChangeEvent['detail'] = event.detail
      seen.push(detail)
    })
  }
}

const moved = [
  'helix-action',
  'helix-band',
  'helix-before-collapse',
  'helix-before-expand',
  'helix-before-facet',
  'helix-before-graph-filter',
  'helix-before-move',
  'helix-before-paste',
  'helix-before-read',
  'helix-before-reconnect',
  'helix-before-relabel',
  'helix-canvas-edit',
  'helix-canvas-pan',
  'helix-canvas-view',
  'helix-canvas-zoom',
  'helix-collapse',
  'helix-connect',
  'helix-create',
  'helix-before-follow',
  'helix-follow',
  'helix-device-button',
  'helix-device-key',
  'helix-device-screenshot',
  'helix-device-scroll',
  'helix-device-swipe',
  'helix-device-tap',
  'helix-device-text',
  'helix-device-touch',
  'helix-end',
  'helix-facet',
  'helix-graph-filter',
  'helix-graph-layout',
  'helix-graph-pan',
  'helix-graph-part-change',
  'helix-graph-ready',
  'helix-graph-signal',
  'helix-graph-zoom',
  'helix-history',
  'helix-map-cluster',
  'helix-map-pan',
  'helix-map-part-change',
  'helix-map-ready',
  'helix-map-rotate',
  'helix-map-tilt',
  'helix-map-zoom',
  'helix-move',
  'helix-next',
  'helix-pasted',
  'helix-press',
  'helix-preview',
  'helix-previous',
  'helix-range-change',
  'helix-read',
  'helix-reconnect',
  'helix-reject',
  'helix-relabel',
  'helix-remove',
  'helix-sample-end',
  'helix-sample-start',
  'helix-scrolled',
  'helix-send',
  'helix-shortcut',
  'helix-stop',
  'helix-terminal-bell',
  'helix-terminal-input',
  'helix-terminal-link',
  'helix-terminal-resize',
  'helix-terminal-restart',
  'helix-terminal-title',
  'helix-tour-ask',
  'helix-tour-status',
  'helix-typing',
]

describe('the events a headless family sends by itself', () => {
  beforeAll(async () => {
    registerDom()
    await import('../app-header/events/index.js')
    await import('../button/events/index.js')
    await import('../canvas/events/index.js')
    await import('../chat/events/index.js')
    await import('../color-picker/events/index.js')
    await import('../combobox/events/index.js')
    await import('../data-table/events/index.js')
    await import('../device-screen/events/index.js')
    await import('../file-input/events/index.js')
    await import('../filter-input/events/index.js')
    await import('../graph/events/index.js')
    await import('../kbd/events/index.js')
    await import('../list/events/index.js')
    await import('../map/events/index.js')
    await import('../meter/events/index.js')
    await import('../notifications/events/index.js')
    await import('../rating/events/index.js')
    await import('../splitter/events/index.js')
    await import('../table/events/index.js')
    await import('../terminal/events/index.js')
    await import('../tour/events/index.js')
    await import('../video/events/index.js')
    await import('../video-playlist/events/index.js')
    await import('../virtual-list/events/index.js')
  })

  test('are typed on addEventListener for the element of their family', () => {
    listenToEveryEvent()
    expect(seen).toHaveLength(0)
  })

  test('are names core lists once their family loads', async () => {
    const { helixEventNames } = await import('@fusion.dev/helix-core')
    expect(moved.filter((name) => !helixEventNames.has(name))).toEqual([])
  })
})
