import './preview.css'

const RESPONSE = {
  build: { cache: { hit: true, size: 1840211 }, duration: 41.2 },
  createdAt: 1767225600000,
  id: 'dpl_8f2c',
  meta: { author: 'Ada Okonjo', branch: 'main', commit: '4f2a9c1e' },
  public: true,
  regions: ['iad1', 'sfo1', 'fra1'],
  state: 'READY',
  target: null,
}

export function Example() {
  return (
    <>
      <script
        id="response"
        type="application/json"
      >
        {JSON.stringify(RESPONSE)}
      </script>

      <helix-headless-object-inspector
        default-depth="2"
        for="response"
        label="GET /v1/deployments/dpl_8f2c"
      ></helix-headless-object-inspector>
    </>
  )
}
