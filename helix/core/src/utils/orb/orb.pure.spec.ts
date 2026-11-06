import { describe, expect, test } from 'bun:test'
import { at } from '@fusion.dev/helix-testing/dom'
import {
  blendParams,
  blendStaged,
  evenSphere,
  meshFor,
  ORB_PARAMS,
  OrbClock,
  orbDotColor,
  orbDots,
  orbPoint,
  orbShown,
  paramsFor,
  project,
  STILL_PHASE,
  stateDistance,
} from './orb.js'

describe('an orb clock', () => {
  test('draws a state it does not know as thinking', () => {
    expect(orbShown('compiling')).toBe('thinking')
    expect(orbShown('working')).toBe('working')
    expect(new OrbClock('compiling').state).toBe('thinking')
  })

  test('a change of state departs from the shape drawn and arrives at the new one', () => {
    const clock = new OrbClock('thinking')
    clock.turn('working', 1000)
    /* At the start of the change the cloud is still the sash it was. */
    expect(clock.params(1000)).toEqual(paramsFor('thinking'))
    expect(clock.progress(1000)).toBe(0)
    /* Partway, between the two, and at the end, the ring. */
    const ring = clock.params(1000 + 400).ring
    expect(ring).toBeGreaterThan(0)
    expect(ring).toBeLessThan(1)
    expect(clock.params(1000 + 5000)).toEqual(paramsFor('working'))
    expect(clock.progress(1000 + 5000)).toBe(1)
  })

  test('a change interrupted departs from the blend on the screen', () => {
    const clock = new OrbClock('thinking')
    clock.turn('working', 0)
    const drawn = clock.params(300)
    clock.turn('done', 300)
    expect(clock.params(300)).toEqual(drawn)
  })

  test('the phase runs at the state rate times the speed, and stands under still', () => {
    const clock = new OrbClock('thinking')
    clock.frame(64, 0, 1, 1, false)
    expect(clock.phase).toBeCloseTo(STILL_PHASE + paramsFor('thinking').rate)
    clock.frame(64, 0, 1, 0.5, false)
    expect(clock.phase).toBeCloseTo(STILL_PHASE + paramsFor('thinking').rate * 1.5)
    clock.still()
    clock.frame(64, 0, 0, 1, true)
    expect(clock.phase).toBe(STILL_PHASE)
  })

  test('a speed that is no number or below zero runs at the state tempo', () => {
    const clock = new OrbClock('done')
    clock.frame(64, 0, 1, Number.NaN, false)
    clock.frame(64, 0, 1, -2, false)
    expect(clock.phase).toBeCloseTo(STILL_PHASE + 2 * paramsFor('done').rate)
  })
})

describe('the dots of a frame', () => {
  test('are sorted back to front and stand inside the box', () => {
    const dots = orbDots(64, STILL_PHASE, paramsFor('fetching'))
    expect(dots.length).toBeGreaterThan(100)
    for (let i = 1; i < dots.length; i++) {
      expect((dots[i] as { z: number }).z).toBeGreaterThanOrEqual((dots[i - 1] as { z: number }).z)
    }
    for (const dot of dots) {
      expect(dot.x).toBeGreaterThan(0)
      expect(dot.x).toBeLessThan(64)
      expect(dot.y).toBeGreaterThan(0)
      expect(dot.y).toBeLessThan(64)
    }
  })

  test('a dot is the ink up close and the ground far off', () => {
    const ink = [0, 0, 0, 1] as const
    const ground = [255, 255, 255, 1] as const
    const near = { alpha: 1, radius: 1, shade: 0, x: 0, y: 0, z: 1 }
    const far = { ...near, shade: 1 }
    expect(orbDotColor(near, ink, ground)).toEqual([0, 0, 0, 1])
    expect(orbDotColor(far, ink, ground)).toEqual([255, 255, 255, 1])
  })

  test('a see-through ink keeps its color, and a clear ground fades a dot out', () => {
    const ink = [200, 0, 0, 0.5] as const
    const clear = [0, 0, 0, 0] as const
    const dot = { alpha: 1, radius: 1, shade: 0.5, x: 0, y: 0, z: 0 }
    expect(orbDotColor(dot, ink, clear)).toEqual([200, 0, 0, 0.25])
    expect(orbDotColor({ ...dot, shade: 1 }, ink, clear)).toBeUndefined()
    expect(orbDotColor({ ...dot, alpha: 0.01 }, ink, clear)).toBeUndefined()
  })
})

describe('orb shapes', () => {
  test('an unknown state is drawn as thinking rather than as nothing', () => {
    /* The set of things an agent can be doing grows faster than the list of
       shapes, and a verb with no shape should cost a reader precision, not the
       whole indicator. */
    expect(paramsFor('summarising')).toBe(ORB_PARAMS.thinking)
    expect(paramsFor(undefined)).toBe(ORB_PARAMS.thinking)
  })

  test('every state carries every number, so a blend cannot produce NaN', () => {
    /* One missing key multiplies into the geometry as `undefined` and the whole
       cloud disappears. It cost a render of `fetching` once. */
    const keys = Object.keys(ORB_PARAMS.thinking).sort()
    for (const params of Object.values(ORB_PARAMS)) {
      expect(Object.keys(params).sort()).toEqual(keys)
      for (const value of Object.values(params)) {
        expect(Number.isFinite(value)).toBe(true)
      }
    }
  })

  test('a blend of two states lands between them, key by key', () => {
    const mid = blendParams(ORB_PARAMS.thinking, ORB_PARAMS.fetching, 0.5)
    expect(mid.belt).toBeCloseTo((ORB_PARAMS.thinking.belt + ORB_PARAMS.fetching.belt) / 2, 6)
    expect(mid.orbit).toBeCloseTo(0.5, 6)
  })

  test('the silhouette leads and what it is doing follows', () => {
    /* Structure at half way, character still held back by the trail: a light
       must not be orbiting a shape that is still a sash. */
    const shape = blendStaged(ORB_PARAMS.thinking, ORB_PARAMS.fetching, 0.5, 0)
    expect(shape.belt).toBeCloseTo((ORB_PARAMS.thinking.belt + 1) / 2, 6)
    expect(shape.orbit).toBe(ORB_PARAMS.thinking.orbit)
  })

  test('a near pair is given less time than a far one', () => {
    const near = stateDistance(ORB_PARAMS.waiting, ORB_PARAMS.done)
    const far = stateDistance(ORB_PARAMS.thinking, ORB_PARAMS.working)
    expect(near).toBeLessThan(far)
    expect(near).toBeGreaterThan(0)
    expect(far).toBeLessThanOrEqual(1)
  })

  test('the ring is a hole, not a squashed ball', () => {
    /* Every dot of a torus sits off the unit sphere: the ones through the hole
       are nearer the axis than any point of a sphere can be. A `ring` that
       normalized with the rest would read as a ball again. */
    const even = evenSphere(6, 12)
    let nearest = 1
    for (let band = 0; band < 6; band++) {
      for (let s = 0; s < 12; s++) {
        const [x, , z] = orbPoint(band / 5, s / 12, 0, ORB_PARAMS.working, band * 12 + s, even)
        nearest = Math.min(nearest, Math.hypot(x, z))
      }
    }
    expect(nearest).toBeLessThan(0.4)
  })

  test('the even sphere is ordered by band and then by longitude', () => {
    /* **The bug this guards is invisible in either end state.** The bands are
       sorted by an azimuth measured from the same origin and in the same
       direction as the generator's longitude. Left at `atan2`'s own range the
       two orderings sit half a turn apart, every dot is handed a destination
       across the ball, and the blend into `done` carries the whole cloud
       through its own axis: a near-empty frame halfway through a transition
       that both endpoints render perfectly. */
    const lanes = 6
    const segs = 12
    const even = evenSphere(lanes, segs)
    expect(even).toHaveLength(lanes * segs)
    for (let band = 0; band < lanes; band++) {
      let previous = -1
      for (let s = 0; s < segs; s++) {
        const point = at(even, band * segs + s)
        const azimuth = (Math.atan2(point[2], point[0]) + Math.PI * 2) % (Math.PI * 2)
        expect(azimuth).toBeGreaterThanOrEqual(previous)
        previous = azimuth
      }
    }
  })

  test('bands rise with the lane index, so a blend is a short move', () => {
    const lanes = 6
    const segs = 12
    const even = evenSphere(lanes, segs)
    const height = (band: number): number => at(even, band * segs)[1]
    for (let band = 1; band < lanes; band++) {
      expect(height(band)).toBeGreaterThan(height(band - 1))
    }
  })

  test('every dot of every state sits where the projection can use it', () => {
    /* A point at the origin is one the projection sends somewhere arbitrary,
       and a point outside the ball is one the depth ramp reads wrongly.
       **The shell is an invariant only for the states that are spheres**: the
       ring's inner edge is nearer the axis than any point of a sphere can be,
       which is exactly what gives it a hole. */
    const mesh = meshFor(64)
    const even = evenSphere(mesh.lanes, mesh.segs)
    for (const [name, params] of Object.entries(ORB_PARAMS)) {
      const outer = 1 + params.pulse + 0.001
      for (let i = 0; i < 200; i++) {
        const u = (i % 13) / 12
        const v = (i % 17) / 17
        const [x, y, z] = orbPoint(u, v, 1.4, params, i, even)
        const length = Math.hypot(x, y, z)
        expect(Number.isFinite(length)).toBe(true)
        expect(`${name}:${length > 0.2}`).toBe(`${name}:true`)
        expect(`${name}:${length <= outer}`).toBe(`${name}:true`)
        if (params.ring < 0.001) {
          expect(`${name}:${length > 0.55 * (1 - params.pulse)}`).toBe(`${name}:true`)
        }
      }
    }
  })

  test('a transition never passes through a collapse', () => {
    /* **The failure this catches is the one every still frame hides**: both
       ends render correctly and the middle falls into the axis.
       
       Measured as coverage (how many cells of a grid over the canvas hold at
       least one dot), and not as the cloud's mean radius, which was the first
       attempt and does not work. Dots piling onto a handful of points barely
       move the mean, so that version passed with the fault deliberately put
       back. Coverage halves. */
    const mesh = meshFor(64)
    const even = evenSphere(mesh.lanes, mesh.segs)
    const coverage = (k: number): number => {
      const params =
        k <= 0
          ? ORB_PARAMS.thinking
          : k >= 1
            ? ORB_PARAMS.done
            : blendParams(ORB_PARAMS.thinking, ORB_PARAMS.done, k)
      const cells = new Set<number>()
      let index = 0
      for (let band = 0; band < mesh.lanes; band++) {
        const u = mesh.lanes < 2 ? 0.5 : band / (mesh.lanes - 1)
        for (let s = 0; s < mesh.segs; s++, index++) {
          const [x, y, z] = orbPoint(u, s / mesh.segs, 1.4, params, index, even)
          const [px, py] = project(64, x, y, z)
          cells.add(Math.round(px) * 128 + Math.round(py))
        }
      }
      return cells.size
    }
    const ends = Math.min(coverage(0), coverage(1))
    for (let step = 1; step < 10; step++) {
      /* No frame in the middle may cover much less of the box than the tighter
         of the two ends. A collapse shows up here as a fraction of it. */
      expect(`${step}:${coverage(step / 10) > ends * 0.85}`).toBe(`${step}:true`)
    }
  })

  test('the mesh thins with size but the orb keeps its middle', () => {
    const large = meshFor(64)
    const small = meshFor(20)
    expect(small.lanes).toBeLessThan(large.lanes)
    expect(small.segs).toBeLessThan(large.segs)
    /* Dots get relatively fatter as the orb shrinks, or the mesh disappears
       into the pixel grid. */
    expect(small.radiusScale / 20).toBeGreaterThan(large.radiusScale / 64)
    /* And the tonal range compresses, because depth drawn as a wide gray ramp
       is invisible when the far side of the sphere is three pixels across. */
    expect(small.shadeSpan).toBeLessThan(large.shadeSpan)
    expect(small.aMin).toBeGreaterThan(large.aMin)
  })
})
