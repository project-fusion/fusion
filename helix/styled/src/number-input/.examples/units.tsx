export function Example() {
  return (
    <helix-number-input
      default-value="12"
      label="Width"
      min={0}
    >
      <helix-text
        slot="end"
        tone="subtle"
        variant="caption"
      >
        px
      </helix-text>
    </helix-number-input>
  )
}
