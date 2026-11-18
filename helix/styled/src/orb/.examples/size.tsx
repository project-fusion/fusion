import './size.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-flex
        align-items="center"
        gap="md"
      >
        <helix-orb
          size="sm"
          state="working"
        ></helix-orb>
        <helix-orb state="working"></helix-orb>
        <helix-orb
          size="lg"
          state="working"
        ></helix-orb>
      </helix-flex>

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
    </helix-flex>
  )
}
