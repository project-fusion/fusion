import './preview.css'

import { useState } from 'react'

export function Example() {
  /* Preview frame: a real page would remember it had been taken. Opening is the
     page's business, the way a dialog's is. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="app">
        <aside
          className="rail"
          id="rail"
        >
          <helix-text
            tone="subtle"
            variant="label"
          >
            Project
          </helix-text>
          <helix-text>Drafts</helix-text>
          <helix-text>Published</helix-text>
          <helix-text>Archive</helix-text>
        </aside>

        <div className="main">
          <header className="bar">
            <helix-button
              emphasis="solid"
              id="publish"
              tone="primary"
            >
              Publish
            </helix-button>
            <helix-button
              emphasis="outlined"
              id="preview"
            >
              Preview
            </helix-button>
            <helix-icon-button
              id="settings"
              label="Settings"
            >
              <helix-icon name="gear"></helix-icon>
            </helix-icon-button>
          </header>

          <section
            className="sheet"
            id="sheet"
          >
            <helix-text as="h2">Quarterly review</helix-text>
            <helix-text tone="muted">
              A draft nobody has read yet. Everything below this line is the part you are still
              writing.
            </helix-text>
          </section>
        </div>
      </div>

      <helix-button
        onClick={() => {
          setIndex(0)
          setOpen(true)
        }}
      >
        Take the tour
      </helix-button>

      <helix-tour
        index={index}
        label="Getting started"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        open={open}
      >
        <helix-tour-stop
          for="rail"
          placement="right-start"
        >
          <helix-card separation="plain">
            <helix-text as="h3">Everything lives here</helix-text>
            <helix-text tone="muted">
              Drafts, published work and the archive. Nothing is ever deleted.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop for="sheet">
          <helix-card separation="plain">
            <helix-text as="h3">Write in the open</helix-text>
            <helix-text tone="muted">
              Saved as you type. There is no save button because there is nothing to press.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="preview"
          placement="bottom"
        >
          <helix-card separation="plain">
            <helix-text as="h3">See it as a reader would</helix-text>
            <helix-text tone="muted">Opens the same page anybody with the link gets.</helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="publish"
          placement="bottom-start"
        >
          <helix-card separation="plain">
            <helix-text as="h3">And when it is ready</helix-text>
            <helix-text tone="muted">
              Publishing is reversible. The archive keeps every version you ever had.
            </helix-text>
          </helix-card>
        </helix-tour-stop>
      </helix-tour>
    </>
  )
}
