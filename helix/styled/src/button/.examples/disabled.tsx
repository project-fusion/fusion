import './disabled.css'

export function Example() {
  return (
    <helix-flex gap="sm">
      <helix-button disabled emphasis="solid" tone="primary">
        Button
      </helix-button>
      <helix-button disabled>Button</helix-button>

      {/* The same state, arriving from an ancestor fieldset. */}
      <fieldset disabled>
        <helix-button emphasis="ghost">Button</helix-button>
      </fieldset>
    </helix-flex>
  )
}
