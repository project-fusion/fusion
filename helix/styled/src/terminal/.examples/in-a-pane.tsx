import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import './in-a-pane.css'

export function Example() {
  const pane = useRef<HelixTerminal>(null)

  useEffect(() => {
    void pane.current?.write(
      '\x1b[36m~\x1b[0m \x1b[32m❯\x1b[0m ls\r\nDesktop  Development  Documents  Downloads\r\n\x1b[36m~\x1b[0m \x1b[32m❯\x1b[0m ',
    )
  }, [])

  return (
    <div className="pane">
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        controls="find clear fullscreen"
        data-preview-terminal
        fill
        label="zsh"
        ref={pane}
        separation="plain"
      >
        <helix-icon-button
          label="New terminal"
          slot="actions"
        >
          <helix-icon name="plus" />
        </helix-icon-button>
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </div>
  )
}
