export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-flex
        gap="lg"
        wrap
      >
        <helix-color-picker
          default-value="#3366ff"
          disabled
          hint="Managed by your admin."
          label="Brand color"
        ></helix-color-picker>
        <helix-color-picker
          default-value="#3366cc"
          hint="Used for links and buttons."
          label="Link color"
          name="link"
          readonly
        ></helix-color-picker>
        <helix-color-picker
          default-value="#fef08a"
          feedback="Choose a darker color so white text stays readable."
          hint="Used behind white text."
          label="Banner color"
          name="banner"
        ></helix-color-picker>
      </helix-flex>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-color-picker
            hint="Used for highlights."
            label="Accent color"
            name="accent"
            required
          ></helix-color-picker>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Save
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
