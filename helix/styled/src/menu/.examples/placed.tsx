export function Example() {
  return (
    <helix-menu
      offset={12}
      placement="right-start"
    >
      <helix-button slot="trigger">Export</helix-button>
      <helix-menu-item
        download="report.csv"
        href="/media/report.csv"
      >
        Comma separated
      </helix-menu-item>
      <helix-menu-item
        download="report.json"
        href="/media/report.json"
      >
        JSON
      </helix-menu-item>
    </helix-menu>
  )
}
