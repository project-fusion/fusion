import type { ViewportGestureMode } from '@fusion.dev/helix-core'
import type { GraphDriver, GraphGroup } from '../connect-graph/connect-graph.js'
import { type DrawnLink, type DrawnNode, linkKey } from '../connect-graph/diff.js'
import { type GraphLooks, mixRgb, type NodeLook } from '../connect-graph/looks.js'
import type { GraphPoint } from '../connect-graph/seed.js'
import { type Box, clearOf, ease, gesturesHeld, isLight } from '../overlay/overlay.js'
import {
  depthOrder,
  floorLine,
  type Point,
  plate,
  project,
  type Solid,
  snapToCells,
  solid,
  solidOf,
} from './geometry.js'

/** How the diagram is drawn where a note does not say. */
export interface IsometricDriverOptions {
  /** Draws every note at no height, which lays the diagram flat as a plan. */
  flat?: boolean | undefined
  /** Whether each group's name is written on its plate. On by default. */
  groupLabels?: boolean | undefined
  /**
   * A note's solid where it gives no `shape`: `square`, a block, by default;
   * `circle` or `ring`, a cylinder; `diamond`, a pyramid.
   */
  shape?: NodeLook['shape']
}

const SVG = 'http://www.w3.org/2000/svg'

/** How long a step of the view takes, in milliseconds, as the Sigma driver's. */
const STEP = 250

/** How far one zoom step goes, as the Sigma driver's. */
const ZOOM = 1.5

/** The room kept at each edge when the diagram is framed, in pixels. */
const PADDING = 32

/** The largest and smallest a cell is drawn, in pixels across. */
const LARGEST = 120
const SMALLEST = 4

/** How much of its cell a note's footprint covers along each edge. */
const FOOTPRINT = 0.62

/** How far a group's plate reaches past its notes' cells. */
const MARGIN = 0.55

/** How large a note's name is drawn, in pixels, and a group's. */
const NAME = 12
const GROUP = 10

/** How far a drag goes before it is a pan rather than a press, in pixels. */
const DRAG = 4

/** How tall a note stands, in cells, from its size: a leaf about half a cell, a hub nearly one and a half. */
const heightOf = (size: number): number => 0.3 + 0.16 * Math.max(size, 0)

/** Text made safe to write into markup. */
const escaped = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' })[
        character
      ] as string,
  )

/** How wide a name is drawn, measured without a canvas, as the snapshot measures it. */
const widthOf = (text: string, size: number): number => text.length * size * 0.56

/**
 * A face's color, shaded for the light it takes from the upper left: the
 * top in the note's own color, the left side darker, and the right darker
 * still.
 */
const shaded = (color: string, light: 'left' | 'right' | 'top'): string =>
  light === 'top' ? color : mixRgb(color, 'rgb(0, 0, 0)', light === 'left' ? 0.2 : 0.36)

/**
 * An edge in an ink that contrasts with its face: a quarter of the way to
 * white on a dark face and to black on a light one, so the darkest note
 * still reads as a solid.
 */
const edgeOf = (face: string): string =>
  mixRgb(face, isLight(face) ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)', 0.25)

/** The view: the point at the middle of the box, in cells on the page, and how many pixels a cell is. */
interface View {
  scale: number
  x: number
  y: number
}

/**
 * Draws the graph of a `helix-graph` frame as an isometric diagram in SVG,
 * for architecture and flow diagrams. Pass it to `connectGraph` with the
 * element to draw in:
 *
 * ```js
 * import { connectGraph } from '@fusion.dev/helix-graph'
 * import { isometricDriver } from '@fusion.dev/helix-graph/isometric'
 *
 * connectGraph(frame, isometricDriver(frame.querySelector('.diagram')))
 * ```
 *
 * **Each note is a solid on a floor of cells**, standing at its `x` and `y`:
 * a note at `x: 2, y: 1` is two cells across and one back. Its `shape` picks
 * the solid, a square a block, a circle a cylinder, and a diamond a pyramid,
 * and its size sets its height. A note given no place is put on the nearest
 * free cell beside the notes it links to.
 *
 * **The faces are shaded from the note's own color**, its tone's or its
 * group's, so the diagram takes the theme. Links run along the floor with an
 * arrow halfway that points the way each runs, and each group stands on a
 * plate of its color with its name written on the floor.
 *
 * **SVG and nothing else**: no renderer to install, no WebGL context, and
 * text as crisp as the page's. The frame's list, search, and keys work as
 * they do with every driver. Drag to pan and use the wheel to zoom, as the
 * frame's `gestures` allows.
 */
export const isometricDriver = (
  container: HTMLElement,
  options: IsometricDriverOptions = {},
): GraphDriver => {
  const svg = document.createElementNS(SVG, 'svg')
  /* The frame's list is what a reader reads the graph from, so the drawing
     is a picture beside it. */
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('data-helix-isometric', '')
  svg.style.cssText =
    'display:block;inline-size:100%;block-size:100%;overflow:hidden;user-select:none;-webkit-user-select:none'
  const layer = (name: string): SVGGElement => {
    const group = document.createElementNS(SVG, 'g')
    group.setAttribute('data-layer', name)
    svg.append(group)
    return group
  }
  const plates = layer('plates')
  const lines = layer('links')
  const notes = layer('notes')
  const names = layer('names')
  names.setAttribute('paint-order', 'stroke')
  names.setAttribute('stroke-linejoin', 'round')
  names.setAttribute('pointer-events', 'none')
  container.append(svg)

  const nodes = new Map<string, DrawnNode>()
  const links = new Map<string, DrawnLink>()
  let looks: GraphLooks | undefined
  let groups: readonly GraphGroup[] = []
  let hovered: string | undefined
  let mode: ViewportGestureMode = 'free'
  let view: View = { scale: 48, x: 0, y: 0 }
  /* Whether the view is still the driver's own framing of the whole diagram,
     which a resize frames again. Any other move is kept, scaled with the box. */
  let framed = false
  let measured: { height: number; width: number } | undefined
  let gliding = 0
  let press: ((id: string | undefined) => void) | undefined
  const held = gesturesHeld(container)

  const sizeOfBox = (): { height: number; width: number } => {
    const box = svg.getBoundingClientRect()
    return { height: box.height || 1, width: box.width || 1 }
  }

  const shapeOf = (id: string): Solid => solidOf(looks?.node(id).shape ?? options.shape ?? 'square')

  const tallness = (node: DrawnNode): number => (options.flat ? 0 : heightOf(node.size))

  /** Every note as a solid, in the order to paint them. */
  const solids = () =>
    depthOrder(
      [...nodes.values()].map((node) => ({
        drawn: solid(shapeOf(node.id), node.x, node.y, FOOTPRINT, tallness(node)),
        height: tallness(node),
        node,
        x: node.x,
        y: node.y,
      })),
    )

  /** The box around the notes in `ids`, every note where none are given, in cells on the page. */
  const boundsOf = (ids?: readonly string[]): Box | undefined => {
    const chosen = ids ? ids.flatMap((id) => nodes.get(id) ?? []) : [...nodes.values()]
    if (chosen.length === 0) {
      return undefined
    }
    const points: Point[] = []
    for (const node of chosen) {
      const half = FOOTPRINT / 2 + (ids ? 0 : MARGIN)
      points.push(
        project(node.x - half, node.y - half),
        project(node.x + half, node.y + half),
        project(node.x + half, node.y - half),
        project(node.x - half, node.y + half, tallness(node) + 0.5),
      )
    }
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    return {
      bottom: Math.max(...ys),
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
    }
  }

  /** Puts the view's box on the drawing, and draws the names, which keep their size in pixels. */
  const show = (): void => {
    const { height, width } = sizeOfBox()
    const across = width / view.scale
    const down = height / view.scale
    svg.setAttribute('viewBox', `${view.x - across / 2} ${view.y - down / 2} ${across} ${down}`)
    drawNames()
  }

  /** Moves the view to `next`, over a step where `animate`, or at once. */
  const go = (next: View, animate: boolean, whole = false): void => {
    framed = whole
    cancelAnimationFrame(gliding)
    if (!animate) {
      view = next
      show()
      return
    }
    const from = view
    const started = performance.now()
    const frame = (now: number): void => {
      const at = Math.min((now - started) / STEP, 1)
      const eased = ease(at)
      view = {
        /* Scale by its ratio, so a zoom feels even all the way. */
        scale: from.scale * (next.scale / from.scale) ** eased,
        x: from.x + (next.x - from.x) * eased,
        y: from.y + (next.y - from.y) * eased,
      }
      show()
      if (at < 1) {
        gliding = requestAnimationFrame(frame)
      }
    }
    gliding = requestAnimationFrame(frame)
  }

  /** The view that holds `box` in the drawing's box. */
  const framing = (box: Box): View => {
    const { height, width } = sizeOfBox()
    const across = Math.max(box.right - box.left, 0.001)
    const down = Math.max(box.bottom - box.top, 0.001)
    const scale = Math.min(
      Math.max(Math.min((width - PADDING * 2) / across, (height - PADDING * 2) / down), SMALLEST),
      LARGEST,
    )
    return { scale, x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
  }

  const drawPlates = (): void => {
    const own = new Set(nodes.keys())
    const marks: string[] = []
    for (const group of groups) {
      const places = group.ids.flatMap((id) => {
        const node = nodes.get(id)
        return node && own.has(id) && !looks?.node(id).hidden ? [{ x: node.x, y: node.y }] : []
      })
      const drawn = plate(places, MARGIN + FOOTPRINT / 2)
      if (!drawn) {
        continue
      }
      const fill = group.faded ? 0.04 : 0.1
      const stroke = group.faded ? 0.18 : 0.5
      marks.push(
        `<path d="${drawn.d}" fill="${group.color}" fill-opacity="${fill}" stroke="${group.color}" stroke-opacity="${stroke}" stroke-width="1" vector-effect="non-scaling-stroke"/>`,
      )
    }
    plates.innerHTML = marks.join('')
  }

  const drawLinks = (): void => {
    const rest: string[] = []
    const raised: string[] = []
    for (const link of links.values()) {
      const from = nodes.get(link.source)
      const to = nodes.get(link.target)
      if (!from || !to) {
        continue
      }
      const look = looks?.link(link.source, link.target)
      if (look?.hidden) {
        continue
      }
      const color = look?.color ?? 'currentColor'
      const width = look?.raised ? 2 : 1.25
      /* An arrow halfway along, pointing the way the link runs, laid on the
         floor as the line is. */
      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.hypot(dx, dy) || 1
      const along = { x: dx / length, y: dy / length }
      const side = { x: -along.y, y: along.x }
      const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
      const tip = project(middle.x + along.x * 0.14, middle.y + along.y * 0.14)
      const wing = (sign: 1 | -1) =>
        project(
          middle.x - along.x * 0.14 + side.x * 0.12 * sign,
          middle.y - along.y * 0.14 + side.y * 0.12 * sign,
        )
      const [one, other] = [wing(1), wing(-1)]
      ;(look?.raised ? raised : rest).push(
        `<path d="${floorLine(from, to)}" fill="none" stroke="${color}" stroke-linecap="round" stroke-width="${width}" vector-effect="non-scaling-stroke"/>` +
          `<path d="M${one.x} ${one.y}L${tip.x} ${tip.y}L${other.x} ${other.y}Z" fill="${color}"/>`,
      )
    }
    lines.innerHTML = rest.join('') + raised.join('')
  }

  const drawNotes = (): void => {
    const marks: string[] = []
    for (const { drawn, node } of solids()) {
      const look = looks?.node(node.id)
      if (look?.hidden) {
        continue
      }
      const color = look?.color ?? 'rgb(128, 128, 128)'
      const faces = drawn.faces
        .map((face) => {
          const fill = shaded(color, face.light)
          return `<path d="${face.d}" fill="${fill}" stroke="${edgeOf(fill)}" stroke-linejoin="round" stroke-width="1" vector-effect="non-scaling-stroke"/>`
        })
        .join('')
      /* The selected note is ringed and lit beneath, the note under the
         pointer or the keys ringed more finely, each in the page's ink. */
      const ink = looks?.ink ?? 'currentColor'
      const ringed = look?.selected ? 2.5 : node.id === hovered || look?.keyed ? 1.5 : 0
      const glow = look?.selected
        ? `<path d="${solid(shapeOf(node.id), node.x, node.y, FOOTPRINT + 0.5, 0).outline}" fill="${color}" fill-opacity="0.22"/>`
        : ''
      const ring =
        ringed > 0
          ? `<path d="${drawn.outline}" fill="none" stroke="${ink}" stroke-linejoin="round" stroke-width="${ringed}" vector-effect="non-scaling-stroke"/>`
          : ''
      marks.push(
        `<g data-id="${escaped(node.id)}" style="cursor:pointer">${glow}${faces}${ring}</g>`,
      )
    }
    notes.innerHTML = marks.join('')
  }

  /**
   * The names over each note's top: the selected note's and the hovered
   * one's always, and the rest where the looks give them room and they do
   * not cover a name already drawn, the tallest note's first.
   */
  function drawNames(): void {
    if (!looks) {
      names.innerHTML = ''
      return
    }
    const current = looks
    const size = NAME / view.scale
    const taken: Box[] = []
    const marks: string[] = []
    const order = solids()
      .filter(({ node }) => {
        const look = current.node(node.id)
        return !look.hidden && (look.label !== 'never' || node.id === hovered)
      })
      .sort((one, other) => {
        const rank = (id: string): number => {
          const look = current.node(id)
          return look.selected || id === hovered ? 2 : look.label === 'always' ? 1 : 0
        }
        return rank(other.node.id) - rank(one.node.id) || other.height - one.height
      })
    for (const { drawn, node } of order) {
      const look = current.node(node.id)
      const wide = widthOf(node.label, size)
      /* Clear of the solid's highest point, with a third of the name's
         height between, so the top's back edge never shows through a name. */
      const line = drawn.crown - size * 0.55
      const box: Box = {
        bottom: line + size * 0.3,
        left: drawn.peak.x - wide / 2,
        right: drawn.peak.x + wide / 2,
        top: line - size,
      }
      const forced = look.selected || look.label === 'always' || node.id === hovered
      if (!forced && !clearOf(box, taken)) {
        continue
      }
      taken.push(box)
      const strong = look.selected || look.raised || node.id === hovered
      marks.push(
        `<text fill="${strong ? current.ink : current.quiet}" font-weight="${strong ? 600 : 500}" stroke="${current.ground}" text-anchor="middle" x="${drawn.peak.x}" y="${line}">${escaped(node.label)}</text>`,
      )
    }
    /* Each group's name on its plate, written along the floor. */
    if (options.groupLabels !== false) {
      for (const group of groups) {
        const places = group.ids.flatMap((id) => {
          const node = nodes.get(id)
          return node && !current.node(id).hidden ? [{ x: node.x, y: node.y }] : []
        })
        const drawn = plate(places, MARGIN + FOOTPRINT / 2)
        if (!drawn) {
          continue
        }
        const low = {
          x: Math.min(...places.map((place) => place.x)) - MARGIN - FOOTPRINT / 2,
          y: Math.min(...places.map((place) => place.y)) - MARGIN - FOOTPRINT / 2,
        }
        const at = project(low.x + 0.15, low.y + 0.12)
        const small = GROUP / view.scale
        const half = Math.sqrt(3) / 2
        marks.push(
          `<text fill="${group.color}" fill-opacity="${group.faded ? 0.4 : 0.95}" font-size="${small}" font-weight="650" letter-spacing="${small * 0.12}" stroke="none" transform="matrix(${half} 0.5 ${-half} 0.5 ${at.x} ${at.y})">${escaped(group.name.toLocaleUpperCase())}</text>`,
        )
      }
    }
    names.setAttribute('font-family', current.font)
    names.setAttribute('font-size', String(size))
    names.setAttribute('stroke-width', String(3 / view.scale))
    names.innerHTML = marks.join('')
  }

  const render = (): void => {
    drawPlates()
    drawLinks()
    drawNotes()
    drawNames()
  }

  const fitAll = (animate: boolean): void => {
    const box = boundsOf()
    if (box) {
      go(framing(box), animate, true)
    }
  }

  /* Drag to pan and the wheel to zoom, as far as the frame's gestures allow:
     `gesturesHeld` keeps the wheel and touches from here in the modes that
     leave them to the page. A press that did not move is a press. */
  let dragging: { id: number; moved: boolean; x: number; y: number } | undefined
  const onDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      mode === 'off' ||
      (mode === 'cooperative' && event.pointerType === 'touch')
    ) {
      dragging = undefined
      return
    }
    dragging = { id: event.pointerId, moved: false, x: event.clientX, y: event.clientY }
  }
  const onMove = (event: PointerEvent): void => {
    const target = (event.target as Element | null)?.closest?.('[data-id]')
    const over = target?.getAttribute('data-id') ?? undefined
    if (over !== hovered && !dragging?.moved) {
      hovered = over
      drawNotes()
      drawNames()
    }
    if (!dragging || dragging.id !== event.pointerId) {
      return
    }
    const dx = event.clientX - dragging.x
    const dy = event.clientY - dragging.y
    if (!dragging.moved && Math.hypot(dx, dy) < DRAG) {
      return
    }
    if (!dragging.moved) {
      dragging.moved = true
      svg.setPointerCapture?.(event.pointerId)
    }
    dragging.x = event.clientX
    dragging.y = event.clientY
    cancelAnimationFrame(gliding)
    framed = false
    view = { ...view, x: view.x - dx / view.scale, y: view.y - dy / view.scale }
    show()
  }
  const onUp = (event: PointerEvent): void => {
    const was = dragging
    dragging = undefined
    if (!was || was.moved || was.id !== event.pointerId) {
      return
    }
    const target = (event.target as Element | null)?.closest?.('[data-id]')
    press?.(target?.getAttribute('data-id') ?? undefined)
  }
  const onLeave = (): void => {
    if (hovered !== undefined) {
      hovered = undefined
      drawNotes()
      drawNames()
    }
  }
  const onWheel = (event: WheelEvent): void => {
    if (mode === 'off') {
      return
    }
    event.preventDefault()
    const box = svg.getBoundingClientRect()
    /* About the point under the pointer, which stays where it is. */
    const px = event.clientX - box.left - box.width / 2
    const py = event.clientY - box.top - box.height / 2
    const factor = Math.exp(-event.deltaY * 0.0015)
    const scale = Math.min(Math.max(view.scale * factor, SMALLEST), LARGEST)
    const at = { x: view.x + px / view.scale, y: view.y + py / view.scale }
    cancelAnimationFrame(gliding)
    framed = false
    view = { scale, x: at.x - px / scale, y: at.y - py / scale }
    show()
  }
  svg.addEventListener('pointerdown', onDown)
  svg.addEventListener('pointermove', onMove)
  svg.addEventListener('pointerup', onUp)
  svg.addEventListener('pointerleave', onLeave)
  svg.addEventListener('wheel', onWheel, { passive: false })

  /* **A new box keeps what the reader saw**: the whole diagram while the view
     is the driver's own framing, and otherwise the same middle with the scale
     moved as the box's shorter side moved, as Sigma's camera does. Kept at
     one scale, a frame narrowed by its panel cut the diagram off at the edge. */
  const resized = (): void => {
    const next = sizeOfBox()
    const before = measured
    measured = next
    if (framed) {
      fitAll(false)
      return
    }
    if (before) {
      const ratio = Math.min(next.width, next.height) / Math.min(before.width, before.height)
      view = { ...view, scale: Math.min(Math.max(view.scale * ratio, SMALLEST), LARGEST) }
    }
    show()
  }
  const sized = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : undefined
  sized?.observe(svg)

  const set = (list: readonly DrawnNode[]): void => {
    for (const node of list) {
      nodes.set(node.id, node)
    }
  }

  return {
    center: (id, animate) => {
      const node = nodes.get(id)
      if (node) {
        const peak = project(node.x, node.y, tallness(node) / 2)
        go({ ...view, x: peak.x, y: peak.y }, animate)
      }
    },
    draw: (graph) => {
      nodes.clear()
      links.clear()
      set(graph.nodes)
      for (const link of graph.links) {
        links.set(linkKey(link), link)
      }
      render()
      fitAll(false)
    },
    fit: (ids, animate) => {
      const box = boundsOf(ids)
      if (box) {
        const next = framing(box)
        /* Never closer than the diagram's own framing, so a lone note does not fill the box. */
        go({ ...next, scale: Math.min(next.scale, 72) }, animate)
      }
    },
    focusTarget: () => null,
    gestures: (next) => {
      mode = next
      held.set(next)
    },
    groups: (next) => {
      groups = next
      drawPlates()
      drawNames()
    },
    look: (next) => {
      looks = next
      render()
    },
    onPress: (listener) => {
      press = listener
      return () => {
        press = undefined
      }
    },
    panBy: (x, y, animate) => {
      go({ ...view, x: view.x + x / view.scale, y: view.y + y / view.scale }, animate)
    },
    settle: (unplaced, placed) => {
      const seeded = new Map([...nodes].map(([id, node]) => [id, { x: node.x, y: node.y }]))
      const cells = snapToCells(seeded, unplaced)
      for (const [id, cell] of cells) {
        const node = nodes.get(id)
        if (node) {
          nodes.set(id, { ...node, x: cell.x, y: cell.y })
        }
      }
      render()
      fitAll(false)
      /* Told on the next task, after the connector has heard how to stop it. */
      const told = setTimeout(() => {
        placed(
          new Map<string, GraphPoint>(
            [...nodes].map(([id, node]) => [id, { x: node.x, y: node.y }]),
          ),
        )
      }, 0)
      return () => clearTimeout(told)
    },
    stop: () => {
      cancelAnimationFrame(gliding)
      sized?.disconnect()
      held.stop()
      svg.removeEventListener('pointerdown', onDown)
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerup', onUp)
      svg.removeEventListener('pointerleave', onLeave)
      svg.removeEventListener('wheel', onWheel)
      svg.remove()
    },
    update: (changes) => {
      for (const id of changes.removeNodes) {
        nodes.delete(id)
      }
      for (const link of changes.removeLinks) {
        links.delete(linkKey(link))
      }
      set(changes.addNodes)
      set(changes.changeNodes)
      for (const link of changes.addLinks) {
        links.set(linkKey(link), link)
      }
      render()
    },
    zoomBy: (direction, animate) => {
      const scale = Math.min(
        Math.max(view.scale * (direction > 0 ? ZOOM : 1 / ZOOM), SMALLEST),
        LARGEST,
      )
      go({ ...view, scale }, animate)
    },
  }
}
