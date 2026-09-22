export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-list
        kind="ordered"
        label="Steps"
      >
        <helix-list-item>Install the package</helix-list-item>
        <helix-list-item>Import the base layer</helix-list-item>
        <helix-list-item>Register the elements</helix-list-item>
      </helix-list>

      <helix-list
        kind="unordered"
        label="What you get"
      >
        <helix-list-item>Tokens</helix-list-item>
        <helix-list-item>Components</helix-list-item>
        <helix-list-item>React wrappers</helix-list-item>
      </helix-list>

      <helix-list
        kind="description"
        label="Terms"
      >
        <helix-list-item>
          Helix
          <span slot="description">The design system. Tokens, components, wrappers.</span>
        </helix-list-item>
        <helix-list-item>
          Cortex
          <span slot="description">Memory, provenance and context.</span>
        </helix-list-item>
      </helix-list>
    </helix-flex>
  )
}
