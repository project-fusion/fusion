import './material.css'

export function Example() {
  return (
    <div className="scenes">
      <div className="scene">
        <helix-app-header>
          <span slot="start">Logo</span>
          <helix-navigation label="Sections">
            <a
              aria-current="page"
              href="#one"
            >
              Overview
            </a>
            <a href="#two">Projects</a>
          </helix-navigation>
          <helix-icon-button
            label="Settings"
            slot="end"
          >
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-app-header>

        <div className="band">
          <helix-text
            as="h2"
            scale="heading"
          >
            Your projects
          </helix-text>
          <helix-text as="p">Track progress, share files, and invite team members.</helix-text>
        </div>
      </div>

      <div className="scene">
        <helix-app-header material="glass">
          <span slot="start">Logo</span>
          <helix-navigation label="Sections">
            <a
              aria-current="page"
              href="#one"
            >
              Overview
            </a>
            <a href="#two">Projects</a>
          </helix-navigation>
          <helix-icon-button
            label="Settings"
            slot="end"
          >
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-app-header>

        <div className="band">
          <helix-text
            as="h2"
            scale="heading"
          >
            Recent activity
          </helix-text>
          <helix-text as="p">Alex Kim uploaded three files to Website redesign.</helix-text>
        </div>
      </div>

      <div className="scene">
        <helix-app-header material="frosted">
          <span slot="start">Logo</span>
          <helix-navigation label="Sections">
            <a
              aria-current="page"
              href="#one"
            >
              Overview
            </a>
            <a href="#two">Projects</a>
          </helix-navigation>
          <helix-icon-button
            label="Settings"
            slot="end"
          >
            <helix-icon name="gear"></helix-icon>
          </helix-icon-button>
        </helix-app-header>

        <div className="band">
          <helix-text
            as="h2"
            scale="heading"
          >
            Team members
          </helix-text>
          <helix-text as="p">
            Invite people to your workspace and choose what each person can edit.
          </helix-text>
        </div>
      </div>
    </div>
  )
}
