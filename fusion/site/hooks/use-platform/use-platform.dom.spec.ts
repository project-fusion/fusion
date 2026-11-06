import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { applyPlatform, type Platform, readPlatform } from '../../utils/platform/platform'

/* React's DOM half and the hook are imported once the DOM is registered, so
   React finds a document as it loads. */
let createRoot: typeof import('react-dom/client').createRoot
let usePlatform: () => Platform

beforeAll(async () => {
  registerDom()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  ;({ createRoot } = await import('react-dom/client'))
  ;({ usePlatform } = await import('./use-platform'))
})

/** Every value the probe rendered, in order. */
let seen: Platform[] = []
let mounted: Root | undefined

function Probe() {
  seen.push(usePlatform())
  return null
}

const mount = async (): Promise<void> => {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => {
    mounted?.render(createElement(Probe))
  })
}

/** Sets the attribute as the drawer does, and lets the observer answer. */
const choose = async (platform: Platform): Promise<void> => {
  await act(async () => {
    applyPlatform(document.documentElement, platform)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

afterEach(async () => {
  await act(async () => {
    mounted?.unmount()
  })
  mounted = undefined
  seen = []
  delete document.documentElement.dataset.platform
  document.body.replaceChildren()
})

describe('the platform preference', () => {
  test('is the web where the document names none', async () => {
    await mount()
    expect(seen.at(-1)).toBe('web')
  })

  test('is native where the pre-paint script wrote it', async () => {
    document.documentElement.dataset.platform = 'native'
    await mount()
    expect(seen.at(-1)).toBe('native')
  })

  test('renders the web first, as the server does, so hydration matches', async () => {
    document.documentElement.dataset.platform = 'native'
    await mount()
    expect(seen[0]).toBe('web')
  })

  test('follows the drawer both ways', async () => {
    await mount()
    await choose('native')
    expect(seen.at(-1)).toBe('native')
    await choose('web')
    expect(seen.at(-1)).toBe('web')
  })

  test('reads any other value as the web', async () => {
    document.documentElement.dataset.platform = 'phone'
    await mount()
    expect(seen.at(-1)).toBe('web')
  })

  test('stops following once unmounted', async () => {
    await mount()
    await act(async () => {
      mounted?.unmount()
    })
    mounted = undefined
    const rendered = seen.length
    await choose('native')
    expect(seen.length).toBe(rendered)
  })
})

describe('the platform on the document', () => {
  test('is written for native and removed for the web', () => {
    const root = document.documentElement
    applyPlatform(root, 'native')
    expect(root.getAttribute('data-platform')).toBe('native')
    expect(readPlatform(root)).toBe('native')
    applyPlatform(root, 'web')
    expect(root.hasAttribute('data-platform')).toBe(false)
    expect(readPlatform(root)).toBe('web')
  })
})
