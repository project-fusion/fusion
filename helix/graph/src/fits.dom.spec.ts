import { expect, test } from 'bun:test'
import type { Graph as Cosmos } from '@cosmos.gl/graph'
import type Graph from 'graphology'
import type FA2Layout from 'graphology-layout-forceatlas2/worker'
import type Sigma from 'sigma'

/** The drivers, by type only: loading them here would load WebGL programs, which happy-dom cannot. */
type Drivers = typeof import('./cosmos/index.js') & typeof import('./sigma/index.js')

/* The driver types the renderer it takes by what it calls on it, so this
   package imports no renderer. This function is what holds that shape to the
   real one: if Sigma or graphology renames what the driver calls, the
   typecheck fails here rather than at a page. */
const fits = (drivers: Drivers) => ({
  cosmos: (graph: Cosmos, box: HTMLDivElement) => drivers.cosmosDriver(graph, box),
  sigma: (sigma: Sigma, make: (graph: Graph) => FA2Layout) =>
    drivers.sigmaDriver(sigma, { layout: make }),
})

test('the real renderer fits the driver', () => {
  expect(typeof fits).toBe('function')
})
