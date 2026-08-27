export function Example() {
  return (
    <helix-breadcrumbs aria-label="Breadcrumb">
      <helix-breadcrumb>
        <a data-link="quiet" href="/">
          Home
        </a>
      </helix-breadcrumb>
      <helix-breadcrumb>
        <a data-link="quiet" href="/section">
          Section
        </a>
      </helix-breadcrumb>
      <helix-breadcrumb current>Current Page</helix-breadcrumb>
    </helix-breadcrumbs>
  )
}
