/** The parts of d3-force-3d the three.js driver calls, which ships no types of its own. */
declare module 'd3-force-3d' {
  export interface SimulationNode {
    fx?: number | null | undefined
    fy?: number | null | undefined
    fz?: number | null | undefined
    id: string
    index?: number
    vx?: number
    vy?: number
    vz?: number
    x: number
    y: number
    z: number
  }

  export interface SimulationLink {
    source: string | SimulationNode
    target: string | SimulationNode
  }

  export type Force = (alpha: number) => void

  export interface Simulation {
    alpha(): number
    alpha(alpha: number): Simulation
    alphaDecay(decay: number): Simulation
    alphaMin(): number
    force(name: string, force: Force | null): Simulation
    nodes(): SimulationNode[]
    stop(): Simulation
    tick(iterations?: number): Simulation
  }

  export interface LinkForce extends Force {
    distance(distance: number): LinkForce
    id(id: (node: SimulationNode) => string): LinkForce
    strength(strength: number): LinkForce
  }

  export interface ManyBodyForce extends Force {
    distanceMax(distance: number): ManyBodyForce
    strength(strength: number): ManyBodyForce
    theta(theta: number): ManyBodyForce
  }

  export function forceSimulation(nodes: SimulationNode[], dimensions?: number): Simulation
  export function forceLink(links: SimulationLink[]): LinkForce
  export function forceManyBody(): ManyBodyForce
  export function forceCenter(x?: number, y?: number, z?: number): Force
}
