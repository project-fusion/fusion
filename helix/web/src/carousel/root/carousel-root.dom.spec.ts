import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Carousel = HTMLElement & {
  index: number
  loop: boolean
  updateComplete: Promise<unknown>
  internals?: ElementInternals
}

const carousel = async (attrs = ''): Promise<Carousel> =>
  (await mount(`<helix-carousel label="Verticals" ${attrs}>
    <div>Design</div>
    <div>Mind</div>
    <div>Energy</div>
  </helix-carousel>`)) as Carousel

describe('carousel', () => {
  test('announces itself as a carousel, not as a bare group', async () => {
    const cal = await carousel()
    expect(role(cal)).toBe('group')
    expect(cal.internals?.ariaRoleDescription).toBe('carousel')
    expect(cal.getAttributeNames()).toEqual(['label'])
  })

  test('names each slide by its place in the set', async () => {
    // Without it a reader is told "group" three times and cannot tell where
    // they are in the run.
    const cal = await carousel()
    expect([...cal.children].map((slide) => slide.getAttribute('aria-label'))).toEqual([
      '1 of 3',
      '2 of 3',
      '3 of 3',
    ])
    expect([...cal.children].every((s) => s.getAttribute('aria-roledescription') === 'slide')).toBe(
      true,
    )
  })

  test('a slide that names itself keeps its own name', async () => {
    const cal = (await mount(
      '<helix-carousel label="x"><div aria-label="Fusion Design">D</div></helix-carousel>',
    )) as Carousel
    expect(cal.children[0]?.getAttribute('aria-label')).toBe('Fusion Design')
  })

  test('moving reports the slide now in view', async () => {
    const cal = await carousel()
    let seen = ''
    cal.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(cal, 'next') as HTMLElement).click()
    expect(cal.index).toBe(1)
    expect(seen).toBe('1')
  })

  test('it stops at the ends unless it is told to loop', async () => {
    const cal = await carousel()
    ;(part(cal, 'previous') as HTMLElement).click()
    expect(cal.index).toBe(0)

    const looping = await carousel('loop')
    ;(part(looping, 'previous') as HTMLElement).click()
    expect(looping.index).toBe(2)
  })

  test('no rotation control unless it rotates', async () => {
    expect(part(await carousel(), 'rotation')).toBeNull()
    expect(part(await carousel('autoplay'), 'rotation')).not.toBeNull()
  })

  test('rotation stops on hover and stays stopped', async () => {
    // The APG is explicit: rotation resumes only when the reader asks. A
    // carousel that starts again on its own is the thing the control exists to
    // escape.
    const cal = await carousel('autoplay')
    expect(part(cal, 'rotation')?.getAttribute('aria-label')).toBe('Stop slide rotation')

    cal.dispatchEvent(new Event('pointerenter'))
    await cal.updateComplete
    expect(part(cal, 'rotation')?.getAttribute('aria-label')).toBe('Start slide rotation')

    cal.dispatchEvent(new Event('pointerleave'))
    await cal.updateComplete
    expect(part(cal, 'rotation')?.getAttribute('aria-label')).toBe('Start slide rotation')
  })

  test('rotation stops when focus lands anywhere inside', async () => {
    const cal = await carousel('autoplay')
    cal.dispatchEvent(new Event('focusin'))
    await cal.updateComplete
    expect(part(cal, 'rotation')?.getAttribute('aria-label')).toBe('Start slide rotation')
  })

  test('the rotation control comes first in the tab order', async () => {
    // It is the way out of a moving carousel, so it cannot sit behind the
    // slides a reader is trying to escape.
    const cal = await carousel('autoplay')
    const buttons = [...(cal.shadowRoot?.querySelectorAll('[part="controls"] button') ?? [])]
    expect(buttons[0]?.getAttribute('part')).toBe('rotation')
  })
})

describe('carousel naming', () => {
  test('an emptied label leaves the host unnamed, not named with nothing', async () => {
    /* The distinction `hostAria` exists for. `ariaLabel = ''` is a name of no
       characters, which a screen reader announces as an unnamed control while
       every check for "is it labelled" passes. This component assigned the
       property straight through, so a consumer emptying it on purpose, which is
       what you do when a wrapper already names the thing, got the broken half
       of that rather than the honest one. */
    const host = (await mount('<helix-carousel label=""></helix-carousel>')) as Updatable & {
      internals: ElementInternals
    }
    expect(host.internals.ariaLabel).toBeNull()
  })
})

describe('carousel selection can be refused', () => {
  /* It announced after moving, so a listener refusing a slide change was
     refusing a decision already taken and the carousel moved anyway. Every
     other stateful component in the library announces first, through the same
     helper, whose own documentation calls itself the one audited path for this. */
  const carousel = async (): Promise<
    HTMLElement & { goTo(index: number): void; index: number; updateComplete: Promise<boolean> }
  > => {
    const host = (await mount(
      `<helix-carousel label="Highlights">
        <div>One</div><div>Two</div><div>Three</div>
      </helix-carousel>`,
    )) as HTMLElement & {
      goTo(index: number): void
      index: number
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    return host
  }

  test('a listener that refuses leaves the carousel where it was', async () => {
    const host = await carousel()
    host.addEventListener('helix-select', (event) => event.preventDefault())
    host.goTo(2)
    await host.updateComplete
    expect(host.index).toBe(0)
  })

  test('and one that does not still moves it', async () => {
    // The other half. A refusal that refused everything would pass the first.
    const host = await carousel()
    let announced = ''
    host.addEventListener('helix-select', (event) => {
      announced = (event as CustomEvent<{ value: string }>).detail.value
    })
    host.goTo(2)
    await host.updateComplete
    expect(host.index).toBe(2)
    expect(announced).toBe('2')
  })

  test('the announcement carries the slide being proposed, not the one left behind', async () => {
    const host = await carousel()
    let seen = ''
    host.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
      event.preventDefault()
    })
    host.goTo(1)
    await host.updateComplete
    expect(seen).toBe('1')
    expect(host.index).toBe(0)
  })
})

describe('carousel, controlled and uncontrolled', () => {
  const carousel = async (
    attrs = '',
  ): Promise<
    HTMLElement & { goTo(index: number): void; index: number; updateComplete: Promise<boolean> }
  > => {
    const host = (await mount(
      `<helix-carousel label="Highlights" ${attrs}>
        <div>One</div><div>Two</div><div>Three</div>
      </helix-carousel>`,
    )) as HTMLElement & {
      goTo(index: number): void
      index: number
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    return host
  }

  test('an index in the markup is the consumer’s, and the carousel does not move it', async () => {
    /* The same fault the four mixins were reshaped for, in the one component
       whose state is a position rather than a name. */
    const host = await carousel('index="1"')
    host.goTo(2)
    await host.updateComplete
    expect(host.index).toBe(1)
  })

  test('and it is still told where the carousel would have gone', async () => {
    const host = await carousel('index="1"')
    let asked = ''
    host.addEventListener('helix-select', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    host.goTo(2)
    await host.updateComplete
    expect(asked).toBe('2')
  })

  test('default-index seeds one that moves itself', async () => {
    const host = await carousel('default-index="1"')
    expect(host.index).toBe(1)
    host.goTo(2)
    await host.updateComplete
    expect(host.index).toBe(2)
  })

  test('a script may move a seeded carousel without taking it over', async () => {
    const host = await carousel('default-index="0"')
    host.index = 2
    await host.updateComplete
    expect(host.index).toBe(2)
    host.goTo(1)
    await host.updateComplete
    expect(host.index).toBe(1)
  })
})

describe('carousel settling', () => {
  /* Enough of a scroller for `handleScroll` to have something to read. happy-dom
     lays nothing out, so the offsets are stated: what is under test is which
     `scrollend` the component acts on, not the arithmetic of finding the
     nearest slide. */
  const scrolling = async (
    attrs = '',
  ): Promise<{ host: Carousel & { goTo(index: number): void }; track: HTMLElement }> => {
    const host = (await mount(`<helix-carousel label="Shots" ${attrs}>
      <div>One</div><div>Two</div><div>Three</div><div>Four</div>
    </helix-carousel>`)) as Carousel & { goTo(index: number): void }
    await host.updateComplete
    const track = part(host, 'track') as HTMLElement
    for (const [at, slide] of [...host.children].entries()) {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: at * 100 })
    }
    Object.defineProperty(track, 'offsetLeft', { configurable: true, value: 0 })
    track.scrollTo = ((options: ScrollToOptions) => {
      track.scrollLeft = options.left ?? 0
    }) as typeof track.scrollTo
    return { host, track }
  }

  const settle = (track: HTMLElement, at: number): void => {
    track.scrollLeft = at
    track.dispatchEvent(new Event('scrollend'))
  }

  test('a stray scrollend after a move of ours does not drag the index back', async () => {
    // The flip-back. Our own smooth scroll ends with a `scrollend` too, and
    // reading it as a reader's drag lets whichever slide happens to be nearest
    // at that instant overwrite the one they just chose.
    const { host, track } = await scrolling('default-index="0"')
    host.goTo(2)
    await host.updateComplete
    settle(track, 0)
    await host.updateComplete
    expect(host.index).toBe(2)
  })

  test('a reader’s drag still moves it', async () => {
    const { host, track } = await scrolling('default-index="0"')
    track.dispatchEvent(new Event('pointerdown'))
    settle(track, 200)
    await host.updateComplete
    expect(host.index).toBe(2)
  })

  test('and the drag after that one, which a stuck claim would swallow', async () => {
    /* The index following a drag runs `scrollToIndex`, which finds the track
       already where it would send it. No scroll runs, so no `scrollend` comes,
       so a claim staked there would be cleared by this drag instead of by its
       own scroll. */
    const { host, track } = await scrolling('default-index="0"')
    track.dispatchEvent(new Event('pointerdown'))
    settle(track, 200)
    await host.updateComplete
    settle(track, 100)
    await host.updateComplete
    expect(host.index).toBe(1)
  })

  test('a drag does not write an index the consumer owns', async () => {
    // `goTo` has this guard and the scroll handler did not, so every drag
    // overwrote a declared `index`, which is the one thing controlled mode
    // promises will not happen.
    const { host, track } = await scrolling('index="0"')
    let asked = ''
    host.addEventListener('helix-select', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    track.dispatchEvent(new Event('pointerdown'))
    settle(track, 200)
    await host.updateComplete
    expect(host.index).toBe(0)
    expect(asked).toBe('2')
  })
})

describe('carousel indicators', () => {
  test('the run is the dots themselves, each one its own state', async () => {
    /* A single travelling mark was tried here and taken out again. The pill is
       three times a dot's width, so a mark that takes no room in the row has to
       sit over its neighbours, and the pitch had to grow from 12 to 20 to make
       space for it. The run stopped reading as a run. */
    const host = await carousel('default-index="1"')
    await host.updateComplete
    const dots = [...(host.shadowRoot?.querySelectorAll('[part="indicator"]') ?? [])]
    expect(dots).toHaveLength(3)
    expect(dots.map((dot) => dot.hasAttribute('data-current'))).toEqual([false, true, false])
  })

  test('the state a reader hears is on the dot, where a screen reader finds it', async () => {
    const host = await carousel('default-index="1"')
    await host.updateComplete
    const dots = [...(host.shadowRoot?.querySelectorAll('[part="indicator"]') ?? [])]
    expect(dots.map((dot) => dot.getAttribute('aria-current'))).toEqual([null, 'true', null])
  })
})
