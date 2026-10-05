import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Steps = HTMLElement & { updateComplete: Promise<unknown> }

const steps = async (attrs = ''): Promise<Steps> => {
  const host = (await mount(`<helix-headless-steps ${attrs}>
    <helix-headless-step complete>Details</helix-headless-step>
    <helix-headless-step current>Payment</helix-headless-step>
    <helix-headless-step>Review</helix-headless-step>
  </helix-headless-steps>`)) as Steps
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
    const all = [...host.querySelectorAll('helix-headless-step')] as HTMLElement[]
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
    for (const step of [...host.querySelectorAll('helix-headless-step')] as HTMLElement[]) {
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
      `<helix-headless-steps><helix-headless-step complete>A</helix-headless-step>
       <helix-headless-step complete current>B</helix-headless-step></helix-headless-steps>`,
    )) as Steps
    await host.updateComplete
    const steps = [...host.querySelectorAll('helix-headless-step')] as HTMLElement[]
    const done = at(steps, 0)
    const back = at(steps, 1)
    for (const step of [done, back]) {
      await (step as unknown as Steps).updateComplete
    }
    expect(back.shadowRoot?.querySelector('svg')?.innerHTML).toBe(
      done.shadowRoot?.querySelector('svg')?.innerHTML,
    )
  })

  test('the rule is the sheet’s, so a step renders no box for either half', async () => {
    /* Two halves rather than one line, because a line to the next mark has to
       know how far away it is and a step knows only its own size. Both are
       placed entirely from properties the list hands down, so there is nothing
       for a box to carry and this tier renders none: the styled sheet draws them
       on the step's own `::before` and `::after`, and `step-geometry.dom.spec.ts`
       holds it to that. */
    const host = await steps()
    for (const step of [...host.querySelectorAll('helix-headless-step')] as HTMLElement[]) {
      await (step as unknown as Steps).updateComplete
      expect(step.shadowRoot?.querySelector('[part="marker"]')).not.toBeNull()
      expect(step.shadowRoot?.querySelector('[part="lead"]')).toBeNull()
      expect(step.shadowRoot?.querySelector('[part="trail"]')).toBeNull()
    }
  })

  test('complete and current are independent, because a reader can step back', async () => {
    /* Both true is a reader reviewing a stage they already finished. A stepper
       that treats them as one state loses the check the moment they go back. */
    const host = (await mount(
      `<helix-headless-steps><helix-headless-step complete current>Details</helix-headless-step></helix-headless-steps>`,
    )) as Steps
    await host.updateComplete
    const step = host.querySelector('helix-headless-step') as HTMLElement
    await (step as unknown as Steps).updateComplete
    expect(internals(step).ariaCurrent).toBe('step')
    expect(step.shadowRoot?.querySelector('svg')).not.toBeNull()
  })
})

describe('a step is pressable, and only its name is', () => {
  const one = async (attrs = ''): Promise<HTMLElement> => {
    const host = (await mount(
      `<helix-headless-steps><helix-headless-step ${attrs}>Payment</helix-headless-step></helix-headless-steps>`,
    )) as Steps
    await host.updateComplete
    const step = host.querySelector('helix-headless-step') as HTMLElement
    await (step as unknown as Steps).updateComplete
    return step
  }

  test('the button is the name, and it is the library’s own button', async () => {
    /* `helix-headless-button` rather than a `<button>` reset here: the hover wash, the
       focus ring and the disabled treatment are decisions it already carries,
       and a second copy of them is a second copy to keep in step.
       The marker is `aria-hidden` decoration and stays outside it, so wrapping
       it would add hit area and no meaning. */
    const step = await one('value="pay"')
    const label = part(step, 'label') as HTMLElement
    expect(label.tagName).toBe('HELIX-HEADLESS-BUTTON')
    /* **`emphasis`, which is the name the button actually has.** This asserted
       `appearance` for as long as the step wrote it, and neither tier has ever
       had such a property: the test passed on markup that landed nowhere, and
       every step drew at the default emphasis while this said it was a ghost.

       The attribute rather than the property is right here even so, because a
       visual axis belongs to the styled tier and the base button deliberately
       has none: what this tier owes is the correct name written down for the
       subclass to read. */
    expect(label.getAttribute('emphasis')).toBe('ghost')
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
    const host = (await mount(`<helix-headless-steps ${attrs}>
      <helix-headless-step complete value="one">One</helix-headless-step>
      <helix-headless-step value="two">Two</helix-headless-step>
      <helix-headless-step value="three">Three</helix-headless-step>
    </helix-headless-steps>`)) as Steps
    await host.updateComplete
    return host
  }

  const currents = (host: Steps): boolean[] =>
    [...host.querySelectorAll('helix-headless-step')].map((one) => one.hasAttribute('current'))

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
    const steps = [...host.querySelectorAll('helix-headless-step')]
    expect(steps.map((one) => one.hasAttribute('complete'))).toEqual([true, false, false])
    expect(currents(host)).toEqual([true, false, false])
  })

  test('unset, the steps keep whatever they were given', async () => {
    /* The case a server renders. This element would have to count its slotted
       children to know which one is third, and the server has none, so leaving
       them alone is what stops the whole sequence flashing on hydration. */
    const host = (await mount(`<helix-headless-steps>
      <helix-headless-step complete value="one">One</helix-headless-step>
      <helix-headless-step current value="two">Two</helix-headless-step>
    </helix-headless-steps>`)) as Steps
    await host.updateComplete
    expect(currents(host)).toEqual([false, true])
  })

  test('pressing a step moves it, uncontrolled', async () => {
    const host = await seq('default-active="one"')
    const third = host.querySelectorAll('helix-headless-step')[2] as HTMLElement
    await (third as unknown as Steps).updateComplete
    ;(part(third, 'label') as HTMLElement).click()
    await host.updateComplete
    expect((host as unknown as { active: string }).active).toBe('three')
    expect(currents(host)).toEqual([false, false, true])
  })

  test('and refusing the step`s own event leaves the sequence where it was', async () => {
    /* `helix-select` is cancelable and the step documents it as refusable. This
       element is the one thing that acts on it, so a refusal it ignored was a
       veto that did nothing anywhere: valid code, no error, and the move
       happening regardless. Bound on the step, which is the position that can
       refuse a bubbling event before the sequence sees it. */
    const host = await seq('default-active="one"')
    const third = host.querySelectorAll('helix-headless-step')[2] as HTMLElement
    await (third as unknown as Steps).updateComplete
    third.addEventListener('helix-select', (event) => event.preventDefault())
    ;(part(third, 'label') as HTMLElement).click()
    await host.updateComplete
    expect((host as unknown as { active: string }).active).toBe('one')
    expect(currents(host)).toEqual([true, false, false])
  })

  test('and announces and moves, a declared active being a seed', async () => {
    /* Control is an action: a declared `active` applies, and a consumer refuses
       to take the decision. */
    const host = await seq('active="one"')
    const said: string[] = []
    host.addEventListener('helix-before-activate', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const third = host.querySelectorAll('helix-headless-step')[2] as HTMLElement
    await (third as unknown as Steps).updateComplete
    ;(part(third, 'label') as HTMLElement).click()
    await host.updateComplete
    expect(said).toEqual(['three'])
    expect(currents(host)).toEqual([false, false, true])
  })
})

describe('steps and what is inside a step', () => {
  /* A step's `content` holds the stage, so a tab set or a menu there is the
     expected use, and its `helix-select` bubbles out of the step. */
  test('a choice from inside a step leaves the sequence where it is', async () => {
    const host = (await mount(`<helix-headless-steps active="s1">
      <helix-headless-step value="s1">Cart<div slot="content"><span id="inside"></span></div></helix-headless-step>
      <helix-headless-step value="s2">Pay</helix-headless-step>
    </helix-headless-steps>`)) as Steps & { active: string }
    await host.updateComplete
    host.querySelector('#inside')?.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { value: 'y' },
      }),
    )
    await host.updateComplete
    expect(host.active).toBe('s1')
  })
})

type Step = HTMLElement & {
  complete: boolean
  locked: boolean
  select(): void
  updateComplete: Promise<unknown>
}

const linear = async (): Promise<{
  host: Steps & { active: string; next(): boolean; previous(): boolean }
  all: Step[]
}> => {
  const host = (await mount(`<helix-headless-steps linear active="a">
    <helix-headless-step value="a">Details</helix-headless-step>
    <helix-headless-step value="b" optional>Gift note</helix-headless-step>
    <helix-headless-step value="c">Payment</helix-headless-step>
    <helix-headless-step value="d">Review</helix-headless-step>
  </helix-headless-steps>`)) as Steps & { active: string; next(): boolean; previous(): boolean }
  const all = [...host.querySelectorAll('helix-headless-step')] as Step[]
  for (let turn = 0; turn < 3; turn += 1) {
    await host.updateComplete
    await Promise.all(all.map((step) => step.updateComplete))
    await new Promise((resolve) => setTimeout(resolve))
  }
  return { all, host }
}

describe('a linear sequence', () => {
  /* Ark UI's linear steps: a stage ahead is out of reach until the ones before
     it are finished, or optional. */
  test('holds a stage ahead out of reach until the ones before it are finished', async () => {
    const { all, host } = await linear()
    expect(all.map((step) => step.locked)).toEqual([false, true, true, true])
    at(all, 2).select()
    await host.updateComplete
    expect(host.active).toBe('a')
    at(all, 0).complete = true
    for (let turn = 0; turn < 3; turn += 1) {
      await new Promise((resolve) => setTimeout(resolve))
    }
    expect(all.map((step) => step.locked)).toEqual([false, false, false, true])
    at(all, 2).select()
    await host.updateComplete
    expect(host.active).toBe('c')
  })

  test('next and previous move one stage, under the same rules', async () => {
    const { all, host } = await linear()
    expect(host.next()).toBe(false)
    at(all, 0).complete = true
    await at(all, 0).updateComplete
    expect(host.next()).toBe(true)
    await host.updateComplete
    expect(host.active).toBe('b')
    expect(host.previous()).toBe(true)
    await host.updateComplete
    expect(host.active).toBe('a')
    expect(host.previous()).toBe(false)
  })
})

describe('a finished stage', () => {
  /* The check was the only thing that said a stage was done, and it is hidden
     from the accessibility tree. */
  test('describes its button in words, and says it once when it is finished', async () => {
    const host = await steps()
    const [done, , review] = [...host.querySelectorAll('helix-headless-step')] as Step[]
    await done?.updateComplete
    expect(part(done as Step, 'label')?.getAttribute('aria-describedby')).toBe('state')
    expect(part(done as Step, 'state')?.textContent).toBe('Complete')
    expect(part(review as Step, 'label')?.hasAttribute('aria-describedby')).toBe(false)
    ;(review as Step).complete = true
    await (review as Step).updateComplete
    await new Promise((resolve) => setTimeout(resolve, 40))
    await (review as Step).updateComplete
    expect(part(review as Step, 'live')?.textContent).toBe('Review, Complete')
  })

  test('the current stage puts aria-current on its button', async () => {
    const host = await steps()
    const [, payment] = [...host.querySelectorAll('helix-headless-step')] as Step[]
    await payment?.updateComplete
    expect(part(payment as Step, 'label')?.getAttribute('aria-current')).toBe('step')
  })
})
