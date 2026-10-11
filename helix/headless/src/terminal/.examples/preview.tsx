import type { HelixHeadlessTerminal } from '@fusion.dev/helix-headless'
import { useEffect, useRef } from 'react'
import './preview.css'

export function Example() {
  const shell = useRef<HelixHeadlessTerminal>(null)

  useEffect(() => {
    void shell.current?.write(
      '$ echo "Hello from the headless tier"\r\nHello from the headless tier\r\n$ ',
    )
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-headless-terminal
        data-preview-terminal
        label="~/fusion"
        ref={shell}
      >
        <div data-preview-terminal-canvas />
      </helix-headless-terminal>
    </>
  )
}
