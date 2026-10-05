export function Example() {
  return (
    <helix-list label="Settings">
      <helix-list-item href="#profile">Profile</helix-list-item>
      <helix-list-item
        current="page"
        href="#billing"
      >
        Billing
      </helix-list-item>
      <helix-list-item href="#notifications">Notifications</helix-list-item>
    </helix-list>
  )
}
