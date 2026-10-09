export function Example() {
  return (
    <helix-grid
      align-items="center"
      columns={3}
      gap="md"
    >
      <helix-card>
        <helix-text as="h3">Starter</helix-text>
      </helix-card>
      <helix-card>
        <helix-text as="h3">Team</helix-text>
        <helix-text as="p">
          Includes shared projects, admin controls, and priority support.
        </helix-text>
      </helix-card>
      <helix-card>
        <helix-text as="h3">Business</helix-text>
      </helix-card>
    </helix-grid>
  )
}
