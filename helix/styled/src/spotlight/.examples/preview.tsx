const PLANS = [
  { name: 'Free', text: 'One workspace and a week of history.' },
  { name: 'Pro', text: 'Unlimited workspaces, shared memory, and a year of history.' },
  { name: 'Team', text: 'Everything in Pro, with roles, audit logs, and single sign-on.' },
]

export function Example() {
  return (
    <helix-grid
      columns={3}
      gap="sm"
    >
      {PLANS.map((plan) => (
        <helix-spotlight key={plan.name}>
          <helix-card separation="outlined">
            <helix-text
              as="h3"
              scale="title"
              slot="header"
            >
              {plan.name}
            </helix-text>
            {plan.text}
          </helix-card>
        </helix-spotlight>
      ))}
    </helix-grid>
  )
}
