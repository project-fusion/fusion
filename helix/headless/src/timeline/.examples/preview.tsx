import './preview.css'

export function Example() {
  return (
    <helix-headless-timeline label="Deployment history">
      <helix-headless-timeline-item
        datetime="2026-08-19T09:12"
        tone="success"
      >
        <helix-headless-icon
          name="check"
          slot="marker"
        ></helix-headless-icon>
        <span slot="time">09:12</span>
        <p>Deployed to production</p>
        <p>Version 4.2.0, by the release job.</p>
      </helix-headless-timeline-item>
      <helix-headless-timeline-item
        datetime="2026-08-19T08:47"
        tone="danger"
      >
        <helix-headless-icon
          name="x"
          slot="marker"
        ></helix-headless-icon>
        <span slot="time">08:47</span>
        <p>Rolled back</p>
        <p>Error rate above the threshold for four minutes.</p>
      </helix-headless-timeline-item>
      <helix-headless-timeline-item
        datetime="2026-08-19T08:30"
        tone="primary"
      >
        <span slot="time">08:30</span>
        <p>Build passed</p>
        <p>1,089 specs across 75 families.</p>
      </helix-headless-timeline-item>
      <helix-headless-timeline-item datetime="2026-08-19T08:04">
        <span slot="time">08:04</span>
        <p>Opened</p>
        <p>A branch, and the first commit on it.</p>
      </helix-headless-timeline-item>
    </helix-headless-timeline>
  )
}
