import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors } from '../connect-plot/connect-plot.js'
import type { SpatialSurfaceChartDriver, SurfaceField } from './connect-spatial-surface-chart.js'

let connectSpatialSurfaceChart: typeof import('./connect-spatial-surface-chart.js').connectSpatialSurfaceChart

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-surface-chart')
  ;({ connectSpatialSurfaceChart } = await import('./connect-spatial-surface-chart.js'))
})

/* The connection between a surface and a driver that records what it was
 * told. The three.js driver needs WebGL, which no DOM spec has; what is held
 * here is what the surface's connection decides beyond the scatter's: the
 * ramp it is shaded along. */

interface Chart extends HTMLElement {
  active: number
  updateComplete: Promise<unknown>
}

const recording = () => {
  const told: { colors?: PlotColors; drawn: SurfaceField[]; focus: number[] } = {
    drawn: [],
    focus: [],
  }
  const driver: SpatialSurfaceChartDriver = {
    draw: (field, colors) => {
      told.drawn.push(field)
      told.colors = colors
    },
    focus: (index) => told.focus.push(index),
    turnBy: () => {},
  }
  return { driver, told }
}

const chart = async (ramp = '') => {
  const host = (await mount(
    `<div style="--helix-color-border: rgb(1, 2, 3); --helix-color-surface-sunken: rgb(4, 5, 6); --helix-color-foreground: rgb(7, 8, 9); --helix-color-foreground-muted: rgb(10, 11, 12); --helix-color-primary-active: rgb(0, 0, 200); ${ramp}">
      <table id="load" data-hidden-visually>
        <caption>Load</caption>
        <thead><tr><th>Slot</th><th>Hour</th><th>Day</th><th>Load</th></tr></thead>
        <tbody>
          <tr><th scope="row">Mon 0h</th><td>0</td><td>1</td><td>10</td></tr>
          <tr><th scope="row">Mon 1h</th><td>1</td><td>1</td><td>30</td></tr>
          <tr><th scope="row">Tue 0h</th><td>0</td><td>2</td><td>20</td></tr>
        </tbody>
      </table>
      <helix-headless-spatial-surface-chart for="load"><div></div></helix-headless-spatial-surface-chart>
    </div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-surface-chart') as Chart
  await element.updateComplete
  return element
}

const settle = async (element: Chart) => {
  await element.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  await element.updateComplete
}

describe('connectSpatialSurfaceChart', () => {
  test('draws the grid in the driver and hides the flat grid', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialSurfaceChart(element, driver)
    await settle(element)
    expect(told.drawn.at(-1)?.cells.map((cell) => cell.value)).toEqual([10, 20, 30, undefined])
    expect(hasState(element, 'drawn')).toBe(true)
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('shades along the theme’s primary color where the page sets no ramp', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialSurfaceChart(element, driver)
    await settle(element)
    expect(told.colors?.ramp.high).toBe('rgb(0, 0, 200)')
  })

  test('shades along the ramp the page sets', async () => {
    const element = await chart(
      '--spatial-surface-chart-low: rgb(250, 250, 0); --spatial-surface-chart-high: rgb(200, 0, 0)',
    )
    const { driver, told } = recording()
    connectSpatialSurfaceChart(element, driver)
    await settle(element)
    expect(told.colors?.ramp).toEqual({ high: 'rgb(200, 0, 0)', low: 'rgb(250, 250, 0)' })
  })

  test('marks the place the keys rest on', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialSurfaceChart(element, driver)
    await settle(element)
    ;(element as unknown as { requestActive(index: number): void }).requestActive(2)
    await settle(element)
    expect(told.focus.at(-1)).toBe(2)
  })
})
