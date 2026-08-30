export function Example() {
  return (
    <helix-rating default-value="3.5" label="Favorite" show-value step={0.5}>
      <svg aria-hidden="true" fill="currentColor" slot="mark" viewBox="0 0 24 24">
        <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.1 12 21 12 21z" />
      </svg>
    </helix-rating>
  )
}
