import {
  customElement,
  DelayController,
  deepActiveElement,
  HelixFormElement,
  hostAria,
  internalsOf,
  MixinVoice,
  markRegion,
  motionPaused,
  numberConverter,
  onMotionChange,
  pressedOwnControl,
  reducedMotion,
  SPOKEN_RULE,
  timeConverter,
  words,
} from '@fusion.dev/helix-core'
import { arrowElbowDownLeft, stop } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html as staticHtml } from 'lit/static-html.js'
import { HelixSendEvent, HelixStopEvent, HelixTypingEvent } from '../events/index.js'
import '../../tooltip/index.js'

/**
 * How long an example shows before the next one replaces it, in milliseconds,
 * counted from the moment its text appears. An example up to
 * `EXAMPLE_SHORT` characters long shows this long.
 */
const EXAMPLE_SHOWN = 6500

/** The most characters an example can have and still show for `EXAMPLE_SHOWN`. */
const EXAMPLE_SHORT = 40

/** How much longer an example shows for each character past `EXAMPLE_SHORT`, in milliseconds. */
const EXAMPLE_PER_CHARACTER = 60

/** The longest an example shows, however long it is, in milliseconds. */
const EXAMPLE_LONGEST = 10000

/**
 * How long an example takes to leave, in milliseconds, while
 * `:state(example-leaving)` holds. The styled tier's exit takes as long.
 */
const EXAMPLE_LEAVE = 250

/**
 * How far into the exit the next example appears, in milliseconds: 40% of
 * `EXAMPLE_LEAVE`, so the two cross and the field is never empty.
 */
const EXAMPLE_CROSS = 100

/**
 * How long `:state(example-entering)` holds after the next example appears,
 * in milliseconds. The styled tier's entrance ends within it.
 */
const EXAMPLE_ENTER = 350

/**
 * How long `example` shows before the next one replaces it, in milliseconds:
 * `EXAMPLE_SHOWN`, and `EXAMPLE_PER_CHARACTER` more for each character past
 * `EXAMPLE_SHORT`, up to `EXAMPLE_LONGEST`. A longer example takes longer to
 * read.
 */
export function exampleShown(example: string): number {
  const extra = Math.max(0, Array.from(example).length - EXAMPLE_SHORT)
  return Math.min(EXAMPLE_LONGEST, EXAMPLE_SHOWN + extra * EXAMPLE_PER_CHARACTER)
}

/**
 * @summary A field for writing a turn in a conversation.
 *
 * @description
 * The composer is a separate element so you can replace it. If you need
 * slash commands or a layout of your own, replace the composer and keep the
 * transcript.
 *
 * By default, Enter sends and Shift+Enter starts a new line, the convention in
 * messaging apps. Document editors mostly use the opposite, so `submit-on`
 * takes `enter` or `button`. Use `button` for a long-form composer.
 *
 * The composer clears only when no listener cancels the send, so the text is
 * kept when you cancel a send that failed.
 *
 * **Set `voice` for dictation.** A microphone button before send listens
 * through the page's speech engine, the browser's own unless
 * `registerSpeechEngine` gave the page another, and types what it hears at the
 * caret as the reader speaks, each guess replaced by the next. Press it again,
 * press Escape, or send, and it stops. Where the browser has no engine, as in
 * Firefox, no button is drawn.
 *
 * **In a form, the draft is the composer's value**, submitted under `name`,
 * and an empty draft submits an empty entry, as a native textarea does. A
 * form reset puts back the `value` the markup declared, and a `<fieldset
 * disabled>` turns the composer off. Sending is still `helix-send`, and it
 * does not submit the form.
 *
 * **`required`, `minlength` and `maxlength` are checked by the browser**, as
 * on a `<textarea>`, and the message is the browser's. `maxlength` stops the
 * field taking more. A draft that fails them does not send, and the composer
 * takes `:state(invalid)` and `aria-invalid` once the reader has tried to send
 * it, the form was submitted, or the reader edited the field and left it.
 * Sending an empty required composer counts as trying. Tabbing past an empty
 * composer marks nothing.
 *
 * **`feedback` is a message of your own about the draft**, such as one your
 * server sent back. While it is set, the composer is invalid at once, does
 * not send or submit, shows the message under the field, and a screen reader
 * hears it as it appears. Clear it to let the draft go.
 *
 * **`typing` says whether the user is writing**, and `helix-typing` is sent
 * each time it changes: when they start, and when they send or stop for
 * `typing-timeout` milliseconds. Pass it on to show "is typing" to the other
 * side.
 *
 * **`busy` says a reply is on its way**, and turns the send button into a
 * stop button, named by `stop-label`, that sends `helix-stop`. The field
 * stays open so the reader can write the next turn, and Enter does not send
 * it until `busy` is cleared. With `queue`, Enter sends while `busy` too, for
 * a page that holds a turn until the reply ends or hands it to the reply
 * under way; the button stays the stop button.
 *
 * **The `idle` slot takes the send button's place while there is nothing to
 * send**: the field is empty, `attached` is not set, and no reply is on its
 * way. Put the action an empty draft offers there, such as a button that
 * starts a voice conversation. The send button comes back as soon as there
 * is a draft. Where focus was on the one that goes, it moves to the one that
 * comes, so a keyboard reader stays in the same place.
 *
 * **What the draft carries goes in `attachments`**, inside the box and above
 * the field, such as thumbnails of attached images and cards for attached
 * files. The region takes no room while nothing is in it. A press on its
 * empty space keeps the reader in the field, and a press on a control in it,
 * such as a button that removes an attachment, goes to that control. Set
 * `attached` as well, so the send button shows for a draft with no text.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Message box, Prompt input
 * @documentation https://fusion.dev/helix/components/chat
 *
 * @slot attachments - What the draft carries, such as images or files, inside the box and above the field.
 * @slot end - Content under the field, beside the send button.
 * @slot idle - A control shown in place of the send button while the draft is empty and no reply is on its way, such as a button that starts a voice conversation.
 * @slot start - Content under the field at the leading edge, such as an attachment button or a model picker.
 *
 * @event {HelixBeforeListenEvent} helix-before-listen - The dictation button was pressed. Cancelable: cancel it to keep the composer from listening.
 * @event {HelixListenEvent} helix-listen - Dictation settled on a phrase and put it in the draft, after the draft's own `input`.
 * @event {HelixSendEvent} helix-send - Fired when the user sends their turn, and cancelable.
 * @event {HelixStopEvent} helix-stop - Fired when the user presses the stop button, shown in place of the send button while `busy` is set.
 * @event {HelixTypingEvent} helix-typing - The user started or stopped writing, with `typing` saying which, as the composer's `typing` does.
 * @event {Event} input - The user changed the text. Read it from `value`, for a typing indicator or a saved draft. Bubbles and is composed, as a native field's is.
 *
 * @csspart attachments - The box around the `attachments` slot, above the field. It is hidden while the slot is empty.
 * @csspart composer - The whole composer.
 * @csspart end - The box around the `end` slot.
 * @csspart feedback - The `feedback` message, under the field while it is set.
 * @csspart field - The text field.
 * @csspart idle - The box around the `idle` slot, shown in the send button's place while the draft is empty.
 * @csspart mark - The icon inside the send button, a return key, or a square while `busy`.
 * @csspart reason - The tooltip that says `send-reason` over the send button.
 * @csspart reason-arrow - The arrow of the bubble that says `send-reason`, forwarded from `Tooltip`.
 * @csspart reason-arrow-bottom - The arrow while the bubble is below the send button, on the bubble's top edge. Set together with `reason-arrow`.
 * @csspart reason-arrow-left - The arrow while the bubble is left of the send button, on the bubble's right edge. Set together with `reason-arrow`.
 * @csspart reason-arrow-right - The arrow while the bubble is right of the send button, on the bubble's left edge. Set together with `reason-arrow`.
 * @csspart reason-arrow-top - The arrow while the bubble is above the send button, on the bubble's bottom edge. Set together with `reason-arrow`.
 * @csspart reason-surface - The bubble that says `send-reason` over the send button, forwarded from `Tooltip`.
 * @csspart reason-surface-bottom - The bubble while it is below the send button. Set together with `reason-surface`.
 * @csspart reason-surface-left - The bubble while it is left of the send button. Set together with `reason-surface`.
 * @csspart reason-surface-right - The bubble while it is right of the send button. Set together with `reason-surface`.
 * @csspart reason-surface-top - The bubble while it is above the send button. Set together with `reason-surface`.
 * @csspart send - The send button, which is the stop button while `busy`.
 * @csspart start - The box around the `start` slot.
 * @csspart tools - The row under the field.
 * @csspart voice - The dictation button, under `voice`, before the send button.
 * @csspart voice-level - The meter that draws the microphone's level in place of its glyph while the field listens, where the tier defines Voice Level.
 * @csspart voice-level-canvas - The canvas the dictation meter draws on.
 * @csspart voice-listening - The dictation button while it listens. Set alongside `voice`.
 * @csspart voice-status - What a screen reader hears as dictation starts and stops, drawn for no one else.
 *
 * @cssstate example-entering - The example in the empty field has just replaced the one before it, for an entrance. It holds for 350 milliseconds. See `placeholders`.
 * @cssstate example-leaving - The example in the empty field is giving way to the next one, for an exit. It holds for 250 milliseconds, and the next example becomes the placeholder 100 milliseconds in, so the two can cross. See `placeholders`.
 * @cssstate invalid - The draft fails `required`, `minlength`, `maxlength`, or a custom error, and the reader has tried to send or submit it, or edited the field and left it. Or `feedback` is set.
 * @cssstate listening - While the composer listens for dictation. The element sets `--dictation-level` on itself meanwhile, from 0 to 1, for a meter.
 */
@customElement('helix-headless-chat-composer')
export class HelixHeadlessChatComposer extends MixinVoice(HelixFormElement) {
  protected static override markRules = [SPOKEN_RULE]

  /**
   * The key this part's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-chat-composer': { sendLabel: 'Senden' } })`.
   */
  static words = 'helix-chat-composer'

  /**
   * Whether the draft holds something besides its text, such as an attached
   * file. The draft then counts as one though the field is empty, so the
   * send button shows in place of the `idle` slot.
   */
  @property({ reflect: true, type: Boolean })
  attached = false

  /**
   * Whether a reply is on its way. While set, the send button is a stop
   * button that sends `helix-stop`, and the draft does not send.
   *
   * **The same button rather than one beside it**, because sending and
   * stopping are never both possible: while a reply is on its way there is
   * nothing to send to, and the place the reader's eye goes to act is the
   * place that can act. The field stays open for the next turn.
   */
  @property({ reflect: true, type: Boolean })
  busy = false

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Message'

  /**
   * A message about the draft, shown under the field. While set, the composer
   * is invalid, does not send, and does not submit, as a field's `feedback`
   * does, and the message is announced as it appears.
   */
  @property()
  feedback = ''

  /**
   * The field's name, read by screen readers.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * The most characters a draft can have. The field stops taking more.
   */
  @property({ attribute: 'maxlength', converter: numberConverter('maxlength', undefined) })
  maxLength?: number

  /**
   * The fewest characters a draft can have, once the reader has written in
   * the field, as on a `<textarea>`.
   */
  @property({ attribute: 'minlength', converter: numberConverter('minlength', undefined) })
  minLength?: number

  /**
   * Placeholder text shown in an empty field.
   */
  @property()
  placeholder = ''

  /**
   * Examples the empty field shows in turn, in place of `placeholder`, such
   * as tasks a reader might ask for. Each shows for 6.5 seconds, and a longer
   * one shows longer, up to 10 seconds.
   *
   * **Each is the field's placeholder in its turn**, so a screen reader that
   * reaches the field hears the one showing. The swap runs through
   * `:state(example-leaving)`, as one example leaves, and
   * `:state(example-entering)`, as the next arrives.
   *
   * **They move only while nobody is about to write, and while the reader
   * can see them.** An empty field without focus moves on. Focus or text
   * holds the example showing, and an example already leaving finishes its
   * turn. A composer scrolled out of view holds its example, and the example
   * gets its full time again when the composer comes back. Where the reader
   * asked for less motion, or the page paused its motion, the first example
   * stays.
   */
  @property({ attribute: false })
  placeholders: readonly string[] = []

  /**
   * Whether Enter sends while `busy`, for a page that queues the turn or
   * hands it to the reply under way.
   *
   * Off by default, because a page that does neither would drop the turn: it
   * has nowhere to put a message while a reply is coming. The button stays
   * the stop button either way, since stopping is still the one thing it
   * should do while a reply is on its way.
   */
  @property({ reflect: true, type: Boolean })
  queue = false

  /**
   * Whether the form needs a draft to submit. An empty draft never sends,
   * required or not.
   */
  @property({ type: Boolean })
  required = false

  /**
   * How many rows the field opens at.
   *
   * It grows from there.
   */
  @property({ converter: numberConverter('rows', 1) })
  rows = 1

  /**
   * Whether the draft waits to be sent, such as while an attachment is still
   * read. The send button is unavailable and Enter does not send, while the
   * field stays open. The stop button shown while `busy` still stops.
   */
  @property({ attribute: 'send-disabled', type: Boolean })
  sendDisabled = false

  /**
   * Label for the send button.
   */
  @words
  @property({ attribute: 'send-label' })
  sendLabel = 'Send'

  /**
   * Why the draft waits, such as "Reading photo.jpg", shown in a tooltip on
   * the send button while `send-disabled` is set. The button then stays in
   * the tab order and takes the pointer, with `aria-disabled` in place of
   * `disabled`, so the reason can be reached by keyboard and by pointer, as
   * Button's `focusable-when-disabled` does. A press still sends nothing.
   */
  @property({ attribute: 'send-reason' })
  sendReason = ''

  /**
   * Label for the stop button shown while `busy`.
   */
  @words
  @property({ attribute: 'stop-label' })
  stopLabel = 'Stop'

  /**
   * What sends the turn: `enter` for the Enter key, or `button` for the send
   * button only.
   *
   * `enter` is the messaging convention and makes Shift+Enter the line break.
   * `button` is what a composer holding several paragraphs wants, where Enter
   * has to mean a new line and nothing else.
   */
  @property({ attribute: 'submit-on' })
  submitOn: 'button' | 'enter' = 'enter'

  /**
   * How long after the last keystroke the user still counts as typing, in
   * milliseconds. The attribute also takes a CSS time, such as `3s`.
   */
  @property({ attribute: 'typing-timeout', converter: timeConverter('typing-timeout', 3000) })
  typingTimeout = 3000

  /**
   * The text the user has written.
   *
   * It follows typing, so reading it gives the draft. Set it to seed a draft or
   * to replace the one in the field, and set it to `''` to clear it.
   */
  @property()
  value = ''

  /**
   * @internal Read by the transcript to find the composer among its children.
   */
  readonly isChatComposer = true

  /** Whether the user is writing, which `helix-typing` announces. */
  private writing = false

  /** Whether the reader has tried to send or submit the draft, or edited it and left. */
  private touched = false

  /**
   * Whether the reader has typed in the field since it last held a fresh
   * draft: since it rendered, since a send cleared it, or since a reset.
   *
   * **A send clears the field, and the field still sends `change` as it is
   * left**, because the platform compares the text with what it held when it
   * was focused. Measured in Chromium before this: a required composer sent
   * "hi", cleared, and on Tab showed itself invalid over an empty draft
   * nobody had written.
   */
  private edited = false

  /** Whether the composer shows that its draft is wrong. */
  @state()
  private shownInvalid = false

  /** Which of `placeholders` the empty field shows. */
  @state()
  private example = 0

  /**
   * Which of `placeholders` is on its way out while the next comes in, so a
   * tier can draw the two at once.
   */
  @state()
  private leavingExample: number | undefined

  /** Whether the field holds focus, which holds the examples still. */
  private focused = false

  /** Whether any of the composer is in view, which the examples need to move. */
  private onScreen = true

  /** Watches the composer come into view and go out of it. */
  private sight: IntersectionObserver | undefined

  /** The wait before the example showing leaves, while the examples move. */
  private turning: ReturnType<typeof setTimeout> | undefined

  /** The wait before the next example appears, part way through the exit. */
  private crossing: ReturnType<typeof setTimeout> | undefined

  /** The exit of the example leaving, while it runs. */
  private leaving: ReturnType<typeof setTimeout> | undefined

  /** The entrance of the example arriving, while it runs. */
  private entering: ReturnType<typeof setTimeout> | undefined

  /** Stops listening to the page's motion switch. */
  private unmoved: (() => void) | undefined

  /** The pause after which the user has stopped writing. */
  private readonly pause = new DelayController(this, { renders: false })

  /**
   * Whether the user is writing: true from their first keystroke until they
   * send, clear the field, or pause for `typing-timeout` milliseconds.
   */
  get typing(): boolean {
    return this.writing
  }

  /** Records whether the user is writing, and says so when that changed. */
  private markTyping(typing: boolean): void {
    if (typing) {
      this.pause.start(Math.max(0, this.typingTimeout), () => this.markTyping(false))
    } else {
      this.pause.cancel()
    }
    if (typing === this.writing) {
      return
    }
    this.writing = typing
    this.dispatchEvent(new HelixTypingEvent({ typing }))
  }

  protected override voiceField(): HTMLTextAreaElement | null {
    return this.partNamed<HTMLTextAreaElement>('field')
  }

  /**
   * Sends what is written, and returns whether the send went through.
   *
   * Public because a consumer's own send control is as likely to ask as this
   * element's is, and because a keyboard shortcut somewhere else on the page is
   * a reasonable way to send.
   */
  send(): boolean {
    /* What was heard so far stays in the draft and goes with it. */
    this.stopListening()
    const value = this.value.trim()
    if (this.isDisabled || this.sendDisabled || (this.busy && !this.queue)) {
      return false
    }
    /* Nothing is sent, and a required composer says why, as a draft the form
       would refuse does. */
    if (value === '') {
      if (this.required) {
        this.touch()
      }
      return false
    }
    /* A draft the form would refuse is refused here too, and shown as wrong. */
    if (!internalsOf(this).validity.valid) {
      this.touch()
      return false
    }
    if (!this.dispatchEvent(new HelixSendEvent({ value }))) {
      return false
    }
    /* Cleared only here, after nobody refused. A composer that empties itself
       first and hears about the failure afterwards has thrown away the only copy
       of what the reader wrote. */
    this.value = ''
    /* An empty field after a send is a fresh draft, so a required composer
       does not show itself wrong. */
    this.touched = false
    this.edited = false
    this.markTyping(false)
    return true
  }

  /**
   * The value the markup declared, which a form reset and an empty restore go
   * back to. `value` does not reflect, so its attribute stays as written.
   */
  private get declared(): string {
    return this.getAttribute('value') ?? ''
  }

  /** @internal `feedback` marks the composer invalid, as a field's does. */
  protected override get validityFeedback(): string {
    return this.feedback
  }

  /** Puts back the draft the markup declared when the form is reset. */
  override formResetCallback(): void {
    super.formResetCallback()
    this.value = this.declared
    this.touched = false
    this.edited = false
    this.requestUpdate()
  }

  /** The reader has had a go at the draft, so whether it is wrong can be shown. */
  private readonly touch = (): void => {
    this.touched = true
    this.requestUpdate()
  }

  /** The field's `change`, which counts only after the reader typed in it. */
  private readonly handleChange = (): void => {
    if (this.edited) {
      this.touch()
    }
  }

  /** Brings back the draft when the browser restores the form. */
  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? state : this.declared
  }

  /**
   * Says on each tool box whether anything is in it.
   *
   * They are boxes in a flex row, so an empty one still takes the gap beside it
   * and the send control drifts inward by one for every slot a consumer left
   * alone. No selector can ask this: a slot's assigned nodes are not its DOM
   * children, so `:empty` describes the fallback rather than the fill.
   * Re-marked on `slotchange` as well as after a render, so a control a
   * framework renders after the first render is shown.
   */
  private markEmpty(): void {
    for (const name of ['attachments', 'start', 'end'] as const) {
      markRegion(this.renderRoot, name, [name])
    }
  }

  /**
   * Whether the `idle` slot shows in the send button's place: a child is in
   * it, the draft is empty, and no reply is on its way. Read off the children
   * where they are known, and drawn again as the slot's contents change. A
   * server cannot know them, so it serves the send button, which a hydrating
   * render keeps until `finishHydration` reads them.
   */
  private get idling(): boolean {
    return (
      this.knownChildren.some((child) => child.getAttribute('slot') === 'idle') &&
      !this.busy &&
      !this.attached &&
      this.value.trim() === ''
    )
  }

  /**
   * Whether anything is slotted in `attachments`, where the children are
   * known. A server cannot know them, so it serves the region hidden and
   * takes no gap above the field for an empty draft, the common case.
   * `markEmpty` keeps it right after every render and on `slotchange`.
   */
  private get carrying(): boolean {
    return this.knownChildren.some((child) => child.getAttribute('slot') === 'attachments')
  }

  /**
   * A press on the attachments' empty space, such as the gap between two
   * thumbnails, keeps the reader in the field, so the next key they press is
   * typed. A press on a control of their own, such as a button that removes
   * an attachment, is left to that control.
   */
  private readonly handleAttachmentsDown = (event: MouseEvent): void => {
    const region = event.currentTarget as HTMLElement
    if (event.button !== 0 || pressedOwnControl(event, region) || this.isDisabled) {
      return
    }
    event.preventDefault()
    this.partNamed<HTMLTextAreaElement>('field')?.focus()
  }

  /** Where focus was as an update began: on the send button, in the idle control, or elsewhere. */
  private focusedOn: 'elsewhere' | 'idle' | 'send' = 'elsewhere'

  /** Reads which control holds focus, before an update swaps them. */
  private noteFocus(): void {
    /* Before the first render no control of this composer exists to hold focus,
       and on a server there is no document to ask, which a first update is too. */
    if (!this.hasUpdated) {
      this.focusedOn = 'elsewhere'
      return
    }
    const active = deepActiveElement()
    const send = this.partNamed('send')
    const idle = this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="idle"]')
      ?.assignedElements({ flatten: true })
    this.focusedOn =
      active !== null && active === send
        ? 'send'
        : active !== null && idle?.some((element) => element === active || element.contains(active))
          ? 'idle'
          : 'elsewhere'
  }

  /** Moves focus to the control that came, where it was on the one that went. */
  private keepFocus(): void {
    if (this.focusedOn === 'send' && this.idling) {
      const idle = this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot[name="idle"]')
        ?.assignedElements({ flatten: true })[0] as HTMLElement | undefined
      idle?.focus()
    } else if (this.focusedOn === 'idle' && !this.idling) {
      this.partNamed<HTMLButtonElement>('send')?.focus()
    }
    this.focusedOn = 'elsewhere'
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.unmoved ??= onMotionChange(() => this.turnExamples())
    /* Off screen, nobody reads the examples, so they hold. Where the platform
       has no observer, the composer counts as in view. */
    if (typeof IntersectionObserver === 'function' && this.sight === undefined) {
      this.sight = new IntersectionObserver((entries) => {
        const seen = entries.at(-1)?.isIntersecting ?? this.onScreen
        if (seen !== this.onScreen) {
          this.onScreen = seen
          this.turnExamples()
        }
      })
      this.sight.observe(this)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unmoved?.()
    this.unmoved = undefined
    this.sight?.disconnect()
    this.sight = undefined
    this.onScreen = true
    this.stopExamples()
  }

  /** Notes focus coming and going, which holds the examples or frees them. */
  private readonly handleFocus = (event: FocusEvent): void => {
    this.focused = event.type === 'focus'
    this.turnExamples()
  }

  /** The examples drawn over the field: the one showing, and the one leaving while they cross. */
  private renderExamples(): TemplateResult | typeof nothing {
    const { length } = this.placeholders
    const at = (index: number) => ({ index, text: this.placeholders[index % length] ?? '' })
    const leaving = this.leavingExample
    return this.renderExample(at(this.example), leaving === undefined ? undefined : at(leaving))
  }

  /** The example the empty field shows, or `placeholder` where there are none. */
  private get shownPlaceholder(): string {
    const { length } = this.placeholders
    return length > 0 ? (this.placeholders[this.example % length] ?? '') : this.placeholder
  }

  /**
   * Starts the examples moving, or stops them, as the list, the field, and
   * the page allow.
   *
   * **Each turn is timed by the example showing**, so a long one stays up
   * longer. **Focus holds the examples and leaves a turn under way to
   * finish**, so the field never shows half an exit. Text, reduced motion, a
   * paused page, scrolling out of view, and leaving the document stop them at
   * once.
   */
  private turnExamples(): void {
    const free =
      this.isConnected &&
      this.placeholders.length > 1 &&
      this.value === '' &&
      this.onScreen &&
      !reducedMotion() &&
      !motionPaused()
    if (!free) {
      this.stopExamples()
      return
    }
    if (this.focused) {
      clearTimeout(this.turning)
      this.turning = undefined
      return
    }
    if (this.turning === undefined && this.crossing === undefined && this.leaving === undefined) {
      this.turning = setTimeout(() => this.leaveExample(), exampleShown(this.shownPlaceholder))
    }
  }

  /**
   * Starts the example showing on its way out. The next appears part way
   * through the exit, and the one leaving goes once its exit ends.
   */
  private leaveExample(): void {
    this.turning = undefined
    if (reducedMotion() || motionPaused()) {
      this.stopExamples()
      return
    }
    clearTimeout(this.entering)
    this.entering = undefined
    this.toggleState('example-entering', false)
    this.toggleState('example-leaving', true)
    this.leavingExample = this.example
    this.crossing = setTimeout(() => this.arriveExample(), EXAMPLE_CROSS)
    this.leaving = setTimeout(() => {
      this.leaving = undefined
      this.leavingExample = undefined
      this.toggleState('example-leaving', false)
    }, EXAMPLE_LEAVE)
  }

  /** Shows the next example, on its way in, and times the turn after it. */
  private arriveExample(): void {
    this.crossing = undefined
    this.example = (this.example + 1) % Math.max(this.placeholders.length, 1)
    this.toggleState('example-entering', true)
    this.entering = setTimeout(() => {
      this.entering = undefined
      this.toggleState('example-entering', false)
      this.exampleLanded()
    }, EXAMPLE_ENTER)
    this.turnExamples()
  }

  private stopExamples(): void {
    clearTimeout(this.turning)
    clearTimeout(this.crossing)
    clearTimeout(this.leaving)
    clearTimeout(this.entering)
    this.turning = undefined
    this.crossing = undefined
    this.leaving = undefined
    this.entering = undefined
    this.leavingExample = undefined
    this.toggleState('example-leaving', false)
    this.toggleState('example-entering', false)
    this.exampleLanded()
  }

  /**
   * Called as the example showing has landed: its entrance ended, or the
   * examples stopped. A tier that holds anything for the swap lets it go
   * here. The headless tier holds nothing.
   */
  protected exampleLanded(): void {}

  /**
   * What the tier above draws over the empty field while `placeholders` holds
   * two examples or more, behind a seam so a tier can draw the swap the
   * field's own placeholder cannot. `example` is the field's placeholder, and
   * `leaving` the one on its way out, each with its place in `placeholders`.
   * For the first 100 milliseconds of an exit the two are the same example,
   * and after that they cross. The headless tier draws nothing, and its field
   * shows each example as its placeholder.
   *
   * **The field keeps its placeholder either way**, so whatever is drawn
   * here is decoration, and the field is what a screen reader reaches.
   */
  protected renderExample(
    _example: { index: number; text: string },
    _leaving?: { index: number; text: string },
  ): TemplateResult | typeof nothing {
    return nothing
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.keepFocus()
    if (changed.has('placeholders') || changed.has('value')) {
      this.turnExamples()
    }
    this.markEmpty()
    /* An empty entry where nothing is written, as a native textarea submits
       `draft=`. The draft is the state too, so a browser restoring the form
       puts back a draft the reader emptied as empty, and not the declared
       one. */
    if (changed.has('value')) {
      internalsOf(this).setFormValue(this.value, this.value)
    }
    /* The browser's verdict on the field, copied with the field as the anchor,
       so the message is in the reader's language and points at the text. */
    const field = this.partNamed<HTMLTextAreaElement>('field')
    if (field?.validity) {
      internalsOf(this).setValidity(field.validity, field.validationMessage, field)
    }
    const invalid = this.feedback !== '' || (this.touched && !internalsOf(this).validity.valid)
    this.toggleState('invalid', invalid)
    /* **`false` while nothing is shown**: a host with a role and no
       `aria-invalid` is judged by its validity, and Chromium exposed an
       untouched required composer, a `group`, as invalid on load. */
    internalsOf(this).ariaInvalid = invalid ? 'true' : 'false'
    if (invalid !== this.shownInvalid) {
      this.shownInvalid = invalid
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    this.addEventListener('invalid', () => {
      if (!this.checkingValidity) {
        this.touch()
      }
    })
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(internalsOf(this), { label: this.label || this.fallbackLabel, role: 'group' })
    this.noteFocus()
  }

  /**
   * The control that offers the turn, behind a seam so a tier can draw its own.
   *
   * **A glyph with the label as its accessible name, rather than the label as
   * text.** The word "Send" beside a field is the widest thing in the row and
   * says nothing a return key does not. The return glyph is the mark because
   * Enter is what actually sends, which `submit-on` says out loud: the control
   * and the key are one affordance and should look like it. `send-label` is the
   * accessible name rather than a visible one, so a screen reader still hears
   * the word.
   *
   * **Not mirrored on a right-to-left page**, where every caret meaning next
   * is. It pictures a key rather than a way to go, like the arrows `Kbd`
   * draws, and a picture of a key is not turned round with the text.
   */
  protected renderSend(): TemplateResult {
    const mark = this.busy ? stop : arrowElbowDownLeft
    const held = this.sendDisabled && !this.busy
    // A reason keeps the held button reachable, so its tooltip can say it.
    const reasoned = held && !this.isDisabled && this.sendReason !== ''
    const control = html`<button
      part="send"
      type="button"
      aria-label=${this.busy ? this.stopLabel : this.sendLabel}
      aria-disabled=${reasoned ? 'true' : nothing}
      aria-describedby=${reasoned ? 'send-reason' : nothing}
      ?disabled=${this.isDisabled || (held && !reasoned)}
      @click=${this.busy ? this.handleStop : this.handleSend}
    >
      <svg part="mark" fill="currentColor" viewBox=${mark.viewBox} aria-hidden="true">
        ${unsafeSVG(mark.content)}
      </svg>
    </button>`
    if (!reasoned) {
      return control
    }
    return staticHtml`<${this.tag('tooltip')} part="reason" id="send-reason" content=${this.sendReason}
      exportparts="arrow: reason-arrow, arrow-bottom: reason-arrow-bottom, arrow-left: reason-arrow-left, arrow-right: reason-arrow-right, arrow-top: reason-arrow-top, surface: reason-surface, surface-bottom: reason-surface-bottom, surface-left: reason-surface-left, surface-right: reason-surface-right, surface-top: reason-surface-top"
      >${control}</${this.tag('tooltip')}>`
  }

  /**
   * What the draft carries, the field, and a row of tools under it.
   *
   * **The tools take a line of their own rather than sharing the field's.** On
   * one line every tool a consumer adds takes width away from the thing being
   * typed into; under it, the field spans the whole composer at every width and
   * the tools have room to grow along.
   *
   * Send is at the trailing end of that line rather than in the field, which is
   * the same corner and costs no overlay: a control positioned inside a
   * scrolling textarea either covers the last line of a long draft or scrolls
   * away with it.
   */
  protected override render(): TemplateResult {
    return html`<div part="composer">
      <div part="attachments" ?hidden=${!this.carrying} @mousedown=${this.handleAttachmentsDown}
        ><slot name="attachments" @slotchange=${() => this.markEmpty()}></slot
      ></div>
      <textarea
        part="field"
        .value=${live(this.value)}
        aria-label=${this.label || this.fallbackLabel}
        placeholder=${this.shownPlaceholder}
        rows=${this.rows}
        ?required=${this.required}
        minlength=${this.minLength ?? nothing}
        maxlength=${this.maxLength ?? nothing}
        aria-invalid=${this.shownInvalid ? 'true' : nothing}
        aria-describedby=${this.feedback === '' ? nothing : 'feedback'}
        ?disabled=${this.isDisabled}
        @blur=${this.handleFocus}
        @change=${this.handleChange}
        @focus=${this.handleFocus}
        @input=${this.handleInput}
        @keydown=${this.handleKey}
      ></textarea>
      ${this.placeholders.length > 1 ? this.renderExamples() : nothing}
      <div part="tools">
        <span part="start"><slot name="start" @slotchange=${() => this.markEmpty()}></slot></span>
        <span part="end"><slot name="end" @slotchange=${() => this.markEmpty()}></slot></span>
        ${this.renderVoice()}
        <span part="idle" ?hidden=${!this.idling}
          ><slot
            name="idle"
            @slotchange=${() => this.requestUpdate()}
          ></slot
        ></span>
        ${this.idling ? nothing : this.renderSend()}
      </div>
    </div>${
      this.feedback === ''
        ? nothing
        : html`<p part="feedback" id="feedback" role="alert">${this.feedback}</p>`
    }`
  }

  /**
   * Takes what was typed into `value`, and says so from this element.
   *
   * **The textarea's own `input` is stopped and this element sends one.**
   * `input` is composed by specification, so the `<textarea>` in this shadow
   * root sent its own past this host with a target a consumer cannot reach.
   * The one sent here comes from the composer, whose `value` already holds
   * the text, which is what a typing indicator or a saved draft reads.
   *
   * **The text is `value` and nothing beside it.** A private draft read before
   * `value` sent a seed the reader had deleted, since an empty draft fell back
   * to it, and left `value` reading empty while the field held a whole draft.
   */
  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    this.value = (event.target as HTMLTextAreaElement).value
    this.edited = true
    /* Bubbling and composed, as the `input` of a native field is and as every
       other field here sends it. Sent on the composer alone before this, and a
       listener on the document or on a form never heard the composer typed
       in, measured in Chromium. The target is the composer, so a listener
       above a transcript still knows which element was typed in. */
    this.announceInput()
    this.markTyping(this.value !== '')
  }

  private readonly handleSend = (): void => {
    this.send()
  }

  private readonly handleStop = (): void => {
    this.dispatchEvent(new HelixStopEvent())
  }

  /**
   * Enter sends where that is what `submit-on` says, and never mid-composition.
   *
   * **`isComposing` is the part that is easy to leave out and breaks a whole
   * writing system.** A reader typing Japanese, Chinese or Korean presses Enter
   * to accept the candidate their input method is offering, and a composer that
   * reads it as send fires off a half-finished word every time. The flag is on
   * the event for exactly this and costs one condition.
   */
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || this.submitOn !== 'enter') {
      return
    }
    if (event.shiftKey || event.isComposing) {
      return
    }
    event.preventDefault()
    this.send()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-chat-composer': HelixHeadlessChatComposer
  }
}
