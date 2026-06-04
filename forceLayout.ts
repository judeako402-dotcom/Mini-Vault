import { ForceNode } from '../types';

export function updateForceLayout(
  nodes: ForceNode[],
  groupSizes: Map<string, number>,
  workspaceCenters: Map<string, { x: number; y: number; z: number }>,
  draggedId: string | null = null,
  centerStrength = 0.02,
  repulsionStrength = 3.0,
  attractionStrength = 0.01,
  damping = 0.85,
  minDist = 2.0
): ForceNode[] {
  const n = nodes.length;
  if (n === 0) return nodes;

  const updated = nodes.map(n => ({ ...n }));

  for (let i = 0; i < n; i++) {
    const node = updated[i];
    if (node.id === draggedId) continue;

    const groupSize = groupSizes.get(node.id) || 1;
    const isIsolated = groupSize === 1;

    const wc = workspaceCenters.get(node.id) || { x: 0, y: 0, z: 0 };

    const dxc = node.x - wc.x;
    const dyc = node.y - wc.y;
    const dzc = node.z - wc.z;

    const cs = isIsolated ? centerStrength * 2.5 : centerStrength * 0.4;
    node.vx += -dxc * cs;
    node.vy += -dyc * cs;
    node.vz += -dzc * cs;

    if (!isIsolated) {
      const pushOut = 0.004;
      node.vx += dxc * pushOut;
      node.vy += dyc * pushOut;
      node.vz += dzc * pushOut;
    }

    for (let j = i + 1; j < n; j++) {
      const other = updated[j];
      if (other.id === draggedId) continue;

      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const dz = other.z - node.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const isConnected = node.connectionSet.has(other.id);

      if (isConnected) {
        const force = Math.max(0, dist - minDist) * attractionStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        node.vx += fx;
        node.vy += fy;
        node.vz += fz;
        other.vx -= fx;
        other.vy -= fy;
        other.vz -= fz;
      } else {
        const force = repulsionStrength / (dist * dist + 0.1);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        node.vx -= fx;
        node.vy -= fy;
        node.vz -= fz;
        other.vx += fx;
        other.vy += fy;
        other.vz += fz;
      }
    }

    node.vx *= damping;
    node.vy *= damping;
    node.vz *= damping;

    node.x += node.vx;
    node.y += node.vy;
    node.z += node.vz;

    const bound = isIsolated ? 3.5 : 18;
    node.x = Math.max(wc.x - bound, Math.min(wc.x + bound, node.x));
    node.y = Math.max(wc.y - bound, Math.min(wc.y + bound, node.y));
    node.z = Math.max(wc.z - bound, Math.min(wc.z + bound, node.z));
  }

  return updated;
}
