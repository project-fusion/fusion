import { useState } from 'react'

const SECTIONS = [
  ['#one', 'Overview'],
  ['#two', 'Activity'],
  ['#three', 'Settings'],
] as const

export function Example() {
  const [current, setCurrent] = useState('#one')

  const go = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    setCurrent(event.detail.value)
  }

  return (
    <helix-navigation
      label="Sections"
      marker="underlined"
    >
      {SECTIONS.map(([href, name]) => (
        <helix-navigation-item
          current={href === current ? 'page' : undefined}
          href={href}
          key={href}
          onhelix-select={go}
        >
          {name}
        </helix-navigation-item>
      ))}
    </helix-navigation>
  )
}
