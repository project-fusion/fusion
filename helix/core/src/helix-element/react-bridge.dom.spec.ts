import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { RUNTIME_LOG, type RuntimeEvent } from '../utils/report-runtime/report-runtime.js'

const tag = 'missing-probe'

/** Longer than the window and its six ticks, which take 96 ms and at least 96 ms. */
const pastTheWindow = (): Promise<void> => new Promise((done) => setTimeout(done, 250))

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('./helix-element.js')
  customElements.define(tag, class extends HelixElement {})
  /* **Every element a spec before this one left looking stops first.** One
     holding a props bag finds it under whichever mark the document carries
     next, which on a real page is right, since any element finding props
     shows the key still works, and here would answer for a page it is not on. */
  document.body.replaceChildren()
  await pastTheWindow()
})

/**
 * A new page as React would mark it: the document's root mark, under a suffix
 * no other test has used, because the bridge remembers what it found by mark.
 */
let pages = 0
const marked: string[] = []
const page = (): string => {
  pages += 1
  const mark = `_reactListening${pages}x`
  Object.assign(document, { [mark]: true })
  marked.push(mark)
  return mark
}

/** The mark `createRoot` and `hydrateRoot` leave on the node they render into. */
const CONTAINER = '__reactContainer$m3q1'

/** Makes a node the one React rendered into. */
const container = (node: Node): void => {
  Object.assign(node, { [CONTAINER]: {} })
}

/** Runs `run` with `console.error` counted and silenced, and says how many lines it printed. */
const printed = async (run: () => Promise<void>): Promise<number> => {
  const original = console.error
  let lines = 0
  console.error = () => {
    lines += 1
  }
  try {
    await run()
  } finally {
    console.error = original
  }
  return lines
}

/** The missing-props errors reported so far. */
const missing = (): RuntimeEvent[] =>
  (((globalThis as Record<symbol, unknown>)[RUNTIME_LOG] ?? []) as RuntimeEvent[]).filter(
    (one) => one.kind === 'react-props-missing',
  )

/* Cleared before each test, because the log keeps only the first 200 events
   of a run and a spec file before this one can fill it. */
beforeEach(() => {
  ;(globalThis as Record<symbol, unknown>)[RUNTIME_LOG] = []
})

afterEach(() => {
  for (const mark of marked.splice(0)) {
    delete (document as unknown as Record<string, unknown>)[mark]
  }
  delete (document.body as unknown as Record<string, unknown>)[CONTAINER]
  document.body.replaceChildren()
})

/* **The bridge's one silent failure, made loud.** It reads React's props under
   React's own key, so the day React renames it every handler on a hydrated
   page is dead and nothing says so. These are in a development build, which
   `bun test --conditions helix-development` resolves `#react-audit` to. */
describe('a page where React has a root and no element found its props', () => {
  test('is an error, once, naming the window it looked for', async () => {
    page()
    container(document.body)
    const lines = await printed(async () => {
      document.body.append(document.createElement(tag), document.createElement(tag))
      await pastTheWindow()
    })
    expect(missing()).toHaveLength(1)
    expect(missing()[0]?.level).toBe('error')
    expect(missing()[0]?.tag).toBe(tag)
    expect(missing()[0]?.message).toContain('within 96 ms')
    expect(lines).toBe(1)
  })

  test('is quiet once one element found them, whatever the others found', async () => {
    page()
    container(document.body)
    const owned = document.createElement(tag)
    Object.assign(owned, { __reactProps$k9x2: { label: 'Owned' } })
    document.body.append(owned, document.createElement(tag))
    await pastTheWindow()
    expect(missing()).toHaveLength(0)
  })

  /* A second copy of React on the page writes its own suffix, and is asked again. */
  test('is asked again for a new mark', async () => {
    page()
    container(document.body)
    await printed(async () => {
      document.body.append(document.createElement(tag))
      await pastTheWindow()
    })
    expect(missing()).toHaveLength(1)
  })
})

describe('an element React does not render', () => {
  test('says nothing on a page without the root mark', async () => {
    container(document.body)
    document.body.append(document.createElement(tag))
    await pastTheWindow()
    expect(missing()).toHaveLength(0)
  })

  /* Lit renders most of this library's elements in a shadow root, where React
     holds nothing. */
  test('says nothing from inside a shadow root', async () => {
    page()
    container(document.body)
    const host = document.createElement('div')
    document.body.append(host)
    host.attachShadow({ mode: 'open' }).append(document.createElement(tag))
    await pastTheWindow()
    expect(missing()).toHaveLength(0)
  })

  /* A React island that renders no Helix element marks the document all the
     same, and the static elements beside it are no symptom. */
  test('says nothing outside the node React rendered into', async () => {
    page()
    const island = document.createElement('div')
    container(island)
    document.body.append(island, document.createElement(tag))
    await pastTheWindow()
    expect(missing()).toHaveLength(0)
  })
})
