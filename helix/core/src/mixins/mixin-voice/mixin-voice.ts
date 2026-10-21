import { microphone } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import { HelixBeforeListenEvent, HelixListenEvent } from '../../events/events.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { drawIcon } from '../../utils/draw-icon/draw-icon.js'
import {
  pageSpeechEngine,
  type SpeechEngine,
  type SpeechSession,
} from '../../utils/speech/speech.js'
import { words } from '../../words/words.js'
import { wordsLocale } from '../../words/words-locale.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

export declare class VoiceElement {
  dictationDeniedLabel: string

  dictationFailedLabel: string

  dictationUnreachableLabel: string

  /** Whether the field is listening now. */
  readonly listening: boolean

  listeningLabel: string

  speechEngine: SpeechEngine | undefined

  stoppedListeningLabel: string

  voice: boolean

  voiceLabel: string

  voiceStopLabel: string

  /** Starts listening, and returns whether it did. */
  startListening(): boolean

  /** Stops listening, keeping what was heard. */
  stopListening(): void

  /** The dictation button and its status, behind a seam a tier can move. */
  protected renderVoice(): TemplateResult | typeof nothing

  /** What the dictation button draws: the microphone, or a level meter while listening. */
  protected renderVoiceGlyph(): TemplateResult

  /** The native field dictation types into. */
  protected voiceField(): HTMLInputElement | HTMLTextAreaElement | null

  /** The type of the field dictation types into. Dictation listens only in `text`, `search`, `tel` and `url`. */
  protected get voiceType(): string
}

/** A phrase that starts with punctuation joins the word before it with no space. */
const JOINS = /^[\s.,!?;:)\]}]/

/**
 * The input types dictation types into. A password is never dictated, since
 * the browser's recognizer sends what is said to a server and the guesses
 * would show in clear text, and `email` and `number` have no caret a script
 * can read or write.
 */
const DICTATED = new Set(['search', 'tel', 'text', 'url'])

/** Keys that change nothing in the field, so pressing one leaves dictation running. */
const HELD = new Set(['Alt', 'CapsLock', 'Control', 'Meta', 'Shift'])

/**
 * Adds dictation to a field: `voice` draws a button that listens through the
 * page's speech engine and types what it hears at the caret.
 *
 * **What is heard goes in through the field's own `input` event.** A guess is
 * written where the caret was and replaced by each better guess, and the
 * settled phrase replaces the last guess, each an `input` like a key press, so
 * a field's value, its validation and a framework's state follow it with no
 * code of their own. A space is put before a phrase that does not start with
 * punctuation when the text before it does not end in one.
 *
 * The button is drawn only once the page has been read, since a server cannot
 * ask whether the browser has an engine, and only where it has one.
 */
export const MixinVoice = <T extends Constructor<HelixElement>>(Base: T) => {
  class Voice extends Base {
    static words = ''

    /** What a screen reader hears when the browser or the reader refuses the microphone. */
    @words
    @property({ attribute: 'dictation-denied-label' })
    dictationDeniedLabel = 'Dictation needs the microphone'

    /** What a screen reader hears when listening ends with an error that has no label of its own. */
    @words
    @property({ attribute: 'dictation-failed-label' })
    dictationFailedLabel = 'Dictation stopped with an error'

    /** What a screen reader hears when the recognizer cannot reach its speech service. */
    @words
    @property({ attribute: 'dictation-unreachable-label' })
    dictationUnreachableLabel = 'Dictation could not reach the speech service'

    /** What a screen reader hears as listening starts. */
    @words
    @property({ attribute: 'listening-label' })
    listeningLabel = 'Listening'

    /**
     * The engine this field listens through, in place of the one
     * `registerSpeechEngine` gave the page, or the browser's own.
     */
    @property({ attribute: false })
    speechEngine: SpeechEngine | undefined = undefined

    /** What a screen reader hears as listening stops. */
    @words
    @property({ attribute: 'stopped-listening-label' })
    stoppedListeningLabel = 'Stopped listening'

    /**
     * Draws a button that listens for dictation and types what it hears at
     * the caret. Nothing listens until the button is pressed, and the
     * microphone is let go as listening stops. An input of type `password`,
     * `email` or `number` draws no button.
     */
    @property({ type: Boolean })
    voice = false

    /** The dictation button's name while it is not listening. */
    @words
    @property({ attribute: 'voice-label' })
    voiceLabel = 'Dictate'

    /** The dictation button's name while it listens. */
    @words
    @property({ attribute: 'voice-stop-label' })
    voiceStopLabel = 'Stop dictation'

    @state()
    private heard = false

    /** What the status region says, which a screen reader announces. */
    @state()
    private said = ''

    private session: SpeechSession | undefined

    /** Where the current guess sits in the field's value. */
    private guess: [number, number] = [0, 0]

    /** Whether the field is listening for dictation now. */
    get listening(): boolean {
      return this.heard
    }

    protected voiceField(): HTMLInputElement | HTMLTextAreaElement | null {
      return null
    }

    private get engine(): SpeechEngine {
      return this.speechEngine ?? pageSpeechEngine()
    }

    /** The type of the field dictation types into, which Input reads from its own `type`. */
    protected get voiceType(): string {
      return 'text'
    }

    /**
     * Whether the engine can listen here: never on a server or while hydrating
     * what one sent, which cannot ask the browser, so the button arrives with
     * the render that follows, and never in a field whose type it cannot type into.
     */
    private get voiceReady(): boolean {
      return (
        DICTATED.has(this.voiceType) &&
        (this as unknown as { childrenKnown: boolean }).childrenKnown &&
        this.engine.available()
      )
    }

    /** The button waits for the render after a hydration, which a field may not ask for itself. */
    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      if (this.voice) {
        this.finishHydration()
      }
    }

    protected override updated(changed: PropertyValues): void {
      super.updated(changed)
      if ((changed.has('voice') && !this.voice) || (this.heard && !this.voiceReady)) {
        this.stopListening()
      }
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.stopListening()
    }

    /**
     * Starts listening, as pressing the dictation button does, and returns
     * whether it did. It does not where `voice` drew no button, where the
     * field has nowhere to type, or where a listener refused
     * `helix-before-listen`.
     */
    startListening(): boolean {
      if (this.heard) {
        return true
      }
      const field = this.voiceField()
      if (!field || !this.voiceReady || !this.dispatchEvent(new HelixBeforeListenEvent())) {
        return false
      }
      this.guess = [
        field.selectionStart ?? field.value.length,
        field.selectionEnd ?? field.value.length,
      ]
      this.heard = true
      this.said = this.listeningLabel
      ;(this as unknown as { toggleState(name: string, on: boolean): void }).toggleState(
        'listening',
        true,
      )
      field.addEventListener('keydown', this.handleVoiceKey)
      field.addEventListener('pointerdown', this.handleVoicePointer)
      let session: SpeechSession
      try {
        session = this.engine.listen({
          lang: wordsLocale(this),
          listener: {
            end: (reason, message) => this.ended(reason, message),
            final: (text) => this.place(text, true),
            level: (level) => {
              this.style.setProperty('--dictation-level', level.toFixed(3))
              const meter = this.partNamed<HTMLElement & { level: number }>('voice-level')
              if (meter) {
                meter.level = level
              }
            },
            partial: (text) => this.place(text, false),
          },
        })
      } catch {
        this.ended()
        return false
      }
      /* The engine can end before it returns, when the browser refuses to
         start. The field is already quiet. Drop the session so a later press
         starts clean. */
      if (!this.heard) {
        try {
          session.stop()
        } catch {
          /* The session already ended. */
        }
        return false
      }
      this.session = session
      return true
    }

    /** Stops listening, keeping what was heard in the field. */
    stopListening(): void {
      this.session?.stop()
      this.ended()
    }

    private ended(reason?: 'ended' | 'error' | 'stopped', message?: string): void {
      if (!this.heard) {
        return
      }
      this.session = undefined
      this.heard = false
      this.said = reason === 'error' ? this.failure(message) : this.stoppedListeningLabel
      this.style.removeProperty('--dictation-level')
      ;(this as unknown as { toggleState(name: string, on: boolean): void }).toggleState(
        'listening',
        false,
      )
      this.voiceField()?.removeEventListener('keydown', this.handleVoiceKey)
      this.voiceField()?.removeEventListener('pointerdown', this.handleVoicePointer)
    }

    /** What the status region says for an error, by the Web Speech API's code where it has one. */
    private failure(message: string | undefined): string {
      if (message === 'network') {
        return this.dictationUnreachableLabel
      }
      if (
        message === 'not-allowed' ||
        message === 'service-not-allowed' ||
        message === 'audio-capture'
      ) {
        return this.dictationDeniedLabel
      }
      return this.dictationFailedLabel
    }

    /** Writes a guess, or the phrase it settled on, over the last guess. */
    private place(text: string, settled: boolean): void {
      const field = this.voiceField()
      if (!field || !this.heard) {
        return
      }
      const [start, end] = this.guess
      const before = field.value.slice(0, start)
      const spaced =
        text !== '' && before !== '' && !/\s$/.test(before) && !JOINS.test(text) ? ` ${text}` : text
      field.setRangeText(spaced, start, end, 'end')
      this.guess = settled
        ? [start + spaced.length, start + spaced.length]
        : [start, start + spaced.length]
      field.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          data: spaced,
          inputType: 'insertText',
        }),
      )
      if (settled && text !== '') {
        this.dispatchEvent(new HelixListenEvent({ text }))
      }
    }

    /**
     * Escape stops listening and is spent on it. Any other key that writes
     * or moves the caret stops listening too, and does what it does, since
     * the next guess would be written over the place the reader left.
     */
    private readonly handleVoiceKey = (event: Event): void => {
      const { key } = event as KeyboardEvent
      if (!this.heard || HELD.has(key)) {
        return
      }
      if (key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
      this.stopListening()
    }

    /** A press in the field moves the caret, so it stops listening as a key does. */
    private readonly handleVoicePointer = (): void => {
      this.stopListening()
    }

    /**
     * The microphone, or while the field listens, the tier's Voice Level
     * drawing the microphone's level as a few bars in its place.
     *
     * **Only where the tier defines one.** Voice Level is styled only, so a
     * headless field keeps the microphone while it listens, and its button
     * says so in `aria-pressed` and its name. The level is set on the meter
     * from each reading, with no render, about thirty times a second.
     */
    protected renderVoiceGlyph(): TemplateResult {
      const tier = (this.constructor as typeof HelixElement & { tier: string }).tier
      if (this.heard && customElements.get(`${tier}voice-level`)) {
        const meter = this.tag('voice-level')
        return html`<${meter} part="voice-level" exportparts="canvas: voice-level-canvas" aria-hidden="true" variant="spectrum"></${meter}>`
      }
      return drawIcon(microphone)
    }

    protected renderVoice(): TemplateResult | typeof nothing {
      if (!this.voice || !this.voiceReady) {
        return nothing
      }
      const off = (this as unknown as { isDisabled?: boolean }).isDisabled === true
      const readOnly = (this as unknown as { readOnly?: boolean }).readOnly === true
      return html`<button
          part="voice${this.heard ? ' voice-listening' : ''}"
          type="button"
          aria-label=${this.heard ? this.voiceStopLabel : this.voiceLabel}
          aria-pressed=${this.heard ? 'true' : 'false'}
          ?disabled=${off || readOnly}
          @click=${() => {
            if (this.heard) {
              this.stopListening()
            } else {
              this.startListening()
            }
          }}
        >
          ${this.renderVoiceGlyph()}
        </button
        ><span part="voice-status" data-spoken role="status">${this.said}</span>`
    }
  }

  return Voice as unknown as Constructor<VoiceElement> & T
}
