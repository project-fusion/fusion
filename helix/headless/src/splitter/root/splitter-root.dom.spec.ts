import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Splitter = HTMLElement & { position: number; updateComplete: Promise<unknown> }

const splitter = async (attrs = ''): Promise<Splitter> => {
  const host = (await mount(`<helix-headless-splitter ${attrs}>
    <div slot="start">one</div><div slot="end">two</div>
  </helix-headless-splitter>`)) as Splitter
  await host.updateComplete
  return host
}

const separator = (host: HTMLElement): HTMLElement => part(host, 'separator') as HTMLElement

const press = async (host: Splitter, key: string): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  separator(host).dispatchEvent(event)
  await host.updateComplete
  return event
}

describe('splitter', () => {
  test('two panes and a divider between them', async () => {
    const host = await splitter()
    expect(slotted(host, 'start').map((one) => one.textContent)).toEqual(['one'])
    expect(slotted(host, 'end').map((one) => one.textContent)).toEqual(['two'])
    expect(separator(host)).not.toBeNull()
  })

  test('the divider is a real separator a keyboard can reach', async () => {
    // A divider only a mouse can move is unusable without one.
    const host = await splitter('default-position="40"')
    const bar = separator(host)
    expect(bar.getAttribute('role')).toBe('separator')
    expect(bar.getAttribute('tabindex')).toBe('0')
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
  })

  test('the orientation announced is the way it is drawn, not the way it moves', async () => {
    /* A separator between panes laid out side by side is drawn upright, so the
       two words are opposite each other here. */
    const side = await splitter()
    expect(separator(side).getAttribute('aria-orientation')).toBe('vertical')
    const stacked = await splitter('orientation="vertical"')
    expect(separator(stacked).getAttribute('aria-orientation')).toBe('horizontal')
  })

  test('the position sizes the first pane, and never the host', async () => {
    /* The number has to reach the layout, and writing an inline style onto the
       host at upgrade is markup a server's output never had. It goes on the pane
       instead, which is an element in this shadow root. */
    const host = await splitter('default-position="30"')
    expect(part(host, 'start')?.getAttribute('style')).toContain('30%')
    expect(host.getAttribute('style')).toBeNull()
  })
})

describe('splitter keyboard', () => {
  test('the arrows move it by a step', async () => {
    const host = await splitter('default-position="50" step="5"')
    await press(host, 'ArrowRight')
    expect(host.position).toBe(55)
    await press(host, 'ArrowLeft')
    await press(host, 'ArrowLeft')
    expect(host.position).toBe(45)
  })

  test('the arrows follow the axis the panes are on', async () => {
    const host = await splitter('default-position="50" orientation="vertical" step="5"')
    await press(host, 'ArrowDown')
    expect(host.position).toBe(55)
  })

  /* The start pane is on the right of a right-to-left page, so the left
     arrow, which moves the divider left, is the one that grows it. It shrank
     it, sending the divider the opposite way to where the key points. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('the left arrow moves the divider left, growing the start pane', async () => {
      document.documentElement.dir = 'rtl'
      const host = await splitter('default-position="50" step="5"')
      await press(host, 'ArrowLeft')
      expect(host.position).toBe(55)
      await press(host, 'ArrowRight')
      await press(host, 'ArrowRight')
      expect(host.position).toBe(45)
    })

    test('while panes one above the other keep Down as down', async () => {
      document.documentElement.dir = 'rtl'
      const host = await splitter('default-position="50" orientation="vertical" step="5"')
      await press(host, 'ArrowDown')
      expect(host.position).toBe(55)
    })

    test('and the corner moves each divider the way its arrow points', async () => {
      document.documentElement.dir = 'rtl'
      const [host, within] = await nested(
        'default-position="30" step="5"',
        'orientation="vertical" default-position="60" step="5"',
      )
      const handle = corner(host) as HTMLElement
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
      )
      await host.updateComplete
      await within.updateComplete
      expect([host.position, within.position]).toEqual([35, 60])
    })
  })

  test('Home and End go all the way to either end', async () => {
    // A divider that stops dead short of the edge gives a reader no way to put a
    // pane away.
    const host = await splitter('default-position="50"')
    await press(host, 'Home')
    expect(host.position).toBe(0)
    await press(host, 'End')
    expect(host.position).toBe(100)
  })

  test('and only as far as a consumer’s own bounds', async () => {
    const host = await splitter('default-position="50" max="80" min="20"')
    await press(host, 'Home')
    expect(host.position).toBe(20)
    await press(host, 'End')
    expect(host.position).toBe(80)
  })

  test('the arrows are taken, or the page scrolls under the divider', async () => {
    const host = await splitter()
    expect((await press(host, 'ArrowLeft')).defaultPrevented).toBe(true)
  })

  test('a key it does not answer is left alone', async () => {
    const host = await splitter()
    expect((await press(host, 'Tab')).defaultPrevented).toBe(false)
  })
})

describe('splitter settling', () => {
  test('says so when a key move settles', async () => {
    const host = await splitter('default-position="50" step="5"')
    let settled = ''
    host.addEventListener('helix-before-resize', (event) => {
      settled = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'ArrowRight')
    expect(settled).toBe('55')
  })

  test('declaring `position` seeds it, and the divider still moves', async () => {
    /* Control is an action: the element applies, and a consumer takes the
       decision by refusing the before event. */
    const host = await splitter('position="50" step="5"')
    let asked = ''
    host.addEventListener('helix-before-resize', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'ArrowRight')
    expect(asked).toBe('55')
    expect(host.position).toBe(55)
  })

  /**
   * **Refusing it takes the position and leaves the rest of the gesture.**
   *
   * The reading this replaces was that the two announcements are one decision,
   * `shutAt` computing the collapse from the position being settled, so refusing
   * the first left the second derived from a number that did not happen. That
   * holds for a splitter nobody else owns, and it reads "no" as "the gesture is
   * over", which is not what a consumer who owns the position means by it: the
   * sandbox refuses every one of these in order to *take* the decision, and
   * returning on its refusal left `panel-collapsed-size` inert two folders away.
   *
   * The collapse is honest on its own because it carries its own position: the
   * pane lands on `collapsed-size`, here 10, and never on the 0 that was
   * refused.
   */
  test('refusing the settling leaves the divider where it was, and still offers the collapse', async () => {
    const host = (await splitter('default-position="40" collapsed-size="10"')) as Splitter & {
      collapsed?: 'end' | 'start'
    }
    let asked = ''
    host.addEventListener('helix-before-resize', (event) => event.preventDefault())
    host.addEventListener('helix-before-collapse', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'Home')
    expect(asked).toBe('start')
    expect(host.collapsed).toBe('start')
    expect(host.position).toBe(10)
  })

  /** And the position they kept is the one it opens back to, never the refused one. */
  test('a collapse allowed over a refused resize opens back to the consumer position', async () => {
    const host = (await splitter('default-position="40" collapsed-size="10"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    host.addEventListener('helix-before-resize', (event) => event.preventDefault())
    await press(host, 'Home')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(40)
  })

  /** Refusing both is the way to take the whole gesture, and it still is. */
  test('refusing the settling and the collapse leaves the divider where it was, and open', async () => {
    const host = (await splitter('default-position="40" collapsed-size="10"')) as Splitter & {
      collapsed?: 'end' | 'start'
    }
    host.addEventListener('helix-before-resize', (event) => event.preventDefault())
    host.addEventListener('helix-before-collapse', (event) => event.preventDefault())
    await press(host, 'Home')
    expect(host.position).toBe(40)
    expect(host.collapsed).toBeUndefined()
  })

  /** And a key announces before it applies, which the corner's own arrows do. */
  test('refusing a step leaves the divider where it was', async () => {
    const host = await splitter('default-position="40" step="5"')
    host.addEventListener('helix-before-resize', (event) => event.preventDefault())
    await press(host, 'ArrowRight')
    expect(host.position).toBe(40)
  })

  test('a double click puts it back where the markup put it', async () => {
    const host = await splitter('default-position="30" step="5"')
    await press(host, 'ArrowRight')
    expect(host.position).toBe(35)
    separator(host).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await host.updateComplete
    expect(host.position).toBe(30)
  })
})

const nested = async (
  outer = '',
  inner = 'orientation="vertical"',
): Promise<[Splitter, Splitter]> => {
  const host = (await mount(`<helix-headless-splitter ${outer}>
    <div slot="start">one</div>
    <helix-headless-splitter slot="end" ${inner}>
      <div slot="start">two</div><div slot="end">three</div>
    </helix-headless-splitter>
  </helix-headless-splitter>`)) as Splitter
  const within = host.querySelector('helix-headless-splitter') as Splitter
  await host.updateComplete
  await within.updateComplete
  await host.updateComplete
  return [host, within]
}

const corner = (host: HTMLElement): HTMLElement | null =>
  (host.shadowRoot?.querySelector('[part="corner"]') ?? null) as HTMLElement | null

const grab = async (host: Splitter, handle: HTMLElement, type: string): Promise<PointerEvent> => {
  const event = new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(
    type,
    { bubbles: true, cancelable: true },
  ) as PointerEvent
  handle.dispatchEvent(event)
  await host.updateComplete
  return event
}

describe('splitter crossings', () => {
  test('the outer one draws the corner, and the nested one does not', async () => {
    // It has to be the outer: the crossing is on a pane's edge, and a pane is
    // `overflow: auto`, so a handle centered there is cut in half by the pane it
    // belongs to.
    const [host, within] = await nested()
    expect(corner(host)).not.toBeNull()
    expect(corner(within)).toBeNull()
  })

  test('the corner is named, and named for what it does rather than what it is', async () => {
    /* It moves both dividers at once, which no other control here does, and it
       is a bare box with a `role="separator"`: a reader arrowing onto it is
       told "separator" twice over unless this says which one it is.

       It cannot be asserted on the server, because a crossing only exists once
       a nested splitter has registered itself with the one outside it, and that
       is a client-side pass over a tree the server does not have.

       A phrase the component does not default to, `cornerLabel` holding "Resize
       both", so a template writing that literal would not satisfy this. */
    const [host] = await nested('corner-label="Move both edges"')
    expect(corner(host)?.getAttribute('aria-label')).toBe('Move both edges')
  })

  test('it sits where the two dividers cross, on both their numbers', async () => {
    const [host] = await nested('default-position="30"', 'orientation="vertical" position="65"')
    const handle = corner(host) as HTMLElement
    expect(handle.getAttribute('style')).toContain('--splitter-position: 30%')
    expect(handle.getAttribute('style')).toContain('--splitter-corner-at: 65%')
  })

  test('it follows the nested divider as that one moves', async () => {
    const [host, within] = await nested('default-position="30"', 'orientation="vertical" step="5"')
    const bar = part(within, 'separator') as HTMLElement
    bar.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' }),
    )
    await within.updateComplete
    await host.updateComplete
    expect((corner(host) as HTMLElement).getAttribute('style')).toContain(
      '--splitter-corner-at: 55%',
    )
  })

  test('parallel dividers never meet, so there is no corner', async () => {
    const [host] = await nested('', '')
    expect(corner(host)).toBeNull()
  })

  test('a nested splitter that leaves takes its corner with it', async () => {
    const [host, within] = await nested()
    within.remove()
    await host.updateComplete
    expect(corner(host)).toBeNull()
  })

  test('each arrow moves the splitter whose axis it points along', async () => {
    const [host, within] = await nested(
      'default-position="30" step="5"',
      'orientation="vertical" default-position="60" step="5"',
    )
    const handle = corner(host) as HTMLElement
    const press = async (key: string): Promise<KeyboardEvent> => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
      handle.dispatchEvent(event)
      await host.updateComplete
      await within.updateComplete
      return event
    }
    await press('ArrowRight')
    expect([host.position, within.position]).toEqual([35, 60])
    await press('ArrowUp')
    expect([host.position, within.position]).toEqual([35, 55])
    expect((await press('Tab')).defaultPrevented).toBe(false)
  })

  test('a double click on the corner puts both dividers back', async () => {
    // The corner sits against the host rather than inside the separator, so
    // none of this arrives by bubbling.
    const [host, within] = await nested(
      'default-position="30" step="5"',
      'orientation="vertical" default-position="60" step="5"',
    )
    const handle = corner(host) as HTMLElement
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }),
    )
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowUp' }),
    )
    await host.updateComplete
    await within.updateComplete
    expect([host.position, within.position]).toEqual([35, 55])
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    await host.updateComplete
    await within.updateComplete
    expect([host.position, within.position]).toEqual([30, 60])
  })

  test('nothing moves until something is pressed', async () => {
    // The move handler runs on every pointer event the handle sees, so the
    // origin taken at `pointerdown` is what says a drag is under way. Without
    // it a bare hover resizes.
    const [host, within] = await nested(
      'default-position="30"',
      'orientation="vertical" default-position="60"',
    )
    const handle = corner(host) as HTMLElement
    await grab(host, handle, 'pointermove')
    expect([host.position, within.position]).toEqual([30, 60])
  })

  test('the divider underneath never starts its own drag from the same press', async () => {
    // Pointer capture would then send every later event to the divider, so the
    // corner's `pointerup` never arrives and it keeps resizing with no button
    // held. The corner is a sibling and stops its events either way.
    const [host] = await nested()
    let pressed = 0
    ;(part(host, 'separator') as HTMLElement).addEventListener('pointerdown', () => {
      pressed += 1
    })
    await grab(host, corner(host) as HTMLElement, 'pointerdown')
    expect(pressed).toBe(0)
  })
})

describe('splitter while it moves', () => {
  test('the divider says it is moving, and stops when it settles', async () => {
    // `:hover` cannot carry this: a drag captures the pointer, and a fast one
    // leaves an eight pixel target behind.
    const host = await splitter()
    const bar = separator(host)
    expect(bar.hasAttribute('data-dragging')).toBe(false)
    await grab(host, bar, 'pointerdown')
    expect(bar.hasAttribute('data-dragging')).toBe(true)
    await grab(host, bar, 'pointerup')
    expect(separator(host).hasAttribute('data-dragging')).toBe(false)
  })

  test('a keyboard move never reads as a drag', async () => {
    const host = await splitter('default-position="50" step="5"')
    await press(host, 'ArrowRight')
    expect(separator(host).hasAttribute('data-dragging')).toBe(false)
  })

  test('a corner lights both dividers, including the one under nobody', async () => {
    const [host, within] = await nested()
    const handle = corner(host) as HTMLElement
    await grab(host, handle, 'pointerdown')
    await within.updateComplete
    expect(separator(host).hasAttribute('data-dragging')).toBe(true)
    expect((part(within, 'separator') as HTMLElement).hasAttribute('data-dragging')).toBe(true)
    await grab(host, handle, 'pointerup')
    await within.updateComplete
    expect(separator(host).hasAttribute('data-dragging')).toBe(false)
    expect((part(within, 'separator') as HTMLElement).hasAttribute('data-dragging')).toBe(false)
  })

  test('the corner reports the divider whose value it carries', async () => {
    // It moves both, and ARIA has no role for that, so the axis it names has to
    // be the axis of the number it names.
    const [host] = await nested('default-position="30"', 'orientation="vertical" position="65"')
    const handle = corner(host) as HTMLElement
    expect(handle.getAttribute('aria-valuenow')).toBe('65')
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal')
  })
})

describe('a splitter given a bound as a length', () => {
  /* The box, stated. happy-dom lays nothing out, so a length has nothing to
     resolve against and every one of these would fall back; the width is what
     the arithmetic is about, so it is the thing to state. */
  const sized = async (attrs: string, width: number): Promise<Splitter> => {
    const host = await splitter(attrs)
    host.getBoundingClientRect = () => ({ height: 400, width }) as DOMRect
    return host
  }

  test('a percentage minimum is a different distance at different widths, which is the fault', async () => {
    // Twenty per cent of 1400 is 280 and twenty per cent of 500 is 100. The
    // number a consumer picked was about how much text fits, and only one of
    // these two answers holds it.
    const wide = await sized('min="20" default-position="0" step="5"', 1400)
    const narrow = await sized('min="20" default-position="0" step="5"', 500)
    await press(wide, 'Home')
    await press(narrow, 'Home')
    expect({
      narrowPixels: (narrow.position / 100) * 500,
      widePixels: (wide.position / 100) * 1400,
    }).toEqual({ narrowPixels: 100, widePixels: 280 })
  })

  test('a length minimum is the same distance at both, which is the point', async () => {
    const wide = await sized('min="280px" default-position="0" step="5"', 1400)
    const narrow = await sized('min="280px" default-position="0" step="5"', 500)
    await press(wide, 'Home')
    await press(narrow, 'Home')
    expect({
      narrowPixels: Math.round((narrow.position / 100) * 500),
      widePixels: Math.round((wide.position / 100) * 1400),
    }).toEqual({ narrowPixels: 280, widePixels: 280 })
  })

  test("rem is resolved against the root, so a bound tracks the reader's text size", async () => {
    const host = await sized('min="10rem" default-position="0" step="5"', 800)
    await press(host, 'Home')
    // 10rem at the default 16px root is 160px, which is a fifth of 800.
    expect(Math.round(host.position)).toBe(20)
  })
})

describe('a splitter told to choose its own axis', () => {
  /* The observation, stated rather than laid out. happy-dom computes no
     geometry, so a `ResizeObserver` here would report nothing and never fire;
     what is under test is not the arithmetic of comparing a width to a
     threshold but that a turn reaches all three of the things that have to turn
     with it. The carousel specs state `offsetLeft` for the same reason. */
  const stack = async (host: Splitter, stacked: boolean): Promise<void> => {
    ;(host as unknown as { stacked: boolean }).stacked = stacked
    await host.updateComplete
  }

  test('auto rests horizontal, so a splitter with room behaves as it always did', async () => {
    const host = await splitter('orientation="auto" default-position="50" step="5"')
    await press(host, 'ArrowRight')
    expect({
      announced: separator(host).getAttribute('aria-orientation'),
      mirrored: host.dataset.axis,
      position: host.position,
    }).toEqual({ announced: 'vertical', mirrored: undefined, position: 55 })
  })

  /* The whole reason this is a value and not a media query: turning a splitter
     is three changes at once, and a stylesheet can only make one of them. A
     CSS-only version looks stacked and behaves side by side, with the arrow
     keys moving the wrong way and the accessibility tree saying something
     untrue. */
  test('the arrow keys, the announcement and the mirrored axis turn together', async () => {
    const host = await splitter('orientation="auto" default-position="50" step="5"')
    await stack(host, true)
    await press(host, 'ArrowRight')
    const sideways = host.position
    await press(host, 'ArrowDown')
    expect({
      announced: separator(host).getAttribute('aria-orientation'),
      mirrored: host.dataset.axis,
      movedOnTheNewAxis: host.position,
      refusedTheOldOne: sideways,
    }).toEqual({
      announced: 'horizontal',
      mirrored: 'vertical',
      movedOnTheNewAxis: 55,
      refusedTheOldOne: 50,
    })
  })

  test('turning back takes the mirrored attribute off, a host keeping no stale state', async () => {
    const host = await splitter('orientation="auto"')
    await stack(host, true)
    await stack(host, false)
    expect({
      announced: separator(host).getAttribute('aria-orientation'),
      mirrored: host.dataset.axis,
    }).toEqual({ announced: 'vertical', mirrored: undefined })
  })

  test('an explicit orientation is never mirrored, the attribute already saying it', async () => {
    // Two sources for one truth on the host is the trap, and a page rendered
    // before hydration would flash the wrong axis on its way through.
    const host = await splitter('orientation="vertical"')
    expect(host.dataset.axis).toBeUndefined()
  })
})

describe('splitter collapsing', () => {
  test('a shut pane is gone, past whatever bounds a drag answers to', async () => {
    // The bounds keep a pane from vanishing by accident. This is the deliberate
    // version, so it goes through them.
    const host = await splitter('default-position="40" min="20" default-collapsed="start"')
    expect(host.position).toBe(0)
  })

  test('and keeps a sliver where it was asked to', async () => {
    const host = await splitter('default-collapsed="end" collapsed-size="10"')
    expect(host.position).toBe(90)
  })

  test('opening it again returns to where it was, with nothing remembering', async () => {
    const host = (await splitter('default-position="35"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    host.collapsed = 'start'
    await host.updateComplete
    expect(host.position).toBe(0)
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(35)
  })

  test('a drag that lands on the edge latches shut, and says which pane', async () => {
    const host = await splitter('default-position="40"')
    let value = ''
    host.addEventListener('helix-before-collapse', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'Home')
    expect(value).toBe('start')
    expect(host.hasAttribute('data-collapsed')).toBe(true)
  })

  test('a drag ending shut opens back to where the drag began, not to the edge', async () => {
    const host = (await splitter('default-position="60"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    const bar = separator(host)
    await grab(host, bar, 'pointerdown')
    /* The moves are stood in for, a pointer drag needing a box this harness
       does not lay out. What matters is that every one of them overwrites the
       position, so by the edge the start is gone unless the press took it. */
    host.position = 20
    await host.updateComplete
    await press(host, 'Home')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(60)
  })

  /* **And so does every other way of shutting one**, which is the half the
     press capture could not answer for. A key applies nothing before it
     settles, so where the divider is when the settling starts is where it was;
     read from the press alone, this reopened at the edge the resize had just
     written, under a class docstring saying a shut pane knows where to go
     back to. */
  test('a key ending shut opens back to where it was, not to the edge', async () => {
    const host = (await splitter('default-position="60"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    await press(host, 'Home')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(60)
  })

  test('and a step that lands on the edge is the same', async () => {
    const host = (await splitter('default-position="4" step="2"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    await press(host, 'ArrowLeft')
    await press(host, 'ArrowLeft')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(2)
  })

  test('and the reading is this gesture’s, never the one before it', async () => {
    /* Never cleared, the press capture outlived its own gesture and measured
       the next one: a press at 60, an hour of other work, and a key collapse
       from 20 reopened at 60. */
    const host = (await splitter('default-position="60"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    const bar = separator(host)
    await grab(host, bar, 'pointerdown')
    await grab(host, bar, 'pointerup')
    host.position = 20
    await host.updateComplete
    await press(host, 'Home')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(20)
  })

  test('any move opens it, so a shut pane is still draggable', async () => {
    const host = (await splitter('default-collapsed="start" step="5"')) as Splitter & {
      collapsed?: 'end' | 'start' | undefined
    }
    expect(host.position).toBe(0)
    await press(host, 'ArrowRight')
    expect(host.collapsed).toBeUndefined()
    expect(host.position).toBe(5)
    expect(host.hasAttribute('data-collapsed')).toBe(false)
  })

  test('a pane shut to nothing leaves no line behind, but keeps its target', async () => {
    // The divider is flush against whatever contains the splitter, and that has
    // its own edge: two lines a pixel apart with nothing between them.
    const host = await splitter('default-collapsed="start"')
    expect(separator(host).hasAttribute('data-flush')).toBe(true)
  })

  test('a pane shut to a sliver keeps its line, because a sliver is a pane', async () => {
    const host = await splitter('default-collapsed="start" collapsed-size="10"')
    expect(separator(host).hasAttribute('data-flush')).toBe(false)
  })

  test('and the line comes back the moment the pane opens', async () => {
    const host = await splitter('default-collapsed="start" step="5"')
    await press(host, 'ArrowRight')
    expect(separator(host).hasAttribute('data-flush')).toBe(false)
  })

  test('declaring `collapsed` seeds it, and the pane still collapses', async () => {
    /* Control is an action: the element applies, and a consumer takes the
       decision by refusing the before event. */
    const host = (await splitter('collapsed="start"')) as Splitter & { collapsed?: 'end' | 'start' }
    let asked = ''
    host.addEventListener('helix-before-collapse', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'End')
    expect(asked).toBe('end')
    expect(host.collapsed).toBe('end')
  })
})

describe('splitter under a consumer that owns the position', () => {
  const drag = async (host: Splitter, from: number, to: number): Promise<void> => {
    const bar = separator(host)
    const box = host.getBoundingClientRect()
    const at = (type: string, fraction: number) =>
      bar.dispatchEvent(
        new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: box.left + box.width * fraction,
          clientY: box.top + box.height * fraction,
        }) as PointerEvent,
      )
    let held = false
    bar.setPointerCapture = () => {
      held = true
    }
    bar.releasePointerCapture = () => {
      held = false
    }
    bar.hasPointerCapture = () => held
    at('pointerdown', from)
    at('pointermove', to)
    at('pointerup', to)
    await host.updateComplete
  }

  test('a splitter whose markup declared a position can still be dragged', async () => {
    /* A declared `position` is a seed, not a claim of ownership: there is
       nothing to defer to, and the drag applies like any other change.
 */
    const host = await splitter('position="50"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    let asked = ''
    host.addEventListener('helix-before-resize', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await drag(host, 0.5, 0.25)
    expect(asked).toBe('25')
    expect(host.position).toBe(25)
  })

  test('and announces once at the end, however many times it is drawn', async () => {
    /* The divider follows the hand and says nothing until the hand lets go. It
       is drawn on every move and tells once, at the end. */
    const host = await splitter('position="50"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    const said: string[] = []
    host.addEventListener('helix-before-resize', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const bar = separator(host)
    const at = (type: string, fraction: number) =>
      bar.dispatchEvent(
        new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: 200 * fraction,
          clientY: 50,
        }) as PointerEvent,
      )
    let held = false
    bar.setPointerCapture = () => {
      held = true
    }
    bar.releasePointerCapture = () => {
      held = false
    }
    bar.hasPointerCapture = () => held

    at('pointerdown', 0.5)
    at('pointermove', 0.8)
    await host.updateComplete
    // Drawn at the pointer, moved with it, and silent until it is dropped.
    expect(part(host, 'start')?.getAttribute('style')).toContain('80%')
    expect(host.position).toBe(80)
    expect(said).toEqual([])

    at('pointerup', 0.8)
    await host.updateComplete
    expect(said).toEqual(['80'])
  })

  test('and holds where it was dropped until the consumer answers', async () => {
    /* `dragging` goes false on `pointerup`. If the drawn position fell back to
       `position` there and then, the divider snapped to where the gesture began
       and jumped again a frame later when the answer arrived: a flash on every
       drag. */
    const host = await splitter('position="50"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    const bar = separator(host)
    let held = false
    bar.setPointerCapture = () => {
      held = true
    }
    bar.releasePointerCapture = () => {
      held = false
    }
    bar.hasPointerCapture = () => held
    const at = (type: string, fraction: number) =>
      bar.dispatchEvent(
        new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: 200 * fraction,
          clientY: 50,
        }) as PointerEvent,
      )
    at('pointerdown', 0.5)
    at('pointermove', 0.9)
    at('pointerup', 0.9)
    await host.updateComplete
    // A consumer that has not answered yet: still drawn where it was dropped.
    expect(part(host, 'start')?.getAttribute('style')).toContain('90%')

    // And the moment they do, whatever they say is what is drawn.
    host.position = 40
    await host.updateComplete
    expect(part(host, 'start')?.getAttribute('style')).toContain('40%')
  })

  test('an uncontrolled one is unchanged by the same path', async () => {
    const host = await splitter('default-position="50"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    await drag(host, 0.5, 0.75)
    expect(host.position).toBe(75)
  })
})

describe('a press that moves nothing', () => {
  const pointer = (type: string, y = 0): PointerEvent =>
    new PointerEvent(type, { bubbles: true, clientY: y, composed: true, pointerId: 1 })

  test('announces nothing, because nothing changed', async () => {
    /* A press that settles dispatches the position the divider already had.
       Harmless where a consumer's value round-trips exactly, and not where it
       does not: the sandbox stores pixels and divides by a box, so a plain click
       rewrites a stored size from a gesture that moved nothing. */
    const host = await splitter('default-position="40"')
    const said: string[] = []
    host.addEventListener('helix-before-resize', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const bar = separator(host)
    bar.dispatchEvent(pointer('pointerdown', 100))
    bar.dispatchEvent(pointer('pointerup', 100))
    await host.updateComplete
    expect(said).toEqual([])
  })

  test('and neither does a drag that came back to where it started', async () => {
    /* `reached === undefined` was the question asked here, which is whether the
       pointer ever moved rather than whether the divider ended anywhere new. A
       gesture out and back is the second one, and it announced. */
    const host = await splitter('default-position="40"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    const said: string[] = []
    host.addEventListener('helix-before-resize', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const bar = separator(host)
    const at = (type: string, fraction: number) =>
      bar.dispatchEvent(
        new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: 200 * fraction,
          clientY: 50,
        }) as PointerEvent,
      )
    at('pointerdown', 0.4)
    at('pointermove', 0.8)
    at('pointermove', 0.4)
    at('pointerup', 0.4)
    await host.updateComplete
    expect(said).toEqual([])
  })

  test('and neither does a key that had nowhere left to go', async () => {
    // Home on a divider already at its minimum is the same announcement of a
    // number nobody changed, reached by the other door.
    const host = await splitter('default-position="40"')
    const said: string[] = []
    host.addEventListener('helix-before-resize', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await press(host, 'Home')
    expect(said).toEqual(['0'])
    await press(host, 'Home')
    await press(host, 'ArrowLeft')
    expect(said).toEqual(['0'])
  })

  test('and neither does a double click on a divider already where it goes back to', async () => {
    const host = await splitter('default-position="40"')
    const said: string[] = []
    host.addEventListener('helix-before-resize', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    separator(host).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    await host.updateComplete
    expect(said).toEqual([])
  })

  test('and the panes go inert only while it is actually moving', async () => {
    /* A pane holds whatever a consumer slotted, and a cross-origin iframe is its
       own hit-testing world: a drag whose path crosses one can be lost to it.
       Asserted on both edges, since a pane left inert after the gesture is a
       pane nobody can click. */
    const host = await splitter('default-position="40"')
    const pane = part(host, 'start') as HTMLElement
    expect(pane.hasAttribute('data-dragging')).toBe(false)

    separator(host).dispatchEvent(pointer('pointerdown', 100))
    await host.updateComplete
    expect(pane.hasAttribute('data-dragging')).toBe(true)
    expect((part(host, 'end') as HTMLElement).hasAttribute('data-dragging')).toBe(true)

    separator(host).dispatchEvent(pointer('pointerup', 100))
    await host.updateComplete
    expect(pane.hasAttribute('data-dragging')).toBe(false)
  })
})

/**
 * The same rule at the handle that moves two dividers at once.
 *
 * The separator held it and the corner did not, so a press and a release on the
 * crossing with nothing between announced on both splitters, each carrying the
 * position it already had. Measured in Chromium 17 Sep 2026.
 *
 * **"Moved nothing" is asked of each divider and never of the gesture**, which
 * is what a handle on two axes costs: a drag along one of them moves one and
 * leaves the other exactly where it was, and the one that moved still has
 * something to say.
 */
describe('a corner gesture that moves nothing', () => {
  /** Both boxes stated, since happy-dom lays nothing out and the corner divides by them. */
  const crossing = async (): Promise<[Splitter, Splitter, HTMLElement, string[]]> => {
    const [host, within] = await nested(
      'default-position="50"',
      'orientation="vertical" default-position="50"',
    )
    for (const one of [host, within]) {
      Object.defineProperty(one, 'getBoundingClientRect', {
        value: () => ({ bottom: 400, height: 400, left: 0, right: 400, top: 0, width: 400 }),
      })
    }
    const said: string[] = []
    /* One listener, on the outer, labeled by what announced: the nested one is a
       child in the light DOM, so its events reach here by bubbling and a
       listener on each would record those twice. */
    host.addEventListener('helix-before-resize', (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value
      said.push(`${event.target === host ? 'outer' : 'inner'} ${value}`)
    })
    return [host, within, corner(host) as HTMLElement, said]
  }

  const trace = async (
    host: Splitter,
    within: Splitter,
    handle: HTMLElement,
    path: [string, number, number][],
  ): Promise<void> => {
    for (const [type, x, y] of path) {
      handle.dispatchEvent(
        new (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        }) as PointerEvent,
      )
    }
    await host.updateComplete
    await within.updateComplete
  }

  test('announces on neither divider, because neither moved', async () => {
    const [host, within, handle, said] = await crossing()
    await trace(host, within, handle, [
      ['pointerdown', 200, 200],
      ['pointerup', 200, 200],
    ])
    expect(said).toEqual([])
    expect([host.position, within.position]).toEqual([50, 50])
  })

  test('and on one of them where the gesture moved one of them', async () => {
    /* Along the outer divider's axis only. The corner feeds both on every step,
       so the nested one has a number from this gesture too: the one it already
       had. */
    const [host, within, handle, said] = await crossing()
    await trace(host, within, handle, [
      ['pointerdown', 200, 200],
      ['pointermove', 300, 200],
      ['pointerup', 300, 200],
    ])
    expect(said).toEqual(['outer 75'])
    expect([host.position, within.position]).toEqual([75, 50])
  })

  test('and on the nested one where that is the one that moved', async () => {
    const [host, within, handle, said] = await crossing()
    await trace(host, within, handle, [
      ['pointerdown', 200, 200],
      ['pointermove', 200, 300],
      ['pointerup', 200, 300],
    ])
    expect(said).toEqual(['inner 75'])
    expect([host.position, within.position]).toEqual([50, 75])
  })

  test('and on both where both moved', async () => {
    const [host, within, handle, said] = await crossing()
    await trace(host, within, handle, [
      ['pointerdown', 200, 200],
      ['pointermove', 300, 100],
      ['pointerup', 300, 100],
    ])
    expect(said).toEqual(['outer 75', 'inner 25'])
  })

  test('and a double click on it announces only what it actually puts back', async () => {
    /* `reset` goes straight to the settling, so a divider already sitting on its
       `default-position` is a move of zero arriving by a fourth door. The two
       presses a double click is made of are two more. */
    const [host, within, handle, said] = await crossing()
    await trace(host, within, handle, [
      ['pointerdown', 200, 200],
      ['pointermove', 200, 300],
      ['pointerup', 200, 300],
    ])
    said.length = 0
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    await host.updateComplete
    await within.updateComplete
    expect(said).toEqual(['inner 50'])
  })
})

/**
 * A splitter under a tag this package has never heard of.
 *
 * **This is the case a tag match cannot answer.** Matching
 * `'helix-splitter, helix-headless-splitter'` has a headless package naming a
 * styled one by string, and only `@fusion.dev/helix` registers the first.
 * Subclassing a headless element under a third tag is exactly what this tier
 * exists to allow and exactly what `helix/styled` itself does, and under one the
 * lookup returns null: a nested splitter with no corner and nothing saying why.
 *
 * `closestInstance` asks whether the ancestor *is* a splitter, which is true of
 * every subclass whatever it is called, and walks through shadow roots on the
 * way, which `closest` does not.
 */
describe('a splitter a consumer has subclassed', () => {
  test('still finds the one it crosses, whatever either of them is called', async () => {
    const { HelixHeadlessSplitter } = await import('./splitter-root.js')
    for (const tag of ['probe-splitter-outer', 'probe-splitter-inner']) {
      if (!customElements.get(tag)) {
        customElements.define(tag, class extends HelixHeadlessSplitter {})
      }
    }
    const host = (await mount(`<probe-splitter-outer>
      <div slot="start">one</div>
      <probe-splitter-inner slot="end" orientation="vertical">
        <div slot="start">two</div><div slot="end">three</div>
      </probe-splitter-inner>
    </probe-splitter-outer>`)) as Splitter
    const within = host.querySelector('probe-splitter-inner') as Splitter
    await host.updateComplete
    await within.updateComplete
    await host.updateComplete
    expect(corner(host)).not.toBeNull()
    expect(corner(within)).toBeNull()
  })
})
