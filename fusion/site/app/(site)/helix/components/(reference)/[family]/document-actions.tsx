'use client'

import type { HelixMenu } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import { absolute } from '@/utils/site/site'

/*
 * The ellipsis beside a component's title, wired.
 *
 * **Everything in here is about the document rather than about the component**,
 * which is why it is an overflow menu and why View Source keeps its own button
 * beside it: one of these is a thing a reader wants, and five are a thing a
 * reader occasionally wants.
 *
 * **Four of the five are links and one needs script**, so this is a client
 * component that owns the whole menu rather than one item of it. A menu item
 * given an `href` renders a real `<a>`, so middle click and open-in-new-tab
 * work on four of them without any of this code running, and the component
 * still server-renders: the markup is in the HTML before hydration either way.
 *
 * Copy is the exception and cannot be a link. It listens for `helix-select`,
 * which bubbles and is composed, so one listener on the menu answers whichever
 * row was chosen by pointer or by keyboard. A click handler on the row would
 * catch the first and miss the second.
 */

/** How long the trigger says it copied before going back to saying nothing. */
const SETTLE = 2000

export function DocumentActions({
  family,
  headline,
}: {
  /** The family's slug, which is its document's name. */
  family: string
  /** The canonical example's slug, where the family has one. */
  headline?: string
}) {
  const menu = useRef<HelixMenu>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const node = menu.current
    if (!node) {
      return
    }
    const onSelect = (event: Event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value
      if (value !== 'copy-markdown') {
        return
      }
      /* Fetched rather than carried in the page. The document is 8 KB for an
         accordion and every component page would ship its own copy of one to
         serve a menu row almost nobody opens. It is a static file on this
         origin, so the request is a cache hit in every case that matters. */
      void fetch(`/helix/components/${family}.md`)
        .then((response) => response.text())
        .then((markdown) => navigator.clipboard.writeText(markdown))
        .then(() => setCopied(true))
        .catch(() => setCopied(false))
    }
    node.addEventListener('helix-select', onSelect)
    return () => node.removeEventListener('helix-select', onSelect)
  }, [family])

  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = setTimeout(() => setCopied(false), SETTLE)
    return () => clearTimeout(timer)
  }, [copied])

  /* The prompt both agents are handed. It points at the document rather than
     pasting it, because the document is a stable public URL and a pasted copy
     is a snapshot that starts going stale immediately. */
  const document = absolute(`/helix/components/${family}.md`)
  const prompt = `Read ${document} and help me use the Helix ${family} component.`

  return (
    <helix-menu label="Document actions" ref={menu}>
      <helix-icon-button emphasis="outlined" label="More" slot="trigger">
        <helix-icon name="dots-three-vertical"></helix-icon>
      </helix-icon-button>

      {headline && (
        <helix-menu-item href={`/helix/sandbox?e=${family}.${headline}`} value="edit-sandbox">
          Edit in Sandbox
        </helix-menu-item>
      )}

      {/* A new tab, because it is the same page in another form and losing the
          one you were reading to see it is a poor trade. Verified in Chromium
          rather than assumed: `text/markdown` renders as text there instead of
          downloading, which is the open question here. */}
      <helix-menu-item
        href={`/helix/components/${family}.md`}
        rel="noreferrer"
        target="_blank"
        value="view-markdown"
      >
        View Markdown
      </helix-menu-item>

      <helix-menu-item value="copy-markdown">{copied ? 'Copied' : 'Copy Markdown'}</helix-menu-item>

      <helix-menu-item
        href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`}
        rel="noreferrer"
        target="_blank"
        value="open-claude"
      >
        Open in Claude
      </helix-menu-item>

      <helix-menu-item
        href={`cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`}
        value="open-cursor"
      >
        Open in Cursor
      </helix-menu-item>
    </helix-menu>
  )
}
