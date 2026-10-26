import { useState } from 'react'

const SECTIONS = [
  ['#one', 'Overview'],
  ['#two', 'Projects'],
] as const

export function Example() {
  const [current, setCurrent] = useState('#one')

  // The page says which destination is current, as a router does once it has moved.
  const go = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    setCurrent(event.detail.value)
  }

  return (
    <helix-app-header>
      <helix-text slot="start">Logo</helix-text>
      <helix-navigation label="Sections">
        {SECTIONS.map(([href, label]) => (
          <helix-navigation-item
            current={href === current ? 'page' : undefined}
            href={href}
            key={href}
            onhelix-before-select={go}
          >
            {label}
          </helix-navigation-item>
        ))}
      </helix-navigation>

      <helix-icon-button
        label="Search"
        slot="end"
      >
        <helix-icon name="magnifying-glass"></helix-icon>
      </helix-icon-button>
      <helix-icon-button
        label="Settings"
        slot="end"
      >
        <helix-icon name="gear"></helix-icon>
      </helix-icon-button>
    </helix-app-header>
  )
}
