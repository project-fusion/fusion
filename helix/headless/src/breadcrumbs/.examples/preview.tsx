import './preview.css'

export function Example() {
  return (
    <helix-headless-breadcrumbs aria-label="Breadcrumb">
      <helix-headless-breadcrumb>
        <a data-link="quiet" href="/">
          Home
        </a>
      </helix-headless-breadcrumb>
      <helix-headless-breadcrumb>
        <a data-link="quiet" href="/section">
          Section
        </a>
      </helix-headless-breadcrumb>
      <helix-headless-breadcrumb current>Current Page</helix-headless-breadcrumb>
    </helix-headless-breadcrumbs>
  )
}
