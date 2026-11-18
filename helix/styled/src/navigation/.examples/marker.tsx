export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-navigation label="Sections">
        <a
          aria-current="page"
          href="#one"
        >
          Overview
        </a>
        <a href="#two">Activity</a>
        <a href="#three">Settings</a>
      </helix-navigation>

      <helix-navigation
        label="Sections"
        marker="underlined"
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
    </helix-flex>
  )
}
