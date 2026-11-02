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
    <helix-flex direction="column">
      <helix-app-header
        data-color-mode="dark"
        material="transparent"
        overlay
        sticky
      >
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
          label="Settings"
          slot="end"
        >
          <helix-icon name="gear"></helix-icon>
        </helix-icon-button>
      </helix-app-header>

      <helix-card
        data-color-mode="dark"
        separation="filled"
        style={{
          '--card-background-color': 'var(--helix-color-surface)',
          '--card-color': 'var(--helix-color-foreground)',
          '--card-padding': 'var(--helix-space-3xl)',
          '--card-radius': '0',
        }}
      >
        <helix-text
          as="h1"
          scale="display"
        >
          Your projects
        </helix-text>
        <helix-text as="p">Track progress, share files, and invite team members.</helix-text>
      </helix-card>

      <helix-card
        separation="plain"
        style={{
          '--card-color': 'var(--helix-color-foreground)',
          '--card-gap': 'var(--helix-space-lg)',
          '--card-padding': 'var(--helix-space-2xl)',
        }}
      >
        <helix-text
          as="h2"
          scale="title"
        >
          Recent activity
        </helix-text>
        <helix-text as="p">Alex Kim uploaded three files to Website redesign.</helix-text>

        <helix-text
          as="h2"
          scale="title"
        >
          Team members
        </helix-text>
        <helix-text as="p">
          Invite people to your workspace and choose what each person can edit.
        </helix-text>

        <helix-text
          as="h2"
          scale="title"
        >
          Billing
        </helix-text>
        <helix-text as="p">Your next invoice is due on October 1, 2026.</helix-text>

        <helix-text
          as="h2"
          scale="title"
        >
          Integrations
        </helix-text>
        <helix-text as="p">
          Connect the tools your team already uses, and choose what each one can read.
        </helix-text>

        <helix-text
          as="h2"
          scale="title"
        >
          Notifications
        </helix-text>
        <helix-text as="p">
          Choose which updates reach you by email and which stay in the app.
        </helix-text>

        <helix-text
          as="h2"
          scale="title"
        >
          Security
        </helix-text>
        <helix-text as="p">Turn on two-step sign-in for everyone in the workspace.</helix-text>
      </helix-card>
    </helix-flex>
  )
}
