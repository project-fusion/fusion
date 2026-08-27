import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@helix-io/testing/dom'

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
       two words are opposite each other here. The code had this right and the
       sentence beside it said the reverse. */
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
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const host = await splitter('position="50" step="5"')
    let asked = ''
    host.addEventListener('helix-before-resize', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, 'ArrowRight')
    expect(asked).toBe('55')
    expect(host.position).toBe(55)
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
    // Free by bubbling while the corner lived inside the separator, and lost the
    // moment it moved out to sit against the host. Reported.
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
    // Reported: it resized on a bare hover. The move handler runs on every
    // pointer event the handle sees, so the origin taken at `pointerdown` is
    // what says a drag is under way.
    const [host, within] = await nested(
      'default-position="30"',
      'orientation="vertical" default-position="60"',
    )
    const handle = corner(host) as HTMLElement
    await grab(host, handle, 'pointermove')
    expect([host.position, within.position]).toEqual([30, 60])
  })

  test('the divider underneath never starts its own drag from the same press', async () => {
    // It used to, and pointer capture then sent every later event to it, so the
    // corner's `pointerup` never arrived and it kept resizing with no button
    // held. The corner is a sibling now and stops its events either way.
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
    // be the axis of the number it names. It named the perpendicular one.
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
      collapsed?: 'end' | 'start'
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
    let named = ''
    let value = ''
    host.addEventListener('helix-before-collapse', (event) => {
      const detail = (event as CustomEvent<{ property: string; value: string }>).detail
      if (detail.property === 'collapsed') {
        named = detail.property
        value = detail.value
      }
    })
    await press(host, 'Home')
    expect([named, value]).toEqual(['collapsed', 'start'])
    expect(host.hasAttribute('data-collapsed')).toBe(true)
  })

  test('a drag ending shut opens back to where the drag began, not to the edge', async () => {
    const host = (await splitter('default-position="60"')) as Splitter & {
      collapsed?: 'end' | 'start'
    }
    const bar = separator(host)
    await grab(host, bar, 'pointerdown')
    // Every move overwrites the position, so by the edge the start is gone
    // unless the press took it.
    host.position = 20
    await host.updateComplete
    await press(host, 'Home')
    expect(host.collapsed).toBe('start')
    host.collapsed = undefined
    await host.updateComplete
    expect(host.position).toBe(60)
  })

  test('any move opens it, so a shut pane is still draggable', async () => {
    const host = (await splitter('default-collapsed="start" step="5"')) as Splitter & {
      collapsed?: 'end' | 'start'
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
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const host = (await splitter('collapsed="start"')) as Splitter & { collapsed?: 'end' | 'start' }
    let asked = ''
    host.addEventListener('helix-before-collapse', (event) => {
      const detail = (event as CustomEvent<{ property: string; value: string }>).detail
      if (detail.property === 'collapsed') {
        asked = detail.value
      }
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
    /* It could not, twice over. `move` used to refuse to apply anything when the
       consumer owned the position, so `position` never changed during the drag
       and letting go settled at *that*: the announcement carried the number it
       started with and the divider never moved. That was fixed by drawing
       without applying; it is moot now, since there is no ownership to defer to
       and the drag applies like any other change. See 294. */
    const host = await splitter('position="50"')
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ bottom: 100, height: 100, left: 0, right: 200, top: 0, width: 200 }),
    })
    let asked = ''
    host.addEventListener('helix-before-resize', (event) => {
      const detail = (event as CustomEvent<{ property: string; value: string }>).detail
      if (detail.property === 'position') {
        asked = detail.value
      }
    })
    await drag(host, 0.5, 0.25)
    expect(asked).toBe('25')
    expect(host.position).toBe(25)
  })

  test('and announces once at the end, however many times it is drawn', async () => {
    /* The divider follows the hand and says nothing until the hand lets go. The
       drawing half was once the interesting part, because a controlled splitter
       applied nothing and had to be drawn some other way; what survives that is
       the rule about *telling*, which is once, at the end. This is what the
       sandbox did for itself before it used this component. */
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
       drag, reported against the examples rail. */
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
    /* Every press used to settle, dispatching the position the divider already
       had. Harmless where a consumer's value round-trips exactly, and not where
       it does not: the sandbox stores pixels and divides by a box, so a plain
       click rewrote a stored size from a gesture that moved nothing. */
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
 * A splitter under a tag this package has never heard of.
 *
 * **This is the case a tag match cannot answer, and it was the fault.**
 * `findOuter` matched `'helix-splitter, helix-headless-splitter'`, and only
 * `@helix-io/styled` registers the first: a headless package naming a styled one
 * by string. Subclassing a headless element under a third tag is exactly what this
 * tier exists to allow and exactly what `helix/styled` itself does, and under one
 * the lookup returned null, so a nested splitter simply had no corner and
 * nothing said why.
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
