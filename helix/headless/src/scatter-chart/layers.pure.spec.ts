import { describe, expect, test } from 'bun:test'
import { layersOf } from './layers.js'

const at = (x: number, y: number, width = 10): { width: number; x: number; y: number } => ({
  width,
  x,
  y,
})

/* A series' points were one path, which draws its own overlaps once: two
   points that met did not darken there, and neither kept its edge. */
describe('layersOf', () => {
  test('points apart share one layer', () => {
    expect(layersOf([at(0, 0), at(20, 0), at(0, 20)], 4)).toEqual([[0, 1, 2]])
  })

  test('two points that overlap stand in two layers', () => {
    expect(layersOf([at(0, 0), at(5, 0), at(30, 0)], 4)).toEqual([[0, 2], [1]])
  })

  test('a point takes the first layer it overlaps nothing in', () => {
    /* 1 overlaps 0, and 2 overlaps 1 and not 0. */
    expect(layersOf([at(0, 0), at(8, 0), at(16, 0)], 4)).toEqual([[0, 2], [1]])
  })

  test('a wider point reaches farther, by half of each ring', () => {
    expect(layersOf([at(0, 0, 10), at(20, 0, 10)], 4)).toHaveLength(1)
    expect(layersOf([at(0, 0, 10), at(20, 0, 40)], 4)).toHaveLength(2)
  })

  test('past the last layer, the rest share it, less those in a pixel already drawn', () => {
    const piled = [at(0, 0), at(1, 0), at(2, 0), at(2.2, 0), at(3, 0)]
    expect(layersOf(piled, 3)).toEqual([[0], [1], [2, 4]])
    /* Ten pixels of the screen to one of the plot, so 2 and 2.2 are apart. */
    expect(layersOf(piled, 3, 10)).toEqual([[0], [1], [2, 3, 4]])
  })

  test('one layer holds every point, less those in a pixel already drawn', () => {
    expect(layersOf([at(0, 0), at(0.2, 0), at(5, 0)], 1)).toEqual([[0, 2]])
  })

  test('no points, no layers', () => {
    expect(layersOf([], 4)).toEqual([])
  })
})
