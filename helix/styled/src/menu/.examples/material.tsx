export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-menu label="File">
          <helix-button slot="trigger">Opaque</helix-button>
          <helix-menu-item value="open">Open</helix-menu-item>
          <helix-menu-item value="rename">Rename</helix-menu-item>
          <helix-menu-item value="archive">Archive</helix-menu-item>
        </helix-menu>
        <helix-menu
          label="File"
          material="glass"
        >
          <helix-button slot="trigger">Glass</helix-button>
          <helix-menu-item value="open">Open</helix-menu-item>
          <helix-menu-item value="rename">Rename</helix-menu-item>
          <helix-menu-item value="archive">Archive</helix-menu-item>
        </helix-menu>
        <helix-menu
          label="File"
          material="frosted"
        >
          <helix-button slot="trigger">Frosted</helix-button>
          <helix-menu-item value="open">Open</helix-menu-item>
          <helix-menu-item value="rename">Rename</helix-menu-item>
          <helix-menu-item value="archive">Archive</helix-menu-item>
        </helix-menu>
      </helix-flex>
      <helix-text as="p">
        Track progress, share files, and invite team members to your projects. Recent activity from
        your team appears here.
      </helix-text>
    </helix-flex>
  )
}
