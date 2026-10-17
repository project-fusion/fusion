import { microphone } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
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

  /** The native field dictation types into. */
  protected voiceField(): HTMLInputElement | HTMLTextAreaElement | null
}

/** A phrase that starts with punctuation joins the word before it with no space. */
const JOINS = /^[\s.,!?;:)\]}]/

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
     * microphone is let go as listening stops.
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

    /**
     * Whether the engine can listen here: never on a server or while hydrating
     * what one sent, which cannot ask the browser, so the button arrives with
     * the render that follows.
     */
    private get voiceReady(): boolean {
      return (
        (this as unknown as { childrenKnown: boolean }).childrenKnown && this.engine.available()
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
      if (changed.has('voice') && !this.voice) {
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
      this.session = this.engine.listen({
        lang: wordsLocale(this),
        listener: {
          end: () => this.ended(),
          final: (text) => this.place(text, true),
          level: (level) => {
            this.style.setProperty('--dictation-level', level.toFixed(3))
          },
          partial: (text) => this.place(text, false),
        },
      })
      return true
    }

    /** Stops listening, keeping what was heard in the field. */
    stopListening(): void {
      this.session?.stop()
      this.ended()
    }

    private ended(): void {
      if (!this.heard) {
        return
      }
      this.session = undefined
      this.heard = false
      this.said = this.stoppedListeningLabel
      this.style.removeProperty('--dictation-level')
      ;(this as unknown as { toggleState(name: string, on: boolean): void }).toggleState(
        'listening',
        false,
      )
      this.voiceField()?.removeEventListener('keydown', this.handleVoiceKey)
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

    private readonly handleVoiceKey = (event: Event): void => {
      if ((event as KeyboardEvent).key === 'Escape' && this.heard) {
        event.preventDefault()
        event.stopPropagation()
        this.stopListening()
      }
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
          ${drawIcon(microphone)}
        </button
        ><span part="voice-status" data-spoken role="status">${this.said}</span>`
    }
  }

  return Voice as unknown as Constructor<VoiceElement> & T
}
