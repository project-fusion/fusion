import './preview.css'

export function Example() {
  return (
    <helix-headless-navigation label="Sections">
      {' '}
      <a
        aria-current="page"
        href="/one"
      >
        Overview
      </a>{' '}
      <a href="/two">Activity</a> <a href="/three">Settings</a>{' '}
    </helix-headless-navigation>
  )
}
