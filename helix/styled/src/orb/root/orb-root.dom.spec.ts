import { beforeAll, describe, expect, test } from 'bun:test'
import {
  at,
  hasLayout,
  hasState,
  label,
  mount,
  readyToMove,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'
import { readColor } from '../color.js'
import {
  blendParams,
  blendStaged,
  evenSphere,
  meshFor,
  ORB_PARAMS,
  orbPoint,
  paramsFor,
  project,
  stateDistance,
} from '../shapes.js'

/* Registered before the module is evaluated, and the import is dynamic for
   exactly that reason: `@customElement` runs at evaluation, and a static import
   would run it before `registerDom` has installed a `customElements` to
   register against. The element then never upgrades and every assertion about
   its shadow root reads `undefined`. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Upgraded = HTMLElement & {
  internals?: ElementInternals
  state: string
  updateComplete: Promise<boolean>
}

describe('orb', () => {
  test('renders a canvas and keeps the name on the host', async () => {
    const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    /* The canvas has nothing of its own to announce; the host carries the role
       and the name through `ElementInternals`, so a consumer walking the light
       DOM finds them. */
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
  })

  /* Browser only: happy-dom never runs the frame the state is recorded from. */
  if (hasLayout()) {
    test('settles like every other element, so a transition on it can run', async () => {
      const host = (await mount('<helix-orb></helix-orb>')) as Upgraded
      await readyToMove(host)
      expect(hasState(host, 'settled')).toBe(true)
    })
  }

  test('survives a machine that refuses a 2D context', async () => {
    /* happy-dom returns null from `getContext`, which is exactly what a reader
       on a refused context gets. The element must render and stay connected:
       the canvas simply never paints. */
    const host = (await mount('<helix-orb state="working"></helix-orb>')) as Upgraded
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('canvas')).toBeDefined()
    expect(host.isConnected).toBe(true)
  })

  test('names itself from the state, through internals rather than an attribute', async () => {
    const host = (await mount('<helix-orb state="fetching"></helix-orb>')) as Upgraded
    await host.updateComplete
    expect(role(host)).toBe('progressbar')
    expect(label(host)).toBe('Fetching')
    expect(host.internals?.ariaBusy).toBe('true')
    /* Said through `ElementInternals`, so a consumer's server markup never had
       an attribute here to reconcile. */
    expect(host.getAttribute('role')).toBeNull()
    expect(host.getAttribute('aria-label')).toBeNull()
  })

  test('stops calling itself a progress bar once it is done', async () => {
    const host = (await mount('<helix-orb state="fetching"></helix-orb>')) as Upgraded
    await host.updateComplete
    host.state = 'done'
    await host.updateComplete
    /* A finished orb still announcing itself as a progress bar leaves a screen
       reader waiting for a bar that never fills. */
    expect(role(host)).toBe('img')
    expect(label(host)).toBe('Done')
    expect(host.internals?.ariaBusy).toBe('false')
  })

  test('a label the caller wrote wins over the state word', async () => {
    const host = (await mount(
      '<helix-orb state="working" label="Running tests"></helix-orb>',
    )) as Upgraded
    await host.updateComplete
    expect(label(host)).toBe('Running tests')
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

describe('reading a color the engine resolved but did not convert', () => {
  /* Registered only where there is a real 2D context, rather than skipped:
     happy-dom refuses one and the browser runner has no `test.if`. The reader
     answers gray without a context by design, which the element spec covers. */
  const painting =
    typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d')

  if (painting) {
    test('converts lab, which is what these tokens compute to', () => {
      expect(readColor('lab(100 0 0)')).toEqual([255, 255, 255])
      expect(readColor('lab(0 0 0)')).toEqual([0, 0, 0])
    })

    test('leaves rgb alone', () => {
      expect(readColor('rgb(12, 34, 56)')).toEqual([12, 34, 56])
    })

    test('answers gray for a value no engine will parse', () => {
      expect(readColor('not-a-color')).toEqual([128, 128, 128])
    })
  }
})
