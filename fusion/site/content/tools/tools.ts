import type { PageCopy } from '@/content/copy/copy'

/**
 * The three Helix tools, as data.
 *
 * **A tool has no prose, and that is what its document is for.** These pages
 * are a component with the whole viewport: there is nothing on them to extract.
 * What they do have is a contract, and an agent that knows it can send a person
 * straight at a live example or a derived palette rather than at a home page.
 * The sandbox's `.md` is exactly this.
 *
 * So these are written rather than extracted, which makes them the one copy
 * module here that is not also rendered by its page. It is a second source, kept
 * honest by describing a URL contract rather than repeating words on a screen.
 * If one of these pages grows prose, the prose belongs here and the page should
 * read it.
 */

export const SANDBOX: PageCopy = {
  blocks: [
    {
      body: [
        'The sandbox shows the source of an example beside a live preview. When you edit the markup or the stylesheet, the preview updates.',
        'The preview runs in a sandboxed frame with an opaque origin, so the markup you type cannot read the rest of the page. The Sandbox page in the Helix documentation explains how it works.',
      ],
      title: 'What it is',
    },
    {
      body: [
        '`/helix/sandbox?e=<family>` opens the sandbox on a component, and `/helix/sandbox?e=<family>.<example>` opens one of its examples. The family is the slug in `/helix/components/<family>`.',
        'Send a sandbox link to share a working example that the other person can edit.',
      ],
      title: 'Link to a component',
    },
  ],
  lede: 'Edit the source of any Helix component example and see the result beside it.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Sandbox',
}

export const THEME_BUILDER: PageCopy = {
  blocks: [
    {
      body: [
        'Enter the inputs that `derive()` takes, starting with a brand color. The theme builder runs the same `derive()` your build does and shows the complete token set, with the components drawn in it in light and dark.',
      ],
      title: 'What it is',
    },
    {
      body: [
        'The contrast column lists every text and background pair, with its contrast ratio measured against the background it is drawn on. Each pair has one of three results:',
        '- **Met**: the pair meets its contrast target.\n- **Unverifiable**: the background is translucent, so there is no single color to measure against.\n- **Pinned**: you set the color yourself, so Helix did not compute it.',
        'Check the unverifiable pairs before you use the theme.',
      ],
      title: 'Read the contrast column',
    },
    {
      body: [
        'Save the intent object with your code. Helix computes the tokens from it, so when Helix improves how it computes them, your theme gets the improvement. A copy of the 176 token values stays as it was on the day you copied it.',
      ],
      title: 'Save the inputs',
    },
  ],
  lede: 'Enter your brand color and get a full palette, with the contrast of every pair measured.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Theme builder',
}

export const AURA: PageCopy = {
  blocks: [
    {
      body: [
        'Aura has nine animated backgrounds colored by your tokens. The page shows each one at full size, with controls for every parameter and the response to the pointer. The component is `helix-aura`, and its reference is at `/helix/components/aura`.',
        'Aura draws with WebGL. In a browser without WebGL, it draws nothing and the page shows its content on the plain background.',
      ],
      title: 'What it is',
    },
  ],
  lede: 'Nine animated backgrounds colored by your tokens, with controls for every parameter.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Aura',
}
