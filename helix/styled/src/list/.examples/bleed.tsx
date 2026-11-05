import './bleed.css'

export function Example() {
  return (
    <div className="panel">
      <p className="heading">Settings</p>
      <helix-divider></helix-divider>
      <helix-list
        bleed
        label="Settings"
      >
        <helix-list-item href="#profile">Profile</helix-list-item>
        <helix-list-item
          current="page"
          href="#billing"
        >
          Billing
        </helix-list-item>
        <helix-list-item href="#notifications">Notifications</helix-list-item>
      </helix-list>
    </div>
  )
}
