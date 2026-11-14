export function Example() {
  return (
    <helix-breadcrumbs
      aria-label="Breadcrumb"
      max-items={3}
    >
      <helix-breadcrumb href="#home">Home</helix-breadcrumb>
      <helix-breadcrumb href="#design">Projects</helix-breadcrumb>
      <helix-breadcrumb href="#components">Website redesign</helix-breadcrumb>
      <helix-breadcrumb href="#navigation">Files</helix-breadcrumb>
      <helix-breadcrumb current>Settings</helix-breadcrumb>
    </helix-breadcrumbs>
  )
}
