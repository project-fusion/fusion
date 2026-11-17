import { useState } from 'react'

const PROJECTS = ['Orbit', 'Cedar', 'Lumen', 'Atlas']
const MORE = ['Harbor', 'Ember', 'Fjord', 'Juniper']

export function Example() {
  const [projects, setProjects] = useState(PROJECTS)

  // The list moves no row itself: render the rows in their new order, and each one slides.
  const sort = () => setProjects((before) => [...before].sort((a, b) => a.localeCompare(b)))
  const add = () => {
    const name = MORE.find((one) => !projects.includes(one))
    if (name) {
      setProjects((before) => [name, ...before])
    }
  }
  const remove = (name: string) => setProjects((before) => before.filter((one) => one !== name))

  return (
    <>
      <helix-button-group label="List actions">
        <helix-button onClick={sort}>Sort by name</helix-button>
        <helix-button onClick={add}>Add a project</helix-button>
      </helix-button-group>

      <helix-list
        divided
        label="Projects"
      >
        {projects.map((name) => (
          <helix-list-item
            key={name}
            value={name.toLowerCase()}
          >
            {name}
            <helix-icon-button
              label={`Remove ${name}`}
              onClick={() => remove(name)}
              slot="end"
            >
              <helix-icon name="x"></helix-icon>
            </helix-icon-button>
          </helix-list-item>
        ))}
      </helix-list>
    </>
  )
}
