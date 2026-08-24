import type { PageCopy } from './copy'

/**
 * The three Helix tools, as data.
 *
 * **A tool has no prose, and that is what its document is for.** These pages
 * are a component with the whole viewport: there is nothing on them to extract.
 * What they do have is a contract, and an agent that knows it can send a person
 * straight at a live example or a derived palette rather than at a home page.
 * `12-ai-native-web.md` names exactly this as the sandbox's `.md`.
 *
 * So these are written rather than extracted, which makes them the one copy
 * module here that is not also rendered by its page. That is a real asymmetry
 * and worth stating: it is a second source, and the thing keeping it honest is
 * that it describes a URL contract rather than repeating words on a screen. If
 * one of these pages grows prose, the prose belongs here and the page should
 * read it.
 */

export const SANDBOX: PageCopy = {
  blocks: [
    {
      body: [
        'The editor is a source pane beside a live preview. Edit the markup and the preview redraws; edit the stylesheet beside it and the preview restyles.',
        'The preview runs in a sandboxed frame with an opaque origin, so markup typed into it cannot read the surrounding page. See the Sandbox page in the Helix documentation for how that is put together.',
      ],
      title: 'What it is',
    },
    {
      body: [
        '`/helix/sandbox?family=<slug>` opens the sandbox on a component family. The slug is the one in `/helix/components/<slug>`, and every family in the manifest has one.',
        'A link to a family in the sandbox is the fastest way to put a working example in front of somebody, because it arrives editable rather than as a picture of itself.',
      ],
      title: 'The URL contract',
    },
  ],
  lede: 'An editable source pane beside a live preview, for any component in the library.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Sandbox',
}

export const THEME_BUILDER: PageCopy = {
  blocks: [
    {
      body: [
        'Give it the intent inputs that `derive()` takes, a brand color first, and it runs the real derivation rather than an approximation of it. What comes back is the complete token set and the library rendered in it, light and dark at once.',
      ],
      title: 'What it is',
    },
    {
      body: [
        'Every pairing the engine solved, with its measured ratio against the ground it is actually painted on. Met, unverifiable where the ground is translucent and there is no known color to measure against, or pinned where you supplied the color outright and the engine did not solve for it.',
        'A theme with a column of unverifiable is a theme making a trade, and it should be possible to see that you made it.',
      ],
      title: 'The contrast column is the part to read',
    },
    {
      body: [
        'Keep the intent object, not the token block. The tokens are the output of a solver and the solver improves; a theme stored as its inputs picks up a better derivation, and a theme stored as 176 literal values is frozen at the version that produced it.',
      ],
      title: 'What to take away',
    },
  ],
  lede: 'Describe a brand. Get a palette every pair of which has been measured.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Theme builder',
}

export const AURA: PageCopy = {
  blocks: [
    {
      body: [
        'Nine backgrounds drawn from the token layer, with the pointer response and every parameter live. The component is `helix-aura` and its API tables are at `/helix/components/aura`; this is the other half, which is the thing running at full size with the controls in reach.',
        'It draws in WebGL. Where WebGL is refused it draws nothing and the page is the type it always was, which is the behavior to expect rather than a fallback to configure.',
      ],
      title: 'What it is',
    },
  ],
  lede: 'Nine backgrounds drawn from the token layer, with every parameter live.',
  source: 'written for this document; the page is a tool and has no prose',
  title: 'Aura',
}
