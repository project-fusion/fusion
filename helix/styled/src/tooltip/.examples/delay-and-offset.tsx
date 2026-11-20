export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
      wrap
    >
      <helix-tooltip
        content="Copy the link to your clipboard"
        delay={0}
        delay-out="600"
      >
        <helix-button>Copy link</helix-button>
      </helix-tooltip>

      <helix-tooltip
        content="Share the file with your team"
        delay={700}
      >
        <helix-button>Share file</helix-button>
      </helix-tooltip>

      <helix-tooltip
        content="Change your name and photo"
        offset={16}
      >
        <helix-button>Edit profile</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
