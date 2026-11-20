/*
 * A graph's picture as numbers: where each note and link stands in a box,
 * how large each note is, the color each takes as theme tokens, and the
 * names placed where they clear each other. `graphSnapshot` in
 * `@fusion.dev/helix-graph` writes it as an SVG for a page to paint before
 * its renderer has loaded, and a phone draws it in react-native-svg, so both
 * stand each note at one place, as Sigma.js fits it.
 */
import { type Box, clearOf } from './clear.js'
import {
  type At,
  FADED,
  type GraphPicture,
  type GraphPictureOptions,
  HUB,
  LABEL,
  mixed,
  type PictureLine,
  type PictureLink,
  type PictureMark,
  type PictureName,
  type PictureNode,
  type PictureRegion,
  placesOf,
  type Scene,
  sceneOf,
  widthOf,
} from './picture-scene.js'
import { pixelsOf, sizeOf } from './sizes.js'

/** **A link at rest steps back as far as the graph is dense**, as the drawing's does, and one on the selection's way takes its color. */
const linesOf = (scene: Scene, at: At): PictureLine[] => {
  const { drawn, notes, own, reached, selected } = scene
  const along = Math.min(Math.max(Math.log(drawn.length / 50) / Math.log(2000 / 50), 0), 1)
  const rest = (0.35 + (0.72 - 0.35) * along) * 100
  const lines: PictureLine[] = []
  const raised: PictureLine[] = []
  for (const link of drawn) {
    const source = notes.get(link.source) as PictureNode
    const from = at(source)
    const to = at(notes.get(link.target) as PictureNode)
    const lit = reached?.along(link.source, link.target) ?? false
    const ink = lit
      ? own(notes.get(selected as string) as PictureNode)
      : selected !== undefined
        ? mixed({ base: 'border' }, 'surface-sunken', 60)
        : mixed(own(source), 'surface-sunken', rest)
    ;(lit ? raised : lines).push({
      ink,
      raised: lit,
      width: lit ? 1.2 : 0.6,
      x1: from.x,
      x2: to.x,
      y1: from.y,
      y2: to.y,
    })
  }
  return [...lines, ...raised]
}

/** The notes, the selection's over the rest and the selected one last. */
const marksOf = (
  nodes: readonly PictureNode[],
  scene: Scene,
  at: At,
  options: GraphPictureOptions,
): PictureMark[] => {
  const { faded, near, own, radiusOf, selected } = scene
  const order = (node: PictureNode): number =>
    node.id === selected ? 2 : near.has(node.id) ? 1 : 0
  return [...nodes]
    .sort((one, other) => order(one) - order(other))
    .map((node) => {
      const shape = node.shape ?? options.shape ?? 'circle'
      return {
        /* A ring is a circle drawn outlined, whatever its emphasis says. */
        emphasis: shape === 'ring' ? 'outlined' : (node.emphasis ?? options.emphasis ?? 'solid'),
        id: node.id,
        ink: faded(node) ? mixed(own(node), 'surface-sunken', FADED) : own(node),
        radius: radiusOf(node),
        selected: node.id === selected,
        shape,
        ...at(node),
      }
    })
}

/** Whether a note is named at all: the selected note always, the rest where `labels` says. */
const namedOf = (scene: Scene, options: GraphPictureOptions) => {
  const { degree, faded, near, selected } = scene
  const naming = options.labels ?? 'hover'
  return (node: PictureNode): boolean => {
    if (!node.label && !node.id) {
      return false
    }
    if (node.id === selected) {
      return true
    }
    if (faded(node)) {
      return false
    }
    return (
      near.has(node.id) ||
      naming === 'all' ||
      (naming === 'hubs' && pixelsOf(sizeOf(node.size, degree.get(node.id) ?? 0)) >= HUB)
    )
  }
}

/**
 * **The names, as the Sigma driver names them**: the selected note's
 * always, the rest where `labels` says and only where clear of a name
 * already placed, the larger note's first. After the note, or before it
 * where after would run off the drawing.
 */
const namesOf = (
  nodes: readonly PictureNode[],
  scene: Scene,
  at: At,
  options: GraphPictureOptions,
  taken: Box[],
): PictureName[] => {
  const { near, radiusOf, selected } = scene
  const width = options.width ?? 1200
  const names: PictureName[] = []
  const candidates = nodes
    .filter(namedOf(scene, options))
    .sort(
      (one, other) =>
        (other.id === selected ? 1 : 0) - (one.id === selected ? 1 : 0) ||
        radiusOf(other) - radiusOf(one),
    )
  for (const node of candidates) {
    const text = node.label || node.id
    const strong = node.id === selected || near.has(node.id)
    const size = strong ? LABEL : LABEL - 1
    const { x, y } = at(node)
    const radius = radiusOf(node)
    const wide = widthOf(text, size)
    const line = y + size / 3
    const boxAt = (from: number): Box => ({
      bottom: line + 4,
      left: from - 2,
      right: from + wide + 2,
      top: line - size,
    })
    const after = x + radius + 4
    const fits = (from: number): boolean => {
      const box = boxAt(from)
      return box.left >= 0 && box.right <= width && clearOf(box, taken)
    }
    const before = x - radius - 4 - wide
    const start = fits(after) || !fits(before) ? after : before
    const box = boxAt(start)
    if (!clearOf(box, taken) && node.id !== selected) {
      continue
    }
    taken.push(box)
    names.push({
      ink: { base: strong ? 'foreground' : 'foreground-muted' },
      size,
      strong,
      text,
      x: start,
      y: line,
    })
  }
  return names
}

/**
 * **Each group's name over the middle of its notes**, as the overlay names
 * it: in the group's color made quiet, and only where the group is spread
 * wide enough for the name to say which notes it means and a line is clear
 * of the names.
 */
const regionsOf = (
  nodes: readonly PictureNode[],
  scene: Scene,
  at: At,
  taken: Box[],
): PictureRegion[] => {
  const { groups, notes, own, selected } = scene
  const regions: PictureRegion[] = []
  const ownGroup = selected === undefined ? undefined : notes.get(selected)?.group
  for (const group of groups) {
    const members = nodes.filter((node) => node.group === group)
    const points = members.map(at)
    const middle = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    }
    const spread =
      points.reduce((sum, point) => sum + Math.hypot(point.x - middle.x, point.y - middle.y), 0) /
      points.length
    if (points.length < 2 || spread < 12) {
      continue
    }
    const half = (widthOf(group, 11) * 1.14) / 2 + 4
    const boxAt = (y: number): Box => ({
      bottom: y + 9,
      left: middle.x - half,
      right: middle.x + half,
      top: y - 9,
    })
    const y = [0, 18, -18].map((step) => middle.y + step).find((one) => clearOf(boxAt(one), taken))
    if (y === undefined) {
      continue
    }
    taken.push(boxAt(y))
    const tinted = members.find((node) => node.tone === undefined) ?? members[0]
    regions.push({
      fade: selected !== undefined && ownGroup !== group ? 0.3 : 0.92,
      ink: mixed(tinted ? own(tinted) : { base: 'foreground-muted' }, 'foreground', 60),
      text: group,
      x: middle.x,
      y,
    })
  }
  return regions
}

/**
 * **A graph's picture, where Sigma.js draws it**: fitted to the box as Sigma
 * fits a graph, each note its size and its group's or tone's color, each
 * link tinted by the note it leaves, and the names placed after their notes
 * and left out where one would cover another.
 *
 * **Whole or absent.** Nothing where there are no notes or any note has no
 * `x` and `y`.
 */
export const graphPicture = (
  nodes: readonly PictureNode[],
  links: readonly PictureLink[],
  options: GraphPictureOptions = {},
): GraphPicture | undefined => {
  if (
    nodes.length === 0 ||
    nodes.some((node) => !(Number.isFinite(node.x) && Number.isFinite(node.y)))
  ) {
    return undefined
  }
  const scene = sceneOf(nodes, links, options)
  const at = placesOf(nodes, options)
  const taken: Box[] = []
  const names = namesOf(nodes, scene, at, options, taken)
  const regions = options.groupLabels === false ? [] : regionsOf(nodes, scene, at, taken)
  return {
    height: options.height ?? 480,
    lines: linesOf(scene, at),
    marks: marksOf(nodes, scene, at, options),
    names,
    regions,
    width: options.width ?? 1200,
  }
}
