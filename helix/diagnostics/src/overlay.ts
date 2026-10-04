/**
 * The overlay: a badge with the counts, opening a panel with each finding
 * and its evidence; focusing or pointing at a finding outlines the element.
 *
 * **A custom element of its own, with its own shadow root**, so it works in
 * any framework and needs nothing from Helix's styles: its look is written
 * here, light and dark. It is the one element diagnostics adds to a page, and
 * diagnostics leaves it out of everything it counts and reads.
 *
 * **Built with DOM calls, never with markup strings.** A finding carries the
 * page's own CSS, and none of it is ever parsed as HTML.
 *
 * Shown only while there are findings: a clean page has nothing in its corner.
 */
import { matchable } from './analyze.js'
import { OVERLAY } from './page.js'
import type { Finding, Report, Severity } from './report.js'

/** What a running instance does with the overlay. */
export interface Overlay {
  /** The element, so a change it makes to the page is known for its own. */
  readonly element: HTMLElement
  /** Removes it from the page. */
  remove(): void
  /** Shows a run: the counts on the badge and the findings in the panel. */
  show(run: Report): void
}

/** Its look, light and dark, with nothing read from the page. */
const STYLE = `
:host {
  all: initial;
  --ink: #111113;
  --muted: #55555c;
  --ground: #ffffff;
  --raised: #f4f4f5;
  --edge: #d4d4d8;
  --error: #b42318;
  --warn: #8a5a00;
  --info: #1d4ed8;
  color-scheme: light dark;
  font: 13px/1.45 system-ui, sans-serif;
  inset-block-end: 16px;
  inset-inline-end: 16px;
  position: fixed;
  z-index: 2147483647;
}
@media (prefers-color-scheme: dark) {
  :host {
    --ink: #f4f4f5;
    --muted: #a1a1aa;
    --ground: #18181b;
    --raised: #27272a;
    --edge: #3f3f46;
    --error: #f97066;
    --warn: #fdb022;
    --info: #84adff;
  }
}
[hidden] { display: none !important; }
.stack {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
button {
  background: var(--ground);
  border: 1px solid var(--edge);
  border-radius: 999px;
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}
button:focus-visible, li:focus-visible {
  outline: 2px solid var(--info);
  outline-offset: 2px;
}
.badge {
  align-items: center;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  display: flex;
  gap: 8px;
  padding: 6px 12px;
}
.dot {
  block-size: 8px;
  border-radius: 50%;
  inline-size: 8px;
}
.panel {
  background: var(--ground);
  border: 1px solid var(--edge);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.24);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  inline-size: min(440px, calc(100vw - 32px));
  max-block-size: min(70vh, 560px);
  overflow: hidden;
}
header {
  align-items: center;
  border-block-end: 1px solid var(--edge);
  display: flex;
  gap: 8px;
  padding: 10px 12px;
}
h2 { font-size: 14px; font-weight: 600; margin: 0; }
.counts { color: var(--muted); flex: 1; margin: 0; }
.close { border-radius: 6px; padding: 2px 8px; }
ol { list-style: none; margin: 0; overflow: auto; padding: 0; }
li {
  border-block-end: 1px solid var(--edge);
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}
li:last-child { border-block-end: none; }
.kind { font-weight: 600; }
.error { color: var(--error); }
.warn { color: var(--warn); }
.info { color: var(--info); }
.message code {
  background: var(--raised);
  border-radius: 3px;
  font: 12px/1.4 ui-monospace, monospace;
  padding: 1px 4px;
  white-space: nowrap;
}
.subject, pre {
  font: 12px/1.4 ui-monospace, monospace;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
pre {
  background: var(--raised);
  border-radius: 6px;
  padding: 6px 8px;
}
.where { color: var(--muted); font-size: 12px; }
.outline {
  border: 2px dashed var(--error);
  border-radius: 4px;
  pointer-events: none;
  position: fixed;
}
`

/** The words for each severity, singular and plural. */
const WORDS: Record<Severity, [string, string]> = {
  error: ['error', 'errors'],
  info: ['info', 'info'],
  warn: ['warning', 'warnings'],
}

/** A count and its word. */
const counted = (count: number, severity: Severity): string =>
  `${count} ${WORDS[severity][count === 1 ? 0 : 1]}`

/** An element with a class and, where given, text. */
const make = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  name?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag)
  if (name) {
    element.className = name
  }
  if (text !== undefined) {
    element.textContent = text
  }
  return element
}

/**
 * A message as text and code: what sits between backticks, which the console
 * shows as written, is set as code here.
 */
const worded = (message: string): HTMLElement => {
  const out = make('span', 'message')
  message.split('`').forEach((piece, at) => {
    if (piece === '') {
      return
    }
    out.append(at % 2 === 1 ? make('code', undefined, piece) : document.createTextNode(piece))
  })
  return out
}

/**
 * The element a finding is about, where the page holds one: the element an
 * attribute is on, or the first element a selector matches.
 */
const locate = (finding: Finding, page: Document): Element | null => {
  const markup = /^<([a-z][a-z0-9-]*) ([^\s=>]+)(?:="(.*)")?>$/.exec(finding.subject)
  let selector: string | null
  if (markup) {
    const [, tag, name, value] = markup
    selector =
      value === undefined
        ? `${tag}[${CSS.escape(name ?? '')}]`
        : `${tag}[${CSS.escape(name ?? '')}="${CSS.escape(value)}"]`
  } else {
    selector = matchable(finding.subject.split(' { ')[0] ?? '')
  }
  if (!selector) {
    return null
  }
  try {
    return page.querySelector(selector)
  } catch {
    /* A selector this engine cannot parse points at nothing. */
    return null
  }
}

/** Defines the element once, whichever copy of diagnostics asks first. */
const define = (): void => {
  if (customElements.get(OVERLAY)) {
    return
  }
  customElements.define(OVERLAY, class extends HTMLElement {})
}

/** Puts the overlay on `page`. */
export const overlayOn = (page: Document): Overlay => {
  define()
  const element = page.createElement(OVERLAY)
  const root = element.attachShadow({ mode: 'open' })
  const style = make('style')
  style.textContent = STYLE

  const badge = make('button', 'badge')
  badge.type = 'button'
  badge.hidden = true
  badge.setAttribute('aria-expanded', 'false')
  badge.setAttribute('aria-controls', 'panel')
  const dot = make('span', 'dot')
  const label = make('span')
  badge.append(dot, label)

  const panel = make('section', 'panel')
  panel.id = 'panel'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Helix diagnostics')
  const header = make('header')
  const title = make('h2', undefined, 'Helix diagnostics')
  const summary = make('p', 'counts')
  const close = make('button', 'close', '×')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close Helix diagnostics')
  header.append(title, summary, close)
  const list = make('ol')
  panel.append(header, list)

  const outline = make('div', 'outline')
  outline.hidden = true
  /* The panel above the badge, both against the corner's edge. */
  const stack = make('div', 'stack')
  stack.append(panel, badge)
  root.append(style, stack, outline)
  ;(page.body ?? page.documentElement).append(element)

  const open = (value: boolean): void => {
    panel.hidden = !value
    badge.setAttribute('aria-expanded', String(value))
    if (!value) {
      outline.hidden = true
    }
  }
  badge.addEventListener('click', () => open(panel.hasAttribute('hidden')))
  close.addEventListener('click', () => {
    open(false)
    badge.focus()
  })
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      open(false)
      badge.focus()
    }
  })

  /** Outlines the element a finding is about, where the page holds one. */
  const point = (finding: Finding | undefined): void => {
    const target = finding ? locate(finding, page) : null
    if (!target) {
      outline.hidden = true
      return
    }
    const box = target.getBoundingClientRect()
    outline.style.borderColor = `var(--${finding?.severity})`
    outline.style.insetBlockStart = `${box.top - 3}px`
    outline.style.insetInlineStart = `${box.left - 3}px`
    outline.style.blockSize = `${box.height + 2}px`
    outline.style.inlineSize = `${box.width + 2}px`
    outline.hidden = false
  }

  const show = (run: Report): void => {
    const findings = run.findings
    const of = (severity: Severity) => findings.filter((one) => one.severity === severity).length
    const worst: Severity = of('error') > 0 ? 'error' : of('warn') > 0 ? 'warn' : 'info'
    const counts = (['error', 'warn', 'info'] as const)
      .filter((severity) => of(severity) > 0)
      .map((severity) => counted(of(severity), severity))
      .join(', ')
    badge.hidden = findings.length === 0
    if (findings.length === 0) {
      open(false)
    }
    dot.style.background = `var(--${worst})`
    label.textContent = counts
    badge.setAttribute('aria-label', `Helix diagnostics: ${counts}`)
    summary.textContent = run.run.page ? `${counts} on ${run.run.page}` : counts
    list.replaceChildren(
      ...findings.map((finding) => {
        const item = make('li')
        item.tabIndex = 0
        const head = make('span', 'kind')
        head.append(
          make('span', finding.severity, `${finding.severity} `),
          document.createTextNode(finding.kind),
        )
        item.append(head, make('code', 'subject', finding.subject), worded(finding.message))
        if (finding.origin) {
          item.append(
            make('span', 'where', `in ${finding.origin.sheet}`),
            make('pre', undefined, finding.origin.cssText),
          )
        }
        item.addEventListener('mouseenter', () => point(finding))
        item.addEventListener('focus', () => point(finding))
        item.addEventListener('mouseleave', () => point(undefined))
        item.addEventListener('blur', () => point(undefined))
        return item
      }),
    )
  }

  return { element, remove: () => element.remove(), show }
}
