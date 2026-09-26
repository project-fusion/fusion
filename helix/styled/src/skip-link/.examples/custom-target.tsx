export function Example() {
  return (
    <>
      <helix-skip-link href="#results">Skip to results</helix-skip-link>

      <helix-app-header>
        <span slot="start">Logo</span>
      </helix-app-header>

      <section
        aria-label="Results"
        id="results"
      >
        <helix-text as="p">12 results found.</helix-text>
      </section>
    </>
  )
}
