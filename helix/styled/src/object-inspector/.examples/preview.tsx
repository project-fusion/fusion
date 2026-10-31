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
    <helix-object-inspector
      default-depth="2"
      label="GET /v1/deployments/dpl_8f2c"
      value={RESPONSE}
    ></helix-object-inspector>
  )
}
