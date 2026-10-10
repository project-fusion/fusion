export function Example() {
  return (
    <helix-number-input
      default-value="12"
      label="Width"
      min={0}
    >
      <helix-text
        emphasis="muted"
        slot="end"
        variant="caption"
      >
        px
      </helix-text>
    </helix-number-input>
  )
}
