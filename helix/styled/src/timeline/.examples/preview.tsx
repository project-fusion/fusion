export function Example() {
  return (
    <helix-timeline label="Deployment history">
      <helix-timeline-item
        datetime="2026-08-19T09:12"
        tone="success"
      >
        <helix-icon
          name="check"
          slot="marker"
        ></helix-icon>
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
        <helix-icon
          name="x"
          slot="marker"
        ></helix-icon>
        <span slot="time">08:47</span>
        <helix-text variant="body-strong">Rolled back</helix-text>
        <helix-text
          emphasis="muted"
          variant="caption"
        >
          Error rate above the threshold for four minutes.
        </helix-text>
      </helix-timeline-item>
      <helix-timeline-item
        datetime="2026-08-19T08:30"
        tone="primary"
      >
        <span slot="time">08:30</span>
        <helix-text variant="body-strong">Build passed</helix-text>
        <helix-text
          emphasis="muted"
          variant="caption"
        >
          1,089 tests across 75 packages.
        </helix-text>
      </helix-timeline-item>
      <helix-timeline-item datetime="2026-08-19T08:04">
        <span slot="time">08:04</span>
        <helix-text variant="body-strong">Pull request opened</helix-text>
        <helix-text
          emphasis="muted"
          variant="caption"
        >
          A new branch with its first commit.
        </helix-text>
      </helix-timeline-item>
    </helix-timeline>
  )
}
