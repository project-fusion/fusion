export function Example() {
  return (
    <helix-number-input
      default-value="12"
      label="Width"
      min={0}
    >
      <helix-text
        emphasis="muted"
        scale="caption"
        slot="end"
      >
        px
      </helix-text>
    </helix-number-input>
  )
}
