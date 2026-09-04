import './preview.css'

export function Example() {
  return (
    <helix-headless-navigation label="Sections">
      {' '}
      <a
        aria-current="page"
        href="/one"
      >
        Item One
      </a>{' '}
      <a href="/two">Item Two</a> <a href="/three">Item Three</a>{' '}
    </helix-headless-navigation>
  )
}
