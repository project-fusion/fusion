import { deepActiveElement } from '../focusable-elements/focusable-elements.js'

/*
 * A screen's state, saved and put back: which overlays are open, what each
 * field holds, where each box is scrolled and where the caret is, so a visual
 * test and an agent can reproduce an exact screen.
 *
 * **Restoring goes through the same requests a reader's action does.** An
 * overlay opens through `requestOpen`, a field through `requestValue`, a box
 * through `requestChecked`, so a page that controls `open` from React hears
 * `helix-before-open` and keeps its own state, and a page that refuses one
 * keeps the state it chose. `restoreState` says which entries did not take.
 *
 * **What a reader typed is in a snapshot**, except a password field, a field
 * whose `autocomplete` names a password, a one-time code or a payment card,
 * and anything under `snapshot="off"`.
 */

/** What one element holds, as a snapshot keeps it. */
export interface ElementState {
  /** The caret or selection in its field, start and end. */
  caret?: [number, number]
  checked?: boolean
  open?: boolean
  /** Where each box it scrolls is scrolled, in the order the boxes are drawn, as `[left, top]`. */
  scroll?: Array<[number, number]>
  value?: string
}

/** A screen, as `captureState` writes it. */
export interface PageState {
  /** One entry per Helix element with something to keep, in document order. */
  entries: Array<{ path: string; state: ElementState; tag: string }>
  /** The element focus was on, by its path. */
  focus?: string
  /** The document's own scroll, `[left, top]`. */
  scroll: [number, number]
  version: 1
  /** The viewport the screen was captured at, `[width, height]`. */
  viewport: [number, number]
}

/** What `restoreState` did. */
export interface RestoreReport {
  /** How many entries were put back. */
  applied: number
  /** Paths that found no element, such as one the page no longer draws. */
  missed: string[]
  /** Paths whose element refused a request, which the page decided. */
  refused: string[]
}

type Stateful = HTMLElement & {
  checked?: unknown
  open?: unknown
  requestChecked?: (next: boolean) => boolean
  requestOpen?: (next: boolean) => boolean
  requestValue?: (next: string) => boolean
  updateComplete?: Promise<unknown>
  value?: unknown
}

/** Whether an element is one of Helix's, which every tier's class says through its `tier`. */
const isHelix = (element: Element): element is Stateful =>
  typeof (element.constructor as { tier?: unknown }).tier === 'string'

/** The element's composed parent: its parent, or the host of the shadow root it sits in. */
const parentOf = (element: Element): Element | null =>
  element.parentElement ??
  ((element.getRootNode() as ShadowRoot).host as Element | undefined) ??
  null

/** Whether `snapshot="off"` is on the element or around it. */
const excluded = (element: Element): boolean => {
  for (let at: Element | null = element; at; at = parentOf(at)) {
    if (at.getAttribute('snapshot') === 'off') {
      return true
    }
  }
  return false
}

/** The native field inside a Helix field, where its text and caret are. */
const fieldOf = (element: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null =>
  element.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]), textarea',
  ) ?? null

/** The `autocomplete` tokens that name a secret: a password, a one-time code, or any `cc-` field of a payment card. */
const SECRET_TOKEN = /^(?:cc-.+|current-password|new-password|one-time-code)$/

/** Whether a field holds something a snapshot must never keep. */
const secret = (element: HTMLElement): boolean => {
  const field = fieldOf(element)
  const type = (element as { type?: unknown }).type ?? field?.type
  const autocomplete =
    element.getAttribute('autocomplete') ?? field?.getAttribute('autocomplete') ?? ''
  return (
    type === 'password' ||
    autocomplete
      .toLowerCase()
      .split(/\s+/)
      .some((token) => SECRET_TOKEN.test(token))
  )
}

/** What one Helix element holds that a snapshot keeps, or nothing where it holds none. */
export const snapshotOf = (element: HTMLElement): ElementState | undefined => {
  const stateful = element as Stateful
  const state: ElementState = {}
  if (typeof stateful.requestOpen === 'function' && typeof stateful.open === 'boolean') {
    state.open = stateful.open
  }
  if (typeof stateful.requestChecked === 'function' && typeof stateful.checked === 'boolean') {
    state.checked = stateful.checked
  }
  if (
    typeof stateful.requestValue === 'function' &&
    typeof stateful.value === 'string' &&
    !secret(element)
  ) {
    state.value = stateful.value
  }
  const boxes = [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[data-scroller]') ?? [])]
  if (boxes.some((box) => box.scrollTop !== 0 || box.scrollLeft !== 0)) {
    state.scroll = boxes.map((box) => [box.scrollLeft, box.scrollTop])
  }
  const field = fieldOf(element)
  if (field && deepActiveElement() === field && field.selectionStart !== null && !secret(element)) {
    state.caret = [field.selectionStart, field.selectionEnd ?? field.selectionStart]
  }
  return Object.keys(state).length > 0 ? state : undefined
}

/**
 * Puts one element's state back, through the requests a reader's action
 * makes, and returns whether every request was granted.
 */
export const restoreOn = async (element: HTMLElement, state: ElementState): Promise<boolean> => {
  const stateful = element as Stateful
  let granted = true
  if (state.value !== undefined && stateful.value !== state.value) {
    granted = (stateful.requestValue?.(state.value) ?? false) && granted
  }
  if (state.checked !== undefined && stateful.checked !== state.checked) {
    granted = (stateful.requestChecked?.(state.checked) ?? false) && granted
  }
  if (state.open !== undefined && stateful.open !== state.open) {
    granted = (stateful.requestOpen?.(state.open) ?? false) && granted
  }
  /* Scroll and caret once the element has drawn what the requests changed,
     such as an opened list's rows. */
  await stateful.updateComplete
  const boxes = [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[data-scroller]') ?? [])]
  state.scroll?.forEach(([left, top], index) => {
    boxes[index]?.scrollTo({ behavior: 'instant', left, top })
  })
  if (state.caret) {
    const field = fieldOf(element)
    field?.focus()
    field?.setSelectionRange(state.caret[0], state.caret[1])
  }
  return granted
}

/**
 * A path that finds an element again on the same page: its `id` where it has
 * one, and otherwise its tag and its place among the elements of that tag in
 * its tree, with `>>` crossing into a shadow root.
 */
export const pathOf = (element: Element): string => {
  const steps: string[] = []
  for (let at: Element | null = element; at; ) {
    const root = at.getRootNode() as Document | ShadowRoot
    const tag = at.localName
    const id = at.id
    const unique = id !== '' && root.querySelectorAll(`#${CSS.escape(id)}`).length === 1
    steps.unshift(unique ? `#${id}` : `${tag}:${[...root.querySelectorAll(tag)].indexOf(at)}`)
    at = root instanceof ShadowRoot ? root.host : null
  }
  return steps.join(' >> ')
}

/** The element a path names, or nothing where the page no longer draws it. */
export const elementAt = (path: string, root: Document = document): Element | null => {
  let scope: Document | ShadowRoot | null = root
  let found: Element | null = null
  for (const step of path.split(' >> ')) {
    if (!scope) {
      return null
    }
    if (step.startsWith('#')) {
      found = scope.querySelector(`#${CSS.escape(step.slice(1))}`)
    } else {
      const [tag = '', index = '0'] = step.split(':')
      found = scope.querySelectorAll(tag)[Number(index)] ?? null
    }
    scope = found?.shadowRoot ?? null
  }
  return found
}

/** Every element under a root, shadow roots included, in document order. */
const everyElement = (root: Document | ShadowRoot | Element): Element[] =>
  [...root.querySelectorAll('*')].flatMap((element) => [
    element,
    ...(element.shadowRoot ? everyElement(element.shadowRoot) : []),
  ])

/** The screen as it is: every Helix element's state, the focus, the scroll and the viewport. */
export const captureState = (root: Document = document): PageState => {
  const entries = everyElement(root)
    .filter(isHelix)
    .filter((element) => !excluded(element))
    .flatMap((element) => {
      const state = snapshotOf(element)
      return state ? [{ path: pathOf(element), state, tag: element.localName }] : []
    })
  const focus = deepActiveElement()
  const view = root.defaultView
  return {
    entries,
    ...(focus && focus !== root.body ? { focus: pathOf(focus) } : {}),
    scroll: [view?.scrollX ?? 0, view?.scrollY ?? 0],
    version: 1,
    viewport: [view?.innerWidth ?? 0, view?.innerHeight ?? 0],
  }
}

/**
 * Puts a screen back: each entry in document order, each element waiting for
 * its definition and its update so an opened overlay has drawn its rows
 * before a row inside it is restored, then the focus and the scroll.
 */
export const restoreState = async (
  snapshot: PageState,
  root: Document = document,
): Promise<RestoreReport> => {
  const report: RestoreReport = { applied: 0, missed: [], refused: [] }
  for (const entry of snapshot.entries) {
    await customElements.whenDefined(entry.tag)
    const element = elementAt(entry.path, root)
    if (!(element instanceof HTMLElement)) {
      report.missed.push(entry.path)
      continue
    }
    await (element as Stateful).updateComplete
    if (await restoreOn(element, entry.state)) {
      report.applied += 1
    } else {
      report.refused.push(entry.path)
    }
  }
  if (snapshot.focus) {
    const target = elementAt(snapshot.focus, root)
    ;(target as HTMLElement | null)?.focus?.()
  }
  root.defaultView?.scrollTo({
    behavior: 'instant',
    left: snapshot.scroll[0],
    top: snapshot.scroll[1],
  })
  return report
}

/**
 * Where a page's capture and restore are found without importing anything,
 * such as by `helix visual`'s driver, which reaches a page only through its
 * globals: `globalThis[Symbol.for('fusion.dev/helix/state')]`.
 *
 * **Empty unless asked for.** A page that exposed it by default would hand
 * every script on it the text in every field and a way to drive each element.
 * The page asks by calling `exposeState()`. A tool that drives a page it did
 * not write, such as `helix visual` or an agent's browser, asks before the
 * page loads by setting the slot to `true`, and the first copy of Helix to
 * load fills it.
 *
 * **On `globalThis` and not on the element classes**, for the reason
 * `noteVersion` gives: a static would be listed on every reference page. The
 * first copy of Helix on a page keeps the slot.
 */
export const STATE_SLOT = Symbol.for('fusion.dev/helix/state')

/** Puts `captureState` and `restoreState` where a page's tools find them, once. */
export const exposeState = (): void => {
  const store = globalThis as Record<symbol, unknown>
  if (typeof store[STATE_SLOT] !== 'object') {
    store[STATE_SLOT] = { captureState, restoreState }
  }
}

/** Exposes the state tools where a tool set the slot to `true` before the page loaded. */
export const exposeStateIfAsked = (): void => {
  if ((globalThis as Record<symbol, unknown>)[STATE_SLOT] === true) {
    exposeState()
  }
}
