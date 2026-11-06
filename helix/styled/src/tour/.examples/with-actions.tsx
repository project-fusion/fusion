import { useState } from 'react'

const STOPS = 3

export function Example() {
  /* Controls in the `actions` slot replace the ones the stop draws, so they
     move the tour themselves, through its `index` and `open`. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const count = `${index + 1} of ${STOPS}`
  const back = () => setIndex(Math.max(0, index - 1))
  const next = () => (index < STOPS - 1 ? setIndex(index + 1) : setOpen(false))

  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-flex
        align-items="center"
        gap="sm"
      >
        <helix-button
          emphasis="solid"
          id="compose"
          tone="primary"
        >
          Compose
        </helix-button>
        <helix-button
          emphasis="outlined"
          id="filter"
        >
          Filter
        </helix-button>
        <helix-icon-button
          id="refresh"
          label="Refresh"
        >
          <helix-icon name="arrow-clockwise"></helix-icon>
        </helix-icon-button>
      </helix-flex>

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
        label="Inbox tour"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        open={open}
      >
        <helix-tour-stop
          for="compose"
          placement="bottom-start"
        >
          <helix-text as="h3">Write a message</helix-text>
          <helix-text emphasis="muted">Start a new email.</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            {count}
          </helix-text>
          <helix-button
            emphasis="solid"
            onClick={next}
            slot="actions"
            tone="primary"
          >
            Next
          </helix-button>
        </helix-tour-stop>

        <helix-tour-stop
          for="filter"
          placement="bottom"
        >
          <helix-text as="h3">Filter your inbox</helix-text>
          <helix-text emphasis="muted">Show only unread, flagged, or starred messages.</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            {count}
          </helix-text>
          <helix-button
            emphasis="ghost"
            onClick={back}
            slot="actions"
          >
            Back
          </helix-button>
          <helix-button
            emphasis="solid"
            onClick={next}
            slot="actions"
            tone="primary"
          >
            Next
          </helix-button>
        </helix-tour-stop>

        <helix-tour-stop
          for="refresh"
          placement="bottom-end"
        >
          <helix-text as="h3">Refresh your inbox</helix-text>
          <helix-text emphasis="muted">Check for new messages.</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            {count}
          </helix-text>
          <helix-button
            emphasis="ghost"
            onClick={back}
            slot="actions"
          >
            Back
          </helix-button>
          <helix-button
            emphasis="solid"
            onClick={next}
            slot="actions"
            tone="primary"
          >
            Got it
          </helix-button>
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
