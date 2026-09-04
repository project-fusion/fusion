export function Example() {
  return (
    <helix-list label="Label">
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        <a
          aria-current="page"
          data-link="quiet"
          href="#one"
        >
          Item One
        </a>
        <span slot="supporting">Caption</span>
      </helix-list-item>
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        <a
          data-link="quiet"
          href="#two"
        >
          Item Two
        </a>
        <span slot="supporting">Caption</span>
      </helix-list-item>
    </helix-list>
  )
}
