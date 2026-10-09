import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors } from '../connect-plot/connect-plot.js'
import type { RibbonField, SpatialRibbonChartDriver } from './connect-spatial-ribbon-chart.js'

let connectSpatialRibbonChart: typeof import('./connect-spatial-ribbon-chart.js').connectSpatialRibbonChart

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-ribbon-chart')
  ;({ connectSpatialRibbonChart } = await import('./connect-spatial-ribbon-chart.js'))
})

/* The connection between a ribbon chart and a driver that records what it
 * was told: a series color for each series, and the box's proportions. */

describe('connectSpatialRibbonChart', () => {
  test('draws the ribbons in the driver, a series color for each, and hides the chart’s own drawing', async () => {
    const host = (await mount(
      `<div style="--helix-color-border: rgb(1, 2, 3); --helix-color-surface-sunken: rgb(4, 5, 6); --helix-color-foreground: rgb(7, 8, 9); --helix-color-foreground-muted: rgb(10, 11, 12); --chart-series-1: rgb(200, 0, 0); --chart-series-2: rgb(0, 200, 0)">
        <table id="latency" data-hidden-visually>
          <thead><tr><th>Day</th><th>Frankfurt</th><th>Virginia</th></tr></thead>
          <tbody>
            <tr><th scope="row">Mon</th><td>120</td><td>95</td></tr>
            <tr><th scope="row">Tue</th><td>130</td><td>90</td></tr>
          </tbody>
        </table>
        <helix-headless-spatial-ribbon-chart for="latency"><div></div></helix-headless-spatial-ribbon-chart>
      </div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-spatial-ribbon-chart') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await element.updateComplete
    const told: { colors?: PlotColors; drawn: RibbonField[] } = { drawn: [] }
    const driver: SpatialRibbonChartDriver = {
      draw: (field, colors) => {
        told.drawn.push(field)
        told.colors = colors
      },
      focus: () => {},
      turnBy: () => {},
    }
    connectSpatialRibbonChart(element, driver)
    await element.updateComplete
    await new Promise((done) => setTimeout(done, 0))
    expect(told.drawn.at(-1)?.series).toEqual(['Frankfurt', 'Virginia'])
    expect(told.drawn.at(-1)?.axes.extent?.[2]).toBeLessThan(1)
    expect(told.colors?.groups).toEqual(['rgb(200, 0, 0)', 'rgb(0, 200, 0)'])
    expect(hasState(element, 'drawn')).toBe(true)
  })
})
