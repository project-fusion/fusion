import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const pier = html`<helix-base-image alt="A pier" src="/pier.jpg"></helix-base-image>`

describe('image server output', () => {
  test('ships the picture, so the browser can start fetching it', () => {
    expect(partTag(ssr(pier), 'image')).toContain('src="/pier.jpg"')
    expect(partTag(ssr(pier), 'image')).toContain('alt="A pier"')
  })

  test('and ships the stand-in showing, because it has not arrived yet', () => {
    /* The server cannot know. Saying "loading" is the only honest answer it
       has, and it is the one that reserves the ground. */
    /* Matched on `hidden` as its own attribute: `aria-hidden` is on both of
       these and contains the word, so a substring check passed on the tag that
       was showing. */
    expect(partTag(ssr(pier), 'placeholder')).not.toMatch(/\shidden[\s=>]/)
    expect(partTag(ssr(pier), 'fallback')).toMatch(/\shidden[\s=>]/)
  })

  test('a decorative picture ships an empty alt rather than none', () => {
    const mark = html`<helix-base-image alt="" src="/rule.svg"></helix-base-image>`
    expect(partTag(ssr(mark), 'image')).toContain('alt=""')
  })

  test('nothing waits on the client to know the shape of it', () => {
    expect(hasPart(ssr(pier), 'placeholder')).toBe(true)
    expect(withoutStyles(ssr(pier))).toContain('loading="lazy"')
  })
})
