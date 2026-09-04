export function Example() {
  return (
    <helix-app-header>
      <span slot="start">Logo</span>
      <helix-navigation label="Sections">
        <a
          aria-current="page"
          href="#one"
        >
          Item One
        </a>
        <a href="#two">Item Two</a>
      </helix-navigation>

      <helix-icon-button
        label="Search"
        slot="end"
      >
        <helix-icon name="magnifying-glass"></helix-icon>
      </helix-icon-button>
      <helix-icon-button
        label="Settings"
        slot="end"
      >
        <helix-icon name="gear"></helix-icon>
      </helix-icon-button>
    </helix-app-header>
  )
}
