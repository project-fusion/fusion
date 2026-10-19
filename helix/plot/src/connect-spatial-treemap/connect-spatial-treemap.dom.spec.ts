import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors, PointerKind } from '../connect-plot/connect-plot.js'
import type { SpatialTreemapDriver, TreemapField } from './connect-spatial-treemap.js'

let connectSpatialTreemap: typeof import('./connect-spatial-treemap.js').connectSpatialTreemap

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-treemap')
  ;({ connectSpatialTreemap } = await import('./connect-spatial-treemap.js'))
})

/* The connection between a treemap and a driver that records what it was
 * told. The three.js driver needs WebGL, which no DOM spec has; what is held
 * here is what the treemap's connection decides: a series color for each
 * group, the blocks' parts of the floor, and a press in the drawing. */

interface Chart extends HTMLElement {
  active: number
  updateComplete: Promise<unknown>
}

const recording = () => {
  const told: {
    colors?: PlotColors
    drawn: TreemapField[]
    press?: ((index: number, kind: PointerKind) => void) | undefined
  } = { drawn: [] }
  const driver: SpatialTreemapDriver = {
    draw: (field, colors) => {
      told.drawn.push(field)
      told.colors = colors
    },
    focus: () => {},
    onPress: (press) => {
      told.press = press
      return () => {
        told.press = undefined
      }
    },
    turnBy: () => {},
  }
  return { driver, told }
}

const chart = async () => {
  const host = (await mount(
    `<div style="--helix-color-border: rgb(1, 2, 3); --helix-color-surface-sunken: rgb(4, 5, 6); --helix-color-foreground: rgb(7, 8, 9); --helix-color-foreground-muted: rgb(10, 11, 12); --chart-series-1: rgb(200, 0, 0); --chart-series-2: rgb(0, 200, 0)">
      <table id="signups" data-hidden-visually>
        <caption>Signups</caption>
        <thead><tr><th>Service</th><th>Team</th><th>Requests</th><th>Errors</th></tr></thead>
        <tbody>
          <tr><th scope="row">Search</th><td>Platform</td><td>40</td><td>2</td></tr>
          <tr><th scope="row">Billing</th><td>Payments</td><td>25</td><td>9</td></tr>
          <tr><th scope="row">Auth</th><td>Platform</td><td>20</td><td>1</td></tr>
        </tbody>
      </table>
      <helix-headless-spatial-treemap for="signups" group-by="Team"><div></div></helix-headless-spatial-treemap>
    </div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-treemap') as Chart
  await element.updateComplete
  return element
}

const settle = async (element: Chart) => {
  await element.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  await element.updateComplete
}

describe('connectSpatialTreemap', () => {
  test('draws the blocks in the driver, a series color for each group, and hides the chart’s own drawing', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialTreemap(element, driver)
    await settle(element)
    const field = told.drawn.at(-1)
    expect(field?.blocks.map((block) => [block.label, block.size, block.height])).toEqual([
      ['Search', 40, 2],
      ['Billing', 25, 9],
      ['Auth', 20, 1],
    ])
    for (const block of field?.blocks ?? []) {
      expect(block.area.x1).toBeGreaterThan(block.area.x0)
      expect(block.area.z1).toBeGreaterThan(block.area.z0)
    }
    expect(told.colors?.groups).toEqual(['rgb(200, 0, 0)', 'rgb(0, 200, 0)'])
    expect(hasState(element, 'drawn')).toBe(true)
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('a press in the drawing puts the reading on that block', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialTreemap(element, driver)
    await settle(element)
    told.press?.(2, 'mouse')
    await settle(element)
    expect(element.active).toBe(2)
  })
})
