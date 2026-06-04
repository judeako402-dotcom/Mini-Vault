export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

export interface BulletBlock {
  id: string;
  type: 'bullet';
  items: string[];
}

export interface ChecklistBlock {
  id: string;
  type: 'checklist';
  items: ChecklistItem[];
}

export type Block = TextBlock | BulletBlock | ChecklistBlock;

export interface Note {
  id: string;
  title: string;
  keywords: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
  workspaceId: string;
  reviewCount: number;
  nextReview: number;
}

export interface ForceNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  connections: string[];
  connectionSet: Set<string>;
  groupColor: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
}

export function getDefaultWorkspaces(): Workspace[] {
  return [{ id: 'default', name: 'Main', color: '#00ffff' }];
}
