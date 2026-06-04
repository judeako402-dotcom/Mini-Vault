import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SpinningBox from './SpinningBox'
import NoteNodes from './NoteNodes'
import CameraController from './CameraController'
import { useStore } from '../store/useStore'

function Particles() {
  const count = 500
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      arr[i] = (Math.random() - 0.5) * 40
    }
    return arr
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00ffff"
        size={0.03}
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  )
}

export default function NeuralCanvas() {
  const workspaces = useStore(s => s.workspaces)
  const notes = useStore(s => s.notes)

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 60 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0a0a0a'))
      }}
    >
      <ambientLight intensity={0.5} />
      <Particles />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={40}
      />
      <CameraController />
      {workspaces.map((ws, i) => {
        const angle = (i / workspaces.length) * Math.PI * 2
        const pos: [number, number, number] = [
          Math.cos(angle) * 10,
          0,
          Math.sin(angle) * 10,
        ]
        const wsNoteCount = notes.filter(n => n.workspaceId === ws.id).length
        return (
          <SpinningBox
            key={ws.id}
            position={pos}
            color={ws.color}
            label={`${ws.name} (${wsNoteCount})`}
            noteCount={wsNoteCount}
          />
        )
      })}
      <NoteNodes />
    </Canvas>
  )
}
