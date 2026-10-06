import { useState } from 'react'

const STEPS = [
  { description: 'Stop merging new work', label: 'Freeze the branch', value: 'freeze' },
  { description: 'One line for each change', label: 'Write the release notes', value: 'notes' },
  { description: 'The version from the changelog', label: 'Tag the release', value: 'tag' },
  {
    description: 'In the changelog and the newsletter',
    label: 'Announce the release',
    value: 'announce',
  },
]

export function Example() {
  const [steps, setSteps] = useState(STEPS)

  // The list moves no row itself. Render the rows in the order the event carries.
  const reordered = (event: CustomEvent<{ keys: string[] }>) => {
    setSteps(event.detail.keys.flatMap((key) => STEPS.filter((step) => step.value === key)))
  }

  return (
    <helix-list
      divided
      label="Release steps"
      onhelix-reorder={reordered}
      reorderable
    >
      {steps.map((step) => (
        <helix-list-item
          key={step.value}
          value={step.value}
        >
          {step.label}
          <span slot="description">{step.description}</span>
        </helix-list-item>
      ))}
    </helix-list>
  )
}
