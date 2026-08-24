import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

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
  (await mount(`<helix-base-carousel label="Verticals" ${attrs}>
    <div>Design</div>
    <div>Mind</div>
    <div>Energy</div>
  </helix-base-carousel>`)) as Carousel

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
      '<helix-base-carousel label="x"><div aria-label="Fusion Design">D</div></helix-base-carousel>',
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
       every check for "is it labeled" passes. This component assigned the
       property straight through, so a consumer emptying it on purpose, which is
       what you do when a wrapper already names the thing, got the broken half
       of that rather than the honest one. */
    const host = (await mount(
      '<helix-base-carousel label=""></helix-base-carousel>',
    )) as Updatable & {
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
      `<helix-base-carousel label="Highlights">
        <div>One</div><div>Two</div><div>Three</div>
      </helix-base-carousel>`,
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
      `<helix-base-carousel label="Highlights" ${attrs}>
        <div>One</div><div>Two</div><div>Three</div>
      </helix-base-carousel>`,
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
    const host = (await mount(`<helix-base-carousel label="Shots" ${attrs}>
      <div>One</div><div>Two</div><div>Three</div><div>Four</div>
    </helix-base-carousel>`)) as Carousel & { goTo(index: number): void }
    await host.updateComplete
    const track = part(host, 'track') as HTMLElement
    /* Offsets past the track's own bleed, so a stated position is one the
       scroller could really settle on.

       The component reads a slide's edge as its offset less the track's leading
       padding, because that padding is where a slide's shadow and focus ring
       draw and `scrollLeft` does not count it. Stating the offsets as though
       there were none put every edge 16px from the position this then settles
       at, and a settle that is not exactly on an edge makes the component scroll
       to correct it, stake `settling`, and swallow the next `scrollend`: the
       drag after a drag stopped moving the index. Zero on happy-dom, which
       computes no padding, so the numbers there are the ones they always
       were. */
    const bleed = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0
    for (const [at, slide] of [...host.children].entries()) {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: at * 100 + bleed })
    }
    Object.defineProperty(track, 'offsetLeft', { configurable: true, value: 0 })
    /* And `scrollLeft`, which is the one that has to be stated in a browser.
       It is a real accessor there and clamps to the scrollable range, and this
       track has none: the slides are empty divs whose widths are faked by the
       `offsetLeft` above, so every position written to it read back as 0 and
       the component was asked which slide is nearest to the left edge. A
       writable own property shadows the prototype's accessor, which is what the
       stated offsets need to be believed. */
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 0, writable: true })
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
    /* A single traveling mark was tried here and taken out again. The pill is
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

describe('carousel chrome placement', () => {
  /* Where a run lands, read against the row it is placed in rather than against
     the host. The host spans three grid rows, so a run centered in its own row
     is well above the host's center, and measuring against the host called every
     inline case "start" on the first pass. happy-dom lays nothing out, so this
     asserts the properties the layout is made of instead. */
  const along = (host: HTMLElement, name: string): string =>
    (part(host, name) as HTMLElement).style.getPropertyValue(`--_carousel-${name}-along`)

  test('the two attributes are independent, so moving one leaves the other', async () => {
    const host = await carousel('controls-placement="block-start" indicator-placement="block-end"')
    expect(host.getAttribute('indicator-placement')).toBe('block-end')
    expect(host.getAttribute('controls-placement')).toBe('block-start')
  })

  test('both alignments reflect, so a stylesheet can select on them', async () => {
    // They are read by `:host([indicator-align="center"])` rules, which is the
    // whole mechanism: an unreflected property would style nothing.
    const host = await carousel('controls-align="start" indicator-align="center"')
    await host.updateComplete
    expect(host.getAttribute('indicator-align')).toBe('center')
    expect(host.getAttribute('controls-align')).toBe('start')
  })

  test('the alignment is optional, and absent means the split the row had', async () => {
    const host = await carousel()
    await host.updateComplete
    expect(host.hasAttribute('indicator-align')).toBe(false)
    expect(host.hasAttribute('controls-align')).toBe(false)
    expect(along(host, 'indicators')).toBe('')
  })
})

describe('carousel across several slides at once', () => {
  /* Six slides four across stop three times: 0 to 3, 1 to 4, 2 to 5. Everything
     here is that one number, and every failure it replaced came from counting
     slides instead. */
  const four = async (): Promise<HTMLElement> =>
    mount(`<helix-base-carousel label="Reel" per-view="4">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-base-carousel>`)

  test('the indicators count positions, not slides', async () => {
    const host = await four()
    expect(part(host, 'indicators')?.querySelectorAll('[part="indicator"]')).toHaveLength(3)
  })

  test('and it will not walk past the last one', async () => {
    // Clamped to the last *slide* this reached five, and three of those indices
    // scrolled to the same offset the track had already run out at.
    const host = await four()
    ;(host as HTMLElement & { goTo(index: number): void }).goTo(9)
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect((host as HTMLElement & { index: number }).index).toBe(2)
  })

  test('one across is unchanged, so a plain carousel counts its slides', async () => {
    const host = await mount(`<helix-base-carousel label="Reel">
      <div>1</div><div>2</div><div>3</div>
    </helix-base-carousel>`)
    expect(part(host, 'indicators')?.querySelectorAll('[part="indicator"]')).toHaveLength(3)
  })
})

/* The room the scroller keeps for whatever a slide draws outside itself, which
   is the stylesheet's and so is tested here.

   Browser only, and not for speed. happy-dom resolves nothing out of an adopted
   stylesheet and reports `''` for every side of the track's padding, so the
   number under test does not exist on that harness and neither does the
   scrolling it has to survive. */
