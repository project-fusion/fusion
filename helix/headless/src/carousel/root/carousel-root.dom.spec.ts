import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  part,
  registerDom,
  role,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Carousel = HTMLElement & {
  index: number
  loop: boolean
  positions: number
  updateComplete: Promise<unknown>
  internals?: ElementInternals
}

/** The panes the component renders, one per slide, in order. */
const panes = (cal: Carousel): HTMLElement[] => [
  ...(cal.shadowRoot?.querySelectorAll<HTMLElement>('[part="slide"]') ?? []),
]

const carousel = async (attrs = ''): Promise<Carousel> =>
  (await mount(`<helix-headless-carousel label="Verticals" ${attrs}>
    <div>Design</div>
    <div>Mind</div>
    <div>Energy</div>
  </helix-headless-carousel>`)) as Carousel

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
    expect(panes(cal).map((pane) => pane.getAttribute('aria-label'))).toEqual([
      '1 of 3',
      '2 of 3',
      '3 of 3',
    ])
    expect(
      panes(cal).every(
        (pane) =>
          pane.getAttribute('aria-roledescription') === 'slide' &&
          pane.getAttribute('role') === 'group',
      ),
    ).toBe(true)
  })

  test('and writes nothing at all onto the slides themselves', async () => {
    /* The slides are the consumer's own elements, and on a React page they are
       nodes React is in the middle of hydrating. Writing `role` and
       `aria-roledescription` onto them is a mismatch React reports and does not
       patch up. Deferring the write is a race rather than an ordering; a pane
       the component renders is neither.

       And the role is wrong on its own terms: `role="group"` on an `<a href>`
       replaces the link role rather than adding to it, so a slide that is a
       link stops being announced as one. Both faults are the same write, so the
       assertion is that the write does not happen.

       This is `hydration.dom.spec.ts` one level down: that lane asks what an
       element writes onto its *own* host and has no markup to mount, so a write
       a parent makes to its children is the case it cannot reach. */
    const cal = await carousel()
    await cal.updateComplete
    expect([...cal.children].map((slide) => slide.getAttributeNames())).toEqual([[], [], []])
  })

  test('a slide that names itself keeps its own name, and stays what it is', async () => {
    /* The pane carries the position and the slide carries itself, so a link is
       still announced as a link inside a group that says where it sits. A role
       written onto the slide takes this anchor out of the links list. */
    const cal = (await mount(
      '<helix-headless-carousel label="x"><a href="/d" aria-label="Fusion Design">D</a></helix-headless-carousel>',
    )) as Carousel
    await cal.updateComplete
    const slide = cal.children[0]
    expect(slide?.getAttribute('aria-label')).toBe('Fusion Design')
    expect(slide?.getAttribute('role')).toBeNull()
    expect(panes(cal)[0]?.getAttribute('aria-label')).toBe('1 of 1')
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

  /* The APG's live region: a move the reader makes is heard, and a carousel
     rotating on its own is not read out every few seconds. */
  test('says the slide a move lands on, politely, and nothing while it rotates', async () => {
    const cal = await carousel()
    const live = part(cal, 'live') as HTMLElement
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe('')
    ;(part(cal, 'next') as HTMLElement).click()
    await cal.updateComplete
    expect(live.textContent).toBe('2 of 3')

    const rotating = await carousel('autoplay')
    expect(part(rotating, 'live')?.getAttribute('aria-live')).toBe('off')
  })

  /* Without `loop` the timer clamped at the last slide and went on firing at
     nothing, while the control still said rotation was running. */
  test('rotation goes round from the last slide to the first, without `loop`', async () => {
    const cal = await carousel('autoplay interval="20" default-index="2"')
    await new Promise((done) => setTimeout(done, 60))
    await cal.updateComplete
    expect(cal.index).not.toBe(2)
  })

  test('says Previous and Next have nowhere to go at the ends, unless it loops', async () => {
    const cal = await carousel()
    expect(part(cal, 'previous')?.getAttribute('aria-disabled')).toBe('true')
    expect(part(cal, 'next')?.hasAttribute('aria-disabled')).toBe(false)
    cal.index = 2
    await cal.updateComplete
    expect(part(cal, 'next')?.getAttribute('aria-disabled')).toBe('true')
    const looping = await carousel('loop')
    expect(part(looping, 'previous')?.hasAttribute('aria-disabled')).toBe(false)
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

  test('rotation carries on after the carousel is moved in the page', async () => {
    /* The disconnect clears the interval and only `updated` starts it, which
       a move does not ask for: the control said pause over slides that had
       stopped. Read straight after the move, because happy-dom renders again
       on a reconnect for reasons of its own and a browser does not, so waiting
       for a slide to turn passes here against the bug. */
    const cal = await carousel('autoplay interval="30"')
    const elsewhere = document.createElement('div')
    document.body.append(elsewhere)
    elsewhere.append(cal)
    expect((cal as unknown as { timer: unknown }).timer).toBeDefined()
  })
})

describe('carousel naming', () => {
  test('an emptied label leaves the host unnamed, not named with nothing', async () => {
    /* The distinction `hostAria` exists for. `ariaLabel = ''` is a name of no
       characters, which a screen reader announces as an unnamed control while
       every check for "is it labeled" passes. Assigning the property straight
       through hands that broken half to a consumer who empties the label on
       purpose, which is what you do when a wrapper already names the thing. */
    const host = (await mount(
      '<helix-headless-carousel label=""></helix-headless-carousel>',
    )) as Updatable & {
      internals: ElementInternals
    }
    expect(host.internals.ariaLabel).toBeNull()
  })
})

describe('carousel selection can be refused', () => {
  /* Announcing after moving would leave a listener refusing a decision already
     taken. Every stateful component in the library announces first, through the
     same helper. */
  const carousel = async (): Promise<
    HTMLElement & { goTo(index: number): void; index: number; updateComplete: Promise<boolean> }
  > => {
    const host = (await mount(
      `<helix-headless-carousel label="Highlights">
        <div>One</div><div>Two</div><div>Three</div>
      </helix-headless-carousel>`,
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
      `<helix-headless-carousel label="Highlights" ${attrs}>
        <div>One</div><div>Two</div><div>Three</div>
      </helix-headless-carousel>`,
    )) as HTMLElement & {
      goTo(index: number): void
      index: number
      updateComplete: Promise<boolean>
    }
    await host.updateComplete
    return host
  }

  test('an index in the markup is a seed, and the carousel still moves', async () => {
    /* Control is an action: the element always applies, and a consumer takes
       the decision by refusing. */
    const host = await carousel('index="1"')
    host.goTo(2)
    await host.updateComplete
    expect(host.index).toBe(2)
  })

  test('and refusing is what holds it where the markup put it', async () => {
    const host = await carousel('index="1"')
    host.addEventListener('helix-select', (event: Event) => {
      event.preventDefault()
    })
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
    const host = (await mount(`<helix-headless-carousel label="Shots" ${attrs}>
      <div>One</div><div>Two</div><div>Three</div><div>Four</div>
    </helix-headless-carousel>`)) as Carousel & { goTo(index: number): void }
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
    /* Stated on the panes rather than on the slides, because the pane is the
       box the track lays out: the component wraps each slide in a
       `[part="slide"]` and assigns it there, so a slide has no offset of its own
       within the scroller. Faking the offset on the element the component does
       not measure left every position reading zero, which reads as the index
       never moving. */
    const panes = [...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part="slide"]') ?? [])]
    for (const [at, pane] of panes.entries()) {
      Object.defineProperty(pane, 'offsetLeft', { configurable: true, value: at * 100 + bleed })
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

  /** One animation frame, which is what the marker waits for. */
  const frame = (): Promise<void> =>
    new Promise((done) => {
      requestAnimationFrame(() => done())
    })

  test('the marker follows a drag in flight while the index waits for it to settle', async () => {
    /* `scrollend` is the only honest place to commit an index and much too late
       to show one: it fires once momentum has fully settled, which on iOS is
       most of a second after the finger has left the glass. The dots sat on the
       old slide for the whole of the coast and then jumped.

       So a scroll with no `scrollend` after it is a drag still running, and the
       three answers here are deliberately different: the marker has moved,
       because that is where the track is; the index has not, because the reader
       has not arrived anywhere yet; and `aria-current` has not, because moving
       it every frame would churn the accessibility tree to report a place
       nobody has reached. */
    const { host, track } = await scrolling('default-index="0"')
    track.scrollLeft = 200
    track.dispatchEvent(new Event('scroll'))
    await frame()
    await host.updateComplete
    const dots = [
      ...(part(host, 'indicators') as HTMLElement).querySelectorAll('[part~="indicator"]'),
    ]
    expect({
      announced: dots.findIndex((dot) => dot.getAttribute('aria-current') === 'true'),
      index: host.index,
      marker: dots.findIndex((dot) => dot.hasAttribute('data-current')),
    }).toEqual({ announced: 0, index: 0, marker: 2 })
  })

  test('the marker gives the position back to the index once the drag settles', async () => {
    // And the committed index is what it lands on, so the two agree again with
    // nothing keeping them in step.
    const { host, track } = await scrolling('default-index="0"')
    track.scrollLeft = 200
    track.dispatchEvent(new Event('scroll'))
    await frame()
    settle(track, 300)
    await host.updateComplete
    const dots = [
      ...(part(host, 'indicators') as HTMLElement).querySelectorAll('[part~="indicator"]'),
    ]
    expect({
      index: host.index,
      marker: dots.findIndex((dot) => dot.hasAttribute('data-current')),
    }).toEqual({ index: 3, marker: 3 })
  })

  test('a dot pressed while a drag is still coasting takes the marker with it', async () => {
    /* The reader's press is a choice and the drag is not one yet, so the marker
       goes where the index went. The only `scrollend` after the press is our own
       scroll's, and that one is not read, so the marker kept the coasting
       drag's slide while the index and the track moved on. */
    const { host, track } = await scrolling('default-index="0"')
    track.scrollLeft = 200
    track.dispatchEvent(new Event('scroll'))
    await frame()
    await host.updateComplete
    host.goTo(3)
    await host.updateComplete
    track.dispatchEvent(new Event('scrollend'))
    await host.updateComplete
    const dots = [
      ...(part(host, 'indicators') as HTMLElement).querySelectorAll('[part~="indicator"]'),
    ]
    expect({
      index: host.index,
      marker: dots.findIndex((dot) => dot.hasAttribute('data-current')),
    }).toEqual({ index: 3, marker: 3 })
  })

  test('a settled drag can be refused, and the track goes back where it was', async () => {
    /* This was the one dispatch in the library of a cancelable event whose
       answer nothing read: `helix-select` announced after `index` had already
       moved, on the argument that a reader has already dragged the track and
       `preventDefault()` could not un-drag it. The track is ours to scroll, so
       it can: the index stays where it was and the scroller is put back on the
       slide that index names. */
    const { host, track } = await scrolling('default-index="0"')
    host.addEventListener('helix-select', (event) => event.preventDefault())
    settle(track, 200)
    await host.updateComplete
    expect(host.index).toBe(0)
    expect(track.scrollLeft).toBe(0)
  })

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

  test('a move back before our own scroll has left sends the track back with it', async () => {
    /* Two presses inside one frame. The first press's scroll is smooth and has
       not moved the track yet, so the second finds the track already on its
       slide. Asking nothing then left the first scroll running: in Chromium the
       index said the first slide and the track came to rest on the second.
       Stated here as a scroll that is asked for and never moves, which is that
       frame held still. */
    const { host, track } = await scrolling('default-index="0"')
    const asked: ScrollToOptions[] = []
    track.scrollTo = ((options: ScrollToOptions) => {
      asked.push(options)
    }) as typeof track.scrollTo
    host.goTo(1)
    await host.updateComplete
    host.goTo(0)
    await host.updateComplete
    expect(asked.map((options) => options.left)).toEqual([100, 0])
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

  test('a drag writes the index it settled on, declared or not', async () => {
    /* Control is an action: the element always applies, and a consumer takes
       the decision by refusing. */
    const { host, track } = await scrolling('index="0"')
    let asked = ''
    host.addEventListener('helix-select', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    track.dispatchEvent(new Event('pointerdown'))
    settle(track, 200)
    await host.updateComplete
    expect(host.index).toBe(2)
    expect(asked).toBe('2')
  })
})

describe('carousel indicators', () => {
  test('the run is the dots themselves, each one its own state', async () => {
    /* A single traveling mark was tried here and taken out again. The pill is
       three times a dot's width, so a mark that takes no room in the row has to
       sit over its neighbors, and the pitch had to grow from 12 to 20 to make
       space for it. The run stopped reading as a run. */
    const host = await carousel('default-index="1"')
    await host.updateComplete
    const dots = [...(host.shadowRoot?.querySelectorAll('[part~="indicator"]') ?? [])]
    expect(dots).toHaveLength(3)
    expect(dots.map((dot) => dot.hasAttribute('data-current'))).toEqual([false, true, false])
  })

  test('the state a reader hears is on the dot, where a screen reader finds it', async () => {
    const host = await carousel('default-index="1"')
    await host.updateComplete
    const dots = [...(host.shadowRoot?.querySelectorAll('[part~="indicator"]') ?? [])]
    expect(dots.map((dot) => dot.getAttribute('aria-current'))).toEqual([null, 'true', null])
  })

  test('the current dot is a part of its own, and stops being one when it is not', async () => {
    /* `::part()` takes no attribute after it, so `data-current` is out of reach
       of a stylesheet outside the element and the second name is how one draws
       it. */
    const host = (await carousel('default-index="1"')) as Carousel
    await host.updateComplete
    const named = (): boolean[] =>
      [...(host.shadowRoot?.querySelectorAll('[part~="indicator"]') ?? [])].map((dot) =>
        (dot.getAttribute('part') ?? '').split(' ').includes('indicator-current'),
      )
    expect(named()).toEqual([false, true, false])
    host.index = 2
    await host.updateComplete
    expect(named()).toEqual([false, false, true])
  })
})

describe('the arrows on the indicators', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  const press = async (host: Carousel, key: string): Promise<void> => {
    host.shadowRoot
      ?.querySelector('[part~="indicator-current"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
    await host.updateComplete
  }

  test('move along the line, the right arrow to the next slide', async () => {
    const host = await carousel('default-index="1"')
    await press(host, 'ArrowRight')
    expect(host.index).toBe(2)
  })

  test('Home and End go to the first and the last', async () => {
    const host = await carousel('default-index="1"')
    await press(host, 'End')
    expect(host.index).toBe(2)
    await press(host, 'Home')
    expect(host.index).toBe(0)
  })

  /* The run of a vertical carousel is read up and down. Only the inline pair
     was answered, so Down did nothing and Right moved the slide. */
  test('are Up and Down on a vertical carousel', async () => {
    const host = await carousel('orientation="vertical"')
    await press(host, 'ArrowDown')
    expect(host.index).toBe(1)
    await press(host, 'ArrowRight')
    expect(host.index).toBe(1)
    await press(host, 'ArrowUp')
    expect(host.index).toBe(0)
  })

  /* The first dot is on the right of a right-to-left page, so the right arrow
     pointed away from the slide it moved to. */
  test('which on a right-to-left page is the left arrow', async () => {
    document.documentElement.dir = 'rtl'
    const host = await carousel('default-index="1"')
    await press(host, 'ArrowLeft')
    expect(host.index).toBe(2)
    await press(host, 'ArrowRight')
    expect(host.index).toBe(1)
  })
})

describe('carousel chrome placement', () => {
  /* Where a run lands, read against the row it is placed in rather than against
     the host. The host spans three grid rows, so a run centered in its own row
     is well above the host's center and measuring against the host calls every
     inline case "start". happy-dom lays nothing out, so this asserts the
     properties the layout is made of instead. */
  const along = (host: HTMLElement, name: string): string =>
    (part(host, name) as HTMLElement).style.getPropertyValue(`--_carousel-${name}-along`)

  test('the two attributes are independent, so moving one leaves the other', async () => {
    const host = await carousel('controls-placement="top" indicator-placement="bottom"')
    expect(host.getAttribute('indicator-placement')).toBe('bottom')
    expect(host.getAttribute('controls-placement')).toBe('top')
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

/** The count the track was handed, which is what both tiers divide by. */
const handed = (host: HTMLElement): string =>
  (part(host, 'track') as HTMLElement | undefined)?.style.getPropertyValue('--carousel-per-view') ??
  ''

describe('carousel across several slides at once', () => {
  /* Six slides four across stop three times: 0 to 3, 1 to 4, 2 to 5. Everything
     here is that one number, and counting slides instead is the fault. */
  const four = async (): Promise<HTMLElement> =>
    mount(`<helix-headless-carousel label="Reel" per-view="4">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)

  test('the indicators count positions, not slides', async () => {
    const host = await four()
    expect(part(host, 'indicators')?.querySelectorAll('[part~="indicator"]')).toHaveLength(3)
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
    const host = await mount(`<helix-headless-carousel label="Reel">
      <div>1</div><div>2</div><div>3</div>
    </helix-headless-carousel>`)
    expect(part(host, 'indicators')?.querySelectorAll('[part~="indicator"]')).toHaveLength(3)
  })

  test('the styles are handed the number the positions were counted from', async () => {
    // The whole of what keeps a width and a count from disagreeing. A sheet
    // enumerating values instead had a last one, and a track above it drew one
    // across while this went on counting.
    expect(handed(await four())).toBe('4')
  })

  /* What the track cannot honor it takes to the nearest thing it can, and says
     so in the one place both tiers read. `abc` is the one that was a fault
     rather than a curiosity: it parses to `NaN`, which `Math.max` propagates,
     and the carousel counted `NaN` positions and drew no indicators at all. */
  const REFUSED: [string, string][] = [
    ['0', '1'],
    ['-2', '1'],
    ['1.5', '1'],
    ['2.5', '2'],
    ['abc', '1'],
  ]

  for (const [asked, honored] of REFUSED) {
    test(`per-view ${asked} is honored as ${honored} across`, async () => {
      const host = await mount(`<helix-headless-carousel label="Reel" per-view="${asked}">
        <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
      </helix-headless-carousel>`)
      expect(handed(host)).toBe(honored)
    })
  }

  test('and the indicators count the honored number, not the asked one', async () => {
    const host = await mount(`<helix-headless-carousel label="Reel" per-view="abc">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)
    expect(part(host, 'indicators')?.querySelectorAll('[part~="indicator"]')).toHaveLength(6)
  })

  /* **A declared count takes places away exactly as a fitted track does**, so
     the reader has to be brought back inside the run either way. A fitted one
     is corrected in `readFit` and a declared one was clamped to the slide
     count, which is the wrong number the moment more than one is across. */
  test('raising the count brings the reader back inside what it leaves', async () => {
    const host = (await mount(`<helix-headless-carousel label="Reel" per-view="1">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)) as Carousel
    host.index = 5
    await host.updateComplete
    host.setAttribute('per-view', '4')
    await host.updateComplete
    await host.updateComplete
    expect(host.positions).toBe(3)
    expect(host.index).toBe(2)
  })

  test('and the dot for where they are is drawn, with the tab stop on it', async () => {
    /* The roving tab stop is keyed on `index`, so an index outside the run
       leaves the whole row unreachable: three dots, none current, and nothing
       in it a Tab can land on. */
    const host = (await mount(`<helix-headless-carousel label="Reel" per-view="1">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)) as Carousel
    host.index = 5
    await host.updateComplete
    host.setAttribute('per-view', '4')
    await host.updateComplete
    await host.updateComplete
    const row = part(host, 'indicators')
    expect(row?.querySelectorAll('[part~="indicator-current"]')).toHaveLength(1)
    expect(row?.querySelectorAll('[part~="indicator"][tabindex="0"]')).toHaveLength(1)
  })

  test('and a slide removed under a count is the same correction', async () => {
    // Six three across is four places; four slides is two, and an index of 3
    // is inside the slides and outside the run, which clamping to the slide
    // count could not see.
    const host = (await mount(`<helix-headless-carousel label="Reel" per-view="3">
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)) as Carousel
    host.index = 3
    await host.updateComplete
    host.lastElementChild?.remove()
    host.lastElementChild?.remove()
    /* A macrotask, because the slides are watched by a `MutationObserver` and
       the update it asks for is scheduled from its callback. `updateComplete`
       alone resolves before the observer has run in either harness. */
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    expect(host.positions).toBe(2)
    expect(host.index).toBe(1)
  })

  /* Nobody asked for that move, so it is no request: it went out as a
     cancelable `helix-select`, and refusing it left the index past the last
     place and asked again on every update. */
  test('and the correction is written, with no request anybody could refuse', async () => {
    const host = (await mount(`<helix-headless-carousel label="Reel">
      <div>1</div><div>2</div><div>3</div>
    </helix-headless-carousel>`)) as Carousel
    host.index = 2
    await host.updateComplete
    let asked = 0
    host.addEventListener('helix-select', (event) => {
      asked += 1
      event.preventDefault()
    })
    host.lastElementChild?.remove()
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    await host.updateComplete
    expect(host.index).toBe(1)
    expect(asked).toBe(0)
  })
})

/* The room the scroller keeps for whatever a slide draws outside itself, which
   is the stylesheet's and so is tested here.

   Browser only, and not for speed. happy-dom resolves nothing out of an adopted
   stylesheet and reports `''` for every side of the track's padding, so the
   number under test does not exist on that harness and neither does the
   scrolling it has to survive. */

describe('a carousel fitting what it can hold', () => {
  const fitted = async (attrs = ''): Promise<HTMLElement> =>
    mount(`<helix-headless-carousel label="Shelf" per-view="auto" ${attrs}>
      <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
    </helix-headless-carousel>`)

  test('hands the track no count at all, the sheet having one', async () => {
    /* An inline declaration outranks every rule short of `!important`, so a
       track told `1` here could never be told three by the rule that fits it.
       The absence is not a gap: that rule declares the same name on the same
       element, so it beats an inherited one exactly as this write does. */
    expect(handed(await fitted())).toBe('')
  })

  test('and a declared count is still a count', async () => {
    expect(
      handed(
        await mount(`<helix-headless-carousel label="Shelf" per-view="3">
      <div>1</div><div>2</div><div>3</div><div>4</div>
    </helix-headless-carousel>`),
      ),
    ).toBe('3')
  })

  /* A vertical track's room is a height the consumer chose, so there is nothing
     to fit against that they did not already decide, and the block axis would
     want a size container a headless consumer has no reason to have given it.
     It reads as one across, through the clamp every other value it cannot
     honor goes through. */
  test('a vertical track takes the word as one across', async () => {
    expect(handed(await fitted('orientation="vertical"'))).toBe('1')
  })

  /* **The served state, and the reason it is coherent rather than briefly
     false.** A fitted carousel's dot count is whatever its box resolved to, so
     nothing knows it until there is a box: not a server, and not the render
     that draws the panes, layout being what follows a render. Drawn from a
     guess and corrected, the run would change length under the reader, which is
     the jump fitting in the sheet exists to avoid. happy-dom lays nothing out,
     so this is that state held still. A declared count is unaffected, being an
     answer nobody has to measure for. */
  const unlaid = hasLayout() ? (): void => {} : test

  unlaid('serves no dots at all until its box has been laid out', async () => {
    expect(part(await fitted(), 'indicators')).toBe(null)
  })

  unlaid('while a declared count draws its dots with nothing measured', async () => {
    const host = await mount(`<helix-headless-carousel label="Shelf" per-view="3">
      <div>1</div><div>2</div><div>3</div><div>4</div>
    </helix-headless-carousel>`)
    expect(part(host, 'indicators')?.querySelectorAll('[part~="indicator"]')).toHaveLength(2)
  })
})

/* A caret means previous or next, so it points where that slide is: toward the
   start and toward the end of the line, which on a right-to-left page are the
   right and the left. The headless tier draws the caret and says so with the
   mark `core` turns, so a page with no stylesheet gets it right; before, the
   caret kept its left-to-right face and each pointed at the other button.

   A browser's, because the turn is a `:dir()` rule and happy-dom matches no
   `:dir()` at all. */
const browser = hasLayout() ? test : (): void => {}

describe('the carets', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  const faces = async (): Promise<{ next: string; previous: string; previousOnRight: boolean }> => {
    const host = await carousel()
    const previous = part(host, 'previous') as HTMLElement
    const next = part(host, 'next') as HTMLElement
    return {
      next: getComputedStyle(part(host, 'next-mark') as Element).scale,
      previous: getComputedStyle(part(host, 'previous-mark') as Element).scale,
      previousOnRight: previous.getBoundingClientRect().left > next.getBoundingClientRect().left,
    }
  }

  browser('keep their faces on a left-to-right page', async () => {
    expect(await faces()).toEqual({ next: 'none', previous: 'none', previousOnRight: false })
  })

  browser('and turn on a right-to-left one, each toward its own side', async () => {
    document.documentElement.dir = 'rtl'
    expect(await faces()).toEqual({ next: '-1 1', previous: '-1 1', previousOnRight: true })
  })
})
