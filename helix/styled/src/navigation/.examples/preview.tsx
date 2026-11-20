import { useState } from 'react'

const SECTIONS = [
  ['#one', 'Overview'],
  ['#two', 'Activity'],
  ['#three', 'Settings'],
] as const

export function Example() {
  const [current, setCurrent] = useState('#one')

  // The page says which destination is current, as a router does once it has moved.
  const go = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    setCurrent(event.detail.value)
  }

  return (
    <helix-navigation label="Sections">
      {SECTIONS.map(([href, name]) => (
        <helix-navigation-item
          current={href === current ? 'page' : undefined}
          href={href}
          key={href}
          onhelix-before-select={go}
        >
          {name}
        </helix-navigation-item>
      ))}
    </helix-navigation>
  )
}
