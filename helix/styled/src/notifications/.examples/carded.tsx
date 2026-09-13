import './carded.css'

export function Example() {
  return (
    <helix-notifications
      className="feed"
      label="Notifications"
    >
      <h2 slot="header">Notifications</h2>

      {/* A reminder, and the actions are the point of it, so they are drawn
          rather than waiting for a pointer. */}
      <helix-notification
        at="2026-09-09T03:00:00Z"
        dismissible
        separation="filled"
      >
        <helix-avatar
          name="Boyd Larkin"
          slot="media"
        ></helix-avatar>
        <span>
          <strong>Boyd Larkin</strong> has sent you a reminder
        </span>
        <helix-button
          emphasis="outlined"
          slot="actions"
        >
          Ignore
        </helix-button>
        <helix-button
          emphasis="solid"
          slot="actions"
          tone="primary"
        >
          Respond
        </helix-button>
      </helix-notification>

      {/* A status moving from one value to another, which is a block rather than
          a line about the row, so it goes in `detail` and keeps its own type. */}
      <helix-notification
        at="2026-09-08T03:00:00Z"
        dismissible
        separation="filled"
      >
        <helix-avatar
          name="Josh Krajcik"
          slot="media"
        ></helix-avatar>
        <span>
          <strong>Josh Krajcik</strong> changed the status of <strong>Design Project</strong>
        </span>
        <helix-flex
          align="center"
          gap="xs"
          slot="detail"
        >
          <helix-tag>In Progress</helix-tag>
          <helix-icon name="arrow-right"></helix-icon>
          <helix-tag tone="success">Completed</helix-tag>
        </helix-flex>
      </helix-notification>

      {/* Somebody else's words. `detail` sets no size and no ink, so this is the
          consumer's box to dress, which is the whole difference between it and
          `caption`. */}
      <helix-notification
        at="2026-09-07T03:00:00Z"
        read
        separation="filled"
      >
        <helix-avatar
          name="Santos Kling"
          slot="media"
        ></helix-avatar>
        <span>
          <strong>Santos Kling</strong> left a comment on <strong>Strategy 2022</strong>
        </span>
        <p
          className="quote"
          slot="detail"
        >
          Where can i find the process for submitting invoices and for reviewing a contract?
        </p>
      </helix-notification>
    </helix-notifications>
  )
}
