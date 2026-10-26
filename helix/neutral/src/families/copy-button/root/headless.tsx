import {
  Announce,
  headless,
  oneOf,
  Pressable,
  property,
  Slot,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { copy, derive } from '../../../tree.js'

/**
 * Copy Button's headless tier: a button that copies `value` to the clipboard
 * and confirms the copy.
 *
 * **A press copies, and the button says what became of it** for
 * `feedback-duration`: named by `copied-label` and drawing a check where
 * the text is on the clipboard, and by `error-label` with a cross where the
 * platform refused the write or there was nothing to copy. `copy` is sent
 * once the text is there, with it as `value`, and `copy-error` where it is
 * not. The same words are said to a screen reader.
 *
 * **The words show in a tooltip around the button**, which it draws: its
 * name on hover and focus and the result after a press on the web, the
 * result alone under `tooltip="copy"`, and none under `tooltip="none"`. A
 * phone has no hover, so it shows the result alone. `tooltip-placement` is
 * the side the bubble prefers. `show-label` draws the words beside the icon.
 *
 * **Named by `aria-label`, then `label`**, Copy. Icon Button's press and
 * look, under its own name: `pending` and `disabled` keep a press from
 * copying, and the icons passed into the default, `copied`, and `failed`
 * regions replace the clipboard, the check, and the cross.
 *
 * **The web's**: `from`, which copies from another element on the page by
 * its id, and `name`. A phone has no document to find an element in.
 *
 * **Held to `helix-copy-button`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('copy-button', {
  props: {
    ariaLabel: '',
    copiedLabel: 'Copied',
    disabled: false,
    errorLabel: 'Could not copy',
    fallbackLabel: 'Copy',
    feedbackDuration: 1600,
    focusable: property(true),
    focusableWhenDisabled: false,
    /* `from` is an element on the page by its id, and `name` a form's name. */
    from: web(''),
    label: '',
    name: web(''),
    pending: false,
    pendingLabel: 'Loading',
    showLabel: false,
    tooltip: oneOf(['copy', 'full', 'none']),
    tooltipPlacement: oneOf(
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ],
      'top',
    ),
    value: '',
  },
  events: {
    copy: ['value'],
    copyError: [],
    press: ['pointerType'],
  },
  states: ['copied', 'failed', 'pending', 'pressed', 'settled'],
  derived: {
    copiedWords: derive('copy-button-copied'),
    failedWords: derive('copy-button-failed'),
    name: derive('copy-button-name'),
    tips: derive('copy-button-tips'),
  },
  copy: copy({
    after: 'feedback-duration',
    copied: 'copied',
    failed: 'failed',
    fails: 'copy-error',
    says: 'says',
    sends: 'copy',
    text: 'value',
    told: 'told',
    words: { copied: 'copied-words', failed: 'failed-words', resting: 'name' },
  }),
  render: ({ copy, derived, props, send, state }) => (
    <>
      <Wrap
        draws="tooltip"
        exports={{
          arrow: true,
          'arrow-bottom': true,
          'arrow-left': true,
          'arrow-right': true,
          'arrow-top': true,
          surface: true,
          'surface-bottom': true,
          'surface-left': true,
          'surface-right': true,
          'surface-top': true,
        }}
        /* The result's words, shown while they stand. */
        gives={{
          content: copy.told,
          open: copy.told,
          persist: true,
          placement: props.tooltipPlacement,
        }}
        part="tooltip"
        when={derived.tips}
      >
        <Pressable
          busy={props.pending}
          copies
          disabled={props.disabled}
          focusable-when-disabled={props.focusableWhenDisabled}
          label={copy.says}
          onPress={send.press}
          part="button"
          role="button"
        >
          <Slot
            hidden={!state.copied}
            name="copied"
          >
            <View
              ariaHidden
              icon="check"
              part="mark"
            />
          </Slot>
          <Slot
            hidden={!state.failed}
            name="failed"
          >
            <View
              ariaHidden
              icon="x"
              part="mark"
            />
          </Slot>
          <Slot hidden={copy.told}>
            <View
              ariaHidden
              icon="copy"
              part="mark"
            />
          </Slot>
          {props.pending && (
            <View
              ariaHidden
              part="spinner"
            />
          )}
          {props.showLabel && (
            <View
              ariaHidden
              part="text"
            >
              {/* As wide as the widest of its three words, so the
                  button keeps its width as they change. */}
              <Text
                part="words"
                widest={{
                  copied: derived.copiedWords,
                  failed: derived.failedWords,
                  resting: props.name,
                }}
              >
                {copy.says}
              </Text>
            </View>
          )}
        </Pressable>
      </Wrap>
      <Announce
        part="live"
        when={props.pending}
      >
        {props.pendingLabel}
      </Announce>
    </>
  ),
})
