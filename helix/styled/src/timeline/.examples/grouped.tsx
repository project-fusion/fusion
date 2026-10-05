export function Example() {
  return (
    <helix-timeline label="Deployment history">
      <helix-timeline-group label="Today">
        <helix-timeline-item
          datetime="2026-08-19T09:12"
          tone="success"
        >
          <span slot="time">09:12</span>
          <helix-text variant="body-strong">Deployed to production</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            Version 4.2.0, by the release job.
          </helix-text>
        </helix-timeline-item>
        <helix-timeline-item
          datetime="2026-08-19T08:47"
          tone="danger"
        >
          <span slot="time">08:47</span>
          <helix-text variant="body-strong">Rolled back</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            The health check failed on two regions.
          </helix-text>
        </helix-timeline-item>
      </helix-timeline-group>
      <helix-timeline-group label="Yesterday">
        <helix-timeline-item datetime="2026-08-18T16:30">
          <span slot="time">16:30</span>
          <helix-text variant="body-strong">Opened the release</helix-text>
          <helix-text
            emphasis="muted"
            variant="caption"
          >
            Three changes waiting for review.
          </helix-text>
        </helix-timeline-item>
      </helix-timeline-group>
    </helix-timeline>
  )
}
