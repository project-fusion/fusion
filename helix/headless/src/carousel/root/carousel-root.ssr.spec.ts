import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const carousel = html`<helix-headless-carousel label="Verticals">
  <div>Design</div>
  <div>Mind</div>
</helix-headless-carousel>`

const fitted = html`<helix-headless-carousel label="Verticals" per-view="auto">
  <div>Design</div>
  <div>Mind</div>
</helix-headless-carousel>`

describe('carousel server output', () => {
  test('the frame is served and no pane is, a server having no slides to count', () => {
    /* This was `toContain('Design')` on the whole render. The slides are the
       host's own light-DOM children read back out of it, so it passed with the
       carousel rendering nothing: `slides` is empty on a server, so neither a
       pane nor a slot to project one is drawn, and what ships is the frame.
       The frame entire rather than the parts somebody named, so a mark drawn
       into a template nobody meant to change fails here. */
    expect(servedParts(ssr(carousel))).toEqual([
      'controls',
      'next',
      'next-mark',
      'previous',
      'previous-mark',
      'track',
    ])
  })

  test('the controls ship with the markup', () => {
    expect(hasPart(ssr(carousel), 'previous')).toBe(true)
    expect(hasPart(ssr(carousel), 'next')).toBe(true)
  })

  test('no rotation control until it is asked for', () => {
    expect(hasPart(ssr(carousel), 'rotation')).toBe(false)
  })

  /* **What a fitted carousel serves is no count at all.** A count is consumer
     API because of first paint: a carousel that asks how wide its container is
     can only ask on the client, so a served `1` would be the width every pane
     was laid out at until a script said otherwise, and an inline one would
     outrank the rule that fits the track anyway. What ships is the frame and
     the sheet, and the browser answers the count with the first layout it
     does. */
  test('a fitted track is served no count to be corrected', () => {
    expect(partTag(ssr(fitted), 'track')).not.toContain('--carousel-per-view')
  })

  test('and a plain one is served the one across it is', () => {
    expect(partTag(ssr(carousel), 'track')).toContain('--carousel-per-view: 1')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(carousel), 'helix-headless-carousel')).toEqual(['label'])
  })
})
