import './sticky.css'

export function Example() {
  return (
    <div className="page">
      <helix-app-header sticky>
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

      <div className="prose">
        <helix-text
          as="h2"
          variant="title"
        >
          Recent activity
        </helix-text>
        <helix-text as="p">Alex Kim uploaded three files to Website redesign.</helix-text>

        <helix-text
          as="h2"
          variant="title"
        >
          Team members
        </helix-text>
        <helix-text as="p">
          Invite people to your workspace and choose what each person can edit.
        </helix-text>

        <helix-text
          as="h2"
          variant="title"
        >
          Billing
        </helix-text>
        <helix-text as="p">Your next invoice is due on October 1, 2026.</helix-text>
      </div>
    </div>
  )
}
