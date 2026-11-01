import { useState } from 'react'

const FILES = [
  'Quarterly report',
  'Launch plan',
  'Hiring tracker',
  'Brand guidelines',
  'Budget for next year',
  'Customer interviews',
  'Release notes',
  'Team offsite',
  'Support playbook',
  'Pricing study',
  'Roadmap',
  'Onboarding checklist',
]

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <helix-button
        emphasis="solid"
        onClick={() => setOpen(true)}
        tone="primary"
      >
        Open recent files
      </helix-button>

      <helix-drawer
        label="Recent files"
        onClose={() => setOpen(false)}
        open={open}
        placement="bottom"
        snap-points="0.5 1"
      >
        <span slot="header">Recent files</span>
        <helix-list label="Recent files">
          {FILES.map((file) => (
            <helix-list-item key={file}>{file}</helix-list-item>
          ))}
        </helix-list>
      </helix-drawer>
    </>
  )
}
