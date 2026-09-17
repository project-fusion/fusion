import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const pier = html`<helix-headless-image alt="A pier" src="/pier.jpg"></helix-headless-image>`

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
    const mark = html`<helix-headless-image alt="" src="/rule.svg"></helix-headless-image>`
    expect(partTag(ssr(mark), 'image')).toContain('alt=""')
  })

  test('nothing waits on the client to know the shape of it', () => {
    expect(hasPart(ssr(pier), 'placeholder')).toBe(true)
    expect(rendered(ssr(pier), 'helix-headless-image')).toContain('loading="lazy"')
  })

  test('the candidate set and its widths reach the picture', () => {
    /* The preload scanner picks a candidate out of the parsed markup, before
       any script runs, and it picks badly without `sizes`. Forwarded at
       hydration these would arrive after the fetch they exist to steer. */
    const responsive = html`<helix-headless-image
      alt="A pier"
      src="/pier.jpg"
      srcset="/pier-400.jpg 400w, /pier-800.jpg 800w"
      sizes="(min-width: 40em) 50vw, 100vw"
    ></helix-headless-image>`
    expect(partTag(ssr(responsive), 'image')).toContain('srcset="/pier-400.jpg 400w')
    expect(partTag(ssr(responsive), 'image')).toContain('sizes="(min-width: 40em) 50vw, 100vw"')
  })

  test('the fetch policies reach the picture, where the browser reads them', () => {
    /* `crossorigin` decides whether the pixels can be read back at all, and
       `referrerpolicy` decides what a third-party host is told. Both are the
       request's, so they have to be on the `<img>` before the request starts;
       neither is read by this component for anything. */
    const guarded = html`<helix-headless-image
      alt="A pier"
      src="https://cdn.example/pier.jpg"
      crossorigin="use-credentials"
      decoding="sync"
      referrerpolicy="no-referrer"
    ></helix-headless-image>`
    expect(partTag(ssr(guarded), 'image')).toContain('crossorigin="use-credentials"')
    expect(partTag(ssr(guarded), 'image')).toContain('decoding="sync"')
    expect(partTag(ssr(guarded), 'image')).toContain('referrerpolicy="no-referrer"')
  })

  test('a same-origin picture carries no crossorigin, which is not the same as an empty one', () => {
    /* `crossorigin=""` is the CORS-anonymous state, so an absent policy written
       as an empty attribute is a different request from the one the consumer
       asked for. The default is `null` and renders nothing. */
    expect(partTag(ssr(pier), 'image')).not.toContain('crossorigin')
    expect(partTag(ssr(pier), 'image')).not.toContain('referrerpolicy')
  })
})
