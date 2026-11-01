/**
 * Keeps a failed submit to one message.
 *
 * A control that draws its own feedback under the field also got the browser's
 * bubble over it, so a reader saw the message twice, measured October 31, 2026.
 * Refusing the `invalid` event removes the bubble. It also removes the focus the
 * browser would have moved to the first invalid control, so the first one takes
 * focus here.
 */
export const reportInPlace = (control: HTMLElement, event: Event): void => {
  event.preventDefault()
  const form = (control as HTMLElement & { form?: HTMLFormElement | null }).form
  const first = form ? [...form.elements].find((element) => element.matches(':invalid')) : control
  if (first === control && event.isTrusted) {
    control.focus()
  }
}
