import { describe, expect, test } from 'bun:test'
import { pointsFrom } from './points.js'

describe('pointsFrom', () => {
  test('GeoJSON points are places, latitude first, named by the key asked and reported by their id', () => {
    const found = pointsFrom(
      {
        features: [
          {
            geometry: { coordinates: [-97.74, 30.27], type: 'Point' },
            id: 7,
            properties: { title: 'Cafe' },
            type: 'Feature',
          },
          {
            geometry: { coordinates: [-97.75, 30.26], type: 'Point' },
            properties: { title: 'Bar' },
            type: 'Feature',
          },
          {
            geometry: {
              coordinates: [
                [0, 0],
                [1, 1],
              ],
              type: 'LineString',
            },
            properties: {},
            type: 'Feature',
          },
          { geometry: { coordinates: ['a', 1], type: 'Point' }, properties: {}, type: 'Feature' },
          { geometry: null, properties: {}, type: 'Feature' },
          {
            geometry: {
              coordinates: [
                [1, 2],
                [3, 4],
              ],
              type: 'MultiPoint',
            },
            properties: {},
            type: 'Feature',
          },
        ],
        type: 'FeatureCollection',
      },
      'title',
    )
    expect(found.points).toEqual([
      { lat: 30.27, lng: -97.74 },
      { lat: 30.26, lng: -97.75 },
      { lat: 2, lng: 1 },
      { lat: 4, lng: 3 },
    ])
    expect(found.names).toEqual(['Cafe', 'Bar', '', ''])
    // Its id, else its name, else where it is in the list.
    expect(found.values).toEqual(['7', 'Bar', '2', '3'])
  })

  test('a list of places is taken as it is, and what is neither is nothing', () => {
    expect(
      pointsFrom([
        { id: 'a', label: 'Depot', lat: 1, lng: 2 },
        { lat: 'x', lng: 1 },
      ]),
    ).toEqual({
      names: ['Depot'],
      points: [{ lat: 1, lng: 2 }],
      values: ['a'],
    })
    expect(pointsFrom(undefined).points).toEqual([])
    expect(pointsFrom({ type: 'Feature' }).points).toEqual([])
  })
})
