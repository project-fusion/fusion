import { useRef, useState } from 'react'

const FILES = ['Quarterly report.pdf', 'Roadmap.key']

export function Example() {
  const [files, setFiles] = useState(FILES)
  const stack = useRef<HTMLElementTagNameMap['helix-toast']>(null)

  /* The action happens at once. The message offers to take it back, which
     replaces asking first. */
  const archive = (name: string) => {
    const before = files
    setFiles(files.filter((one) => one !== name))
    void stack.current?.undoable(`Archived ${name}`, {
      undo: () => setFiles(before),
    })
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-list
        divided
        label="Files"
      >
        {files.map((name) => (
          <helix-list-item key={name}>
            {name}
            <helix-button
              onClick={() => archive(name)}
              slot="end"
            >
              Archive
            </helix-button>
          </helix-list-item>
        ))}
      </helix-list>

      <helix-toast
        label="Notifications"
        placement="bottom-end"
        ref={stack}
      />
    </helix-flex>
  )
}
