import './with-actions.css'

import type { HelixTour } from '@fusion.dev/helix/tour'
import { useRef, useState } from 'react'

const STOPS = 3

export function Example() {
  /* Controls in the `actions` slot replace the ones the stop draws, so they call
     `next()` and `back()` themselves. The count uses `index` and `length`. */
  const tour = useRef<HelixTour>(null)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const count = `${index + 1} of ${STOPS}`

  return (
    <>
      <div className="bar">
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
        label="Inbox tour"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        open={open}
        ref={tour}
      >
        <helix-tour-stop
          for="compose"
          placement="bottom-start"
        >
          <helix-text as="h3">Write a message</helix-text>
          <helix-text emphasis="muted">Start a new email.</helix-text>
          <helix-flex
            align-items="center"
            gap="xs"
            slot="actions"
          >
            <helix-text
              className="count"
              emphasis="subtle"
              variant="caption"
            >
              {count}
            </helix-text>
            <helix-button
              emphasis="solid"
              onClick={() => tour.current?.next()}
              tone="primary"
            >
              Next
            </helix-button>
          </helix-flex>
        </helix-tour-stop>

        <helix-tour-stop
          for="filter"
          placement="bottom"
        >
          <helix-text as="h3">Filter your inbox</helix-text>
          <helix-text emphasis="muted">Show only unread, flagged, or starred messages.</helix-text>
          <helix-flex
            align-items="center"
            gap="xs"
            slot="actions"
          >
            <helix-text
              className="count"
              emphasis="subtle"
              variant="caption"
            >
              {count}
            </helix-text>
            <helix-button
              emphasis="ghost"
              onClick={() => tour.current?.back()}
            >
              Back
            </helix-button>
            <helix-button
              emphasis="solid"
              onClick={() => tour.current?.next()}
              tone="primary"
            >
              Next
            </helix-button>
          </helix-flex>
        </helix-tour-stop>

        <helix-tour-stop
          for="refresh"
          placement="bottom-end"
        >
          <helix-text as="h3">Refresh your inbox</helix-text>
          <helix-text emphasis="muted">Check for new messages.</helix-text>
          <helix-flex
            align-items="center"
            gap="xs"
            slot="actions"
          >
            <helix-text
              className="count"
              emphasis="subtle"
              variant="caption"
            >
              {count}
            </helix-text>
            <helix-button
              emphasis="ghost"
              onClick={() => tour.current?.back()}
            >
              Back
            </helix-button>
            <helix-button
              emphasis="solid"
              onClick={() => tour.current?.next()}
              tone="primary"
            >
              Got it
            </helix-button>
          </helix-flex>
        </helix-tour-stop>
      </helix-tour>
    </>
  )
}
