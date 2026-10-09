import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { PlotColors } from '../connect-plot/connect-plot.js'
import type { SpatialHeatmapDriver, SpatialHeatmapField } from './connect-spatial-heatmap.js'

let connectSpatialHeatmap: typeof import('./connect-spatial-heatmap.js').connectSpatialHeatmap

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/spatial-heatmap')
  ;({ connectSpatialHeatmap } = await import('./connect-spatial-heatmap.js'))
})

/* The connection between a spatial heatmap and a driver that records what it
 * was told. The three.js driver needs WebGL, which no DOM spec has; what is
 * held here is what the heatmap's connection decides beyond the charts': the
 * tones it reads from the page, and the tile and the slab. */

interface Chart extends HTMLElement {
  updateComplete: Promise<unknown>
}

const recording = () => {
  const told: {
    colors?: PlotColors
    corners?:
      | ((
          at: { end: { x: number; y: number }; start: { x: number; y: number } } | undefined,
        ) => void)
      | undefined
    drawn: SpatialHeatmapField[]
  } = { drawn: [] }
  const driver: SpatialHeatmapDriver = {
    draw: (field, colors) => {
      told.drawn.push(field)
      told.colors = colors
    },
    focus: () => {},
    onCorners: (corners) => {
      told.corners = corners
      return () => {
        told.corners = undefined
      }
    },
    turnBy: () => {},
  }
  return { driver, told }
}

const settle = async (element: Chart) => {
  await element.updateComplete
  await new Promise((done) => setTimeout(done, 0))
  await element.updateComplete
}

describe('connectSpatialHeatmap', () => {
  /* A block in a wide box, so both columns fit: in a browser the heatmap
     measures itself and draws only the newest columns that fit, and with no
     stylesheet it is inline, as wide as its content. */
  test('draws every reading in its tone, read from the page where the chart is', async () => {
    const host = (await mount(
      `<div style="inline-size: 40rem; --helix-color-border: rgb(1, 2, 3); --helix-color-surface-sunken: rgb(4, 5, 6); --helix-color-surface: rgb(250, 250, 250); --helix-color-foreground: rgb(7, 8, 9); --helix-color-foreground-muted: rgb(10, 11, 12); --heatmap-tone-1: rgb(0, 100, 0); --heatmap-tone-2: rgb(0, 200, 0)">
        <table id="commits" data-hidden-visually>
          <tbody>
            <tr><th scope="row">Mon</th><td data-value="1">1</td></tr>
            <tr><th scope="row">Tue</th><td data-value="4">4</td></tr>
            <tr><th scope="row">Wed</th><td data-value="0">0</td></tr>
          </tbody>
        </table>
        <helix-headless-spatial-heatmap for="commits" rows="2" style="display: block" thresholds="1 3" tones="1 2"><div slot="renderer"></div></helix-headless-spatial-heatmap>
      </div>`,
    )) as HTMLElement
    const element = host.querySelector('helix-headless-spatial-heatmap') as Chart
    await element.updateComplete
    const { driver, told } = recording()
    connectSpatialHeatmap(element, driver)
    await settle(element)
    expect(told.drawn.at(-1)?.cells.map((cell) => cell.tone)).toEqual(['1', '2', undefined])
    expect(told.colors?.extra['tone-1']).toBe('rgb(0, 100, 0)')
    expect(told.colors?.extra['tone-2']).toBe('rgb(0, 200, 0)')
    expect(Object.keys(told.colors?.extra ?? {}).sort()).toEqual([
      'base',
      'tile',
      'tone-1',
      'tone-2',
    ])
    expect(hasState(element, 'drawn')).toBe(true)
    /* Where the driver draws the front edge's ends, the labels stand. */
    told.corners?.({ end: { x: 0.7, y: 0.8 }, start: { x: 0.1, y: 0.4 } })
    await settle(element)
    const footer = element.shadowRoot?.querySelector('[part="footer"]')?.getAttribute('style') ?? ''
    expect(footer).toContain('--spatial-heatmap-start-x: 0.1')
    expect(footer).toContain('--spatial-heatmap-end-x: 0.7')
  })
})
