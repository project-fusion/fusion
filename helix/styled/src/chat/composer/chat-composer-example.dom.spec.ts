import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The example the styled composer draws over its empty field, so one example
   can roll into the next. The field's own placeholder stays the one a screen
   reader hears. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Composer = HTMLElement & {
  placeholder: string
  placeholders: readonly string[]
  updateComplete: Promise<unknown>
  value: string
}

const LONG =
  'Find where the session budget is checked, and explain why a long task stops before it reaches the limit'

const composers = async (markup: string): Promise<Composer[]> => {
  await mount(markup)
  const hosts = [...document.querySelectorAll('helix-chat-composer')] as Composer[]
  for (const host of hosts) {
    await host.updateComplete
  }
  return hosts
}

const field = (host: HTMLElement) => part(host, 'field') as HTMLTextAreaElement
const example = (host: HTMLElement) => part(host, 'example') as HTMLTextAreaElement | null

const withExamples = async (host: Composer, placeholders: string[]) => {
  host.placeholders = placeholders
  await host.updateComplete
}

describe('the example over the field', () => {
  test('one example, or a placeholder alone, keeps the field as it is', async () => {
    const [single, plain] = await composers(
      '<helix-chat-composer></helix-chat-composer><helix-chat-composer placeholder="Write a message"></helix-chat-composer>',
    )
    await withExamples(single as Composer, ['Fix the failing test'])
    expect(example(single as Composer)).toBeNull()
    expect(field(single as Composer).placeholder).toBe('Fix the failing test')
    expect(example(plain as Composer)).toBeNull()
    expect(field(plain as Composer).placeholder).toBe('Write a message')
  })

  test('two examples or more draw it, hidden from screen readers, and the field keeps the example', async () => {
    const [host] = await composers(
      '<helix-chat-composer label="Ask anything"></helix-chat-composer>',
    )
    await withExamples(host as Composer, ['Fix the failing test', 'Explain the auth flow'])
    const drawn = example(host as Composer)
    expect(drawn?.getAttribute('aria-hidden')).toBe('true')
    expect(drawn?.hasAttribute('inert')).toBe(true)
    expect(drawn?.tabIndex).toBe(-1)
    expect(drawn?.placeholder).toBe('Fix the failing test')
    expect(field(host as Composer).placeholder).toBe('Fix the failing test')
    expect(field(host as Composer).getAttribute('aria-label')).toBe('Ask anything')
  })

  test('it goes when the list drops to one example', async () => {
    const [host] = await composers('<helix-chat-composer></helix-chat-composer>')
    await withExamples(host as Composer, ['One', 'Two'])
    expect(example(host as Composer)).not.toBeNull()
    await withExamples(host as Composer, [])
    expect(example(host as Composer)).toBeNull()
  })
})

/* Browser only: happy-dom lays nothing out and has no anchor positioning. */
const run = hasLayout() ? test : (): void => {}

const box = (element: Element) => {
  const { height, left, top, width } = element.getBoundingClientRect()
  return [left, top, width, height].map((value) => Math.round(value * 2) / 2)
}

describe('the example in a browser', () => {
  run('sits on the field, and wraps as the field does at 390 pixels wide', async () => {
    const [drawn, alone] = await composers(
      `<div style="inline-size: 358px"><helix-chat-composer></helix-chat-composer></div>
       <div style="inline-size: 358px"><helix-chat-composer></helix-chat-composer></div>`,
    )
    await withExamples(drawn as Composer, [LONG, 'Two'])
    await withExamples(alone as Composer, [LONG])
    const overlay = example(drawn as Composer) as HTMLTextAreaElement
    expect(box(overlay)).toEqual(box(field(drawn as Composer)))
    // Wrapped onto more than one line, and as tall as the field with the example alone.
    expect(field(drawn as Composer).getBoundingClientRect().height).toBe(
      field(alone as Composer).getBoundingClientRect().height,
    )
    expect(overlay.getBoundingClientRect().height).toBeGreaterThan(
      Number.parseFloat(getComputedStyle(overlay).lineHeight) * 1.5,
    )
  })

  run('follows the field where a page places it, and on a right-to-left page', async () => {
    const style = document.createElement('style')
    style.textContent = `
      #placed::part(composer) { grid-template-columns: 2rem minmax(0, 1fr); }
      #placed::part(field) { grid-column: 2; grid-row: 1; margin-inline: 4px; }
      #placed::part(tools) { grid-column: 1 / -1; }
    `
    document.head.append(style)
    try {
      const [placed, mirrored] = await composers(
        `<div style="inline-size: 358px"><helix-chat-composer id="placed"></helix-chat-composer></div>
         <div dir="rtl" style="inline-size: 358px"><helix-chat-composer></helix-chat-composer></div>`,
      )
      for (const host of [placed, mirrored] as Composer[]) {
        await withExamples(host, [LONG, 'Two'])
        expect(box(example(host) as Element)).toEqual(box(field(host)))
      }
      expect(getComputedStyle(example(mirrored as Composer) as Element).direction).toBe('rtl')
    } finally {
      style.remove()
    }
  })

  run(
    'draws in the field placeholder color, and the field placeholder turns transparent',
    async () => {
      const [drawn, alone] = await composers(
        '<helix-chat-composer></helix-chat-composer><helix-chat-composer></helix-chat-composer>',
      )
      await withExamples(drawn as Composer, ['One', 'Two'])
      await withExamples(alone as Composer, ['One'])
      const ink = (element: Element) => getComputedStyle(element, '::placeholder').color
      expect(ink(example(drawn as Composer) as Element)).toBe(ink(field(alone as Composer)))
      expect(ink(field(drawn as Composer))).toBe('rgba(0, 0, 0, 0)')
      expect(ink(field(alone as Composer))).not.toBe('rgba(0, 0, 0, 0)')
    },
  )

  /* A real turn, so this waits out the 6.5 seconds a short example shows. A
     two-line example gives way to a one-line one: the two cross with the
     field at its two-line height, and the box takes the new height as the
     next example lands. */
  run(
    'crosses the leaving and the next example, and changes height as the next lands',
    async () => {
      const [host] = await composers(
        '<div style="inline-size: 358px"><helix-chat-composer></helix-chat-composer></div>',
      )
      await withExamples(host as Composer, [LONG, 'Two'])
      const tall = field(host as Composer).getBoundingClientRect().height
      const until = async (ready: () => boolean) => {
        while (!ready()) {
          await new Promise((done) => setTimeout(done, 5))
        }
      }
      await until(() => (host as Composer).matches(':state(example-entering)'))
      await (host as Composer).updateComplete
      const drawn = [
        ...((host as Composer).shadowRoot?.querySelectorAll('[part~="example"]') ?? []),
      ]
      expect(
        drawn.map((one) => [one.getAttribute('part'), (one as HTMLTextAreaElement).placeholder]),
      ).toEqual([
        ['example example-leaving', LONG],
        ['example', 'Two'],
      ])
      expect(field(host as Composer).getBoundingClientRect().height).toBe(tall)
      await until(() => !(host as Composer).matches(':state(example-entering)'))
      await new Promise((done) => setTimeout(done, 50))
      expect(field(host as Composer).getBoundingClientRect().height).toBeLessThan(tall)
      expect((host as Composer).shadowRoot?.querySelectorAll('[part~="example"]')).toHaveLength(1)
    },
    12000,
  )

  run('hides once the field holds text, and takes no pointer', async () => {
    const [host] = await composers('<helix-chat-composer></helix-chat-composer>')
    await withExamples(host as Composer, ['One', 'Two'])
    const overlay = example(host as Composer) as HTMLTextAreaElement
    expect(getComputedStyle(overlay).pointerEvents).toBe('none')
    expect(getComputedStyle(overlay).visibility).toBe('visible')
    const typed = field(host as Composer)
    typed.value = 'Draft'
    typed.dispatchEvent(new Event('input', { bubbles: true }))
    expect(getComputedStyle(overlay).visibility).toBe('hidden')
  })
})
