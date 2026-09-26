import './preview.css'

export function Example() {
  return (
    <helix-headless-list label="Recent files">
      <helix-headless-list-item>
        <helix-headless-icon
          name="cube"
          slot="start"
        ></helix-headless-icon>
        Quarterly report
        <span slot="description">Edited today</span>
      </helix-headless-list-item>
      <helix-headless-list-item>
        <helix-headless-icon
          name="cube"
          slot="start"
        ></helix-headless-icon>
        Team handbook
        <span slot="description">Edited 3 days ago</span>
      </helix-headless-list-item>
    </helix-headless-list>
  )
}
