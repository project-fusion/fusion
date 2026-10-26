import { useState } from 'react'
import { type Project, STAGES } from './data'

interface Props {
  readonly project: Project
}

/** How far the project is, its stages, and who runs it. */
export function Overview({ project }: Props) {
  return (
    <helix-grid align-items="start" gap="md" min="18rem">
      <helix-card>
        <helix-text as="h2" slot="header" variant="title">
          Progress
        </helix-text>
        <helix-flex direction="column" gap="md">
          <helix-meter
            label="Tasks done"
            max={project.tasks}
            show-value
            value={project.done}
            value-text={`${project.done} of ${project.tasks}`}
          >
            <helix-text slot="label">Tasks done</helix-text>
          </helix-meter>
          <helix-steps label="Stages">
            {STAGES.map((stage, index) => (
              <helix-step
                complete={index < project.stage || project.status === 'done'}
                current={index === project.stage && project.status !== 'done'}
                key={stage}
                value={stage}
              >
                {stage}
              </helix-step>
            ))}
          </helix-steps>
        </helix-flex>
      </helix-card>
      <helix-card>
        <helix-text as="h2" slot="header" variant="title">
          Details
        </helix-text>
        <helix-description-list divided>
          <helix-description-list-item label="Owner">
            <helix-flex align-items="center" gap="xs">
              <helix-avatar
                initials={project.owner.initials}
                name={project.owner.name}
                size="sm"
              ></helix-avatar>
              <helix-text>{project.owner.name}</helix-text>
            </helix-flex>
          </helix-description-list-item>
          <helix-description-list-item label="Started">
            <helix-format-date
              date={project.started}
              day="numeric"
              month="long"
              time-zone="UTC"
              year="numeric"
            ></helix-format-date>
          </helix-description-list-item>
          <helix-description-list-item label="Due">
            <helix-format-date
              date={project.due}
              day="numeric"
              month="long"
              time-zone="UTC"
              year="numeric"
            ></helix-format-date>
          </helix-description-list-item>
          <helix-description-list-item label="Stage">
            <helix-tag tone="primary">{STAGES[project.stage]}</helix-tag>
          </helix-description-list-item>
        </helix-description-list>
      </helix-card>
    </helix-grid>
  )
}

/**
 * What happened on the project, newest first, in the page's own scroll: a
 * nested area that scrolls cut the timeline off partway down a phone's
 * screen.
 */
export function Activity({ project }: Props) {
  return (
    <helix-timeline label={`Activity on ${project.name}`}>
      {project.activity.map((change) => (
        <helix-timeline-item datetime={change.at} key={change.at} tone={change.tone}>
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
            {`${change.detail} ${change.by}.`}
          </helix-text>
        </helix-timeline-item>
      ))}
    </helix-timeline>
  )
}

/**
 * Who hears about the project and who can see it, and archiving it, with an
 * outline that links to each section.
 */
export function Settings({ project }: Props) {
  const [archiving, setArchiving] = useState(false)
  const [archived, setArchived] = useState(false)
  const archive = () => {
    setArchiving(true)
    setTimeout(() => {
      setArchiving(false)
      setArchived(true)
    }, 1200)
  }
  return (
    <helix-flex direction="column" gap="lg">
      <helix-outline></helix-outline>
      <helix-outline-section anchor="notifications" label="Notifications">
        <helix-switch
          default-checked
          hint="Sent to the people on the project."
          label="Email when a task is overdue"
        ></helix-switch>
      </helix-outline-section>
      <helix-outline-section anchor="visibility" label="Visibility">
        <helix-radio-group default-value="team" label="Who can see the project">
          <helix-radio value="team">The people on it</helix-radio>
          <helix-radio value="organization">Everyone in the organization</helix-radio>
          <helix-radio value="owner">{`${project.owner.name} alone`}</helix-radio>
        </helix-radio-group>
      </helix-outline-section>
      <helix-divider></helix-divider>
      <helix-outline-section anchor="archive" label="Archive">
        {archived ? (
          <helix-callout tone="success">
            <helix-text slot="heading">{`${project.name} is archived`}</helix-text>
            It is read-only, and it leaves the list of active projects.
          </helix-callout>
        ) : (
          <helix-flex direction="column" gap="sm">
            <helix-text as="h2" variant="title">
              Archive the project
            </helix-text>
            <helix-text emphasis="muted">
              An archived project is read-only. You can restore it later.
            </helix-text>
            <helix-flex>
              <helix-button
                emphasis="outlined"
                onClick={archive}
                pending={archiving}
                pending-label="Archiving"
                tone="danger"
              >
                Archive project
              </helix-button>
            </helix-flex>
          </helix-flex>
        )}
      </helix-outline-section>
    </helix-flex>
  )
}
