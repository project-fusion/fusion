const CONFIG = {
  build: { cache: true, command: 'bun run build', output: 'dist' },
  env: { API_URL: 'https://api.example.com', REGION: 'iad1' },
  regions: ['iad1', 'sfo1', 'fra1'],
  routes: [
    { path: '/', region: 'iad1' },
    { path: '/api', region: 'sfo1' },
  ],
}

export function Example() {
  return (
    <>
      {/* The JSON is written into the page because React hydration drops object
          properties on custom elements. The text survives server rendering. */}
      <script
        id="config"
        type="application/json"
      >
        {JSON.stringify(CONFIG)}
      </script>

      <helix-object-inspector
        filter="sfo1"
        filterable
        for="config"
        label="config.json"
      ></helix-object-inspector>
    </>
  )
}
