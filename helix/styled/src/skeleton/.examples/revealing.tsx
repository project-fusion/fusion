import { useEffect, useState } from 'react'
import './revealing.css'

interface Person {
  bio: string
  name: string
  role: string
}

const people: Person[] = [
  {
    bio: 'Writes the programs that run on the Analytical Engine and keeps the notes the team works from. Ask her about the tables for the Bernoulli numbers.',
    name: 'Ada Lovelace',
    role: 'Analyst, Engines team',
  },
  {
    bio: 'Leads the compiler work. Her team turned a page of English into the first program a machine could read, and she still keeps the moth from the logbook on her desk. She answers messages in the morning.',
    name: 'Grace Hopper',
    role: 'Lead engineer, Compilers',
  },
]

export function Example() {
  const [loads, setLoads] = useState(0)
  const [person, setPerson] = useState<Person>()
  const [loading, setLoading] = useState(true)

  // Put the loaded profile in and take `loading` off in the same render. The
  // skeleton crossfades to the profile while the card grows to fit it.
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setPerson(people[loads % people.length])
      setLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [loads])

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-card separation="outlined">
        <helix-skeleton
          label="Loading the profile"
          loading={loading}
        >
          <helix-flex
            direction="column"
            gap="md"
            slot="placeholder"
          >
            <helix-flex
              align-items="center"
              gap="sm"
            >
              <helix-skeleton shape="circle"></helix-skeleton>
              <helix-flex
                direction="column"
                gap="2xs"
              >
                <helix-skeleton
                  className="line-name"
                  shape="text"
                ></helix-skeleton>
                <helix-skeleton
                  className="line-role"
                  shape="text"
                ></helix-skeleton>
              </helix-flex>
            </helix-flex>
            <helix-skeleton
              lines={2}
              shape="text"
            ></helix-skeleton>
          </helix-flex>
          {person && (
            <helix-flex
              direction="column"
              gap="md"
            >
              <helix-flex
                align-items="center"
                gap="sm"
              >
                <helix-avatar name={person.name}></helix-avatar>
                <helix-flex direction="column">
                  <helix-text
                    as="h3"
                    scale="title"
                  >
                    {person.name}
                  </helix-text>
                  <helix-text emphasis="muted">{person.role}</helix-text>
                </helix-flex>
              </helix-flex>
              <helix-text>{person.bio}</helix-text>
            </helix-flex>
          )}
        </helix-skeleton>
      </helix-card>
      <helix-text emphasis="muted">
        Profiles are read from the team directory, which updates every hour.
      </helix-text>
      <helix-button onClick={() => setLoads((count) => count + 1)}>Reload the profile</helix-button>
    </helix-flex>
  )
}
