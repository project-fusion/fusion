import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const segmented = async (attrs = ''): Promise<HTMLElement> =>
  mount(`<helix-headless-meter label="Context" max="1000" ${attrs}>
    <helix-headless-meter-segment label="Messages" value="300"></helix-headless-meter-segment>
    <helix-headless-meter-segment label="Tools" value="200"></helix-headless-meter-segment>
  </helix-headless-meter>`)

const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

describe('meter segment', () => {
  test('the meter reads the sum of its segments', async () => {
    const host = await segmented()
    await settle(host)
    expect(internals(host).ariaValueNow).toBe('500')
  })

  test('the meter’s own value is ignored while it has segments', async () => {
    // Otherwise the bar and the reading could disagree, with nothing to say which is right.
    const host = await segmented('value="900"')
    await settle(host)
    expect(internals(host).ariaValueNow).toBe('500')
  })

  test('the segments are the fill, so the meter draws none of its own over them', async () => {
    const host = await segmented()
    await settle(host)
    expect(part(host, 'indicator')).toBeNull()
  })

  test('a meter without segments still draws its fill from its value', async () => {
    const host = await mount(
      '<helix-headless-meter label="Context" max="100" value="40"></helix-headless-meter>',
    )
    await settle(host)
    expect(part(host, 'indicator')).not.toBeNull()
  })

  test('a segment that changes is read again', async () => {
    const host = await segmented()
    await settle(host)
    const first = host.querySelector('helix-headless-meter-segment') as HTMLElement & {
      value: number
    }
    first.value = 600
    await settle(host)
    expect(internals(host).ariaValueNow).toBe('800')
  })

  test('a segment taken out leaves a smaller sum', async () => {
    const host = await segmented()
    await settle(host)
    host.querySelector('helix-headless-meter-segment')?.remove()
    await settle(host)
    expect(internals(host).ariaValueNow).toBe('200')
  })

  test('a value below zero or not a number adds nothing', async () => {
    const host = await mount(`<helix-headless-meter label="Context" max="100">
      <helix-headless-meter-segment value="-5"></helix-headless-meter-segment>
      <helix-headless-meter-segment value="abc"></helix-headless-meter-segment>
      <helix-headless-meter-segment value="40"></helix-headless-meter-segment>
    </helix-headless-meter>`)
    await settle(host)
    expect(internals(host).ariaValueNow).toBe('40')
  })

  test('a segment publishes its amount for the stylesheet to size it by', async () => {
    const host = await segmented()
    await settle(host)
    const segment = host.querySelector('helix-headless-meter-segment') as HTMLElement
    await settle(segment)
    expect(part(segment, 'fill')?.getAttribute('style')).toContain('--meter-segment-value: 300')
  })

  test('the track publishes the span a segment divides by', async () => {
    const host = await segmented()
    await settle(host)
    expect(part(host, 'track')?.getAttribute('style')).toContain('--meter-span: 1000')
  })

  test('the label names the slice for a pointer', async () => {
    const host = await segmented()
    const segment = host.querySelector('helix-headless-meter-segment') as HTMLElement
    await settle(segment)
    expect(part(segment, 'fill')?.getAttribute('title')).toBe('Messages')
  })
})
