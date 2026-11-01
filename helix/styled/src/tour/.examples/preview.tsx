import { useState } from 'react'

export function Example() {
  /* Preview frame: the button opens the tour at its first stop. A real page
     would also remember that the tour was taken. Each stop names its target
     by the target's `id`, which a phone registers too. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-card
        separation="outlined"
        style={{
          '--card-color': 'var(--helix-color-foreground)',
          '--card-padding': '0',
          '--card-shadow': 'none',
        }}
      >
        <helix-flex
          align-items="stretch"
          layout="flank"
          style={{ '--flex-flank-min': '17.8rem', '--flex-flank-size': '11rem' }}
        >
          <helix-card
            id="rail"
            separation="filled"
            style={{
              '--card-background-color': 'var(--helix-color-surface-sunken)',
              '--card-border-width': '0',
              '--card-padding': 'var(--helix-space-md)',
              '--card-radius': '0',
            }}
          >
            <helix-flex
              direction="column"
              gap="xs"
            >
              <helix-text
                emphasis="muted"
                scale="label"
              >
                Project
              </helix-text>
              <helix-text>Drafts</helix-text>
              <helix-text>Published</helix-text>
              <helix-text>Archive</helix-text>
            </helix-flex>
          </helix-card>

          <helix-divider
            decorative
            id="rule-beside-rail"
            orientation="vertical"
          ></helix-divider>

          <helix-flex direction="column">
            <helix-divider
              decorative
              id="rule-under-rail"
            ></helix-divider>

            <helix-card
              separation="plain"
              style={{
                '--card-border-width': '0',
                '--card-padding': 'var(--helix-space-sm) var(--helix-space-md)',
              }}
            >
              <helix-flex
                align-items="center"
                gap="sm"
                wrap
              >
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
              </helix-flex>
            </helix-card>

            <helix-divider decorative></helix-divider>

            <helix-card
              id="sheet"
              separation="plain"
              style={{
                '--card-border-width': '0',
                '--card-padding': 'var(--helix-space-lg) var(--helix-space-md)',
              }}
            >
              <helix-text as="h2">Quarterly review</helix-text>
              <helix-text emphasis="muted">
                A draft of the third quarter report. Add a summary and the results for each team
                before you publish.
              </helix-text>
            </helix-card>
          </helix-flex>
        </helix-flex>
      </helix-card>

      <helix-flex>
        <helix-button
          onClick={() => {
            setIndex(0)
            setOpen(true)
          }}
        >
          Take the tour
        </helix-button>
      </helix-flex>

      <helix-tour
        index={index}
        label="Getting started"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        onhelix-complete={() => setOpen(false)}
        open={open}
      >
        <helix-tour-stop
          for="rail"
          placement="right-start"
        >
          <helix-card separation="plain">
            <helix-text
              as="h3"
              slot="header"
            >
              Find your documents
            </helix-text>
            <helix-text emphasis="muted">
              Drafts, published documents, and archived documents are listed here.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop for="sheet">
          <helix-card separation="plain">
            <helix-text
              as="h3"
              slot="header"
            >
              Write your document
            </helix-text>
            <helix-text emphasis="muted">
              Your changes are saved as you type. You can close the page at any time.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="preview"
          placement="bottom"
        >
          <helix-card separation="plain">
            <helix-text
              as="h3"
              slot="header"
            >
              Preview your document
            </helix-text>
            <helix-text emphasis="muted">
              See the document as it looks to people with the link.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="publish"
          placement="bottom-start"
        >
          <helix-card separation="plain">
            <helix-text
              as="h3"
              slot="header"
            >
              Publish when you are ready
            </helix-text>
            <helix-text emphasis="muted">
              You can unpublish at any time. The archive keeps every earlier version.
            </helix-text>
          </helix-card>
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
