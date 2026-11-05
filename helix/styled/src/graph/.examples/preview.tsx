const nodes = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'plans', label: 'Plans and tiers' },
  { id: 'churn', label: 'Churn review' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'support', label: 'Support playbook' },
  { id: 'hiring', label: 'Hiring plan' },
  { id: 'budget', label: 'Budget' },
]

const links = [
  { source: 'pricing', target: 'plans' },
  { source: 'churn', target: 'pricing' },
  { source: 'pricing', target: 'budget' },
  { source: 'budget', target: 'pricing' },
  { source: 'onboarding', target: 'churn' },
  { source: 'roadmap', target: 'onboarding' },
  { source: 'support', target: 'churn' },
  { source: 'hiring', target: 'budget' },
]

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-graph="cosmos" has the frame connect cosmos.gl; on your page, connectGraph(frame, cosmosDriver(new Graph(box, { enableSimulation: true }), box)) does, the box being the div inside the frame. Any drawing works there: Sigma.js, a canvas, or an image. */}
      <helix-graph
        data-preview-graph="cosmos"
        default-active="pricing"
        label="Company notes"
        links={links}
        nodes={nodes}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
