import { useState } from 'react'

const FILES = ['Quarterly report.pdf', 'Roadmap.key']

type Archived = { at: number; name: string }

export function Example() {
  const [files, setFiles] = useState(FILES)
  const [archived, setArchived] = useState<Archived[]>([])

  /* The action happens at once. The message offers to take it back, which
     replaces asking first. */
  const archive = (name: string) => {
    setFiles((before) => before.filter((one) => one !== name))
    setArchived((before) => [...before, { at: FILES.indexOf(name), name }])
  }

  const undo = (one: Archived) => {
    setFiles((before) => [...before, one.name].sort((a, b) => FILES.indexOf(a) - FILES.indexOf(b)))
    setArchived((before) => before.filter((other) => other !== one))
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

      <helix-toast placement="bottom-end">
        {archived.map((one) => (
          <helix-toast-item
            dismissible
            duration={8000}
            key={`${one.name}-${one.at}`}
            onhelix-dismiss={() => setArchived((before) => before.filter((other) => other !== one))}
          >
            {`Archived ${one.name}`}
            <helix-button
              onClick={() => undo(one)}
              slot="actions"
            >
              Undo
            </helix-button>
          </helix-toast-item>
        ))}
      </helix-toast>
    </helix-flex>
  )
}
