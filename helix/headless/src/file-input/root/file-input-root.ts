import {
  AriaForwardController,
  customElement,
  drawIcon,
  drawStatus,
  fillTemplate,
  formatNumbers,
  HelixBeforeChangeEvent,
  HelixFormElement,
  HelixRejectEvent,
  labelWith,
  MixinField,
  requestChange,
  restoreValue,
  SlottedGlyph,
  StatusController,
} from '@fusion.dev/helix-core'
import { trash } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { type RefusedFile, screenFiles } from '../screen.js'
import { barOf, type FileStatus, saysStatus } from '../status.js'

export type { FileStatus } from '../status.js'

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
 * lands where a decimal comma belongs. The unit is not localized with it: `MB`
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
  /* The extension first, because it is the word a reader has for the file:
     a Word document's subtype is a 59-character vendor string and a text
     file's is `plain`. The subtype only where the name has no extension, and
     only a short one. */
  const extension = /\.([a-z0-9]{1,6})$/i.exec(file.name)?.[1]
  if (extension) {
    return extension.toUpperCase()
  }
  const subtype = file.type.split('/')[1]?.replace(/^x-/, '').split('+')[0] ?? ''
  return /^[a-z0-9]{1,6}$/i.test(subtype) ? subtype.toUpperCase() : 'File'
}

/**
 * @summary A field for choosing files from a picker or by dropping them on it.
 *
 * @description
 * File Input keeps a real `<input type="file">` and makes it invisible. Only a
 * file input opens the file picker: the browser opens it for a click on the
 * input or on a `<label>` that points at it, and a script cannot open it on its
 * own. A custom button would still call `.click()` on a hidden input, and a
 * screen reader would find two controls.
 *
 * The input holds the label, the name, the validity, and the focus, and the
 * visible trigger is a `<label for>`. The label is not focusable. The input is,
 * and Enter and Space on it open the picker.
 *
 * Files arrive from the picker, a drop, or a paste onto the field, and each one
 * is screened: `accept`, `max-file-size`, `max-files` and your own `validate`
 * can refuse it. A refused file is left out, `helix-reject` lists each one with
 * its reason, and a reader hears `rejected-text` with the names filled in.
 * A reader also hears `added-text` for the files a drop or a paste adds, and
 * `removed-text` for a file a remove button takes out, since neither moves
 * focus or says anything on its own. `directory` asks the picker for a folder. `transformFiles` changes the files
 * a field takes before it holds them, such as shrinking an image.
 *
 * Each chosen file is a row: its name, its size and type as tags, and a
 * remove button. `renderFile` draws the row's details your own way, and the
 * `remove-icon` slot replaces the button's icon.
 *
 * **Keyboard.** The input is the tab stop, and each file's remove button is
 * one more.
 *
 * | Key | What it does |
 * |---|---|
 * | Enter, Space | On the input, opens the picker. On a remove button, removes that file and moves focus to the button of the file in its place, or back to the input. |
 * | Control+V, Command+V | Takes files from the clipboard, as a drop does. |
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases FileUpload, FilePicker, Dropzone, InputFile
 * @documentation https://fusion.dev/helix/components/file-input
 *
 * @slot feedback - The message that says what is wrong with the chosen files.
 * @slot hint - Help under the field.
 * @slot label - The label, for content richer than the `label` text.
 * @slot remove-icon - The icon on each file's remove button, in place of the bin. Each button shows a copy.
 * @slot trigger - The content that opens the picker when pressed.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the chosen files change, with their names, and cancelable. Canceling it keeps the files the field had, even when the browser has already written a new pick.
 * @event {HelixRejectEvent} helix-reject - Fired when files arrive and some are left out. `detail.files` lists each with its `reason`: `type`, `size`, `count` or `invalid`, and your `validate` message.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart control - The file input itself, which carries the label and validity.
 * @csspart detail - A file's name, with its size and type below it.
 * @csspart feedback - The message that says what is wrong.
 * @csspart field - The box you press or drop files on.
 * @csspart file - One chosen file.
 * @csspart file-done - A file whose upload `setFileStatus` says is done. Set together with `file`.
 * @csspart file-error - A file whose upload `setFileStatus` says failed. Set together with `file`.
 * @csspart file-uploading - A file whose upload `setFileStatus` says is under way. Set together with `file`.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart kind - A file's type.
 * @csspart kind-cell - The grid cell around the tag, rendered only when the tag sits in a `Tag.Group`.
 * @csspart kind-dismiss - The remove button, when `dismissible`.
 * @csspart kind-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart kind-label - The label, trimmed to its capitals and baseline.
 * @csspart kind-link - The link around the label, when the tag has an `href`.
 * @csspart kind-start - The category before the label.
 * @csspart label - The label above the field.
 * @csspart list - The chosen files.
 * @csspart live - The live region that says `added-text`, `rejected-text`, and `removed-text`. It is rendered from the first time it has something to say.
 * @csspart meta - The row that holds a file's size and type.
 * @csspart name - A file's name.
 * @csspart progress - A file's upload bar, a `<progress>`, while `setFileStatus` gives it a measure or says it is under way.
 * @csspart remove - The control that removes a file.
 * @csspart size - A file's size.
 * @csspart size-cell - The grid cell around the tag, rendered only when the tag sits in a `Tag.Group`.
 * @csspart size-dismiss - The remove button, when `dismissible`.
 * @csspart size-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart size-label - The label, trimmed to its capitals and baseline.
 * @csspart size-link - The link around the label, when the tag has an `href`.
 * @csspart size-start - The category before the label.
 * @csspart status - How a file's upload is going, from `setFileStatus`: the bar and the words.
 * @csspart status-text - The words `setFileStatus` gives a file, such as the reason it failed.
 * @csspart trigger - The label that opens the picker.
 *
 * @cssstate dropping - Files are being dragged over the field.
 * @cssstate has-files - The field holds at least one file.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 */
@customElement('helix-headless-file-input')
export class HelixHeadlessFileInput extends MixinField(HelixFormElement) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    named: () => this.labeled,
    target: () => this.partNamed('control'),
  })

  /**
   * Which files the picker offers and a drop takes, as a native `accept` list.
   *
   * A dropped file the list does not name is left out, because the picker's
   * filter is the only check the platform makes and a drop never meets it.
   */
  @property()
  accept = ''

  /**
   * What a reader hears when a drop or a paste adds files, with `{names}` and
   * `{count}` filled in.
   */
  @property({ attribute: 'added-text' })
  addedText = 'Added: {names}'

  /**
   * Which camera or microphone a mobile picker should offer, if any.
   */
  @property()
  capture?: 'environment' | 'user'

  /**
   * Whether the picker chooses a folder, and the field takes every file in
   * it. The platform's `webkitdirectory`.
   */
  @property({ type: Boolean })
  directory = false

  /**
   * Language tag the sizes are written in.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * The most files the field holds, under `multiple`. Files past it are
   * refused.
   */
  @property({ attribute: 'max-files', type: Number })
  maxFiles?: number

  /**
   * The most bytes one file may have. A larger one is refused.
   */
  @property({ attribute: 'max-file-size', type: Number })
  maxFileSize?: number

  /**
   * Whether more than one file can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /**
   * The name of a file's progress bar, read by screen readers, with `{name}`
   * filled in. A label with no `{name}` has it added after it.
   */
  @property({ attribute: 'progress-label' })
  progressLabel = 'Uploading {name}'

  /**
   * What a reader hears when files are refused, with `{count}` and `{names}`
   * filled in.
   */
  @property({ attribute: 'rejected-text' })
  rejectedText = 'Not added: {names}'

  /**
   * What a reader hears when a file is removed, with `{name}` filled in.
   */
  @property({ attribute: 'removed-text' })
  removedText = 'Removed: {name}'

  /**
   * The accessible name of the control that removes a file. `{name}` is
   * replaced with the file's name.
   *
   * **The name goes in**, so a row of them is heard as which one each
   * removes rather than as "Remove" said once per file. A label with no
   * `{name}` has it added after it.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /**
   * Draws a file's row in place of its name, size, and type: a Lit template, a
   * string, or a DOM node, given the file and its place in the list. The
   * remove button stays beside it.
   */
  @property({ attribute: false })
  renderFile?: (file: File, index: number) => unknown

  /**
   * Your own step between taking files and holding them, such as shrinking an
   * image, as Zag's file upload `transformFiles`. It is given the files taken
   * from one pick, drop, or paste and returns the files to hold, or a promise
   * of them. A promise that rejects refuses those files, with its message.
   */
  @property({ attribute: false })
  transformFiles?: (files: File[]) => File[] | Promise<File[]>

  /**
   * The trigger's text when nothing is slotted into it.
   */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose files'

  /**
   * Your own check on each arriving file, which returns why it is refused, or
   * nothing to take it. A property, since a function cannot be an attribute.
   */
  @property({ attribute: false })
  validate?: (file: File) => string | null | undefined

  /** The live region, rendered from the first time it has something to say. */
  private readonly status = new StatusController(this)

  /** What the page has said of each file's upload, by file. */
  private readonly statuses = new WeakMap<File, FileStatus>()

  /**
   * Shows how a file's upload is going, in its row: a bar for `progress`,
   * from 0 to 1, or a bar without a measure while `state` is `uploading`, and
   * `text` beside it. `state` names the row `file-uploading`, `file-done` or
   * `file-error` beside `file`, and a reader hears `text` when the state
   * becomes `done` or `error`. `null` clears it.
   *
   * The field uploads nothing, as Zag's file upload does not: your page sends
   * the file and says here how it is going.
   */
  setFileStatus(file: File, status: FileStatus | null): void {
    const was = this.statuses.get(file)
    if (status) {
      this.statuses.set(file, status)
      if (saysStatus(status, was)) {
        this.status.say(status.text ?? '')
      }
    } else {
      this.statuses.delete(file)
    }
    this.requestUpdate()
  }

  /**
   * Screens arriving files and commits what is taken, after the files the
   * field keeps, through `transformFiles` where it is set.
   */
  private take(arriving: File[], keeping: File[], picked = false): void {
    const { kept, refused } = screenFiles(arriving, keeping, {
      accept: this.accept,
      maxFileSize: this.maxFileSize,
      maxFiles: this.maxFiles,
      /* The picker already chose as many as the field holds, so only a drop
         or a paste is cut to one. */
      multiple: this.multiple || picked,
      validate: this.validate,
    })
    const taken = kept.filter((file) => !keeping.includes(file))
    const transform = this.transformFiles
    if (!transform || taken.length === 0) {
      this.finish(kept, taken, refused, picked)
      return
    }
    const held = kept.filter((file) => keeping.includes(file))
    Promise.resolve()
      .then(() => transform(taken))
      .then(
        (made) => this.finish([...held, ...made], made, refused, picked),
        (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          this.finish(
            held,
            [],
            [...refused, ...taken.map((file) => ({ file, message, reason: 'invalid' as const }))],
            picked,
          )
        },
      )
  }

  /**
   * Commits what an arrival leaves, sends `helix-reject` for what it refused,
   * and says both.
   *
   * Nothing taken and nothing moved, as when every dropped file is refused, is
   * no change to announce. A pick is the platform's own `change`, relayed
   * whatever it holds, and the picker itself tells a reader what was chosen,
   * so `added-text` is said for a drop or a paste only.
   */
  private finish(next: File[], added: File[], refused: RefusedFile[], picked: boolean): void {
    const same = (one: File[], two: File[]): boolean =>
      one.length === two.length && one.every((file, at) => file === two[at])
    const moved = picked || !(same(next, this.committed) && same(next, this.files))
    const applied = moved && this.commit(next)
    if (refused.length > 0) {
      this.dispatchEvent(new HelixRejectEvent({ files: refused }))
    }
    /* The region arrives empty and takes its words a frame later, since a
       region that arrives with its words is read inconsistently. Cleared
       first, so the same words twice are said twice. */
    const words = [
      applied && !picked && added.length > 0 ? this.listed(this.addedText, added) : '',
      refused.length > 0
        ? this.listed(
            this.rejectedText,
            refused.map((one) => one.file),
          )
        : '',
    ].filter((one) => one !== '')
    if (words.length > 0) {
      this.status.say(words.join(' '))
    }
  }

  /**
   * A sentence about some files, with `{count}` and `{names}` filled in.
   *
   * The names as the page's language lists them, which in English is the comma
   * list it always was: `unit` and `short` join with commas and no "and". The
   * count is written as the language writes a number.
   */
  private listed(sentence: string, files: File[]): string {
    return fillTemplate(sentence, {
      count: formatNumbers(this.lang)(files.length),
      names: new Intl.ListFormat(this.lang || undefined, { style: 'short', type: 'unit' }).format(
        files.map((file) => file.name),
      ),
    })
  }

  /** The element slotted into `remove-icon`, one copy per row's remove button. */
  private readonly removeIcon = new SlottedGlyph()

  private readonly handleRemoveIcon = (event: Event): void => {
    this.removeIcon.read(event.target as HTMLSlotElement)
    this.requestUpdate()
  }

  /** The icon on one row's remove button: a copy of `remove-icon`, or the bin. */
  private removeMark(at: number): unknown {
    return this.removeIcon.copyFor(at) ?? drawIcon(trash)
  }

  /** Takes files pasted onto the field, as a drop takes them. */
  private readonly handlePaste = (event: ClipboardEvent): void => {
    const pasted = [...(event.clipboardData?.files ?? [])]
    if (this.isDisabled || pasted.length === 0) {
      return
    }
    event.preventDefault()
    this.take(pasted, this.files)
  }

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
   * The chosen files. It is read-only.
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
    return this.partNamed<HTMLInputElement>('control')
  }

  /**
   * Removes every chosen file.
   *
   * The one change a consumer can ask for. Setting a `FileList` is refused by
   * every browser for a reason worth keeping, but emptying one is not: nothing
   * about the page learns anything it did not already have.
   */
  clear(): void {
    this.commit([])
  }

  /**
   * Removes one file, by its index.
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
    const gone = this.files[at]
    if (gone && this.commit(this.files.filter((_, index) => index !== at))) {
      this.status.say(fillTemplate(this.removedText, { name: gone.name }))
    }
  }

  /**
   * The files this element last stood behind, so a refusal has somewhere to go.
   *
   * The picker and a drop both write the input before anything here runs, so
   * the list being replaced is gone by the time the request is announced.
   * Nothing else records it: `files` reads the control, which is already the
   * new answer.
   */
  private committed: File[] = []

  /**
   * Asks for a set of files, and puts them in unless a listener refuses.
   *
   * **The request was announced after the fact and nothing read it.** This
   * element dispatched `helix-before-change` from `announce`, after the input
   * had taken the files and after `setFormValue` had reported them, and
   * discarded what the dispatch returned: an `@event` line promising that
   * refusing it left nothing moved, over a veto with no reader. The other
   * direction of that same fault is what `requestChange` exists to prevent, so
   * this goes through it like every other value control.
   *
   * **A refusal puts the input back rather than stopping an assignment**, which
   * is the shape a file input forces. Two of the four paths in are the browser
   * writing `control.files` before this element hears anything, so there is no
   * assignment left to skip and the honest answer is to restore the list the
   * element last stood behind.
   */
  private commit(next: File[]): boolean {
    const control = this.control
    if (!control) {
      return false
    }
    const previous = this.committed
    const applied = requestChange({
      apply: (files) => {
        this.put(control, files)
        this.settle()
      },
      event: (files) =>
        new HelixBeforeChangeEvent({ value: files.map((file) => file.name).join(', ') }),
      host: this,
      next,
    })
    if (!applied) {
      this.put(control, previous)
    }
    return applied
  }

  /**
   * Writes a list onto the input, which is the only way a `FileList` is built.
   *
   * `value = ''` for the empty case rather than an empty `DataTransfer`,
   * because emptying is the one write a control accepts everywhere and a
   * harness without `DataTransfer` still has to be able to clear.
   */
  private put(control: HTMLInputElement, files: File[]): void {
    if (files.length === 0) {
      control.value = ''
      return
    }
    if (typeof DataTransfer === 'undefined') {
      return
    }
    const holding = new DataTransfer()
    for (const file of files) {
      holding.items.add(file)
    }
    control.files = holding.files
  }

  /** Says what is now chosen, by name, and puts it in the form. */
  private settle(): void {
    this.committed = this.files
    this.sync()
    this.requestUpdate()
    /* Under the platform's own names, which is what `onChange` and `onInput`
       bind and what a native file input sends when the chosen files move: both,
       in that order, the way every other control here does.

       Without the explicit `input`, the only one a consumer receives is the
       inner `<input type="file">`'s own, composed out of this shadow root, so
       the documented event does not exist and an undocumented one arrives in
       its place. */
    this.announceInput()
    this.announceChange()
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
    /* **An empty one contributes no entry, and the native control contributes an
       empty file.** Measured, one form holding both: `<input type="file"
       name="nf">` with nothing chosen submits `nf=` carrying a `File` of zero
       bytes and no name, and this submits nothing at all.

       Kept, as a decision rather than an omission. A phantom entry naming a file
       that does not exist is a thing every server reading this form has to know
       to discard, and the reason the platform sends one is compatibility with
       form encodings that predate `FormData`. `value` is excused on this family
       already, for the neighboring reason that the native one is
       `C:\fakepath\name`; this is the same component declining to reproduce a
       lie, one level down. */
    this.internals.setFormValue(data)
    const control = this.control
    if (!control) {
      return
    }
    this.copyValidity(control)
    this.refreshFeedback()
  }

  private readonly handleChange = (event: Event): void => {
    // The native `change` is relayed under this element's own name, so a
    // consumer hears one event from one element rather than two from two.
    event.stopPropagation()
    /* The browser has already written the input, so the request is announced
       for what it holds and a refusal is what puts the previous list back.
       Screened first, since `accept` only filters the picker and the size,
       the count and `validate` are this field's own. */
    this.take(this.files, [], true)
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
    // A single-file control takes the last file it accepts, the way choosing
    // again in the picker replaces what it held, and keeps what it held when
    // it accepts none.
    this.take(dropped, this.files)
  }

  /**
   * Removes a file and keeps focus in the field.
   *
   * The pressed button goes with its file, so focus moves to the file that took
   * its place, or to the one before it, or to the input once the list is empty:
   * left alone, it fell to the page's body.
   */
  private readonly handleRemove = (event: Event): void => {
    const at = Number((event.currentTarget as HTMLElement).dataset.at)
    if (!Number.isFinite(at)) {
      return
    }
    this.removeAt(at)
    this.updateComplete.then(() => {
      const buttons = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[part="remove"]')]
      ;(buttons[Math.min(at, buttons.length - 1)] ?? this.control)?.focus()
    })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is
    // touched. `willUpdate` is too early: there is no control to read yet.
    this.committed = this.files
    this.sync()
  }

  /**
   * Reports again on every update, so a new `name` or `required` reaches the
   * form. Only a pick and the first render reported, so the form kept the old
   * name and the old verdict.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.toggleState('dropping', this.dropping)
    this.toggleState('has-files', this.files.length > 0)
  }

  /** Moves focus to the native file input, as a label pointing at it would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /**
   * Clears the chosen files when the form resets.
   *
   * Not through `commit`, and that is the point of the split: a reset is the
   * form's decision and there is nothing here for a listener to refuse. What it
   * owes is the report and the platform's own announcement, which is what
   * `settle` is.
   */
  override formResetCallback(): void {
    super.formResetCallback()
    if (this.control) {
      restoreValue(this.control, '')
    }
    this.settle()
  }

  /*
   * The hint goes under the field, and the list after both.
   *
   * A hint is instruction for the next action rather than a note about the
   * result: "up to 10MB each" is a rule for what may be added, and a rule read
   * after the outcome is a rule read too late. Its position also has to be
   * stable, and under the list it travels down the page as files are added, a
   * card's height at a time. Every other field here puts it immediately under
   * the control.
   *
   * Feedback stands in place of the hint rather than beside it, so wherever the
   * hint is, an error is. An error about a file that was refused belongs
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
   * see, so a stylesheet targeting it matches nothing.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, or leave it out without reimplementing the whole template.
   * The tag is interpolated rather than written, so `tier` resolves it: this
   * renders the headless element, and a styled subclass that sets `tier`
   * renders the styled one from the same template.
   */
  protected renderMeta(file: File): TemplateResult {
    return html`<${this.tag('tag')} part="size"
    exportparts="cell: size-cell, dismiss: size-dismiss, dismiss-mark: size-dismiss-mark, label: size-label, link: size-link, start: size-start">${size(file.size, this.locale)}</${this.tag('tag')}>
      <${this.tag('tag')}
        part="kind"
      exportparts="cell: kind-cell, dismiss: kind-dismiss, dismiss-mark: kind-dismiss-mark, label: kind-label, link: kind-link, start: kind-start">${kind(file)}</${this.tag('tag')}>`
  }

  /**
   * How a file's upload is going, from `setFileStatus`, behind a seam a tier
   * can move: a `<progress>` named by `progress-label` and the status words.
   */
  protected renderFileStatus(file: File): TemplateResult | typeof nothing {
    const status = this.statuses.get(file)
    if (!status) {
      return nothing
    }
    const bar = barOf(status)
    return html`<span part="status"
      >${
        bar === undefined
          ? nothing
          : html`<progress
              part="progress"
              max="1"
              value=${bar === 'unmeasured' ? nothing : bar}
              aria-label=${labelWith(this.progressLabel, 'name', file.name)}
            ></progress>`
      }${status.text ? html`<span part="status-text">${status.text}</span>` : nothing}</span
    >`
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
        @paste=${this.handlePaste}
      >
        <input
          part="control"
          id=${this.controlId}
          type="file"
          accept=${this.accept || nothing}
          capture=${this.capture ?? nothing}
          name=${this.name || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          aria-invalid=${this.invalidity ?? nothing}
          ?disabled=${this.isDisabled}
          ?multiple=${this.multiple}
          ?required=${this.required}
          ?webkitdirectory=${this.directory}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
        <label part="trigger" for=${this.controlId}>
          <slot name="trigger">${this.triggerLabel}</slot>
        </label>
      </div>
      <!-- Hidden, because this is where the icon arrives: each remove button
           shows a copy. -->
      <slot name="remove-icon" hidden @slotchange=${this.handleRemoveIcon}></slot>
      <!-- The hint sits under the field and the list goes last, which is the
           one ordering decision this component makes differently from the way it
           reads. Reasoning above renderMeta. -->
      ${this.renderHint()}${this.renderFeedback()}
      ${drawStatus(this.status)}
      ${
        files.length === 0
          ? nothing
          : html`<ul part="list">
              ${files.map((file, at) => {
                const state = this.statuses.get(file)?.state
                const done = state === 'done'
                const failed = state === 'error'
                const sending = state === 'uploading'
                return html`<li
                  part="file${done ? ' file-done' : ''}${failed ? ' file-error' : ''}${
                    sending ? ' file-uploading' : ''
                  }"
                >
                  <span part="detail">
                    ${
                      this.renderFile
                        ? this.renderFile(file, at)
                        : html`<span part="name">${file.name}</span>
                          <span part="meta">
                            ${this.renderMeta(file)}
                          </span>`
                    }${this.renderFileStatus(file)}
                  </span>
                  <button
                    part="remove"
                    type="button"
                    aria-label=${labelWith(this.removeLabel, 'name', file.name)}
                    data-at=${at}
                    ?disabled=${this.isDisabled}
                    @click=${this.handleRemove}
                  >
                    ${this.removeMark(at)}
                  </button>
                </li>`
              })}
            </ul>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-file-input': HelixHeadlessFileInput
  }
}
