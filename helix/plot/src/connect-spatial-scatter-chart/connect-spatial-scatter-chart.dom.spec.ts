import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors } from '../connect-plot/connect-plot.js'
import type { Field, SpatialScatterChartDriver } from './connect-spatial-scatter-chart.js'

let connectSpatialScatterChart: typeof import('./connect-spatial-scatter-chart.js').connectSpatialScatterChart

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-scatter-chart')
  ;({ connectSpatialScatterChart } = await import('./connect-spatial-scatter-chart.js'))
})

/* The connection between a chart and a driver that records what it was
 * told. The three.js driver needs WebGL, which no DOM spec has; what is held
 * here is everything the connection decides. */

interface Chart extends HTMLElement {
  active: number
  requestActive(index: number): void
  updateComplete: Promise<unknown>
}

/** A driver that records what it was asked. */
const recording = () => {
  const told: {
    colors?: PlotColors
    drawn: Field[]
    focus: number[]
    press?: ((index: number, kind: 'mouse' | 'pen' | 'touch') => void) | undefined
    stopped: boolean
    turns: Array<[number, number, boolean]>
  } = { drawn: [], focus: [], stopped: false, turns: [] }
  const driver: SpatialScatterChartDriver = {
    draw: (field, colors) => {
      told.drawn.push(field)
      told.colors = colors
    },
    focus: (index) => told.focus.push(index),
    onPress: (press) => {
      told.press = press
      return () => {
        told.press = undefined
      }
    },
    stop: () => {
      told.stopped = true
    },
    turnBy: (across, up, animate) => told.turns.push([across, up, animate]),
  }
  return { driver, told }
}

const chart = async () => {
  const host = (await mount(
    `<div style="--helix-color-border: rgb(1, 2, 3); --helix-color-surface-sunken: rgb(4, 5, 6); --helix-color-foreground: rgb(7, 8, 9); --helix-color-foreground-muted: rgb(10, 11, 12); --chart-series-1: rgb(200, 0, 0); --chart-series-2: rgb(0, 200, 0)">
      <table id="people" data-hidden-visually>
        <caption>People</caption>
        <thead><tr><th>Name</th><th>Team</th><th>Age</th><th>Tenure</th><th>Score</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ada</th><td>Core</td><td>36</td><td>4</td><td>81</td></tr>
          <tr><th scope="row">Grace</th><td>Tools</td><td>52</td><td>11</td><td>93</td></tr>
        </tbody>
      </table>
      <helix-headless-spatial-scatter-chart for="people" group-by="Team"><div></div></helix-headless-spatial-scatter-chart>
    </div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-scatter-chart') as Chart
  await element.updateComplete
  return element
}

const settle = async (element: Chart) => {
  await element.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  await element.updateComplete
}

describe('connectSpatialScatterChart', () => {
  test('draws the chart’s points in the driver, colored by the series, and hides the flat scatter', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialScatterChart(element, driver)
    await settle(element)
    expect(told.drawn.at(-1)?.points.map((point) => point.label)).toEqual(['Ada', 'Grace'])
    expect(told.colors?.groups).toEqual(['rgb(200, 0, 0)', 'rgb(0, 200, 0)'])
    expect(told.colors?.ink).toBe('rgb(7, 8, 9)')
    expect(hasState(element, 'drawn')).toBe(true)
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('marks the point the keys rest on, and a press in the drawing puts the reading there', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialScatterChart(element, driver)
    await settle(element)
    told.press?.(1, 'mouse')
    await settle(element)
    expect(element.active).toBe(1)
    expect(told.focus.at(-1)).toBe(1)
    told.press?.(-1, 'mouse')
    await settle(element)
    expect(told.focus.at(-1)).toBe(-1)
  })

  test('Shift with an arrow on the chart turns the view a step', async () => {
    const element = await chart()
    const { driver, told } = recording()
    connectSpatialScatterChart(element, driver)
    await settle(element)
    part(element, 'plot')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'ArrowRight',
        shiftKey: true,
      }),
    )
    expect(told.turns.map(([across, up]) => [across, up])).toEqual([[1, 0]])
  })

  test('disconnecting frees the driver and shows the flat scatter again', async () => {
    const element = await chart()
    const { driver, told } = recording()
    const connection = connectSpatialScatterChart(element, driver)
    await settle(element)
    connection.disconnect()
    await settle(element)
    expect(told.stopped).toBe(true)
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(false)
  })
})
