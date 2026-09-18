export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
      wrap
    >
      <helix-orb state="waiting"></helix-orb>
      <helix-orb state="connecting"></helix-orb>
      <helix-orb state="thinking"></helix-orb>
      <helix-orb state="fetching"></helix-orb>
      <helix-orb state="listening"></helix-orb>
      <helix-orb state="working"></helix-orb>
      <helix-orb state="done"></helix-orb>
    </helix-flex>
  )
}
