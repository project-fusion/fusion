const DEPLOY = `region: eu-west-1
replicas: 3`

const VERSIONS = `helix 0.227.0
cortex 0.5.0`

const SETTINGS = `API_URL=
TIMEOUT=30`

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-code-editor
        disabled
        hint="Locked while the deploy runs"
        label="deploy.yml"
        rows={3}
        value={DEPLOY}
      ></helix-code-editor>

      <helix-code-editor
        hint="Generated from the lockfile"
        label="versions.txt"
        readonly
        rows={3}
        value={VERSIONS}
      ></helix-code-editor>

      <helix-code-editor
        feedback="Write the value of every key"
        hint="One key and value on each line"
        label="settings.env"
        rows={3}
        value={SETTINGS}
      ></helix-code-editor>

      {/* The preview cancels the submit, so the page stays in place. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-code-editor
            hint="Paste the query that runs slowly"
            label="query.sql"
            name="query"
            placeholder="SELECT * FROM orders"
            required
            rows={3}
          ></helix-code-editor>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Send query
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
