import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Steps = HTMLElement & { updateComplete: Promise<unknown> }

const steps = async (attrs = ''): Promise<Steps> => {
  const host = (await mount(`<helix-steps ${attrs}>
    <helix-step complete>Details</helix-step>
    <helix-step current>Payment</helix-step>
    <helix-step>Review</helix-step>
  </helix-steps>`)) as Steps
  await host.updateComplete
  return host
}

/** The semantics live on the internals, never as attributes on the host. */
const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

describe('steps', () => {
  test('the list is the host, because the steps are the consumer’s elements', async () => {
    // An `<ol>` in the shadow root would be a list whose items are elsewhere.
    const host = await steps('label="Checkout"')
    expect(internals(host).role).toBe('list')
    expect(internals(host).ariaLabel).toBe('Checkout')
  })

  test('each step is an item, and only the current one says so', async () => {
    const host = await steps()
    const all = [...host.querySelectorAll('helix-step')] as HTMLElement[]
    for (const step of all) {
      await (step as unknown as Steps).updateComplete
    }
    expect(all.map((s) => internals(s).role)).toEqual(['listitem', 'listitem', 'listitem'])
    expect(all.map((s) => internals(s).ariaCurrent)).toEqual([null, 'step', null])
  })

  test('every step draws one mark, and which one is its own state', async () => {
    /* Rendering all three and hiding two in CSS would work and is worse: the
       markup would say three things about a stage that is one. Told apart by
       the path data, since that is what actually differs. */
    const host = await steps()
    const marks: string[] = []
    for (const step of [...host.querySelectorAll('helix-step')] as HTMLElement[]) {
      await (step as unknown as Steps).updateComplete
      const svgs = step.shadowRoot?.querySelectorAll('svg') ?? []
      expect(svgs).toHaveLength(1)
      marks.push(svgs[0]?.innerHTML ?? '')
    }
    expect(new Set(marks).size).toBe(3)
  })

  test('and a step that is both keeps the check, because that is the fact', async () => {
    // The target is only where the reader happens to be standing; the name and
    // the rule still say which stage is open.
    const host = (await mount(
      `<helix-steps><helix-step complete>A</helix-step>
       <helix-step complete current>B</helix-step></helix-steps>`,
    )) as Steps
    await host.updateComplete
    const [done, back] = [...host.querySelectorAll('helix-step')] as HTMLElement[]
    for (const step of [done, back]) {
      await (step as unknown as Steps).updateComplete
    }
    expect(back.shadowRoot?.querySelector('svg')?.innerHTML).toBe(
      done.shadowRoot?.querySelector('svg')?.innerHTML,
    )
  })

  test('both halves of the rule are drawn, and the ends drop one each', async () => {
    /* Two halves rather than one line, because a line to the next mark has to
       know how far away it is and a step knows only its own size. */
    const host = await steps()
    for (const step of [...host.querySelectorAll('helix-step')] as HTMLElement[]) {
      await (step as unknown as Steps).updateComplete
      expect(step.shadowRoot?.querySelector('[part="lead"]')).not.toBeNull()
      expect(step.shadowRoot?.querySelector('[part="trail"]')).not.toBeNull()
    }
  })

  test('complete and current are independent, because a reader can step back', async () => {
    /* Both true is a reader reviewing a stage they already finished. A stepper
       that treats them as one state loses the check the moment they go back. */
    const host = (await mount(
      `<helix-steps><helix-step complete current>Details</helix-step></helix-steps>`,
    )) as Steps
    await host.updateComplete
    const step = host.querySelector('helix-step') as HTMLElement
    await (step as unknown as Steps).updateComplete
    expect(internals(step).ariaCurrent).toBe('step')
    expect(step.shadowRoot?.querySelector('svg')).not.toBeNull()
  })
})

describe('a step is pressable, and only its name is', () => {
  const one = async (attrs = ''): Promise<HTMLElement> => {
    const host = (await mount(
      `<helix-steps><helix-step ${attrs}>Payment</helix-step></helix-steps>`,
    )) as Steps
    await host.updateComplete
    const step = host.querySelector('helix-step') as HTMLElement
    await (step as unknown as Steps).updateComplete
    return step
  }

  test('the button is the name, and it is the library’s own button', async () => {
    /* `helix-button` rather than a `<button>` reset here: the hover wash, the
       focus ring and the disabled treatment are decisions it already carries,
       and a second copy of them is a second copy to keep in step.
       The marker is `aria-hidden` decoration and stays outside it, so wrapping
       it would add hit area and no meaning. */
    const step = await one('value="pay"')
    const label = part(step, 'label') as HTMLElement
    expect(label.tagName).toBe('HELIX-BUTTON')
    expect(label.getAttribute('appearance')).toBe('ghost')
    expect(step.shadowRoot?.querySelector('[part="marker"]')?.tagName).toBe('SPAN')
  })

  test('pressing it announces the step by name', async () => {
    const step = await one('value="pay"')
    const said: string[] = []
    step.addEventListener('helix-select', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    ;(part(step, 'label') as HTMLElement).click()
    expect(said).toEqual(['pay'])
  })

  test('and a refused step announces nothing', async () => {
    // Which steps a reader may jump to is the consumer's to know: a wizard that
    // lets you skip to the end and one that does not are both real.
    const step = await one('disabled value="pay"')
    const said: string[] = []
    step.addEventListener('helix-select', () => said.push('x'))
    ;(part(step, 'label') as HTMLElement).click()
    expect(said).toEqual([])
  })

  test('what the stage holds is in the markup either way, and opens on current', async () => {
    /* `current` is what opens it, so the state saying where the reader is also
       shows them the stage: one attribute, and it renders open on the server
       rather than after hydration. */
    const shut = await one('value="pay"')
    const open = await one('current value="pay"')
    for (const step of [shut, open]) {
      expect(step.shadowRoot?.querySelector('[part="content"]')).not.toBeNull()
    }
    expect(shut.hasAttribute('current')).toBe(false)
    expect(open.hasAttribute('current')).toBe(true)
  })
})

describe('the list can hold which step is current', () => {
  const seq = async (attrs = ''): Promise<Steps> => {
    const host = (await mount(`<helix-steps ${attrs}>
      <helix-step complete value="one">One</helix-step>
      <helix-step value="two">Two</helix-step>
      <helix-step value="three">Three</helix-step>
    </helix-steps>`)) as Steps
    await host.updateComplete
    return host
  }

  const currents = (host: Steps): boolean[] =>
    [...host.querySelectorAll('helix-step')].map((one) => one.hasAttribute('current'))

  test('`default-active` puts it on the step that owns the value', async () => {
    const host = await seq('default-active="two"')
    expect(currents(host)).toEqual([false, true, false])
  })

  test('and it never touches `complete`, because a reader can step back', async () => {
    /* Deriving both from a position is the obvious design and is wrong the
       first time anybody goes back: at stage one of three, stages one and two
       are still finished, while "everything before the active one" says only
       the first is. */
    const host = await seq('default-active="one"')
    const steps = [...host.querySelectorAll('helix-step')]
    expect(steps.map((one) => one.hasAttribute('complete'))).toEqual([true, false, false])
    expect(currents(host)).toEqual([true, false, false])
  })

  test('unset, the steps keep whatever they were given', async () => {
    /* The case a server renders. This element would have to count its slotted
       children to know which one is third, and the server has none, so leaving
       them alone is what stops the whole sequence flashing on hydration. */
    const host = (await mount(`<helix-steps>
      <helix-step complete value="one">One</helix-step>
      <helix-step current value="two">Two</helix-step>
    </helix-steps>`)) as Steps
    await host.updateComplete
    expect(currents(host)).toEqual([false, true])
  })

  test('pressing a step moves it, uncontrolled', async () => {
    const host = await seq('default-active="one"')
    const third = host.querySelectorAll('helix-step')[2] as HTMLElement
    await (third as unknown as Steps).updateComplete
    ;(part(third, 'label') as HTMLElement).click()
    await host.updateComplete
    expect((host as unknown as { active: string }).active).toBe('three')
    expect(currents(host)).toEqual([false, false, true])
  })

  test('and announces without moving where the consumer owns it', async () => {
    // Controlled is decided once, off whether anything set `active` by the
    // first update, so this element must announce and wait to be told.
    const host = await seq('active="one"')
    const said: string[] = []
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const third = host.querySelectorAll('helix-step')[2] as HTMLElement
    await (third as unknown as Steps).updateComplete
    ;(part(third, 'label') as HTMLElement).click()
    await host.updateComplete
    expect(said).toEqual(['three'])
    expect(currents(host)).toEqual([true, false, false])
  })
})
