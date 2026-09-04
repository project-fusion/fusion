import './preview.css'

export function Example() {
  return (
    <helix-headless-list label="Label">
      <helix-headless-list-item>
        <helix-headless-icon
          name="cube"
          slot="start"
        ></helix-headless-icon>
        Item One
        <span slot="supporting">Caption</span>
      </helix-headless-list-item>
      <helix-headless-list-item>
        <helix-headless-icon
          name="cube"
          slot="start"
        ></helix-headless-icon>
        Item Two
        <span slot="supporting">Caption</span>
      </helix-headless-list-item>
    </helix-headless-list>
  )
}
