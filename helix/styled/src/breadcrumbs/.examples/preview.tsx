export function Example() {
  return (
    <helix-breadcrumbs aria-label="Breadcrumb">
      <helix-breadcrumb href="#home">
        <helix-icon
          name="house"
          slot="start"
        ></helix-icon>
        Home
      </helix-breadcrumb>
      <helix-breadcrumb href="#projects">Projects</helix-breadcrumb>
      <helix-breadcrumb href="#website-redesign">Website redesign</helix-breadcrumb>
      <helix-breadcrumb current>Settings</helix-breadcrumb>
    </helix-breadcrumbs>
  )
}
