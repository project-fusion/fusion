export function Example() {
  return (
    <helix-navigation
      label="Sections"
      variant="underlined"
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
