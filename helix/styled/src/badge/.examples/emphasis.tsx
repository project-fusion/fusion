export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
      wrap
    >
      <helix-badge
        label="{count} unread"
        value="8"
      >
        <helix-button>Inbox</helix-button>
      </helix-badge>

      <helix-badge
        emphasis="outlined"
        label="{count} drafts"
        value="3"
      >
        <helix-button>Drafts</helix-button>
      </helix-badge>

      <helix-badge
        emphasis="subtle"
        label="{count} errors"
        tone="danger"
        value="2"
      >
        <helix-button>Errors</helix-button>
      </helix-badge>
    </helix-flex>
  )
}
