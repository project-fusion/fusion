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
  {
    items: [
      ['#grid', 'lightbulb', 'Integrations', 'Connect the tools your team uses.'],
      ['#chart', 'chart-line', 'API', 'Build on your account data.'],
    ],
    label: 'Connect',
  },
] as const

const MORE = [
  ['#docs', 'Documentation'],
  ['#changelog', 'Changelog'],
  ['#status', 'Status'],
] as const

export function Example() {
  return (
    <helix-app-header>
      <helix-text slot="start">Fusion</helix-text>
      <helix-navigation label="Main">
        <helix-megamenu
          label="Products"
          layout="band"
        >
          {GROUPS.map((group) => (
            <helix-megamenu-group
              key={group.label}
              label={group.label}
            >
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
          <helix-megamenu-group label="More">
            {MORE.map(([href, name]) => (
              <helix-megamenu-item
                href={href}
                key={href}
              >
                {name}
              </helix-megamenu-item>
            ))}
          </helix-megamenu-group>
        </helix-megamenu>
        <helix-navigation-item href="#pricing">Pricing</helix-navigation-item>
      </helix-navigation>
    </helix-app-header>
  )
}
