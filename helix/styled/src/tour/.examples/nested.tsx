import './nested.css'

import { useState } from 'react'

export function Example() {
  /* Preview frame, and the point of this example.

     The tour owns the order and the light. What it deliberately does not know
     is that stop two is inside a menu and stop three is inside a drawer, which
     is the consumer's own state and stays theirs: `helix-before-activate` says
     where the reader now is, and this decides what has to be open for that to
     make sense.

     Written as "what should be open at index N" rather than as a list of things
     to do on the way. A tour can be walked backwards, so anything phrased as a
     transition has to be written twice and one of the two is always the one
     nobody tested.

     `modal` is set to `false` because a modal drawer is the one thing a tour
     cannot work around: `showModal()` makes everything outside the dialog's own
     subtree inert, so a panel anywhere else cannot be pressed at all. A tour
     points *into* things, so anything it points into has to stay reachable. As
     a prop rather than an attribute, since `modal` is a boolean attribute
     defaulting to true and `modal="false"` in markup still reads as true. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  /* Leaving puts the page back the way it was found, which falls out of
     deriving rather than needing handlers of its own: closed means no index is
     current, so neither panel is. */
  const arranged = open ? index : -1

  return (
    <>
      <div className="bar">
        <helix-menu id="actions" label="Actions" open={arranged === 1}>
          <helix-button id="actions-trigger" slot="trigger">
            Actions
          </helix-button>
          <helix-menu-item value="duplicate">Duplicate</helix-menu-item>
          <helix-menu-item id="export" value="export">
            Export
          </helix-menu-item>
          <helix-menu-item value="delete">Delete</helix-menu-item>
        </helix-menu>

        <helix-button command="--show" commandfor="settings" emphasis="outlined">
          Settings
        </helix-button>
      </div>

      <helix-drawer
        id="settings"
        label="Settings"
        modal={false}
        open={arranged === 2}
        placement="end"
      >
        <helix-flex direction="column" gap="md">
          <helix-switch id="autosave">Autosave</helix-switch>
          <helix-switch>Send me a weekly digest</helix-switch>
        </helix-flex>
      </helix-drawer>

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
        label="Where things are"
        onhelix-before-activate={(event) => setIndex(Number(event.detail.value))}
        onhelix-before-close={() => setOpen(false)}
        onhelix-complete={() => setOpen(false)}
        open={open}
      >
        <helix-tour-stop for="actions-trigger" placement="bottom-start">
          <helix-card separation="plain">
            <helix-text as="h3">Everything you can do to a file</helix-text>
            <helix-text tone="muted">Behind one control, so the bar stays short.</helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop for="export" placement="right">
          <helix-card separation="plain">
            <helix-text as="h3">Export lives in here</helix-text>
            <helix-text tone="muted">
              The tour opened the menu to show you. It closes again on the way out.
            </helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop for="autosave" placement="left">
          <helix-card separation="plain">
            <helix-text as="h3">And this is on by default</helix-text>
            <helix-text tone="muted">
              Inside a drawer the tour opened, over a page it did not have to know about.
            </helix-text>
          </helix-card>
        </helix-tour-stop>
      </helix-tour>
    </>
  )
}
