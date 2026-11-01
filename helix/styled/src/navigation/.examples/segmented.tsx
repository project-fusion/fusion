export function Example() {
  return (
    <helix-navigation
      label="Sections"
      marker="segmented"
    >
      <a
        aria-current="page"
        href="#one"
      >
        Overview
      </a>
      <a href="#two">Activity</a>
      <a href="#three">Settings</a>
    </helix-navigation>
  )
}
