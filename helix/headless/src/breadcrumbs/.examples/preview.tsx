import './preview.css'

export function Example() {
  return (
    <helix-headless-breadcrumbs aria-label="Breadcrumb">
      <helix-headless-breadcrumb>
        <a
          data-link="quiet"
          href="/"
        >
          Home
        </a>
      </helix-headless-breadcrumb>
      <helix-headless-breadcrumb>
        <a
          data-link="quiet"
          href="/section"
        >
          Projects
        </a>
      </helix-headless-breadcrumb>
      <helix-headless-breadcrumb current>Website redesign</helix-headless-breadcrumb>
    </helix-headless-breadcrumbs>
  )
}
