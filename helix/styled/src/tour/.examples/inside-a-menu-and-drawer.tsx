import { useState } from 'react'

export function Example() {
  /* Stop two is inside the menu and stop three is inside the drawer. Both open
     from the current index, so they stay correct when the tour goes backward.

     A modal drawer makes the rest of the page inert, so the tour could not
     reach it. `modal={false}` is set as a property, because `modal` is a
     boolean attribute that defaults to true and reads as true with any value. */
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(false)

  /* When the tour closes, no index is current, so the menu and the drawer
     close too. */
  const arranged = open ? index : -1

  return (
    <helix-flex
      direction="column"
      gap="xl"
    >
      <helix-flex
        align-items="center"
        gap="sm"
      >
        <helix-menu
          label="Actions"
          open={arranged === 1}
        >
          <helix-button
            id="actions-trigger"
            slot="trigger"
          >
            Actions
          </helix-button>
          <helix-menu-item value="duplicate">Duplicate</helix-menu-item>
          <helix-menu-item
            id="export"
            value="export"
          >
            Export
          </helix-menu-item>
          <helix-menu-item value="delete">Delete</helix-menu-item>
        </helix-menu>

        <helix-button
          emphasis="outlined"
          onClick={() => setSettings(true)}
        >
          Settings
        </helix-button>
      </helix-flex>

      <helix-drawer
        label="Settings"
        modal={false}
        onClose={() => setSettings(false)}
        open={settings || arranged === 2}
        placement="end"
      >
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-switch id="autosave">Autosave</helix-switch>
          <helix-switch>Send me a weekly digest</helix-switch>
        </helix-flex>
      </helix-drawer>

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
          for="actions-trigger"
          placement="bottom-start"
        >
          <helix-card separation="plain">
            <helix-text as="h3">File actions</helix-text>
            <helix-text emphasis="muted">Duplicate, export, or delete the file.</helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="export"
          placement="right"
        >
          <helix-card separation="plain">
            <helix-text as="h3">Export a file</helix-text>
            <helix-text emphasis="muted">Download the file as a PDF or a spreadsheet.</helix-text>
          </helix-card>
        </helix-tour-stop>

        <helix-tour-stop
          for="autosave"
          placement="left"
        >
          <helix-card separation="plain">
            <helix-text as="h3">Autosave is on</helix-text>
            <helix-text emphasis="muted">Your changes are saved as you work.</helix-text>
          </helix-card>
        </helix-tour-stop>
      </helix-tour>
    </helix-flex>
  )
}
