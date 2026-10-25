const GROUPS = [
  {
    items: [
      ['#helix', 'cube', 'Projects', 'Plan and track work across teams.'],
      ['#icons', 'palette', 'Documents', 'Write, edit, and share files.'],
    ],
    label: 'Work',
  },
  {
    items: [
      ['#cortex', 'pulse', 'Reports', 'See how your projects are doing.'],
      ['#trace', 'strategy', 'Dashboards', 'Track the numbers you care about.'],
    ],
    label: 'Insights',
  },
] as const

export function Example() {
  return (
    <helix-navigation label="Main">
      <helix-navigation-item href="#overview">Overview</helix-navigation-item>
      <helix-megamenu label="Products">
        {GROUPS.map((group) => (
          <helix-megamenu-group key={group.label}>
            <helix-text slot="label">{group.label}</helix-text>
            {group.items.map(([href, icon, name, about]) => (
              <helix-megamenu-item
                href={href}
                key={href}
              >
                <helix-icon
                  name={icon}
                  slot="icon"
                ></helix-icon>
                {name}
                <helix-text slot="description">{about}</helix-text>
              </helix-megamenu-item>
            ))}
          </helix-megamenu-group>
        ))}
      </helix-megamenu>
      <helix-navigation-item href="#pricing">Pricing</helix-navigation-item>
    </helix-navigation>
  )
}
