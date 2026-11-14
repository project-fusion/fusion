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
    <helix-object-inspector
      filter="sfo1"
      filterable
      label="config.json"
      value={CONFIG}
    ></helix-object-inspector>
  )
}
