import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ForceNode, Note } from '../types'
import { useStore } from '../store/useStore'
import { computeConnectionMap, computeGroups, computeGroupSizes } from '../utils/similarity'
import { updateForceLayout } from '../utils/forceLayout'
import ConnectionLines from './ConnectionLines'

const GROUP_COLORS = [
  '#00ffff', '#ff6ec7', '#ffd700', '#7fff00',
  '#ff4500', '#9370db', '#00fa9a', '#ff69b4',
  '#87ceeb', '#ffa07a', '#98fb98', '#dda0dd',
]

function buildForceNodes(notes: Note[], previousNodes: ForceNode[] = []): ForceNode[] {
  const groups = computeGroups(notes)
  const groupKeys = Array.from(groups.keys())
  const colorMap = new Map<string, string>()
  const connectionMap = computeConnectionMap(notes)
  const previousMap = new Map(previousNodes.map(node => [node.id, node]))
  groupKeys.forEach((key, i) => {
    const color = GROUP_COLORS[i % GROUP_COLORS.length]
    for (const note of groups.get(key)!) {
      colorMap.set(note.id, color)
    }
  })

  return notes.map((note) => {
    const previous = previousMap.get(note.id)
    const connections = connectionMap.get(note.id) || []
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 1 + Math.random() * 2
    return {
      id: note.id,
      x: previous?.x ?? r * Math.sin(phi) * Math.cos(theta),
      y: previous?.y ?? r * Math.sin(phi) * Math.sin(theta),
      z: previous?.z ?? r * Math.cos(phi) * 0.5,
      vx: previous?.vx ?? 0,
      vy: previous?.vy ?? 0,
      vz: previous?.vz ?? 0,
      connections,
      connectionSet: new Set(connections),
      groupColor: colorMap.get(note.id) || '#00ffff',
    }
  })
}

export default function NoteNodes() {
  const notes = useStore(s => s.notes)
  const workspaces = useStore(s => s.workspaces)
  const searchQuery = useStore(s => s.searchQuery)
  const timelinePosition = useStore(s => s.timelinePosition)
  const setShowEditor = useStore(s => s.setShowEditor)
  const setEditingNoteId = useStore(s => s.setEditingNoteId)
  const setFocusNoteId = useStore(s => s.setFocusNoteId)
  const setBubbleMessage = useStore(s => s.setBubbleMessage)

  const nodesRef = useRef<ForceNode[]>([])
  const draggedId = useRef<string | null>(null)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const intersectPoint = useRef(new THREE.Vector3())
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const frameCount = useRef(0)
  const isDragging = useRef(false)
  const { gl } = useThree()

  const timelineVisible = useMemo(() => {
    if (timelinePosition >= 1 || notes.length === 0) return new Set(notes.map(n => n.id))
    const times = notes.map(n => n.createdAt).sort((a, b) => a - b)
    const minTime = times[0]
    const maxTime = times[times.length - 1]
    const cutOff = minTime + (maxTime - minTime) * timelinePosition
    return new Set(notes.filter(n => n.createdAt <= cutOff).map(n => n.id))
  }, [notes, timelinePosition])

  const searchLower = searchQuery.toLowerCase().trim()

  const visibleNotes = useMemo(() => {
    if (notes.length === 0) return []
    return notes.filter(n => timelineVisible.has(n.id))
  }, [notes, timelineVisible])

  const workspaceCenterMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>()
    const wsPositions = new Map<string, { x: number; y: number; z: number }>()
    for (let i = 0; i < workspaces.length; i++) {
      const angle = (i / workspaces.length) * Math.PI * 2
      wsPositions.set(workspaces[i].id, {
        x: Math.cos(angle) * 10,
        y: 0,
        z: Math.sin(angle) * 10,
      })
    }
    for (const note of notes) {
      const pos = wsPositions.get(note.workspaceId) || { x: 0, y: 0, z: 0 }
      map.set(note.id, pos)
    }
    return map
  }, [notes, workspaces])

  const groupSizes = useMemo(() => computeGroupSizes(visibleNotes), [visibleNotes])

  const graphVersion = useMemo(() => (
    visibleNotes
      .map(n => `${n.id}:${n.updatedAt}:${n.title}:${n.keywords}:${n.workspaceId}`)
      .join('|')
  ), [visibleNotes])

  const graphVersionRef = useRef('')
  const notesChanged = graphVersionRef.current !== graphVersion

  if (notesChanged) {
    nodesRef.current = buildForceNodes(visibleNotes, nodesRef.current)
    graphVersionRef.current = graphVersion
  }

  useEffect(() => {
    const posMap = new Map<string, ForceNode>()
    for (const node of nodesRef.current) {
      posMap.set(node.id, node)
    }
    (window as any).__nodePositions = posMap
  }, [notesChanged])

  const handleEdit = useCallback((id: string) => {
    setEditingNoteId(id)
    setShowEditor(true)
  }, [setEditingNoteId, setShowEditor])

  const handleFocus = useCallback((id: string) => {
    setFocusNoteId(id)
    setBubbleMessage('Press ESC to zoom out')
    setTimeout(() => setBubbleMessage(null), 2000)
  }, [setFocusNoteId, setBubbleMessage])

  const handleDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    pointerDownPos.current = { x: clientX, y: clientY }
    draggedId.current = id
    isDragging.current = false
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    const handleUp = () => {
      if (draggedId.current && !isDragging.current) {
        handleEdit(draggedId.current)
      }
      draggedId.current = null
      isDragging.current = false
    }
    canvas.addEventListener('pointerup', handleUp)
    return () => canvas.removeEventListener('pointerup', handleUp)
  }, [gl, handleEdit])

  useFrame((state) => {
    frameCount.current++

    if (nodesRef.current.length > 0 && frameCount.current % 2 === 0) {
      nodesRef.current = updateForceLayout(
        nodesRef.current,
        groupSizes,
        workspaceCenterMap,
        draggedId.current
      )
    }

    if (draggedId.current) {
      const node = nodesRef.current.find(n => n.id === draggedId.current)
      if (node) {
        const dx = (state.pointer.x * state.size.width / 2 + state.size.width / 2) - pointerDownPos.current.x
        const dy = -(state.pointer.y * state.size.height / 2 + state.size.height / 2) + pointerDownPos.current.y
        const moved = Math.sqrt(dx * dx + dy * dy)

        if (moved > 5) {
          isDragging.current = true
          const raycaster = new THREE.Raycaster()
          const mouse = new THREE.Vector2(state.pointer.x, state.pointer.y)
          raycaster.setFromCamera(mouse, state.camera)
          if (raycaster.ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
            node.x += (intersectPoint.current.x - node.x) * 0.4
            node.y += (intersectPoint.current.y - node.y) * 0.4
            node.z += (intersectPoint.current.z - node.z) * 0.4
            node.vx = 0
            node.vy = 0
            node.vz = 0
          }
        }
      }
    }

    const posMap = (window as any).__nodePositions
    if (posMap) {
      for (const node of nodesRef.current) {
        posMap.set(node.id, node)
      }
    }
  })

  if (visibleNotes.length === 0) return null

  const isSearching = searchLower.length > 0

  const matchingIds = isSearching ? new Set(
    visibleNotes.filter(n => {
      const text = (n.title + ' ' + n.keywords).toLowerCase()
      return text.includes(searchLower)
    }).map(n => n.id)
  ) : null

  return (
    <group>
      <ConnectionLines nodesRef={nodesRef} graphVersion={graphVersion} />
      {nodesRef.current.map((node) => {
        const dimmed = isSearching && !matchingIds!.has(node.id)
        return (
          <NoteSphere
            key={node.id}
            node={node}
            isDragged={draggedId.current === node.id}
            dimmed={dimmed}
            onDragStart={handleDragStart}
            onFocus={handleFocus}
          />
        )
      })}
    </group>
  )
}

function NoteSphere({
  node,
  isDragged,
  dimmed,
  onDragStart,
  onFocus,
}: {
  node: ForceNode
  isDragged: boolean
  dimmed?: boolean
  onDragStart: (id: string, clientX: number, clientY: number) => void
  onFocus: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hovered = useRef(false)

  useFrame(() => {
    if (meshRef.current && !isDragged) {
      meshRef.current.position.set(node.x, node.y, node.z)
    }
    const sphere = meshRef.current
    if (sphere && hovered.current) {
      sphere.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.05)
    } else if (sphere) {
      sphere.scale.setScalar(dimmed ? 0.5 : 1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[node.x, node.y, node.z]}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDragStart(node.id, e.clientX, e.clientY)
      }}
      onPointerOver={() => { hovered.current = true; document.body.style.cursor = 'grab' }}
      onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'default' }}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDragged) onFocus(node.id)
      }}
    >
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshBasicMaterial
        color={node.groupColor}
        transparent
        opacity={dimmed ? 0.15 : (isDragged ? 0.6 : 0.9)}
      />
    </mesh>
  )
}
