import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const meter = async (attrs = ''): Promise<HTMLElement> =>
  mount(`<helix-meter label="Disk" ${attrs}></helix-meter>`)

const band = (host: HTMLElement): string | null =>
  part(host, 'indicator')?.getAttribute('data-band') ?? null

const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

describe('meter', () => {
  test('announces itself as a meter, not as a progress bar', async () => {
    // A progress bar promises it is going somewhere. A meter is a level.
    const host = await meter('value="42"')
    expect(role(host)).toBe('meter')
  })

  test('carries its range and its reading', async () => {
    const host = await meter('max="32" value="18"')
    expect(internals(host).ariaValueMin).toBe('0')
    expect(internals(host).ariaValueMax).toBe('32')
    expect(internals(host).ariaValueNow).toBe('18')
  })

  test('the range is a hundred, not the platform’s one', async () => {
    /* A component that reads `value="72"` as seventy-two times its maximum is a
       trap that costs nothing to avoid, and `Progress` already takes 100. */
    const host = await meter('value="72"')
    expect(internals(host).ariaValueMax).toBe('100')
  })

  test('a reading outside the range is pulled into it', async () => {
    const over = await meter('value="140"')
    expect(internals(over).ariaValueNow).toBe('100')
    const under = await meter('min="10" value="4"')
    expect(internals(under).ariaValueNow).toBe('10')
  })

  test('words replace the number where they were given', async () => {
    // A percentage is a fair summary of a task and a poor one of a quantity.
    const host = await meter('max="32" show-value value="18" value-text="18 GB of 32 GB"')
    expect(part(host, 'value')?.textContent?.trim()).toBe('18 GB of 32 GB')
    expect(internals(host).ariaValueText).toBe('18 GB of 32 GB')
  })

  test('and a percentage stands in where they were not', async () => {
    const host = await meter('show-value value="42"')
    expect(part(host, 'value')?.textContent?.trim()).toBe('42%')
    expect(internals(host).ariaValueText).toBeNull()
  })
})

describe('meter bands', () => {
  test('nothing is banded until a threshold is declared', async () => {
    /* The platform defaults `optimum` to the midpoint and both thresholds to the
       ends, so a bare `<meter value="20" max="100">` computes as optimum and
       every browser paints it green. A gauge with nothing said about it is a
       reading, not good news. */
    const host = await meter('value="20"')
    expect(band(host)).toBeNull()
    expect(part(host, 'tick')).toBeNull()
  })

  test('low is good where optimum sits at the bottom', async () => {
    const host = await meter('high="80" low="50" optimum="0" value="34"')
    expect(band(host)).toBe('good')
  })

  test('the middle is fair, one band from the good one', async () => {
    const host = await meter('high="80" low="50" optimum="0" value="66"')
    expect(band(host)).toBe('fair')
  })

  test('and the far band is poor, two away', async () => {
    const host = await meter('high="80" low="50" optimum="0" value="94"')
    expect(band(host)).toBe('poor')
  })

  test('the whole thing inverts when the good end does', async () => {
    // A battery wants to be full where disk usage wants to be empty.
    const battery = await meter('high="80" low="20" optimum="100" value="12"')
    expect(band(battery)).toBe('poor')
    const full = await meter('high="80" low="20" optimum="100" value="94"')
    expect(band(full)).toBe('good')
  })

  test('optimum defaults to the middle of the bands', async () => {
    const host = await meter('high="80" low="50" value="66"')
    expect(band(host)).toBe('good')
  })

  test('a low above a high is raised rather than giving up', async () => {
    // Out of order describes no bands at all, and the spec's answer is to move
    // the one that is wrong rather than to stop banding.
    const host = await meter('high="20" low="80" value="90"')
    expect(band(host)).not.toBeNull()
  })

  test('a tick marks each threshold, so the bands read without colour', async () => {
    const host = await meter('high="80" low="50" value="34"')
    const ticks = [...(host.shadowRoot?.querySelectorAll('[part="tick"]') ?? [])]
    expect(ticks).toHaveLength(2)
    expect((ticks[0] as HTMLElement).style.getPropertyValue('--_meter-at')).toBe('50%')
    expect((ticks[1] as HTMLElement).style.getPropertyValue('--_meter-at')).toBe('80%')
  })

  test('one threshold is enough to band it', async () => {
    const host = await meter('low="50" optimum="0" value="70"')
    expect(band(host)).not.toBe('good')
  })
})

describe('meter geometry', () => {
  test('the fill is a fraction of the range, not of the maximum', async () => {
    const host = await meter('max="60" min="20" value="40"')
    expect(part(host, 'indicator')?.getAttribute('style')).toContain('0.5')
  })

  test('a range with no width does not divide by zero', async () => {
    const host = await meter('max="0" min="0" value="0"')
    expect(part(host, 'indicator')?.getAttribute('style')).toContain('--_meter-fraction: 0')
  })
})
