import { useState } from 'react'

const SECTIONS = [
  ['#products', 'Products'],
  ['#services', 'Services'],
  ['#insights', 'Insights'],
] as const

export function Example() {
  const [current, setCurrent] = useState('#products')

  // The page says which destination is current, as a router does once it has moved.
  const go = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    setCurrent(event.detail.value)
  }

  return (
    <helix-app-header content-align="start">
      <helix-text
        scale="label"
        slot="start"
      >
        Logo
      </helix-text>
      <helix-navigation label="Main">
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
      <helix-button
        emphasis="solid"
        slot="end"
        tone="primary"
      >
        Sign in
      </helix-button>
    </helix-app-header>
  )
}
