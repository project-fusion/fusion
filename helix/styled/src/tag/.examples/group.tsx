import { useState } from 'react'

const FILTERS = ['Open', 'Assigned to me']

export function Example() {
  const [shown, setShown] = useState(FILTERS)

  const removed = (event: CustomEvent<{ label: string }>) => {
    setShown((before) => before.filter((one) => one !== event.detail.label))
  }

  return (
    <helix-tag-group
      label="Filters"
      onhelix-dismiss={removed}
      selection-mode="multiple"
      value="Open"
    >
      {shown.map((one) => (
        <helix-tag
          dismissible
          key={one}
          tone={one === 'Assigned to me' ? 'primary' : undefined}
        >
          {one}
        </helix-tag>
      ))}
      <helix-tag
        disabled
        dismissible
      >
        Archived
      </helix-tag>
      <helix-tag href="#labels">All labels</helix-tag>
    </helix-tag-group>
  )
}
