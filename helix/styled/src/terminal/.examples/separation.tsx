import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const prompt = (folder: string) => `\x1b[36m${folder}\x1b[0m \x1b[32m❯\x1b[0m `

const PROJECT = [
  `${prompt('~/project')}bun run build`,
  '\x1b[32mbuilt\x1b[0m in 1.4s',
  prompt('~/project'),
]

const DOCS = [`${prompt('~/docs')}ls`, 'guides  reference', prompt('~/docs')]

export function Example() {
  const framed = useRef<HelixTerminal>(null)
  const plain = useRef<HelixTerminal>(null)

  useEffect(() => {
    void framed.current?.write(PROJECT.join('\r\n'))
    void plain.current?.write(DOCS.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-flex
        direction="column"
        gap="lg"
      >
        <helix-terminal
          data-preview-terminal
          label="~/project"
          ref={framed}
        >
          <div data-preview-terminal-canvas />
        </helix-terminal>

        <helix-terminal
          data-preview-terminal
          label="~/docs"
          ref={plain}
          separation="plain"
        >
          <div data-preview-terminal-canvas />
        </helix-terminal>
      </helix-flex>
    </>
  )
}
