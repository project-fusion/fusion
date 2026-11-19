import type { HelixDrawer } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

export function Example() {
  const [text, setText] = useState('')
  const saved = useRef('')
  const note = useRef<HelixDrawer>(null)

  // An unsaved note keeps the sheet open, however it is asked to close.
  const closing = (event: Event) => {
    if (text !== saved.current) {
      event.preventDefault()
    }
  }

  const save = () => {
    saved.current = text
    note.current?.close()
  }

  return (
    <>
      <helix-button
        command="--show"
        commandfor="note"
        emphasis="solid"
        tone="primary"
      >
        Write a note
      </helix-button>

      <helix-drawer
        id="note"
        label="Note"
        onhelix-before-close={closing}
        placement="bottom"
        ref={note}
      >
        <span slot="header">Note</span>
        <helix-textarea
          label="Note"
          onInput={(event: Event) => setText((event.target as HTMLTextAreaElement).value)}
          placeholder="Type, then drag the sheet down"
          value={text}
        ></helix-textarea>
        <helix-button
          emphasis="solid"
          onClick={save}
          slot="footer"
          tone="primary"
        >
          Save
        </helix-button>
      </helix-drawer>
    </>
  )
}
