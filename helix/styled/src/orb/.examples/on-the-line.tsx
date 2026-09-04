import './on-the-line.css'

export function Example() {
  return (
    <helix-flex
      align="center"
      gap="sm"
    >
      <helix-orb
        className="on-the-line"
        label="Reading the migration log"
        state="fetching"
      ></helix-orb>
      Reading the migration log…
    </helix-flex>
  )
}
