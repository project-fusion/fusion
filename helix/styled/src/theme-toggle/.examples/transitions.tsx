export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
      justify-content="center"
    >
      <helix-theme-toggle>Circle</helix-theme-toggle>
      <helix-theme-toggle transition="wipe">Wipe</helix-theme-toggle>
      <helix-theme-toggle transition="fade">Fade</helix-theme-toggle>
    </helix-flex>
  )
}
