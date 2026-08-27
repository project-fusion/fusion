import { useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Tick a scope', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) =>
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))

  return (
    <helix-flex direction="column" gap="md">
      <helix-checkbox-group
        label="Scopes"
        name="scopes"
        onChange={(event) =>
          say('change', `"${event.currentTarget.value || 'nothing'}", the whole set`)
        }
        onhelix-before-change={(event) =>
          say('helix-before-change', `proposing "${event.detail.value}", refusable`)
        }
        onInput={(event) =>
          say('input', `"${event.currentTarget.value || 'nothing'}", the group and not the box`)
        }
      >
        <helix-checkbox value="read">Read</helix-checkbox>
        <helix-checkbox value="write">Write</helix-checkbox>
        <helix-checkbox value="admin">Admin</helix-checkbox>
      </helix-checkbox-group>

      <helix-list divided label="What arrived">
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
