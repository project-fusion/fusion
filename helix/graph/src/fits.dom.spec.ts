import { expect, test } from 'bun:test'
import type Graph from 'graphology'
import type FA2Layout from 'graphology-layout-forceatlas2/worker'
import type Sigma from 'sigma'
import { sigmaDriver } from './sigma/index.js'

/* The driver types the renderer it takes by what it calls on it, so this
   package imports no renderer. This function is what holds that shape to the
   real one: if Sigma or graphology renames what the driver calls, the
   typecheck fails here rather than at a page. */
const fits = {
  sigma: (sigma: Sigma, make: (graph: Graph) => FA2Layout) =>
    sigmaDriver(sigma, { layout: (graph) => make(graph as unknown as Graph) }),
}

test('the real renderer fits the driver', () => {
  expect(Object.keys(fits)).toEqual(['sigma'])
})
