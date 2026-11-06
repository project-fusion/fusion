export function Example() {
  return (
    <helix-list label="Projects">
      <helix-list-item href="#one">
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Website redesign
        <helix-text slot="description">Updated today</helix-text>
      </helix-list-item>
      <helix-list-item href="#two">
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Mobile app
        <helix-text slot="description">Updated 3 days ago</helix-text>
      </helix-list-item>
    </helix-list>
  )
}
