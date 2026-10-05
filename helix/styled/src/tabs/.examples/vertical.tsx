export function Example() {
  return (
    <helix-tabs
      default-active="profile"
      orientation="vertical"
      variant="underlined"
    >
      <helix-tab value="profile">Profile</helix-tab>
      <helix-tab value="notifications">Notifications</helix-tab>
      <helix-tab value="security">Security</helix-tab>

      <helix-tab-panel
        slot="panels"
        value="profile"
      >
        Your name, photo, and the email address people see.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="notifications"
      >
        Which updates reach you, and where.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="security"
      >
        Your password, passkeys, and signed-in devices.
      </helix-tab-panel>
    </helix-tabs>
  )
}
