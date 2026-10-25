import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/** Video Playlist on the words registry: the list's name and the menu's. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../../video/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const playlist = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-video-playlist default-active="one">
    <helix-headless-video label="Player" slot="player">
      <helix-headless-video-playlist-menu slot="controls"></helix-headless-video-playlist-menu>
    </helix-headless-video>
    <helix-headless-video-playlist-item src="/one.mp4" value="one">One</helix-headless-video-playlist-item>
  </helix-headless-video-playlist></div>`
  const host = document.querySelector('helix-headless-video-playlist') as Updatable
  await settle(host)
  await settle(host.querySelector('helix-headless-video-playlist-menu') as Updatable)
  return host
}

const menu = (host: Updatable): Updatable =>
  host.querySelector('helix-headless-video-playlist-menu') as Updatable

const GERMAN = {
  'helix-video-playlist': { fallbackLabel: 'Wiedergabeliste' },
  'helix-video-playlist-menu': { fallbackLabel: 'Folgen' },
}

describe('a video playlist on a page in another language', () => {
  test('names its list and its menu with the words registered for the nearest `lang`', async () => {
    registerWords('de', GERMAN)
    const host = await playlist('lang="de"')
    expect(part(host, 'items')?.getAttribute('aria-label')).toBe('Wiedergabeliste')
    expect(part(menu(host), 'trigger')?.getAttribute('aria-label')).toBe('Folgen')
  })

  test('names them in English where nothing is registered', async () => {
    const host = await playlist('lang="de"')
    expect(part(host, 'items')?.getAttribute('aria-label')).toBe('Playlist')
    expect(part(menu(host), 'trigger')?.getAttribute('aria-label')).toBe('Episodes')
  })
})
