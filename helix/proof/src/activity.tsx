import { ACTIVITY } from './data'

/** What happened across every project, newest first, each change naming its project. */
export function AllActivity() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-flex direction="column" gap="2xs">
        <helix-text as="h1" variant="heading">
          Activity
        </helix-text>
        <helix-text emphasis="muted">{`${ACTIVITY.length} changes across every project`}</helix-text>
      </helix-flex>
      <helix-card>
        <helix-timeline label="Activity on every project">
          {ACTIVITY.map((change) => (
            <helix-timeline-item
              datetime={change.at}
              key={`${change.project.id}/${change.at}`}
              tone={change.tone}
            >
              <helix-format-date
                date={change.at}
                day="numeric"
                hour="numeric"
                minute="2-digit"
                month="short"
                slot="time"
                time-zone="UTC"
              ></helix-format-date>
              <helix-text variant="body-strong">{change.title}</helix-text>
              <helix-text emphasis="muted" variant="caption">
                {`${change.project.name}. ${change.detail} ${change.by}.`}
              </helix-text>
            </helix-timeline-item>
          ))}
        </helix-timeline>
      </helix-card>
    </helix-flex>
  )
}
