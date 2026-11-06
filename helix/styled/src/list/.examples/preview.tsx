export function Example() {
  return (
    <helix-list
      divided
      label="Recent files"
    >
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Quarterly report
        <helix-text slot="description">Edited today</helix-text>
      </helix-list-item>
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Team handbook
        <helix-text slot="description">Edited 3 days ago</helix-text>
      </helix-list-item>
    </helix-list>
  )
}
