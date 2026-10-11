import {
  auditName,
  customElement,
  type DeviceButton,
  drawIcon,
  FullscreenController,
  HelixDeviceButtonEvent,
  HelixDeviceKeyEvent,
  HelixDeviceScreenshotEvent,
  HelixDeviceScrollEvent,
  HelixDeviceSwipeEvent,
  HelixDeviceTapEvent,
  HelixDeviceTextEvent,
  HelixDeviceTouchEvent,
  HelixElement,
  hostAria,
  numberConverter,
  SPOKEN_RULE,
  TOUCHES_RULE,
  words,
} from '@fusion.dev/helix-core'
import {
  arrowClockwise,
  arrowCounterClockwise,
  camera,
  caretLeft,
  cornersOut,
  house,
  power,
  speakerHigh,
  speakerLow,
  square,
} from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { gestureOf } from '../gesture.js'
import { type Fraction, quarterTurns, turn, unturn, unturnDistance } from '../turn.js'

/** A screen's size, in the units its device takes input in. */
interface ScreenSize {
  height: number
  width: number
}

/** One finger on the screen, from landing to lifting. */
interface Finger {
  /** Where it is now, as a fraction of the screen in the device's own way up. */
  at: Fraction
  /** Where it landed, the same way. */
  from: Fraction
  /** The furthest it has strayed from where it landed, in CSS pixels. */
  furthest: number
  /** The number its touches are sent under, and the next one for its mirror. */
  id: number
  /** When it landed, from `performance.now()`. */
  landed: number
  /** Whether a second touch is sent opposite it, for a pinch from a mouse. */
  mirror: boolean
  /** Where it landed on the page, in CSS pixels. */
  startX: number
  startY: number
}

/** A ring drawn on the screen where a touch is or was. */
interface Mark {
  /** Where it is drawn, as a fraction of the drawn screen. */
  at: Fraction
  /** How long a swipe's ring takes to travel, in milliseconds. */
  duration?: number
  /** Whether a finger is holding it there now. */
  held: boolean
  key: number
  /** Where a swipe's ring travels to. */
  to?: Fraction
}

/** How long a ring from `showTap()` or `showSwipe()` stays after it lands, in milliseconds. */
const MARK_SHOWS = 700

/** How far one line of a wheel scrolls, in CSS pixels, for a wheel that counts in lines. */
const LINE = 16

/** The controls drawn while `controls` is absent. */
const RESTING_CONTROLS = 'home screenshot'

/** Whether a key press is the one that moves focus on, which the screen never keeps. */
const leaves = (event: KeyboardEvent): boolean =>
  event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * Whether a key press is the paste shortcut, which pastes in every mode. By
 * the physical key as well as the character, since a Russian layout's V types
 * `м`.
 */
const pastes = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  (event.code === 'KeyV' || event.key.toLowerCase() === 'v')

/**
 * @summary A device's screen, drawn from a stream you supply, that sends taps, swipes, keys, and button presses back to the device.
 *
 * @description
 * Shows the screen of a phone, a tablet, or a watch, such as the iOS Simulator
 * or the Android Emulator, and turns what you do on it into events. Helix does
 * not connect to the device. Put the element that draws the stream inside: a
 * `<video>` fed by WebRTC or Media Source, an `<img>` showing an MJPEG stream,
 * or a `<canvas>` you draw decoded frames on. The frame gives the screen the
 * device's shape and stretches the element to fill it.
 *
 * Set `screen-width` and `screen-height` to the screen's size in the units
 * your device takes input in: points for the iOS Simulator, and pixels for an
 * Android device. Every point an event carries is in those units, beside the
 * `width` and `height` it is measured against. Without them, the frame reads
 * the stream's own size in pixels.
 *
 * **Touches.** Listen in one of two ways, and not both, or the device moves
 * twice:
 * - `helix-device-touch` for each finger as it lands, moves, and lifts, for a
 *   source that takes live touches. A drag and a pinch need it.
 * - `helix-device-tap` and `helix-device-swipe` once the finger lifts, for a
 *   source that takes whole gestures. A long press is a tap with a long
 *   `duration`.
 *
 * Alt, or Option on a Mac, with a drag sends two touches mirrored about the
 * middle of the screen, for a pinch or a turn, as the iOS Simulator does. A
 * wheel or a trackpad over the screen sends `helix-device-scroll`.
 *
 * **Keyboard.** Press Tab to reach the screen, or press the screen. While it
 * has focus:
 *
 * | Key | What it does |
 * |---|---|
 * | Any key | Sends `helix-device-key` as it goes down, and again as it comes up. |
 * | Tab, Shift with Tab | Moves focus on from the screen. Never sent. |
 * | Control, Command, or Alt with a key | Left to the browser, unless `forward-shortcuts` is set. |
 * | Command or Control with V | Sends the clipboard's text as `helix-device-text`. |
 *
 * A key still held when focus leaves is sent as released. The screen has the
 * `application` role, so a screen reader passes every key to it, and its
 * description says how to leave.
 *
 * **Buttons.** `controls` names the hardware buttons to draw: `back`, `home`,
 * `recents`, `power`, `volume`, `rotate`, `screenshot`, and `fullscreen`,
 * `home screenshot` by default. Each sends `helix-device-button` with how long
 * it was held, and the screenshot button sends `helix-device-screenshot`.
 * `press()` and `screenshot()` do the same from a script.
 *
 * Set `rotation` where your source sends frames in the device's natural
 * orientation while the device is turned: the frame turns the picture, and
 * turns every point back. Set `readonly` to show the screen and send nothing,
 * such as while an agent drives the device. The screen is then a picture, and
 * `showTap()` and `showSwipe()` mark where the agent touched it.
 *
 * @since 0.209.0
 * @status experimental
 * @category media
 * @aliases Simulator, Emulator, Device mirror, Remote screen
 * @documentation https://fusion.dev/helix/components/device-screen
 *
 * @slot - The element that draws the stream: a `<video>`, an `<img>`, or a `<canvas>`.
 * @slot back-icon - Replaces the glyph inside the Back button.
 * @slot bezel - A picture of the device drawn over the screen, such as a photograph of a phone with a clear screen. It takes no touches.
 * @slot footer - Content below the device.
 * @slot fullscreen-icon - Replaces the glyph inside the fullscreen button.
 * @slot header - Content above the device, such as its name and state.
 * @slot home-icon - Replaces the glyph inside the Home button.
 * @slot loading - Content shown over the screen while `loading` is set, such as a spinner. `loading-label` by default, which screen readers hear either way.
 * @slot power-icon - Replaces the glyph inside the Power button.
 * @slot recents-icon - Replaces the glyph inside the Recent apps button.
 * @slot rotate-left-icon - Replaces the glyph inside the Rotate left button.
 * @slot rotate-right-icon - Replaces the glyph inside the Rotate right button.
 * @slot screenshot-icon - Replaces the glyph inside the screenshot button.
 * @slot volume-down-icon - Replaces the glyph inside the Volume down button.
 * @slot volume-up-icon - Replaces the glyph inside the Volume up button.
 *
 * @event {HelixDeviceButtonEvent} helix-device-button - A hardware button was pressed, with how long it was held. Press it on the device in response.
 * @event {HelixDeviceKeyEvent} helix-device-key - A key went down or came up while the screen had focus. Press or release it on the device in response.
 * @event {HelixDeviceScreenshotEvent} helix-device-screenshot - A screenshot was asked for. Take one in response.
 * @event {HelixDeviceScrollEvent} helix-device-scroll - A wheel or a trackpad scrolled over the screen. Scroll the device in response.
 * @event {HelixDeviceSwipeEvent} helix-device-swipe - One finger moved across the screen and lifted. Swipe the device in response.
 * @event {HelixDeviceTapEvent} helix-device-tap - One finger touched the screen and lifted near where it landed. Tap the device in response.
 * @event {HelixDeviceTextEvent} helix-device-text - Text was pasted into the screen. Type it on the device in response.
 * @event {HelixDeviceTouchEvent} helix-device-touch - A finger landed, moved, lifted, or was taken away. Touch the device in response.
 *
 * @csspart back - The Back button.
 * @csspart bezel - The body of the device around the screen.
 * @csspart controls - The group of hardware buttons.
 * @csspart device - The box the device is fitted into, which keeps its shape inside it.
 * @csspart footer - The strip below the device.
 * @csspart fullscreen - The button that makes the device fill the screen.
 * @csspart header - The strip above the device.
 * @csspart home - The Home button.
 * @csspart keys-hint - What a screen reader says about the keys when it reaches the screen, as its description. Read by screen readers only.
 * @csspart live - What screen readers hear while `loading` is set: `loading-label`. Read by screen readers only.
 * @csspart loading - The box over the screen that holds the `loading` slot while `loading` is set. Screen readers hear `live` in its place.
 * @csspart picture - The box the stream is drawn in, turned by `rotation`.
 * @csspart power - The Power button.
 * @csspart recents - The Recent apps button.
 * @csspart region - The box that holds the device, its buttons, the header, and the footer.
 * @csspart rotate-left - The Rotate left button.
 * @csspart rotate-right - The Rotate right button.
 * @csspart screen - The device's screen, which takes the touches and the keys.
 * @csspart screenshot - The button that asks for a screenshot.
 * @csspart touch - A ring where a touch is or was.
 * @csspart touch-held - A ring under a finger that is down, beside `touch`, with `show-touches`.
 * @csspart volume-down - The Volume down button.
 * @csspart volume-up - The Volume up button.
 *
 * @cssproperty --device-screen-ratio - The drawn screen's width divided by its height, turned by `rotation`, as a number. Written by the frame once the screen's size is known.
 * @cssproperty --device-screen-rotation - How far the picture is turned, as an angle. The frame writes it from `rotation`.
 * @cssproperty --device-screen-touch-duration - How long a swipe's ring takes to travel, as a time. Written on each ring from `showSwipe()`.
 * @cssproperty --device-screen-touch-to-x - Where a swipe's ring travels to, across the screen, as a percentage. Written on each ring from `showSwipe()`.
 * @cssproperty --device-screen-touch-to-y - Where a swipe's ring travels to, down the screen, as a percentage. Written on each ring from `showSwipe()`.
 * @cssproperty --device-screen-touch-x - Where a ring is, across the screen, as a percentage. Written on each ring.
 * @cssproperty --device-screen-touch-y - Where a ring is, down the screen, as a percentage. Written on each ring.
 *
 * @cssstate empty - No element that draws the stream is inside, which the frame knows once it runs in the browser.
 * @cssstate fullscreen - The device fills the screen.
 * @cssstate loading - `loading` is set.
 * @cssstate readonly - `readonly` is set, and the screen sends nothing.
 * @cssstate sideways - `rotation` turns the picture a quarter, so the drawn screen is the device's height wide.
 * @cssstate touching - A finger is on the screen.
 */
@customElement('helix-headless-device-screen')
export class HelixHeadlessDeviceScreen extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-device-screen': { homeLabel: 'Home' } })`.
   */
  static words = 'helix-device-screen'

  protected static override markRules = [SPOKEN_RULE, TOUCHES_RULE]

  /** The Back button's label. */
  @words
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Which hardware buttons to draw, as a list: `back`, `home`, `recents`,
   * `power`, `volume`, `rotate`, `screenshot`, and `fullscreen`, or `none`.
   * They are drawn in that order whatever order the list is in. Absent is
   * `home screenshot`. `volume` draws Volume up and Volume down, and `rotate`
   * draws Rotate left and Rotate right.
   */
  @property()
  controls?: string

  /** The name of the group of hardware buttons, read by screen readers. */
  @words
  @property({ attribute: 'controls-label' })
  controlsLabel = 'Device controls'

  /**
   * Which side of the device the hardware buttons sit on. Absent and `top`
   * are a row above it, `bottom` is a row below it, and `start` and `end` are
   * a column beside it, as the Android Emulator draws its toolbar. The words
   * are sides, as Carousel's are, and not the corners a map's controls take.
   */
  @property({ attribute: 'controls-placement', reflect: true })
  controlsPlacement?: 'bottom' | 'end' | 'start' | 'top'

  /** The screen's name where `label` is empty and the host has no `aria-label`. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Device'

  /**
   * Also sends key presses with Control, Command, or Alt held, which are left
   * to the browser otherwise. For an app that owns its window. Command or
   * Control with V pastes either way.
   */
  @property({ attribute: 'forward-shortcuts', type: Boolean })
  forwardShortcuts = false

  /** The fullscreen button's label. */
  @words
  @property({ attribute: 'fullscreen-label' })
  fullscreenLabel = 'Fill the screen'

  /** The Home button's label. */
  @words
  @property({ attribute: 'home-label' })
  homeLabel = 'Home'

  /**
   * What a screen reader says about the keys when it reaches the screen,
   * after its name.
   */
  @words
  @property({ attribute: 'keys-hint-label' })
  keysHintLabel = 'Keys you press go to the device. Press Tab to leave the screen.'

  /**
   * The device's name, read by screen readers as the screen's name, such as
   * "iPhone 17 Pro". Name each device on a page with several. Required.
   */
  @property()
  label = ''

  /**
   * Shows the `loading` slot over the screen, for a stream that is starting
   * or has stopped. Screen readers hear `loading-label`.
   */
  @property({ type: Boolean })
  loading = false

  /** What the screen shows and screen readers hear while `loading` is set and nothing is in the `loading` slot. */
  @words
  @property({ attribute: 'loading-label' })
  loadingLabel = 'Connecting to the device'

  /** The Power button's label. */
  @words
  @property({ attribute: 'power-label' })
  powerLabel = 'Power'

  /**
   * Shows the screen and sends nothing: no touches, scrolls, keys, or button
   * presses. The screen is then a picture, out of the tab order, and only
   * the screenshot and fullscreen buttons work.
   */
  @property({ type: Boolean })
  readonly = false

  /** The Recent apps button's label. */
  @words
  @property({ attribute: 'recents-label' })
  recentsLabel = 'Recent apps'

  /**
   * What a screen reader calls the screen in place of its role, after its
   * name: "iPhone 17 Pro, screen". Empty leaves the role.
   */
  @words
  @property({ attribute: 'role-label' })
  roleLabel = 'screen'

  /** The Rotate left button's label. */
  @words
  @property({ attribute: 'rotate-left-label' })
  rotateLeftLabel = 'Rotate left'

  /** The Rotate right button's label. */
  @words
  @property({ attribute: 'rotate-right-label' })
  rotateRightLabel = 'Rotate right'

  /**
   * How far to turn the picture clockwise, in degrees: `90`, `180`, or `270`.
   * For a source that sends frames in the device's natural orientation while
   * the device is turned. Every point is turned back, so events stay in the
   * device's own orientation. A source whose frames turn with the device
   * needs none.
   */
  @property({ converter: numberConverter('rotation', 0, 'degrees') })
  rotation = 0

  /**
   * The screen's height in the units your device takes input in: points for
   * the iOS Simulator, pixels for an Android device. Set with `screen-width`.
   * Set alone, the width follows the stream's shape, and with neither, both
   * are the stream's own size in pixels.
   */
  @property({ attribute: 'screen-height', converter: numberConverter('screen-height', undefined) })
  screenHeight?: number | undefined

  /** The screenshot button's label. */
  @words
  @property({ attribute: 'screenshot-label' })
  screenshotLabel = 'Take a screenshot'

  /**
   * The screen's width in the units your device takes input in, as
   * `screen-height` is. Set alone, the height follows the stream's shape.
   */
  @property({ attribute: 'screen-width', converter: numberConverter('screen-width', undefined) })
  screenWidth?: number | undefined

  /**
   * The screen's outline. Absent is a rectangle with rounded corners;
   * `square` has square corners, as on a phone with a Home button or a
   * television, and `circle` is round, as on a round watch, and takes
   * touches inside the circle only.
   */
  @property({ reflect: true })
  shape?: 'circle' | 'square'

  /**
   * Draws a ring under each finger on the screen, as the iOS Simulator's
   * Show single touches does. Rings from `showTap()` and `showSwipe()` are
   * drawn either way.
   */
  @property({ attribute: 'show-touches', type: Boolean })
  showTouches = false

  /** The Volume down button's label. */
  @words
  @property({ attribute: 'volume-down-label' })
  volumeDownLabel = 'Volume down'

  /** The Volume up button's label. */
  @words
  @property({ attribute: 'volume-up-label' })
  volumeUpLabel = 'Volume up'

  /** Whether the device fills the screen. */
  @state()
  private filled = false

  /** The stream's own size in pixels, once the element drawing it says. */
  @state()
  private intrinsic: ScreenSize | undefined = undefined

  /** The rings on the screen now. */
  @state()
  private marks: Mark[] = []

  /** The fingers on the screen now, by the pointer each one is. */
  private readonly fingers = new Map<number, Finger>()

  /** The most fingers that were down at once since the screen was last bare. */
  private crowd = 0

  /** The keys sent down and not yet up, by their `code`. */
  private readonly held = new Map<string, KeyboardEvent>()

  /** When a hardware button was pressed, so its release can say how long it was held. */
  private heldSince = 0

  /** The next ring's key. */
  private nextMark = 0

  /** The waits that take rings away. */
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  /** The element drawing the stream, while one is listened to. */
  private watched: Element | undefined

  /** A canvas's own size, which changes with no event. */
  private resized: MutationObserver | undefined

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.filled = full
  })

  /** How many quarter turns `rotation` is. */
  private get turns(): 0 | 1 | 2 | 3 {
    return quarterTurns(this.rotation)
  }

  /**
   * The screen's size in the device's own way up, where the page or the stream
   * has said it.
   *
   * **One side from the page is never mixed with the other from the stream**,
   * which counts in pixels where the page may count in points: the missing
   * side is the given one turned by the stream's shape.
   */
  private get size(): ScreenSize | undefined {
    const given = (value: number | undefined): value is number =>
      value !== undefined && Number.isFinite(value) && value > 0
    const { intrinsic, screenHeight: height, screenWidth: width } = this
    if (given(width) && given(height)) {
      return { height, width }
    }
    if (!intrinsic) {
      return undefined
    }
    if (given(width)) {
      return { height: (width * intrinsic.height) / intrinsic.width, width }
    }
    if (given(height)) {
      return { height, width: (height * intrinsic.width) / intrinsic.height }
    }
    return intrinsic
  }

  /**
   * The element drawing the stream: the first child in no named slot, which is
   * what the default slot holds. Read off the children, so it is known before
   * the render, and none on a server.
   */
  private get stream(): Element | undefined {
    return this.knownChildren.find((child) => !child.hasAttribute('slot'))
  }

  /** The screen, where it has been drawn. */
  private get screen(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>('[part="screen"]') ?? null
  }

  /** Whether `controls`, or the resting controls, names a button. */
  private draws(name: string): boolean {
    return (this.controls ?? RESTING_CONTROLS).split(/\s+/).includes(name)
  }

  /**
   * An element's own size in pixels, read by its tag: a server has no
   * `HTMLVideoElement` to compare with.
   */
  private sizeOf(element: Element | undefined): ScreenSize | undefined {
    const read =
      element?.localName === 'video'
        ? {
            height: (element as HTMLVideoElement).videoHeight,
            width: (element as HTMLVideoElement).videoWidth,
          }
        : element?.localName === 'img'
          ? {
              height: (element as HTMLImageElement).naturalHeight,
              width: (element as HTMLImageElement).naturalWidth,
            }
          : element?.localName === 'canvas'
            ? {
                height: (element as HTMLCanvasElement).height,
                width: (element as HTMLCanvasElement).width,
              }
            : undefined
    return read && read.width > 0 && read.height > 0 ? read : undefined
  }

  /** Reads the stream's own size off the element drawing it. */
  private measure(): void {
    const next = this.sizeOf(this.watched)
    if (next?.width !== this.intrinsic?.width || next?.height !== this.intrinsic?.height) {
      this.intrinsic = next
    }
  }

  private readonly handleMeasure = (): void => {
    this.measure()
  }

  /** Stops listening to the element that drew the stream. */
  private unwatch(): void {
    const element = this.watched
    element?.removeEventListener('loadedmetadata', this.handleMeasure)
    element?.removeEventListener('resize', this.handleMeasure)
    element?.removeEventListener('load', this.handleMeasure)
    this.resized?.disconnect()
    this.resized = undefined
    this.watched = undefined
  }

  /**
   * Listens to the element drawing the stream for its size: a video says it
   * on `loadedmetadata` and `resize`, an image on `load`, and a canvas changes
   * its `width` and `height` with no event at all.
   */
  private watch(): void {
    const element = this.stream
    if (element === this.watched) {
      return
    }
    this.unwatch()
    this.watched = element
    element?.addEventListener('loadedmetadata', this.handleMeasure)
    element?.addEventListener('resize', this.handleMeasure)
    element?.addEventListener('load', this.handleMeasure)
    if (element && element.localName === 'canvas') {
      this.resized = new MutationObserver(this.handleMeasure)
      this.resized.observe(element, { attributeFilter: ['height', 'width'], attributes: true })
    }
  }

  /** A stream put in or taken out, which is read again on the next render. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  /**
   * Where a pointer is on the drawn screen, as a fraction of it, or nothing
   * where it is off the screen's shape. `clamp` holds a finger that has left
   * the screen at its edge, as a finger on glass stops at the glass.
   */
  private fractionAt(event: PointerEvent | WheelEvent, clamp: boolean): Fraction | undefined {
    const box = this.screen?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) {
      return undefined
    }
    const u = (event.clientX - box.left) / box.width
    const v = (event.clientY - box.top) / box.height
    if (clamp) {
      return { u: Math.min(1, Math.max(0, u)), v: Math.min(1, Math.max(0, v)) }
    }
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return undefined
    }
    if (this.shape === 'circle' && (u - 0.5) ** 2 + (v - 0.5) ** 2 > 0.25) {
      return undefined
    }
    return { u, v }
  }

  /**
   * The screen's size for an event: the one the page or the stream gave, or
   * the drawn screen's own in CSS pixels where neither has, so the points an
   * event carries agree with the size beside them.
   */
  private sizeFor(): ScreenSize {
    const known = this.size
    if (known) {
      return known
    }
    const box = this.screen?.getBoundingClientRect()
    const width = box?.width ?? 0
    const height = box?.height ?? 0
    return this.turns % 2 === 1 ? { height: width, width: height } : { height, width }
  }

  /** Sends a touch for a finger, and for its mirror where it has one. */
  private sendTouch(phase: 'cancel' | 'down' | 'move' | 'up', finger: Finger): void {
    const { height, width } = this.sizeFor()
    const send = (id: number, at: Fraction): void => {
      this.dispatchEvent(
        new HelixDeviceTouchEvent({ height, id, phase, width, x: at.u * width, y: at.v * height }),
      )
    }
    send(finger.id, finger.at)
    if (finger.mirror) {
      send(finger.id + 1, { u: 1 - finger.at.u, v: 1 - finger.at.v })
    }
  }

  /** The lowest number free for a finger, with the one after it free too for a mirror. */
  private freeId(mirror: boolean): number {
    const taken = new Set<number>()
    for (const finger of this.fingers.values()) {
      taken.add(finger.id)
      if (finger.mirror) {
        taken.add(finger.id + 1)
      }
    }
    let id = 0
    while (taken.has(id) || (mirror && taken.has(id + 1))) {
      id += 1
    }
    return id
  }

  /** How many touches are down, a mirror counting as one of its own. */
  private get touches(): number {
    let count = 0
    for (const finger of this.fingers.values()) {
      count += finger.mirror ? 2 : 1
    }
    return count
  }

  /** The rings under the fingers, with `show-touches`, kept beside the rings that were shown. */
  private holdMarks(): void {
    const shown = this.marks.filter((mark) => !mark.held)
    if (!this.showTouches) {
      if (shown.length !== this.marks.length) {
        this.marks = shown
      }
      return
    }
    const held: Mark[] = []
    for (const [pointer, finger] of this.fingers) {
      held.push({ at: turn(finger.at, this.turns), held: true, key: -1 - pointer * 2 })
      if (finger.mirror) {
        const opposite = { u: 1 - finger.at.u, v: 1 - finger.at.v }
        held.push({ at: turn(opposite, this.turns), held: true, key: -2 - pointer * 2 })
      }
    }
    this.marks = [...shown, ...held]
  }

  /**
   * A finger landing on the screen. The screen takes focus, so keys follow,
   * and keeps the pointer, so a finger that slides off the screen still lifts
   * on it.
   *
   * **The primary button only.** A right click or a middle click is the
   * page's, for a menu or a new tab, and a device has no second finger
   * button to send it to.
   */
  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.readonly || (event.pointerType !== 'touch' && event.button !== 0)) {
      return
    }
    const drawn = this.fractionAt(event, false)
    const screen = this.screen
    if (!(drawn && screen)) {
      return
    }
    /* The press would select the page's text or start dragging the image the
       stream is drawn in, and neither is a touch. Focus is given by hand, as
       the default that would have given it is gone. */
    event.preventDefault()
    screen.focus({ preventScroll: true })
    try {
      screen.setPointerCapture(event.pointerId)
    } catch {
      /* A pointer the browser has already let go of, which ends in a cancel. */
    }
    const mirror = event.altKey && event.pointerType !== 'touch'
    const at = unturn(drawn, this.turns)
    const finger: Finger = {
      at,
      from: at,
      furthest: 0,
      id: this.freeId(mirror),
      landed: performance.now(),
      mirror,
      startX: event.clientX,
      startY: event.clientY,
    }
    this.fingers.set(event.pointerId, finger)
    this.crowd = Math.max(this.crowd, this.touches)
    this.toggleState('touching', true)
    this.sendTouch('down', finger)
    this.holdMarks()
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const finger = this.fingers.get(event.pointerId)
    const drawn = finger ? this.fractionAt(event, true) : undefined
    if (!(finger && drawn)) {
      return
    }
    finger.at = unturn(drawn, this.turns)
    finger.furthest = Math.max(
      finger.furthest,
      Math.hypot(event.clientX - finger.startX, event.clientY - finger.startY),
    )
    this.sendTouch('move', finger)
    this.holdMarks()
  }

  /**
   * A finger lifting, or the browser taking it away. Once the screen is bare,
   * one finger that lifted is a tap or a swipe; a touch that had more fingers
   * on it, or that the browser took away, is neither.
   */
  private readonly handlePointerUp = (event: PointerEvent): void => {
    const finger = this.fingers.get(event.pointerId)
    if (!finger) {
      return
    }
    const canceled = event.type === 'pointercancel'
    const drawn = canceled ? undefined : this.fractionAt(event, true)
    if (drawn) {
      finger.at = unturn(drawn, this.turns)
    }
    this.fingers.delete(event.pointerId)
    this.sendTouch(canceled ? 'cancel' : 'up', finger)
    if (this.fingers.size === 0) {
      const alone = this.crowd === 1 && !canceled
      this.crowd = 0
      this.toggleState('touching', false)
      if (alone) {
        this.sendGesture(finger)
      }
    }
    this.holdMarks()
  }

  /** Sends what one finger did, as a tap or a swipe. */
  private sendGesture(finger: Finger): void {
    const { height, width } = this.sizeFor()
    const duration = Math.max(0, Math.round(performance.now() - finger.landed))
    if (gestureOf(finger.furthest) === 'tap') {
      this.dispatchEvent(
        new HelixDeviceTapEvent({
          duration,
          height,
          width,
          x: finger.from.u * width,
          y: finger.from.v * height,
        }),
      )
      return
    }
    this.dispatchEvent(
      new HelixDeviceSwipeEvent({
        duration,
        fromX: finger.from.u * width,
        fromY: finger.from.v * height,
        height,
        toX: finger.at.u * width,
        toY: finger.at.v * height,
        width,
      }),
    )
  }

  /**
   * A wheel or a trackpad over the screen, which scrolls the device and not
   * the page. Control or Command with the wheel is the page's zoom, and a
   * trackpad's pinch arrives as it, so it stays the page's unless
   * `forward-shortcuts` is set.
   */
  private readonly handleWheel = (event: WheelEvent): void => {
    if (this.readonly || ((event.ctrlKey || event.metaKey) && !this.forwardShortcuts)) {
      return
    }
    const drawn = this.fractionAt(event, false)
    const box = this.screen?.getBoundingClientRect()
    if (!(drawn && box)) {
      return
    }
    event.preventDefault()
    const step = event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? box.height : 1
    const turns = this.turns
    const at = unturn(drawn, turns)
    const by = unturnDistance(
      { u: (event.deltaX * step) / box.width, v: (event.deltaY * step) / box.height },
      turns,
    )
    const { height, width } = this.sizeFor()
    this.dispatchEvent(
      new HelixDeviceScrollEvent({
        deltaX: by.u * width,
        deltaY: by.v * height,
        height,
        width,
        x: at.u * width,
        y: at.v * height,
      }),
    )
  }

  /** Sends a key, and keeps the page from acting on it. */
  private sendKey(event: KeyboardEvent, phase: 'down' | 'up'): void {
    event.preventDefault()
    this.dispatchEvent(
      new HelixDeviceKeyEvent({
        altKey: event.altKey,
        code: event.code,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        phase,
        repeat: phase === 'down' && event.repeat,
        shiftKey: event.shiftKey,
      }),
    )
  }

  /**
   * A key going down on the screen.
   *
   * **Tab is never sent**, so focus can always leave: a screen that kept
   * every key would hold a keyboard reader inside it. **A shortcut is the
   * browser's** unless `forward-shortcuts` is set, so page zoom, find, and
   * the window's own keys keep working. AltGr types a character, and is not
   * a shortcut, although it reports Control and Alt on Windows. The paste
   * shortcut always reaches the browser, which pastes into the screen.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.readonly || event.isComposing || leaves(event) || pastes(event)) {
      return
    }
    const shortcut =
      (event.ctrlKey || event.metaKey || event.altKey) && !event.getModifierState?.('AltGraph')
    if (shortcut && !this.forwardShortcuts) {
      return
    }
    this.held.set(event.code, event)
    this.sendKey(event, 'down')
  }

  /** A key coming up, sent only where its press was: a Tab into the screen lifts on it. */
  private readonly handleKeyup = (event: KeyboardEvent): void => {
    if (!this.held.has(event.code)) {
      return
    }
    this.held.delete(event.code)
    this.sendKey(event, 'up')
  }

  /**
   * Focus leaving with keys still down, which would otherwise stay down on
   * the device: each is sent as released.
   */
  private readonly handleBlur = (): void => {
    for (const [code, pressed] of this.held) {
      this.held.delete(code)
      this.dispatchEvent(
        new HelixDeviceKeyEvent({
          altKey: false,
          code,
          ctrlKey: false,
          key: pressed.key,
          metaKey: false,
          phase: 'up',
          repeat: false,
          shiftKey: false,
        }),
      )
    }
  }

  /** Text pasted into the screen, sent as text. */
  private readonly handlePaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain') ?? ''
    if (this.readonly || text === '') {
      return
    }
    event.preventDefault()
    this.dispatchEvent(new HelixDeviceTextEvent({ text }))
  }

  /** A hardware button going down, so its release can say how long it was held. */
  private readonly handleHoldStart = (): void => {
    this.heldSince = performance.now()
  }

  /**
   * A hardware button pressed, with how long a pointer held it. A press from
   * a key has no length, and says `0`.
   */
  private pressed(button: DeviceButton, event: MouseEvent): void {
    const since = this.heldSince
    this.heldSince = 0
    const duration = event.detail === 0 || since === 0 ? 0 : Math.round(performance.now() - since)
    this.press(button, duration)
  }

  /**
   * Presses a hardware button, as its control does: sends
   * `helix-device-button`. `duration` is how long it is held, in
   * milliseconds.
   */
  press(button: DeviceButton, duration = 0): void {
    this.dispatchEvent(new HelixDeviceButtonEvent({ button, duration: Math.max(0, duration) }))
  }

  /** Asks for a screenshot, as the screenshot button does: sends `helix-device-screenshot`. */
  screenshot(): void {
    this.dispatchEvent(new HelixDeviceScreenshotEvent())
  }

  /**
   * The picture on the screen now, as an image, at the stream's own size and
   * turned by `rotation`. For a page with no sharper screenshot from its
   * source.
   *
   * Fails where there is no stream, where it has not drawn a frame, and where
   * the browser will not let a page read it, such as an image from another
   * origin served without CORS.
   */
  async capture(type = 'image/png', quality?: number): Promise<Blob> {
    const source = this.stream
    if (
      !(
        source instanceof HTMLVideoElement ||
        source instanceof HTMLImageElement ||
        source instanceof HTMLCanvasElement
      )
    ) {
      throw new Error(
        `<${this.localName}> has no stream to capture. Put a <video>, an <img>, or a <canvas> inside it.`,
      )
    }
    const size = this.sizeOf(source)
    if (!size) {
      throw new Error(`<${this.localName}> has no frame to capture yet.`)
    }
    const turns = this.turns
    const canvas = document.createElement('canvas')
    canvas.width = turns % 2 === 1 ? size.height : size.width
    canvas.height = turns % 2 === 1 ? size.width : size.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error(
        `<${this.localName}> could not draw its frame: the browser gave no 2D context.`,
      )
    }
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((turns * Math.PI) / 2)
    context.drawImage(source, -size.width / 2, -size.height / 2, size.width, size.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error(`<${this.localName}> could not write its frame as ${type}.`))
          }
        },
        type,
        quality,
      )
    })
  }

  /**
   * Draws a ring at a point on the screen for a moment, in the device's
   * units, for a touch made elsewhere, such as by an agent. Drawn whether or
   * not `show-touches` is set, and nothing is sent.
   */
  showTap(x: number, y: number): void {
    const at = this.drawnAt(x, y)
    if (at) {
      this.addMark({ at, held: false, key: this.nextMark++ })
    }
  }

  /**
   * Draws a ring that travels from one point to another over `duration`
   * milliseconds, in the device's units, for a swipe made elsewhere, as
   * `showTap()` does for a tap.
   */
  showSwipe(fromX: number, fromY: number, toX: number, toY: number, duration = 300): void {
    const at = this.drawnAt(fromX, fromY)
    const to = this.drawnAt(toX, toY)
    if (at && to) {
      this.addMark({ at, duration: Math.max(0, duration), held: false, key: this.nextMark++, to })
    }
  }

  /**
   * Where a point in the device's units is drawn, as a fraction of the drawn
   * screen, measured against the size the events carry, so a point an event
   * sent is drawn where it came from.
   */
  private drawnAt(x: number, y: number): Fraction | undefined {
    const { height, width } = this.sizeFor()
    if (!(width > 0 && height > 0 && Number.isFinite(x) && Number.isFinite(y))) {
      return undefined
    }
    return turn({ u: x / width, v: y / height }, this.turns)
  }

  /** Adds a ring, and takes it away once it has been seen. */
  private addMark(mark: Mark): void {
    this.marks = [...this.marks, mark]
    const timer = setTimeout(
      () => {
        this.timers.delete(timer)
        this.marks = this.marks.filter((one) => one.key !== mark.key)
      },
      (mark.duration ?? 0) + MARK_SHOWS,
    )
    this.timers.add(timer)
  }

  /** A screen put back on the page listens to its stream again. */
  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.requestUpdate()
    }
  }

  /**
   * Taken off the page mid-touch or with a key down, as a pane closing is:
   * each finger is sent as canceled and each key as released, or the device
   * would hold them down.
   */
  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unwatch()
    for (const timer of this.timers) {
      clearTimeout(timer)
    }
    this.timers.clear()
    for (const finger of this.fingers.values()) {
      this.sendTouch('cancel', finger)
    }
    this.fingers.clear()
    this.crowd = 0
    this.toggleState('touching', false)
    this.handleBlur()
    this.marks = []
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    /* A screen with no name is read as "Device", which says nothing of which
       one. Development builds only. */
    auditName(
      this,
      () => null,
      'device-screen',
      () => this.label !== '',
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The host carries the name, so a consumer's own `aria-label` is the thing
       that wins rather than fighting an attribute this wrote. */
    hostAria(this.internals, { label: this.label })
    this.watch()
    this.measure()
    this.toggleState('empty', this.childrenKnown && this.stream === undefined)
    this.toggleState('fullscreen', this.filled)
    this.toggleState('loading', this.loading)
    this.toggleState('readonly', this.readonly)
    this.toggleState('sideways', this.turns % 2 === 1)
    if (changed.has('showTouches')) {
      this.holdMarks()
    }
  }

  /**
   * The hardware buttons `controls` names, in one fixed order. Each is written
   * out, because a part name behind an interpolation is a part the manifest
   * cannot see.
   */
  protected renderControls(): TemplateResult | typeof nothing {
    const names = [
      'back',
      'home',
      'recents',
      'power',
      'volume',
      'rotate',
      'screenshot',
      'fullscreen',
    ]
    if (!names.some((name) => this.draws(name))) {
      return nothing
    }
    const off = this.readonly
    return html`<div part="controls" role="group" aria-label=${this.controlsLabel}>
      ${
        this.draws('back')
          ? html`<button part="back" aria-label=${this.backLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('back', event)}>
              <slot name="back-icon">${drawIcon(caretLeft)}</slot>
            </button>`
          : nothing
      }
      ${
        this.draws('home')
          ? html`<button part="home" aria-label=${this.homeLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('home', event)}>
              <slot name="home-icon">${drawIcon(house)}</slot>
            </button>`
          : nothing
      }
      ${
        this.draws('recents')
          ? html`<button part="recents" aria-label=${this.recentsLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('recents', event)}>
              <slot name="recents-icon">${drawIcon(square)}</slot>
            </button>`
          : nothing
      }
      ${
        this.draws('power')
          ? html`<button part="power" aria-label=${this.powerLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('power', event)}>
              <slot name="power-icon">${drawIcon(power)}</slot>
            </button>`
          : nothing
      }
      ${
        this.draws('volume')
          ? html`<button part="volume-up" aria-label=${this.volumeUpLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('volume-up', event)}>
                <slot name="volume-up-icon">${drawIcon(speakerHigh)}</slot>
              </button>
              <button part="volume-down" aria-label=${this.volumeDownLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('volume-down', event)}>
                <slot name="volume-down-icon">${drawIcon(speakerLow)}</slot>
              </button>`
          : nothing
      }
      ${
        this.draws('rotate')
          ? html`<button part="rotate-left" aria-label=${this.rotateLeftLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('rotate-left', event)}>
                <slot name="rotate-left-icon">${drawIcon(arrowCounterClockwise)}</slot>
              </button>
              <button part="rotate-right" aria-label=${this.rotateRightLabel} ?disabled=${off} type="button" @pointerdown=${this.handleHoldStart} @click=${(event: MouseEvent) => this.pressed('rotate-right', event)}>
                <slot name="rotate-right-icon">${drawIcon(arrowClockwise)}</slot>
              </button>`
          : nothing
      }
      ${
        this.draws('screenshot')
          ? html`<button part="screenshot" aria-label=${this.screenshotLabel} type="button" @click=${() => this.screenshot()}>
              <slot name="screenshot-icon">${drawIcon(camera)}</slot>
            </button>`
          : nothing
      }
      ${
        this.draws('fullscreen')
          ? html`<button
              part="fullscreen"
              aria-label=${this.fullscreenLabel}
              aria-pressed=${this.filled ? 'true' : 'false'}
              type="button"
              @click=${() => void this.fullscreen.toggle()}
            >
              <slot name="fullscreen-icon">${drawIcon(cornersOut)}</slot>
            </button>`
          : nothing
      }
    </div>`
  }

  /** The rings on the screen, each placed by the custom properties it carries. */
  private renderMarks(): TemplateResult {
    return html`${repeat(
      this.marks,
      (mark) => mark.key,
      (mark) => {
        const place = `--device-screen-touch-x: ${(mark.at.u * 100).toFixed(2)}%; --device-screen-touch-y: ${(mark.at.v * 100).toFixed(2)}%`
        const travel = mark.to
          ? `; --device-screen-touch-to-x: ${(mark.to.u * 100).toFixed(2)}%; --device-screen-touch-to-y: ${(mark.to.v * 100).toFixed(2)}%; --device-screen-touch-duration: ${mark.duration ?? 0}ms`
          : ''
        return html`<span part="touch${mark.held ? ' touch-held' : ''}" aria-hidden="true" style=${place + travel}></span>`
      },
    )}`
  }

  /**
   * The device, its buttons, and the strips around it.
   *
   * **The buttons come before the device in the markup where they are drawn
   * before it**, above it or at its start, and after it otherwise, so the
   * order Tab takes is the order the eye takes. A column at a side is drawn
   * inside the device's box, so it stands beside the device however wide the
   * box is.
   */
  protected override render(): TemplateResult {
    const size = this.size
    const turns = this.turns
    const ratio = size
      ? turns % 2 === 1
        ? size.height / size.width
        : size.width / size.height
      : undefined
    const facts = `${ratio === undefined ? '' : `--device-screen-ratio: ${Number(ratio.toFixed(5))}; `}--device-screen-rotation: ${turns * 90}deg`
    const name = this.label || this.getAttribute('aria-label') || this.fallbackLabel
    const interactive = !this.readonly
    const placement = this.controlsPlacement
    const controls = this.renderControls()
    return html`<div part="region" style=${facts}>
      <div part="header">
        <slot name="header"></slot>
      </div>
      ${placement === undefined || placement === 'top' ? controls : nothing}
      <div part="device">
        ${placement === 'start' ? controls : nothing}
        <div part="bezel">
          <div
            part="screen"
            role=${interactive ? 'application' : 'img'}
            aria-label=${name}
            aria-roledescription=${this.roleLabel || nothing}
            aria-describedby=${interactive ? 'keys-hint' : nothing}
            tabindex=${interactive ? '0' : nothing}
            ?data-touches=${interactive}
            @blur=${this.handleBlur}
            @keydown=${this.handleKeydown}
            @keyup=${this.handleKeyup}
            @paste=${this.handlePaste}
            @pointercancel=${this.handlePointerUp}
            @pointerdown=${this.handlePointerDown}
            @pointermove=${this.handlePointerMove}
            @pointerup=${this.handlePointerUp}
            @wheel=${this.handleWheel}
          >
            <div part="picture">
              <slot @slotchange=${this.handleSlotChange}></slot>
            </div>
            ${this.renderMarks()}
            <div part="loading" aria-hidden="true">
              ${this.loading ? html`<slot name="loading">${this.loadingLabel}</slot>` : nothing}
            </div>
          </div>
          <slot name="bezel"></slot>
        </div>
        ${placement === 'end' ? controls : nothing}
      </div>
      ${placement === 'bottom' ? controls : nothing}
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <span part="keys-hint" id="keys-hint" aria-hidden="true" data-spoken>${interactive ? this.keysHintLabel : ''}</span>
      <span part="live" role="status" data-spoken>${this.loading ? this.loadingLabel : ''}</span>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-device-screen': HelixHeadlessDeviceScreen
  }
}
