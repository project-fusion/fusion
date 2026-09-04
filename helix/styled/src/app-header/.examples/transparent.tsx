import './transparent.css'

export function Example() {
  return (
    <div className="page">
      <helix-app-header
        data-color-mode="dark"
        material="transparent"
        sticky
      >
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
          label="Settings"
          slot="end"
        >
          <helix-icon name="gear"></helix-icon>
        </helix-icon-button>
      </helix-app-header>

      <div
        className="band"
        data-color-mode="dark"
      >
        <helix-text
          as="h1"
          variant="display"
        >
          Scroll this page
        </helix-text>
        <helix-text as="p">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </helix-text>
      </div>

      <div className="prose">
        <helix-text
          as="h2"
          variant="title"
        >
          Section One
        </helix-text>
        <helix-text as="p">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </helix-text>

        <helix-text
          as="h2"
          variant="title"
        >
          Section Two
        </helix-text>
        <helix-text as="p">
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
          commodo consequat.
        </helix-text>

        <helix-text
          as="h2"
          variant="title"
        >
          Section Three
        </helix-text>
        <helix-text as="p">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur.
        </helix-text>
      </div>
    </div>
  )
}
