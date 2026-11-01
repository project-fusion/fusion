import './material.css'

export function Example() {
  return (
    <div className="band">
      <helix-card
        aria-labelledby="glass-title"
        material="glass"
      >
        <helix-text
          as="h3"
          id="glass-title"
          scale="title"
          slot="header"
        >
          Storage
        </helix-text>
        You have used 8 GB of your 10 GB of storage.
      </helix-card>

      <helix-card
        aria-labelledby="frosted-title"
        material="frosted"
      >
        <helix-text
          as="h3"
          id="frosted-title"
          scale="title"
          slot="header"
        >
          Team members
        </helix-text>
        Six people have access to this project.
      </helix-card>

      <helix-card
        aria-labelledby="transparent-title"
        material="transparent"
      >
        <helix-text
          as="h3"
          id="transparent-title"
          scale="title"
          slot="header"
        >
          Next invoice
        </helix-text>
        Your next invoice is due on October 1, 2026.
      </helix-card>

      <helix-card
        aria-labelledby="opaque-title"
        separation="elevated"
      >
        <helix-text
          as="h3"
          id="opaque-title"
          scale="title"
          slot="header"
        >
          Notifications
        </helix-text>
        You have three unread messages.
      </helix-card>
    </div>
  )
}
