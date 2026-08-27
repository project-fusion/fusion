export function Example() {
  return (
    <helix-tooltip placement="top">
      <helix-button>Button</helix-button>
      <span slot="content">
        Lorem ipsum dolor
        <helix-kbd>Cmd</helix-kbd>
        <helix-kbd>S</helix-kbd>
      </span>
    </helix-tooltip>
  )
}
