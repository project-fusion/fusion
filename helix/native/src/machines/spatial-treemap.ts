/**
 * Spatial Treemap's drawing on a phone: each row a block on its share of the
 * floor, as tall as its height where the table gives one, its faces painted
 * in the order core's `blockOrder` lays the blocks, the ring straight after
 * the block the reading rests on, so the blocks in front cover it, and its
 * outline again, faint, over every block. The web element draws the same
 * blocks from the same core in its own SVG.
 *
 * **Each face's color is worked out here**, as Spatial Bar Chart's are: the
 * group's series color darkened by how far the face turns from the light,
 * and its edge a step lighter where it is dark and darker where it is light.
 */

import {
  blockOrder,
  blocksDrawn,
  boundsOf,
  boxView,
  type DrawnBlock,
  type PagePoint,
  type TreemapField,
  treemapOf,
} from '@fusion.dev/helix-core/spatial'
import { plottedOf } from './axis-chart'
import { faceInk, within } from './spatial-bar'
import type { SpatialKind, SpatialPicture } from './spatial-chart'

/** How many series colors the theme has, after which they come round again. */
const SERIES = 24

/** The chart's table as blocks, and what it draws. */
interface Blocks {
  /** The numeric columns, which Up and Down walk among, as the web's keys do. */
  readonly columns: readonly number[]
  readonly emphasis: string
  readonly field: TreemapField
  readonly noBox: boolean
}

/** The picture a phone draws, kept beside the box's picture so the marks read the blocks. */
interface BlocksPicture extends SpatialPicture {
  /** The blocks in the order they are painted, back to front. */
  readonly painted: readonly DrawnBlock[]
}

/** The spatial treemap, as the shared spatial chart draws it. */
export const spatialTreemap: SpatialKind<Blocks> = {
  among: (model) => model.columns,
  count: (model) => model.field.blocks.length,
  /* A point on a block is that block, front first. */
  hit: (_model, picture, at) => {
    const painted = (picture as BlocksPicture).painted
    for (let place = painted.length - 1; place >= 0; place -= 1) {
      const block = painted[place]
      if (block !== undefined && within(block.corners, at)) {
        return block.index
      }
    }
    return -1
  },
  marks: (model, picture, at, { colorOf, theme }) => {
    const painted = (picture as BlocksPicture).painted
    const active = painted.find((block) => block.index === at)
    const faces = painted.flatMap((block) => {
      const group = model.field.blocks[block.index]?.groupIndex ?? 0
      const color = colorOf(group % SERIES)
      const drawn = block.drawn.faces.map((face, side) => {
        const ink = faceInk(color, face.darken, { emphasis: model.emphasis, lit: false, theme })
        return {
          color,
          d: face.d,
          edge: ink.edge,
          face: ink.face,
          key: `${block.index} ${side}`,
          line: '',
        }
      })
      const ring =
        block === active
          ? [
              {
                color: '',
                d: '',
                edge: '',
                face: '',
                key: `${block.index} ring`,
                line: block.drawn.outline,
              },
            ]
          : []
      return [...drawn, ...ring]
    })
    return {
      lists: { faces },
      states: { ring: active?.drawn.outline ?? '' },
    }
  },
  model: (rows, options) => {
    const columns = plottedOf(rows)
    return {
      columns,
      emphasis: String(options.emphasis ?? ''),
      field: treemapOf(rows, columns, String(options.groupBy ?? '')),
      noBox: options.noBox === true,
    }
  },
  options: (read) => ({
    emphasis: String(read('emphasis') ?? ''),
    groupBy: String(read('group-by') ?? ''),
    noBox: read('no-box') === true,
  }),
  picture: (model, camera, words, lang) => {
    const view = boxView(model.field.axes, camera, [], model.noBox, words, lang)
    const blocks = blocksDrawn(model.field, view.projection)
    const places: PagePoint[] = []
    for (const block of blocks) {
      places[block.index] = { x: block.drawn.peak.x, y: block.drawn.peak.y }
    }
    return {
      fits: model.noBox
        ? boundsOf(
            blocks.flatMap((block) => block.corners),
            0.1,
          )
        : view.bounds,
      middle: view.on([0, 0, 0]),
      painted: blockOrder(view.projection, blocks),
      places,
      view,
    }
  },
  rowOf: (model, at) => model.field.blocks[at]?.row ?? -1,
}
