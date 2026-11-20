import { headless, Pressable, Slot, string } from '@fusion.dev/helix-neutral/render'

/**
 * Acme's button: a press, named by its words or by `label`.
 *
 * **A disabled button is still announced**, and pressing it sends nothing.
 */
export default headless('button', {
  props: {
    disabled: false,
    label: string(),
  },
  events: {
    press: ['pointerType'],
  },
  states: [],
  render: ({ props, send }) => (
    <Pressable
      disabled={props.disabled}
      label={props.label}
      onPress={send.press}
      part="button"
      role="button"
    >
      <Slot part="text" />
    </Pressable>
  ),
})
