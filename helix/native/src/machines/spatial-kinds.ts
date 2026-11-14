/**
 * The spatial charts a phone draws, by their family: each a drawing the
 * shared spatial chart hosts in its box.
 */

import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { spatialBar } from './spatial-bar'
import { type SpatialKind, useSpatialChart } from './spatial-chart'
import { spatialRibbon } from './spatial-ribbon'
import { spatialScatter } from './spatial-scatter'

/** Each family's drawing, by its name. */
const KINDS: Readonly<Record<string, SpatialKind<never>>> = {
  'spatial-bar-chart': spatialBar as unknown as SpatialKind<never>,
  'spatial-ribbon-chart': spatialRibbon as unknown as SpatialKind<never>,
  'spatial-scatter-chart': spatialScatter as unknown as SpatialKind<never>,
}

/** Hosts the spatial chart a family draws. */
export const useSpatial = (family: Family, props: Props, use: MachineUse): Behavior =>
  useSpatialChart(
    KINDS[family.name] ?? (KINDS['spatial-scatter-chart'] as SpatialKind<never>),
    family,
    props,
    use,
  )
