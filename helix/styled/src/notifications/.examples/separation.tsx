import './separation.css'

const SEPARATIONS = ['plain', 'outlined', 'filled'] as const

export function Example() {
  return (
    <div className="feeds">
      {SEPARATIONS.map((separation) => (
        <helix-notifications
          className="feed"
          key={separation}
          label="Notifications"
          separation={separation}
        >
          <helix-text
            as="h2"
            scale="title"
            slot="header"
          >
            Notifications
          </helix-text>

          <helix-notification
            at="2026-09-09T03:00:00Z"
            dismissible
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

          <helix-notification
            at="2026-09-08T03:00:00Z"
            dismissible
          >
            <helix-avatar
              name="Jordan Lee"
              slot="media"
            ></helix-avatar>
            <span>
              <strong>Jordan Lee</strong> changed the status of <strong>Website redesign</strong>
            </span>
            <helix-flex
              align-items="center"
              gap="xs"
              slot="detail"
            >
              <helix-tag>In progress</helix-tag>
              <helix-icon
                mirror
                name="arrow-right"
              ></helix-icon>
              <helix-tag tone="success">Completed</helix-tag>
            </helix-flex>
          </helix-notification>

          <helix-notification
            at="2026-09-07T03:00:00Z"
            read
          >
            <helix-avatar
              name="Santos Kling"
              slot="media"
            ></helix-avatar>
            <span>
              <strong>Santos Kling</strong> left a comment on <strong>Q4 planning</strong>
            </span>
            <helix-text
              as="p"
              className="quote"
              slot="detail"
            >
              Where can I find the process for submitting invoices and for reviewing a contract?
            </helix-text>
          </helix-notification>
        </helix-notifications>
      ))}
    </div>
  )
}
