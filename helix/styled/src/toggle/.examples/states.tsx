export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-toggle-group
        default-value="one"
        hint="Applies to the selected paragraph"
        label="Text alignment"
      >
        <helix-toggle value="one">Left</helix-toggle>
        <helix-toggle value="two">Center</helix-toggle>
        <helix-toggle
          disabled
          value="three"
        >
          Right
        </helix-toggle>
      </helix-toggle-group>

      <helix-toggle-group
        aria-label="Theme"
        default-value="two"
      >
        <helix-toggle value="one">Light</helix-toggle>
        <helix-toggle value="two">Dark</helix-toggle>
      </helix-toggle-group>
    </helix-flex>
  )
}
