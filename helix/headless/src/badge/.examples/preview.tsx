import './preview.css'

export function Example() {
  return (
    <helix-headless-badge label="3 unread" value="3">
      <helix-headless-icon-button label="Notifications">
        <helix-headless-icon name="bell"></helix-headless-icon>
      </helix-headless-icon-button>
    </helix-headless-badge>
  )
}
