const MENUS = [
  {
    groups: [
      {
        items: [['#helix', 'cube', 'Projects', 'Plan and track work across teams.']],
        label: 'Build',
      },
      {
        items: [['#trace', 'pulse', 'Reports', 'See how your projects are doing.']],
        label: 'Run',
      },
    ],
    label: 'Products',
  },
  {
    groups: [
      {
        items: [
          ['#engineering', 'gear', 'Engineering', 'Plan releases and track bugs.'],
          ['#design', 'palette', 'Design', 'Share files and collect feedback.'],
        ],
        label: 'By team',
      },
    ],
    label: 'Solutions',
  },
  {
    groups: [
      {
        items: [['#story', 'building', 'About us', 'Our team and our history.']],
        label: 'About',
      },
    ],
    label: 'Company',
  },
] as const

export function Example() {
  return (
    <helix-navigation label="Main">
      <helix-navigation-item href="#overview">Overview</helix-navigation-item>
      {MENUS.map((menu) => (
        <helix-megamenu
          key={menu.label}
          label={menu.label}
        >
          {menu.groups.map((group) => (
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
        </helix-megamenu>
      ))}
      <helix-navigation-item href="#pricing">Pricing</helix-navigation-item>
    </helix-navigation>
  )
}
