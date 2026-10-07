export function Example() {
  return (
    <helix-menu filterable>
      <helix-button slot="trigger">Move to</helix-button>
      <helix-menu-item value="inbox">Inbox</helix-menu-item>
      <helix-menu-item value="archive">Archive</helix-menu-item>
      <helix-menu-item value="drafts">Drafts</helix-menu-item>
      <helix-menu-item value="spam">Spam</helix-menu-item>
      <helix-menu-item value="projects">
        Projects
        <helix-menu-item
          slot="submenu"
          value="atlas"
        >
          Atlas
        </helix-menu-item>
        <helix-menu-item
          slot="submenu"
          value="beacon"
        >
          Beacon
        </helix-menu-item>
        <helix-menu-item
          slot="submenu"
          value="cobalt"
        >
          Cobalt
        </helix-menu-item>
      </helix-menu-item>
    </helix-menu>
  )
}
