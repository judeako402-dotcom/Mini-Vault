import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export default function CameraController() {
  const focusNoteId = useStore(s => s.focusNoteId)
  const setFocusNoteId = useStore(s => s.setFocusNoteId)
  const notes = useStore(s => s.notes)
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 0, 12))
  const isAnimating = useRef(false)
  const velocity = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!focusNoteId) return
    const note = notes.find(n => n.id === focusNoteId)
    if (!note) return
    const nodeRef = (window as any).__nodePositions?.get(focusNoteId)
    if (nodeRef) {
      const offset = new THREE.Vector3(
        nodeRef.x * 0.5,
        nodeRef.y * 0.5,
        nodeRef.z * 0.5 + 4
      )
      targetPos.current.copy(offset)
      isAnimating.current = true
    }
  }, [focusNoteId, notes])

  useFrame((_, delta) => {
    if (!isAnimating.current) return

    const spring = 3.0
    const damping = 6.0

    const diff = new THREE.Vector3()
    diff.copy(targetPos.current).sub(camera.position)

    velocity.current.x += diff.x * spring * delta
    velocity.current.y += diff.y * spring * delta
    velocity.current.z += diff.z * spring * delta

    velocity.current.x *= (1 - damping * delta)
    velocity.current.y *= (1 - damping * delta)
    velocity.current.z *= (1 - damping * delta)

    camera.position.x += velocity.current.x * delta
    camera.position.y += velocity.current.y * delta
    camera.position.z += velocity.current.z * delta

    camera.lookAt(0, 0, 0)

    if (diff.length() < 0.05 && velocity.current.length() < 0.01) {
      isAnimating.current = false
      velocity.current.set(0, 0, 0)
    }
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && focusNoteId) {
      setFocusNoteId(null)
      targetPos.current.set(0, 0, 12)
      isAnimating.current = true
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusNoteId, setFocusNoteId])

  return null
}
