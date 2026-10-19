import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors, PointerKind } from '../connect-plot/connect-plot.js'
import type { BarField, SpatialBarChartDriver } from './connect-spatial-bar-chart.js'

let connectSpatialBarChart: typeof import('./connect-spatial-bar-chart.js').connectSpatialBarChart

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-bar-chart')
  ;({ connectSpatialBarChart } = await import('./connect-spatial-bar-chart.js'))
})

/* The connection between a bar chart and a driver that records what it was
 * told. The three.js driver needs WebGL, which no DOM spec has; what is held
 * here is what the bar chart's connection decides: a series color for each
 * series, the box's proportions, and a press in the drawing. */

interface Chart extends HTMLElement {
  active: number
  updateComplete: Promise<unknown>
}

const recording = () => {
  const told: {
    colors?: PlotColors
    drawn: BarField[]
    press?: ((index: number, kind: PointerKind) => void) | undefined
  } = { drawn: [] }
  const driver: SpatialBarChartDriver = {
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
        <thead><tr><th>Region</th><th>Q1</th><th>Q2</th></tr></thead>
        <tbody>
          <tr><th scope="row">North</th><td>420</td><td>465</td></tr>
          <tr><th scope="row">South</th><td>310</td><td>355</td></tr>
        </tbody>
      </table>
      <helix-headless-spatial-bar-chart for="signups"><div></div></helix-headless-spatial-bar-chart>
    </div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-bar-chart') as Chart
  await element.updateComplete
  return element
}

const settle = async (element: Chart) => {
  await element.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  await element.updateComplete
}

describe('connectSpatialBarChart', () => {
  test('draws the bars in the driver, a series color for each series, and hides the chart’s own drawing', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialBarChart(element, driver)
    await settle(element)
    const field = told.drawn.at(-1)
    expect(field?.cells.map((cell) => cell.value)).toEqual([420, 465, 310, 355])
    expect(field?.axes.extent).toEqual([1, 0.6, 1])
    expect(told.colors?.groups).toEqual(['rgb(200, 0, 0)', 'rgb(0, 200, 0)'])
    expect(hasState(element, 'drawn')).toBe(true)
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('a press in the drawing puts the reading on that bar', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialBarChart(element, driver)
    await settle(element)
    told.press?.(3, 'mouse')
    await settle(element)
    expect(element.active).toBe(3)
  })
})
