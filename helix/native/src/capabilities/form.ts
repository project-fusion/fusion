import type { Form } from '@fusion.dev/helix-core/capabilities/form'
import type { HostInstance } from 'react-native'

/**
 * Does nothing, because on iOS and Android the app owns its forms: it reads a
 * control's value from the control's own events, and shows its own messages.
 * React Native has no form element for a control to belong to.
 */
export const nativeForm: Form<HostInstance> = {
  submit: () => undefined,
  validity: () => undefined,
  value: () => undefined,
}
