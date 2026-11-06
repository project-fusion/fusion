import { useState } from 'react'

const SECTIONS = [
  ['#general', 'General', 'The workspace’s name, address, and time zone.'],
  ['#members', 'Members', 'Who can see and change this workspace.'],
  ['#billing', 'Billing', 'Your plan, invoices, and payment method.'],
  ['#security', 'Security', 'Sign-in rules and the devices signed in.'],
] as const

export function Example() {
  const [current, setCurrent] = useState('#members')

  const go = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    setCurrent(event.detail.value)
  }

  return (
    <helix-flex
      align-items="start"
      gap="lg"
      layout="flank"
    >
      <helix-navigation
        arrows
        label="Settings"
        orientation="vertical"
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
      <helix-text>{SECTIONS.find(([href]) => href === current)?.[2]}</helix-text>
    </helix-flex>
  )
}
