import {
  bare,
  boolean,
  cancelable,
  headless,
  oneOf,
  Pressable,
  property,
  Slot,
  Text,
  View,
} from '../../../render.js'

/**
 * One step of a log, in its headless tier, which folds its lines under a
 * heading with its status and how long it took.
 *
 * **A press on the heading opens and closes it**, asking `before-open` or
 * `before-close` first, and `toggle` says it stood. `default-open` is the step a
 * reader should see, such as the one that failed.
 *
 * **A step drawn from data stands for its heading alone**, its lines being rows
 * beside it, so `logDrawn` draws no content.
 *
 * **What a screen reader hears.** The heading, the status in words, and how long
 * the step took, as the press's name, and whether it is expanded.
 *
 * **The web's**: `hidden="until-found"`, which lets a browser's find open the
 * step, and the fade at a plain step's edges, which a scroll timeline drives.
 *
 * **Held to `helix-log-group`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('log-group', {
  props: {
    defaultOpen: false,
    duration: '',
    heading: '',
    logDrawn: property(false),
    open: boolean(),
    status: oneOf(['done', 'failed', 'pending', 'running', 'skipped']),
    statusLabel:
      '{status, select, pending {waiting} running {running} done {finished} failed {failed} skipped {skipped} other {}}',
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['empty', 'open', 'settled', 'steps'],
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  logGroup: {
    digits: 'digits',
    duration: 'duration',
    durationHidden: 'durationHidden',
    frame: 'frame',
    heading: 'heading',
    heard: 'heard',
    logDrawn: 'logDrawn',
    status: 'status',
    statusHidden: 'statusHidden',
    statusIcon: 'statusIcon',
    statusLabel: 'statusLabel',
  },
  render: ({ logGroup, props }) => (
    <>
      <Pressable
        expanded={props.open}
        label={logGroup.heard}
        part="summary"
        role="button"
        style={{ '--log-digits': logGroup.digits, '--log-frame': logGroup.frame }}
        toggles
      >
        <View
          ariaHidden
          icon="caret-down"
          part="mark"
        />
        {!logGroup.statusHidden && (
          <View
            ariaHidden
            icon={logGroup.statusIcon}
            part="status"
          />
        )}
        <View part="heading">
          <Slot name="heading">
            <Text
              lines={1}
              part="heading-words"
            >
              {props.heading}
            </Text>
          </Slot>
        </View>
        <View
          hidden={logGroup.durationHidden}
          part="duration"
        >
          <Text part="duration-words">{props.duration}</Text>
        </View>
      </Pressable>
      {!props.logDrawn && (
        <View
          open={props.open}
          part="content"
          role={props.open ? 'group' : ''}
        >
          <Slot />
        </View>
      )}
    </>
  ),
})
