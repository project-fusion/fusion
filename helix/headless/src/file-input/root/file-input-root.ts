import {
  customElement,
  drawIcon,
  HelixChangeEvent,
  HelixFormElement,
  MixinField,
  restoreValue,
} from '@helix-io/core'
import { trash } from '@helix-io/icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../tag/index.js'

/**
 * A file's size, at the largest unit that leaves a number worth reading.
 *
 * Binary steps, because that is what a file system reports and what the number
 * beside it in a finder will say. One decimal place from kilobytes up and none
 * for bytes: `1.2 MB` is the reading, `1.23 MB` is noise, and `1.5 bytes` is not
 * a thing.
 *
 * `Intl.NumberFormat` for the number rather than `toFixed`, so a decimal comma
 * lands where a decimal comma belongs. The unit is not localised with it: `MB`
 * is written the same way in the places this ships, and `Intl`'s own byte units
 * carry no scale to pick from.
 */
const size = (bytes: number, locale?: string): string => {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let step = 0
  while (value >= 1024 && step < units.length - 1) {
    value /= 1024
    step += 1
  }
  const written = new Intl.NumberFormat(locale || undefined, {
    maximumFractionDigits: step === 0 ? 0 : 1,
  }).format(value)
  // One byte is a byte. The plural is only wrong at exactly one and it is the
  // size an empty-ish file has, so it is the one a reader sees while testing.
  const unit = step === 0 && value === 1 ? 'byte' : units[step]
  return `${written} ${unit}`
}

/**
 * What kind of file it is, in the shortest honest form.
 *
 * The subtype of the MIME type, so `image/png` reads `PNG`, which is the word a
 * reader already has for it. A browser leaves `type` empty for anything it does
 * not recognize, so the extension is the fallback: it is what the name already
 * shows, which makes it a poor label and a better one than nothing.
 */
const kind = (file: File): string => {
  const subtype = file.type.split('/')[1]
  if (subtype) {
    return subtype.replace(/^x-/, '').split('+')[0]?.toUpperCase() ?? 'File'
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop() : ''
  return extension ? extension.toUpperCase() : 'File'
}

/**
 * @summary A control for choosing files, by pointer or by dropping them on it.
 *
 * @description
 * **A real `<input type="file">`, kept and made invisible rather than
 * replaced.** It is the only way to open a file picker: the dialog is a
 * privileged action a script cannot start on its own, and it opens for a click
 * on the input or on a `<label>` pointing at it. Every version of this component
 * that draws its own button ends up calling `.click()` on a hidden input
 * anyway, and then has two things a screen reader can find where there is one
 * control.
 *
 * So the input stays, holds the label, the name, the validity and the focus,
 * and the visible trigger is a `<label for>` rather than a button. A label is
 * not focusable and does not need to be: the input is, and Enter and Space on it
 * open the picker because that is what the platform does with a file input.
 *
 * **Dropping is why this is a component rather than an attribute.** A bare file
 * input accepts a drop only on the input itself, which is invisible here, so the
 * field is the drop target and it says when something is over it.
 *
 * **Files are not a value a consumer can hand back.** Every other control here
 * takes the controlled and uncontrolled pair, and this one does not: a `FileList`
 * cannot be constructed from markup, and a consumer writing `value` on a file
 * input is the one thing browsers refuse outright, because a page that could
 * name a file could read it. So this element owns what was chosen, announces it,
 * and offers `clear()` for the one change a consumer can legitimately ask for.
 *
 * **The list under it is the control's own, not decoration.** A file input with
 * files chosen reports "3 files" and nothing else, which is unusable for
 * checking that the right ones were picked. The names are rendered, and each
 * carries the way to take it back out.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases FileUpload, FilePicker, Dropzone, InputFile
 * @documentation https://helix.fusion.dev/components/file-input
 *
 * @slot trigger - What the reader presses to open the picker.
 * @slot hint - Help under the field.
 * @slot feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the chosen files change, with their names.
 *
 * @csspart field - The box that is pressed and dropped on.
 * @csspart control - The file input itself, which carries the label and validity.
 * @csspart icon - A glyph this component draws.
 * @csspart trigger - The label that opens the picker.
 * @csspart list - The chosen files.
 * @csspart file - One chosen file.
 * @csspart detail - Its name and its reading, stacked.
 * @csspart name - Its name.
 * @csspart meta - The row holding its size and kind.
 * @csspart size - How big it is.
 * @csspart kind - What kind of file it is.
 * @csspart remove - The control that takes it back out.
 */
@customElement('helix-base-file-input')
export class HelixBaseFileInput extends MixinField(HelixFormElement) {
  /** Which files the picker offers, as a native `accept` list. */
  @property()
  accept = ''

  /** Whether more than one file can be chosen. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** Which camera or microphone a mobile picker should offer, if any. */
  @property()
  capture?: 'environment' | 'user'

  /** What the trigger reads, where nothing is slotted into it. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose files'

  /** Language tag the sizes are written in. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** What the control removing one file is called, per file. */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove'

  /**
   * Whether something is being dragged over the field.
   *
   * State rather than a property: it is a fact about a gesture in progress and
   * nothing a consumer sets. It reaches the stylesheet as `data-dropping` on an
   * element in this shadow root, never on the host, which is markup a consumer
   * rendered.
   */
  @state()
  private dropping = false

  /**
   * The files chosen, which is the element's own and never assigned.
   *
   * Read from the input rather than mirrored into a field. The input is what
   * the picker filled and what a form submits, so a copy here could only ever
   * disagree with it.
   */
  get files(): File[] {
    return [...(this.control?.files ?? [])]
  }

  /**
   * The input, or nothing where there is no tree to ask.
   *
   * The guard is for the server, whose element shim carries attributes but not
   * traversal: `render` reads `files`, `files` reads this, and an unguarded
   * `querySelector` threw before a single character of markup came out. Nothing
   * is lost by answering `null` there, because a file only ever arrives through
   * a reader and a server has never met one.
   */
  private get control(): HTMLInputElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

  /**
   * Takes every file back out.
   *
   * The one change a consumer can ask for. Setting a `FileList` is refused by
   * every browser for a reason worth keeping, but emptying one is not: nothing
   * about the page learns anything it did not already have.
   */
  clear(): void {
    const control = this.control
    if (!control) {
      return
    }
    control.value = ''
    this.announce()
  }

  /**
   * Drops one file, by index.
   *
   * `removeAt` rather than `remove`, which is `Element`'s own and takes no
   * arguments: shadowing it would break every caller who meant the node.
   *
   * Through `DataTransfer`, which is the only way to build a `FileList`: the
   * type has no constructor and `input.files` takes nothing else. It is the same
   * mechanism a drop uses, so a file put in by dragging and one put in by the
   * picker come back out the same way.
   */
  removeAt(at: number): void {
    const control = this.control
    if (!control || typeof DataTransfer === 'undefined') {
      return
    }
    const keeping = new DataTransfer()
    for (const [index, file] of this.files.entries()) {
      if (index !== at) {
        keeping.items.add(file)
      }
    }
    control.files = keeping.files
    this.announce()
  }

  /** Says what is now chosen, by name, and puts it in the form. */
  private announce(): void {
    this.sync()
    this.requestUpdate()
    this.dispatchEvent(
      new HelixChangeEvent({
        property: 'files',
        value: this.files.map((file) => file.name).join(', '),
      }),
    )
  }

  /**
   * Reports the files and the validity the host stands behind.
   *
   * `FormData` rather than a string, because a file input submits the file
   * itself and several of them under one name. The anchor on `setValidity` is
   * the input, so the browser's own bubble points at something a reader can see
   * rather than at a host with no text in it.
   */
  private sync(): void {
    const data = new FormData()
    if (this.name) {
      for (const file of this.files) {
        data.append(this.name, file)
      }
    }
    this.internals.setFormValue(data)
    const control = this.control
    if (!control) {
      return
    }
    this.internals.setValidity(control.validity, control.validationMessage, control)
    this.refreshFeedback()
  }

  private readonly handleChange = (event: Event): void => {
    // The native `change` is relayed under this element's own name, so a
    // consumer hears one event from one element rather than two from two.
    event.stopPropagation()
    this.announce()
  }

  /*
   * Takes a drop, which a bare file input can only do on itself.
   *
   * The input is invisible here, so the field is the target and the files are
   * put into the input afterwards: that keeps one source of truth, and it is
   * what makes a dropped file and a picked file indistinguishable to a form.
   *
   * `preventDefault` on dragover as well as on drop, because without it the
   * browser navigates to the file and the page is gone.
   */
  private readonly handleDragOver = (event: DragEvent): void => {
    if (this.isDisabled) {
      return
    }
    event.preventDefault()
    this.dropping = true
  }

  private readonly handleDragLeave = (): void => {
    this.dropping = false
  }

  private readonly handleDrop = (event: DragEvent): void => {
    this.dropping = false
    const control = this.control
    if (this.isDisabled || !control || !event.dataTransfer) {
      return
    }
    event.preventDefault()
    const dropped = [...event.dataTransfer.files]
    if (dropped.length === 0) {
      return
    }
    const keeping = new DataTransfer()
    // A single-file control takes the last thing dropped, the way choosing
    // again in the picker replaces rather than adds.
    for (const file of this.multiple ? [...this.files, ...dropped] : dropped.slice(-1)) {
      keeping.items.add(file)
    }
    control.files = keeping.files
    this.announce()
  }

  private readonly handleRemove = (event: Event): void => {
    const at = Number((event.currentTarget as HTMLElement).dataset.at)
    if (Number.isFinite(at)) {
      this.removeAt(at)
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is
    // touched. `willUpdate` is too early: there is no control to read yet.
    this.sync()
  }

  /** Puts focus on the input, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /** Empties it, which is what a form reset means for a file input. */
  formResetCallback(): void {
    if (this.control) {
      restoreValue(this.control, '')
    }
    this.announce()
  }

  /*
   * The hint goes under the field, and the list after both.
   *
   * It was under the list, on the reading that the field and its files are one
   * block and the hint describes the block. Three things say otherwise.
   *
   * A hint is instruction for the next action rather than a note about the
   * result: "up to 10MB each" is a rule for what may be added, and a rule read
   * after the outcome is a rule read too late.
   *
   * Its position has to be stable, and this is the one that decides it. Under
   * the list the hint travels down the page as files are added, a card's height
   * at a time, so the one piece of guidance the control carries is never twice
   * in the same place. Every other field here puts it immediately under the
   * control, and a reader who has learned where to look should not have to
   * relearn it for this one.
   *
   * And feedback stands in place of the hint rather than beside it, so wherever
   * the hint is, an error is. An error about a file that was refused belongs
   * against the control that refused it, not below a list of the ones that were
   * not.
   */
  /**
   * What is known about a chosen file, as tags, behind a seam the styled tier
   * can move.
   *
   * One method for both the size and the kind, because they are the same
   * element saying two things and two methods would be two places to keep in
   * step. Both parts are written out rather than passed in, and that is not
   * style: a part name behind an interpolation is a part the manifest cannot
   * see, so `check:selectors` reported the stylesheet as matching nothing the
   * moment this took the name as an argument.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * base element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderMeta(file: File): TemplateResult {
    return html`<${this.tag('tag')} part="size">${size(file.size, this.locale)}</${this.tag('tag')}>
      <${this.tag('tag')} part="kind">${kind(file)}</${this.tag('tag')}>`
  }

  protected override render(): TemplateResult {
    const files = this.files
    return html`${this.renderLabel()}
      <div
        part="field"
        ?data-dropping=${this.dropping}
        @dragleave=${this.handleDragLeave}
        @dragover=${this.handleDragOver}
        @drop=${this.handleDrop}
      >
        <input
          part="control"
          id="control"
          type="file"
          accept=${this.accept || nothing}
          capture=${this.capture ?? nothing}
          name=${this.name || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
          ?multiple=${this.multiple}
          ?required=${this.required}
          @change=${this.handleChange}
        />
        <label part="trigger" for="control">
          <slot name="trigger">${this.triggerLabel}</slot>
        </label>
      </div>
      <!-- The hint sits under the field and the list goes last, which is the
           one ordering decision this component makes differently from the way it
           reads. Reasoning below the template. -->
      ${this.renderHint()}${this.renderFeedback()}
      ${
        files.length === 0
          ? nothing
          : html`<ul part="list">
              ${files.map(
                (file, at) => html`<li part="file">
                  <span part="detail">
                    <span part="name">${file.name}</span>
                    <span part="meta">
                      ${this.renderMeta(file)}
                    </span>
                  </span>
                  <button
                    part="remove"
                    type="button"
                    aria-label=${`${this.removeLabel} ${file.name}`}
                    data-at=${at}
                    ?disabled=${this.isDisabled}
                    @click=${this.handleRemove}
                  >
                    ${drawIcon(trash)}
                  </button>
                </li>`,
              )}
            </ul>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-file-input': HelixBaseFileInput
  }
}
