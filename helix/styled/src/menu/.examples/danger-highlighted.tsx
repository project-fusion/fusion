export function Example() {
  return (
    <helix-menu
      filter="rev"
      filterable
      label="Token"
      open
    >
      <helix-button slot="trigger">Token</helix-button>
      <helix-menu-item value="copy">Copy token</helix-menu-item>
      <helix-menu-item value="rename">Rename</helix-menu-item>
      <helix-divider></helix-divider>
      <helix-menu-item
        shortcut="⌘⌫"
        tone="danger"
        value="revoke"
      >
        Revoke token
      </helix-menu-item>
    </helix-menu>
  )
}
