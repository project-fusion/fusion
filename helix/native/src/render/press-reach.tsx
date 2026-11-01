/**
 * **A press reaches `--helix-size-target`, in a view nothing draws**, as the
 * web's transparent `::after` does, so a finger near a small control still
 * presses it and nothing drawn moves.
 *
 * The web's box is `inset: calc((var(--helix-size-target) - 100%) / -2)`, which
 * comes to a box the target's size centered on the control. Where the control
 * is larger than the target the box sits inside it. A view placed from the
 * control's center draws the same box without measuring the control, and a
 * rule that writes `inset-block` alone takes the row's own width, as stars side
 * by side do.
 *
 * **A child and not `hitSlop`.** A view's `hitSlop` reaches no further than the
 * views around it, and a control's host is as large as the control. A child
 * past its parent's frame is hit, since Fabric takes a view's overflow into its
 * hit test, and a touch on it is a touch on the press around it.
 */
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { length } from '../style/apply'
import type { Family, Rule, Value } from '../style/form'

/** Whether `value` is a length that reads the target's token. */
const readsTarget = (value: Value): boolean => JSON.stringify(value).includes('"size-target"')

/** The rule that gives `part` its reach on the web, where it has one. */
const reachRule = (family: Family, part: string): Rule | undefined =>
  family.rules.find(
    (rule): rule is Rule =>
      rule.kind === 'rule' &&
      rule.inner === '::after' &&
      rule.target === part &&
      rule.set.some(([property, value]) => property.startsWith('inset') && readsTarget(value)),
  )

/**
 * The box a press of `part` reaches through, or `null` where its family gives
 * the part none.
 */
export const pressReach = (
  family: Family,
  part: string,
  target: string | number | undefined,
  rem: number,
): ReactNode => {
  const rule = reachRule(family, part)
  const size = target === undefined ? undefined : length(target, rem, rem)
  if (rule === undefined || typeof size !== 'number') {
    return null
  }
  const reaches = (property: string): boolean =>
    rule.set.some(([name, value]) => name === property && readsTarget(value))
  const across = reaches('inset') || reaches('inset-inline')
  return (
    <View
      accessibilityElementsHidden
      collapsable={false}
      importantForAccessibility="no-hide-descendants"
      key="press-reach"
      style={{
        height: size,
        marginTop: -size / 2,
        position: 'absolute',
        top: '50%',
        ...(across
          ? { left: '50%', marginLeft: -size / 2, width: size }
          : { left: 0, right: 0 }),
      }}
      testID="press-reach"
    />
  )
}
