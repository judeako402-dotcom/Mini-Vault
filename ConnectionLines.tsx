import { useMemo, useRef, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ForceNode } from '../types'

type LinePair = [string, string]

function computeLinePairs(nodes: ForceNode[]): LinePair[] {
  const nodeIds = new Set(nodes.map(n => n.id))
  const pairs: LinePair[] = []
  const seen = new Set<string>()

  for (const node of nodes) {
    for (const connId of node.connections) {
      if (!nodeIds.has(connId)) continue
      const key = [node.id, connId].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push([node.id, connId])
    }
  }

  return pairs
}

export default function ConnectionLines({
  nodesRef,
  graphVersion,
}: {
  nodesRef: RefObject<ForceNode[] | null>
  graphVersion: string
}) {
  const lineRef = useRef<THREE.LineSegments>(null)
  const pairsRef = useRef<LinePair[]>([])
  const bufferRef = useRef<Float32Array>(new Float32Array(0))
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(bufferRef.current, 3))
    return geo
  }, [])

  useFrame(() => {
    const nodes = nodesRef.current
    const line = lineRef.current
    if (!nodes || nodes.length === 0 || !line) return

    const nodeMap = new Map(nodes.map(node => [node.id, node]))
    const positions = bufferRef.current

    for (let i = 0; i < pairsRef.current.length; i++) {
      const [fromId, toId] = pairsRef.current[i]
      const from = nodeMap.get(fromId)
      const to = nodeMap.get(toId)
      if (!from || !to) continue
      const offset = i * 6
      positions[offset] = from.x
      positions[offset + 1] = from.y
      positions[offset + 2] = from.z
      positions[offset + 3] = to.x
      positions[offset + 4] = to.y
      positions[offset + 5] = to.z
    }

    const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute
    attribute.needsUpdate = true
  })

  const nodes = nodesRef.current || []
  pairsRef.current = computeLinePairs(nodes)
  const nextLength = pairsRef.current.length * 6
  if (bufferRef.current.length !== nextLength) {
    bufferRef.current = new Float32Array(nextLength)
    geometry.setAttribute('position', new THREE.BufferAttribute(bufferRef.current, 3))
  }
  geometry.setDrawRange(0, pairsRef.current.length * 2)

  if (!nodesRef.current || nodesRef.current.length === 0 || !graphVersion) return null

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineDashedMaterial
        color="#00ffff"
        transparent
        opacity={0.2}
        dashSize={0.08}
        gapSize={0.06}
      />
    </lineSegments>
  )
}
