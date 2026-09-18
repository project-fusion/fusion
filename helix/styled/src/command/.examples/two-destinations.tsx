export function Example() {
  return (
    <helix-command
      default-open
      label="Search components"
      placeholder="Find a component"
    >
      <helix-option
        alternate="/helix/sandbox?family=card"
        alternate-label="Open in the sandbox"
        value="/helix/components/card"
      >
        Card
        <span slot="end">Reference</span>
      </helix-option>
      <helix-option
        alternate="/helix/sandbox?family=button"
        alternate-label="Open in the sandbox"
        value="/helix/components/button"
      >
        Button
        <span slot="end">Reference</span>
      </helix-option>

      {/* The footer is the consumer's, because only they know what the second
          destination is called on their own site. The keys are drawn rather
          than named: "hold the modifier" is a sentence about a key whose glyph
          differs per reader, and `keys` is what knows which. */}
      <helix-flex
        align-items="center"
        gap="sm"
        slot="footer"
      >
        <helix-flex
          align-items="center"
          gap="2xs"
        >
          <helix-kbd keys="enter"></helix-kbd>
          <helix-text
            emphasis="subtle"
            variant="caption"
          >
            Reference
          </helix-text>
        </helix-flex>
        <helix-flex
          align-items="center"
          gap="2xs"
        >
          <helix-kbd keys="mod+enter"></helix-kbd>
          <helix-text
            emphasis="subtle"
            variant="caption"
          >
            Sandbox
          </helix-text>
        </helix-flex>
      </helix-flex>
    </helix-command>
  )
}
