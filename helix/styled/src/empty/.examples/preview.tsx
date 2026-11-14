export function Example() {
  return (
    <helix-empty>
      <helix-icon
        name="folder-open"
        slot="icon"
      ></helix-icon>
      <helix-text
        as="h3"
        slot="heading"
      >
        No projects yet
      </helix-text>
      Anything you create will show up here.
      <helix-button
        emphasis="solid"
        slot="actions"
        style={{ '--button-inline-size': 'var(--helix-size-button)' }}
        tone="primary"
      >
        New project
      </helix-button>
    </helix-empty>
  )
}
