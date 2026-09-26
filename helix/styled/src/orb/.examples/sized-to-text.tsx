import './sized-to-text.css'

export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="sm"
    >
      <helix-orb
        className="on-the-line"
        label="Loading your files"
        state="fetching"
      ></helix-orb>
      Loading your files…
    </helix-flex>
  )
}
