import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export default function SpinningBox({
  position = [0, 0, 0],
  color = '#00ffff',
  label = '',
  noteCount = 0,
}: {
  position?: [number, number, number]
  color?: string
  label?: string
  noteCount?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const axisRef = useRef({ x: 0.3, y: 0.5, z: 0.2 })
  const lastAxisChange = useRef(Date.now())
  const notes = useStore(s => s.notes)
  const pulseRef = useRef(0)
  const boxEdges = useMemo(() => new THREE.BoxGeometry(3.2, 3.2, 3.2), [])

  const dueCount = notes.filter(n => n.nextReview > 0 && n.nextReview <= Date.now()).length

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const now = Date.now()
    if (now - lastAxisChange.current > 5000) {
      axisRef.current = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0,
      }
      lastAxisChange.current = now
    }
    groupRef.current.rotation.x += delta * axisRef.current.x
    groupRef.current.rotation.y += delta * axisRef.current.y
    groupRef.current.rotation.z += delta * axisRef.current.z

    if (dueCount > 0) {
      pulseRef.current = Math.sin(now * 0.003) * 0.5 + 0.5
    } else {
      pulseRef.current = 0
    }
  })

  const glowColor = new THREE.Color(color)
  glowColor.multiplyScalar(1 + pulseRef.current * 0.3)

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <boxGeometry args={[3.2, 3.2, 3.2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03 + pulseRef.current * 0.04}
          wireframe
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[boxEdges]} />
        <lineBasicMaterial
          color={glowColor}
          transparent
          opacity={0.4 + pulseRef.current * 0.4}
        />
      </lineSegments>
      <mesh>
        <boxGeometry args={[3.4, 3.4, 3.4]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.015 + pulseRef.current * 0.03}
          side={THREE.BackSide}
        />
      </mesh>

      <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          color: '#fff',
          fontSize: 14,
          fontFamily: 'monospace',
          textAlign: 'center',
          textShadow: `0 0 10px ${color}88`,
          background: `rgba(0,0,0,0.7)`,
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${color}33`,
          minWidth: 120,
          whiteSpace: 'nowrap',
        }}>
          {label || `${noteCount} note${noteCount !== 1 ? 's' : ''}`}
          {dueCount > 0 && (
            <span style={{ color: '#ff4444', marginLeft: 8, fontSize: 10 }}>
              ({dueCount} due)
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}
