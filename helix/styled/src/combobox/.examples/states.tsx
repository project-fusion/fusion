export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-combobox
        default-value="rs"
        hint="Used for new projects"
        label="Language"
        name="language"
      >
        <helix-option value="c">C</helix-option>
        <helix-option value="go">Go</helix-option>
        <helix-option value="js">JavaScript</helix-option>
        <helix-option value="rs">Rust</helix-option>
        <helix-option value="ts">TypeScript</helix-option>
      </helix-combobox>

      <helix-combobox
        default-value="ts"
        disabled
        hint="Set by your workspace"
        label="Workspace language"
        name="workspace-language"
      >
        <helix-option value="js">JavaScript</helix-option>
        <helix-option value="ts">TypeScript</helix-option>
      </helix-combobox>

      <helix-combobox
        default-value="ada"
        hint="Only the owner can transfer the project"
        label="Owner"
        name="owner"
        readonly
      >
        <helix-option value="ada">Ada Lovelace</helix-option>
        <helix-option value="grace">Grace Hopper</helix-option>
      </helix-combobox>

      <helix-combobox
        hint="Repositories you can push to"
        label="Repository"
        loading
        name="repository"
        placeholder="Search repositories"
      ></helix-combobox>

      <helix-combobox
        default-value="ap-south-1"
        feedback="That region is not available on your plan"
        hint="Choose the region closest to your users"
        label="Region"
        name="region"
      >
        <helix-option value="ap-south-1">ap-south-1</helix-option>
        <helix-option value="eu-west-2">eu-west-2</helix-option>
        <helix-option value="us-east-1">us-east-1</helix-option>
      </helix-combobox>

      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-combobox
            hint="Choose a framework to continue"
            label="Framework"
            name="framework"
            placeholder="Search frameworks"
            required
          >
            <helix-option value="astro">Astro</helix-option>
            <helix-option value="next">Next.js</helix-option>
            <helix-option value="sveltekit">SvelteKit</helix-option>
          </helix-combobox>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Create project
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
