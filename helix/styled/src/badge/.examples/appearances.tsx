export function Example() {
  return (
    <helix-flex align="center" gap="lg">
      <helix-badge value="8">
        <helix-button>Inbox</helix-button>
      </helix-badge>
      <helix-badge tone="neutral" value="8">
        <helix-button>Drafts</helix-button>
      </helix-badge>
      <helix-badge tone="danger" value="3">
        <helix-button>Failures</helix-button>
      </helix-badge>
    </helix-flex>
  )
}
