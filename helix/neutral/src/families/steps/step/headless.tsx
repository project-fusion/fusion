import { Announce, cancelable, headless, Pressable, Slot, set, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A step's headless tier: its mark, its name, a line under the name, and
 * what the stage holds.
 *
 * **A step is an item of its sequence**, `current` while the sequence is on
 * it, and a press on its name goes to it. A disabled step takes no press.
 *
 * **The mark says the stage's state in a shape**: a tick where it is
 * complete, a dot in a ring where the reader is, and an empty ring ahead.
 * It is decorative, so the name says the state in words: a phone says
 * "Current step" after the current stage's name, and `complete-label` after
 * a finished one's, as the web describes the name by it.
 *
 * **The name is a Button on the web**, and its hover, focus, and disabled
 * looks are Button's, through the parts it exports. A phone draws the name
 * as a press of its own, in a ghost button's look.
 *
 * **A finished stage is said once in words** as it becomes complete: in a
 * live region on the web, and on a phone to the reader who pressed.
 *
 * **What a `linear` sequence writes is the web's**: `locked` and `invalid`.
 *
 * **Held to `helix-step`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('step', {
  memberOf: set('steps', { flag: 'current' }),
  props: {
    complete: false,
    completedLabel: '{name}, {complete}',
    completeLabel: 'Complete',
    current: false,
    disabled: false,
    optional: false,
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
  },
  states: ['invalid', 'locked', 'settled'],
  host: { role: 'listitem' },
  render: ({ props, send }) => (
    <>
      <View
        ariaHidden
        part="marker"
      >
        <Slot name="marker">
          {props.complete && (
            <View
              ariaHidden
              icon="check"
              part="mark"
            />
          )}
          {!props.complete && props.current && (
            <View
              ariaHidden
              icon="record"
              part="mark"
            />
          )}
          {!props.complete && !props.current && (
            <View
              ariaHidden
              icon="circle"
              part="mark"
            />
          )}
        </Slot>
      </View>
      <View part="body">
        <View
          draws="button"
          exports={{ button: true, live: true, spinner: true, text: true }}
          part="label"
          platform="web"
        />
        <Pressable
          chooses
          current={props.current ? 'step' : ''}
          description={derive('step-said')}
          disabled={props.disabled}
          onPress={send.beforeSelect}
          part="label"
          platform="native"
          role="button"
        >
          <Slot />
        </Pressable>
        <View
          hidden
          part="state"
        />
        <View part="description">
          <Slot name="description" />
        </View>
      </View>
      <View part="content">
        <Slot name="content" />
      </View>
      <Announce
        part="live"
        when={props.complete}
      >
        {props.completeLabel}
      </Announce>
    </>
  ),
})
