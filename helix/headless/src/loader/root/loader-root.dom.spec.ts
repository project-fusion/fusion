import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('spinner', () => {
  test('announces itself as outstanding work, without an attribute', async () => {
    // Through internals, so the host carries nothing a consumer's server markup
    // would not have.
    const spinner = await mount('<helix-headless-loader label="Fetching"></helix-headless-loader>')
    expect(role(spinner)).toBe('progressbar')
    expect(spinner.hasAttribute('role')).toBe(false)
    expect(spinner.hasAttribute('aria-label')).toBe(false)
  })

  test('draws a track behind the moving arc', async () => {
    // One circle turning reads as a shape adrift; the track is what makes it a
    // proportion of something.
    const spinner = await mount('<helix-headless-loader></helix-headless-loader>')
    expect(part(spinner, 'track')).not.toBeNull()
    expect(part(spinner, 'indicator')).not.toBeNull()
  })
})
