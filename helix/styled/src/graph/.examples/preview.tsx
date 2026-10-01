import './preview.css'

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
    <helix-graph
      default-active="pricing"
      label="Company notes"
      links={links}
      nodes={nodes}
    >
      {/* Put your graph here, drawn by Sigma.js, a canvas, or an image. */}
      <div className="stand-in">Graph</div>
    </helix-graph>
  )
}
