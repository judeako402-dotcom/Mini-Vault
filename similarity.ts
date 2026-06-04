import { Note } from '../types';

export function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computeConnections(notes: Note[], noteId: string): string[] {
  const note = notes.find(n => n.id === noteId);
  if (!note) return [];

  const noteTokens = tokenize(note.title + ' ' + note.keywords);
  const connections: string[] = [];

  for (const other of notes) {
    if (other.id === noteId) continue;
    const otherTokens = tokenize(other.title + ' ' + other.keywords);
    const similarity = jaccardSimilarity(noteTokens, otherTokens);
    if (similarity >= 0.3 || note.title.toLowerCase() === other.title.toLowerCase()) {
      connections.push(other.id);
    }
  }

  return connections;
}

export function computeConnectionMap(notes: Note[]): Map<string, string[]> {
  const tokenMap = new Map<string, Set<string>>();
  const result = new Map<string, string[]>();

  for (const note of notes) {
    tokenMap.set(note.id, tokenize(note.title + ' ' + note.keywords));
    result.set(note.id, []);
  }

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteTokens = tokenMap.get(note.id)!;
    for (let j = i + 1; j < notes.length; j++) {
      const other = notes[j];
      const otherTokens = tokenMap.get(other.id)!;
      const similarity = jaccardSimilarity(noteTokens, otherTokens);
      const sameTitle = note.title.toLowerCase() === other.title.toLowerCase();
      if (similarity >= 0.3 || sameTitle) {
        result.get(note.id)!.push(other.id);
        result.get(other.id)!.push(note.id);
      }
    }
  }

  return result;
}

export function computeGroups(notes: Note[]): Map<string, Note[]> {
  const groups = new Map<string, Note[]>();
  const byId = new Map(notes.map(note => [note.id, note]));
  const connections = computeConnectionMap(notes);
  const visited = new Set<string>();
  let groupIndex = 0;

  for (const note of notes) {
    if (visited.has(note.id)) continue;

    const key = `group-${groupIndex++}`;
    const group: Note[] = [];
    const stack = [note.id];
    visited.add(note.id);

    while (stack.length > 0) {
      const id = stack.pop()!;
      const current = byId.get(id);
      if (!current) continue;

      group.push(current);
      for (const nextId of connections.get(id) || []) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          stack.push(nextId);
        }
      }
    }

    groups.set(key, group);
  }

  return groups;
}

export function computeGroupSizes(notes: Note[]): Map<string, number> {
  const result = new Map<string, number>();
  const groups = computeGroups(notes);
  for (const group of groups.values()) {
    for (const note of group) {
      result.set(note.id, group.length);
    }
  }
  return result;
}

export function computeBacklinks(notes: Note[], noteId: string): { id: string; title: string; excerpt: string }[] {
  const target = notes.find(n => n.id === noteId);
  if (!target) return [];
  const targetTitle = target.title.toLowerCase().trim();
  if (!targetTitle) return [];
  const results: { id: string; title: string; excerpt: string }[] = [];

  for (const note of notes) {
    if (note.id === noteId) continue;
    const body = (note.title + ' ' + note.keywords + ' ' +
      note.blocks.map(b => {
        if (b.type === 'text') return b.content;
        if (b.type === 'bullet') return b.items.join(' ');
        return b.items.map(i => i.text).join(' ');
      }).join(' ')).toLowerCase();
    if (body.includes(targetTitle)) {
      const excerpt = extractExcerpt(body, targetTitle);
      results.push({ id: note.id, title: note.title, excerpt });
    }
  }
  return results;
}

function extractExcerpt(text: string, term: string): string {
  const idx = text.indexOf(term);
  if (idx === -1) return text.slice(0, 60);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + term.length + 30);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  return excerpt;
}

const GROUP_COLORS = [
  '#00ffff', '#ff6ec7', '#ffd700', '#7fff00',
  '#ff4500', '#9370db', '#00fa9a', '#ff69b4',
  '#87ceeb', '#ffa07a', '#98fb98', '#dda0dd',
];

export function assignGroupColors(notes: Note[]): Map<string, string> {
  const groups = computeGroups(notes);
  const colors = new Map<string, string>();
  let i = 0;
  for (const key of groups.keys()) {
    colors.set(key, GROUP_COLORS[i % GROUP_COLORS.length]);
    i++;
  }
  return colors;
}
