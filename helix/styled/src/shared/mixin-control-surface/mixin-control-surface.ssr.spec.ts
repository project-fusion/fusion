import { describe, expect, test } from 'bun:test'
import { hostTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html, type TemplateResult } from 'lit'
import '../../button/index.js'
import '../../copy-button/index.js'
import '../../icon-button/index.js'

/* The pair three button families share, asked of all three at once.
 *
 * **One spec rather than three, because sharing is the claim.** These two are a
 * mixin instead of three declarations for one reason, that the three drift the
 * first time one of them gains a value, and three copies of this file would
 * drift the same way and each go on passing. A table makes a difference between
 * them something somebody has to write down here.
 *
 * **What is asserted is the reflection, and only that.** The rules live in the
 * base layer beside the `data-button` recipe, so one declaration serves this
 * control and a consumer's own anchor; they are document CSS and reach no
 * shadow root, so there is nothing in the served sheet to read against them.
 * What the component owes is the attribute those rules select on, and it owes
 * it from the *property*, which is what a script and every React consumer set.
 * Written in markup instead, the assertion passes whether or not anything
 * reflects, which is the half of this rule that had drifted on four families at
 * once with each property still reading back what was set. */
const SURFACES: [string, TemplateResult, TemplateResult][] = [
  [
    'helix-button',
    html`<helix-button .emphasis=${'ghost'} .tone=${'danger'}>Go</helix-button>`,
    html`<helix-button>Go</helix-button>`,
  ],
  [
    'helix-copy-button',
    html`<helix-copy-button .emphasis=${'ghost'} .tone=${'danger'}></helix-copy-button>`,
    html`<helix-copy-button></helix-copy-button>`,
  ],
  [
    'helix-icon-button',
    html`<helix-icon-button .emphasis=${'ghost'} .tone=${'danger'} label="Go"></helix-icon-button>`,
    html`<helix-icon-button label="Go"></helix-icon-button>`,
  ],
]

describe('the shared control surface', () => {
  for (const [tag, asked, bare] of SURFACES) {
    test(`${tag} reflects emphasis and tone from the property`, () => {
      const served = hostTag(ssr(asked), tag)
      expect(served).toContain('emphasis="ghost"')
      expect(served).toContain('tone="danger"')
    })

    test(`${tag} carries neither where nobody asked`, () => {
      /* Undefaulted, which is the other half of reflecting: a default writes
         its attribute onto every control anybody renders, and the resting
         treatment is the attribute's absence, which each control names for
         itself. */
      const served = hostTag(ssr(bare), tag)
      expect(served).not.toContain('emphasis=')
      expect(served).not.toContain('tone=')
    })
  }
})
