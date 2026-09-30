import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** A host this can adopt a sheet into: one with a shadow root it renders. */
type Placed = ReactiveControllerHost &
  HTMLElement & { readonly renderRoot?: Element | DocumentFragment }

/**
 * Custom properties another element sets on this one, kept in its own shadow
 * root.
 *
 * **Nothing is written onto the page's element.** A marker a connector stands
 * on the map, or a card a board places, is the page's markup, and its `style`
 * attribute is the page's too. Written there, a placement was markup the
 * server never sent, which a framework's hydration reports; and a page that
 * set `style` on the element, a card's color, wiped the placement every time
 * it rendered. Here the values are a
 * `:host` rule in a sheet this element adopts, which inherit to everything the
 * element draws exactly as an inline style's did, and which no framework
 * sees.
 *
 * **Rewritten only when a value changes**, since a map moving writes every
 * marker's place on every frame and most frames move some not at all.
 */
export class PlacementController implements ReactiveController {
  private readonly values = new Map<string, string>()
  private sheet: CSSStyleSheet | undefined
  private written: string | undefined

  constructor(private readonly host: Placed) {
    host.addController(this)
  }

  /** Sets each property given, and takes away each one given as `undefined`. */
  set(properties: Readonly<Record<string, string | undefined>>): void {
    for (const [name, value] of Object.entries(properties)) {
      if (value === undefined) {
        this.values.delete(name)
      } else {
        this.values.set(name, value)
      }
    }
    this.write()
  }

  /** What a property is set to here, or `undefined` where it is not. */
  get(name: string): string | undefined {
    return this.values.get(name)
  }

  /* The sheet goes on once the shadow root exists, which is when the element
     is first connected: a placement asked for before that is kept and written
     then. After the element's own styles, so a value here outranks the
     default its stylesheet declares. */
  hostConnected(): void {
    this.write()
  }

  private write(): void {
    const root = this.host.renderRoot
    if (!(typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot)) {
      return
    }
    if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype)) {
      return
    }
    const text = `:host{${[...this.values].map(([name, value]) => `${name}:${value}`).join(';')}}`
    if (!this.sheet) {
      this.sheet = new CSSStyleSheet()
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.sheet]
    } else if (!root.adoptedStyleSheets.includes(this.sheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.sheet]
    }
    if (text !== this.written) {
      this.sheet.replaceSync(text)
      this.written = text
    }
  }
}
