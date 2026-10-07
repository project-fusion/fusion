export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
    >
      <helix-badge
        label="Verified"
        tone="success"
      >
        <helix-avatar name="Jane Doe"></helix-avatar>
        <helix-icon
          name="check"
          slot="icon"
        ></helix-icon>
      </helix-badge>
      <helix-badge
        label="{count} failing"
        tone="danger"
        value="2"
      >
        <helix-button>Checks</helix-button>
        <helix-icon
          name="x"
          slot="icon"
        ></helix-icon>
      </helix-badge>
    </helix-flex>
  )
}
