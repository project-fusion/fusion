import './preview.css'

export function Example() {
  return (
    <helix-headless-toolbar label="Text formatting">
      <helix-headless-icon-button label="Bold">
        <helix-headless-icon name="text-b"></helix-headless-icon>
      </helix-headless-icon-button>
      <helix-headless-icon-button label="Italic">
        <helix-headless-icon name="text-italic"></helix-headless-icon>
      </helix-headless-icon-button>
      <helix-headless-icon-button label="Link">
        <helix-headless-icon name="link"></helix-headless-icon>
      </helix-headless-icon-button>
    </helix-headless-toolbar>
  )
}
