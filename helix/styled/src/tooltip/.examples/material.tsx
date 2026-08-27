export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <helix-tooltip content="Lorem ipsum dolor sit amet">
        <helix-button>Inverse</helix-button>
      </helix-tooltip>
      <helix-tooltip content="Lorem ipsum dolor sit amet" material="glass">
        <helix-button>Glass</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
