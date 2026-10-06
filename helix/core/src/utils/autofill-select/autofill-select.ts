import { html, nothing, type TemplateResult } from 'lit'

/** What the hidden native select offers a browser's autofill, and what it does with the answer. */
export interface DrawAutofillOptions {
  /** The autofill token, such as `country` or `cc-exp-month`. Empty draws nothing. */
  autocomplete: string
  /** Whether the select is disabled, which takes it out of autofill too. */
  disabled: boolean
  /** Whether more than one option can be chosen. */
  multiple: boolean
  /** Takes what the browser filled in, as a value: several are joined by commas. */
  onFill: (value: string) => void
  /** The options, each with its value and its words, in order. */
  options: readonly { text: string; value: string }[]
  /** The value now, several joined by commas. */
  value: string
}

/**
 * A pixel, and see-through. A browser fills a field it can lay out, and Safari
 * skips one that is `display: none`, so the select is drawn and never seen, as
 * React Aria's `HiddenSelect` draws it. Fixed, so it takes no room in the host.
 */
const HIDDEN = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'

/**
 * A native `<select>` that a browser's autofill can fill, holding the same
 * options as the custom select beside it. Select and Combobox draw it under
 * `autocomplete`.
 *
 * **A browser fills native fields only.** It reads `autocomplete`, picks an
 * option by its value or its words, and sends `change`, which `onFill` turns
 * into the custom select's value. Chromium fills a select inside a shadow root
 * when its host is inside the form being filled.
 *
 * **Hidden from everyone but the browser**: clipped to a pixel, `aria-hidden`,
 * and out of the tab order, with no `name`, so the form still receives the
 * value once, from the custom select itself.
 */
export const drawAutofill = ({
  autocomplete,
  disabled,
  multiple,
  onFill,
  options,
  value,
}: DrawAutofillOptions): TemplateResult | typeof nothing => {
  if (autocomplete === '') {
    return nothing
  }
  const chosen = value.split(',')
  /* The empty option is never chosen by a fill, so it is dropped here. */
  const fill = (event: Event): void =>
    onFill(
      [...(event.currentTarget as HTMLSelectElement).selectedOptions]
        .map((option) => option.value)
        .filter(Boolean)
        .join(','),
    )
  /* No `selected` on the empty option: a single select with none chosen
     shows its first, which is the empty one. */
  return html`<select aria-hidden="true" autocomplete=${autocomplete} style=${HIDDEN} tabindex="-1" ?disabled=${disabled} ?multiple=${multiple} @change=${fill}><option value=""></option>${options.map(
    (option) =>
      html`<option value=${option.value} ?selected=${chosen.includes(option.value)}>${option.text}</option>`,
  )}</select>`
}
