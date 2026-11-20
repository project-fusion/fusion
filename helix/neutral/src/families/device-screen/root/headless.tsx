import {
  Announce,
  headless,
  number,
  oneOf,
  Pressable,
  Slot,
  string,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Device Screen's headless tier: a device's screen, drawn from a stream a
 * page supplies, with the hardware buttons that send presses back to it.
 *
 * **The web's alone.** Device Screen pictures a device in a frame for a web
 * page, as a tool that mirrors a simulator or a phone on a desktop does: it
 * draws a phone's body around a stream and turns the browser's pointer and
 * keys into taps, swipes and key presses for that device. A phone is itself
 * the device and has no other device to frame, so a phone's
 * `HelixDeviceScreen` draws nothing, and a universal app's shared screens
 * can write it for the web.
 *
 * **Held to `helix-device-screen`.** `helix system check` compares the
 * props, the events, the states, the regions, and the parts with what the
 * manifest says the element has. The hardware buttons are Icon Buttons, each
 * named by a Tooltip, and the web draws each one only where `controls` names
 * it.
 */
export default headless('device-screen', {
  props: {
    backLabel: 'Back',
    controls: string(),
    controlsLabel: 'Device controls',
    controlsPlacement: oneOf(['bottom', 'end', 'start', 'top']),
    fallbackLabel: 'Device',
    forwardShortcuts: false,
    fullscreenLabel: 'Fill the screen',
    homeLabel: 'Home',
    keysHintLabel: 'Keys you press go to the device. Press Tab to leave the screen.',
    label: '',
    loading: false,
    loadingLabel: web(string()),
    loadingText: 'Connecting to the device',
    powerLabel: 'Power',
    readonly: false,
    recentsLabel: 'Recent apps',
    roleLabel: 'screen',
    rotateLeftLabel: 'Rotate left',
    rotateRightLabel: 'Rotate right',
    rotation: 0,
    screenHeight: number(),
    screenshotLabel: 'Take a screenshot',
    screenWidth: number(),
    shape: oneOf(['circle', 'square']),
    showTouches: false,
    volumeDownLabel: 'Volume down',
    volumeUpLabel: 'Volume up',
  },
  events: {
    deviceButton: ['button', 'duration'],
    deviceKey: ['altKey', 'code', 'ctrlKey', 'key', 'metaKey', 'phase', 'repeat', 'shiftKey'],
    deviceScreenshot: [],
    deviceScroll: ['deltaX', 'deltaY', 'height', 'width', 'x', 'y'],
    deviceSwipe: ['duration', 'fromX', 'fromY', 'height', 'toX', 'toY', 'width'],
    deviceTap: ['duration', 'height', 'width', 'x', 'y'],
    deviceText: ['text'],
    deviceTouch: ['height', 'id', 'phase', 'width', 'x', 'y'],
  },
  states: ['empty', 'fullscreen', 'loading', 'readonly', 'settled', 'sideways', 'touching'],
  platform: 'web',
  render: ({ props }) => (
    <View part="region">
      <View part="header">
        <Slot name="header" />
      </View>
      <View part="device">
        {/* The buttons, a row above the device, a row below it, or a column
            beside it, as `controls-placement` says. */}
        <View
          label={props.controlsLabel}
          part="controls"
          role="toolbar"
        >
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.backLabel, raised: true }}
            part="back"
          >
            <Slot name="back-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.homeLabel, raised: true }}
            part="home"
          >
            <Slot name="home-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.recentsLabel, raised: true }}
            part="recents"
          >
            <Slot name="recents-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.powerLabel, raised: true }}
            part="power"
          >
            <Slot name="power-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.volumeUpLabel, raised: true }}
            part="volume-up"
          >
            <Slot name="volume-up-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.volumeDownLabel, raised: true }}
            part="volume-down"
          >
            <Slot name="volume-down-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.rotateLeftLabel, raised: true }}
            part="rotate-left"
          >
            <Slot name="rotate-left-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.rotateRightLabel, raised: true }}
            part="rotate-right"
          >
            <Slot name="rotate-right-icon" />
          </Wrap>
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.screenshotLabel, raised: true }}
            part="screenshot"
          >
            <Slot name="screenshot-icon" />
          </Wrap>
          <Slot name="controls" />
          <Wrap
            draws="icon-button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ label: props.fullscreenLabel, raised: true }}
            part="fullscreen"
          >
            <Slot name="fullscreen-icon" />
          </Wrap>
          {/* The parts each button's Tooltip exports. */}
          <View
            also={{
              'tooltip-arrow-bottom': true,
              'tooltip-arrow-left': true,
              'tooltip-arrow-right': true,
              'tooltip-arrow-top': true,
            }}
            part="tooltip-arrow"
          />
          <View
            also={{
              'tooltip-surface-bottom': true,
              'tooltip-surface-left': true,
              'tooltip-surface-right': true,
              'tooltip-surface-top': true,
            }}
            part="tooltip-surface"
          />
        </View>
        <View part="bezel">
          <Pressable
            label={props.label}
            part="screen"
          >
            <View part="picture">
              <Slot />
            </View>
            <View
              also={{ 'touch-held': true }}
              ariaHidden
              part="touch"
            />
            <View
              ariaHidden
              part="loading"
            >
              <Slot name="loading" />
            </View>
          </Pressable>
          <View part="empty">
            <Slot name="empty" />
          </View>
          <Slot name="bezel" />
        </View>
      </View>
      <View part="footer">
        <Slot name="footer" />
      </View>
      <View
        ariaHidden
        part="keys-hint"
      />
      <Announce part="live" />
    </View>
  ),
})
