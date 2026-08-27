export function Example() {
  return (
    <helix-breadcrumbs aria-label="Breadcrumb">
      {' '}
      <helix-breadcrumb href="/">
        {' '}
        <helix-icon name="house" slot="start"></helix-icon> Home{' '}
      </helix-breadcrumb>{' '}
      <helix-breadcrumb href="/design">Design</helix-breadcrumb>{' '}
      <helix-breadcrumb href="/design/components">Components</helix-breadcrumb>{' '}
      <helix-breadcrumb current>Breadcrumbs</helix-breadcrumb>{' '}
    </helix-breadcrumbs>
  )
}
