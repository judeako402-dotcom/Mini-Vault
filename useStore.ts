import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Note, Block, Workspace, getDefaultWorkspaces } from '../types';
import { computeConnectionMap } from '../utils/similarity';

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 11);
}

export function createBlock(type: Block['type']): Block {
  const id = generateId();
  switch (type) {
    case 'text':
      return { id, type: 'text', content: '' };
    case 'bullet':
      return { id, type: 'bullet', items: [''] };
    case 'checklist':
      return { id, type: 'checklist', items: [{ id: generateId(), text: '', checked: false }] };
  }
}

function computeNextReview(reviewCount: number): number {
  const intervals = [0, 1, 3, 7, 16, 35, 75, 160];
  const index = Math.min(reviewCount, intervals.length - 1);
  return Date.now() + intervals[index] * 24 * 60 * 60 * 1000;
}

function normalizeNote(n: any): Note {
  return {
    id: n.id,
    title: n.title,
    keywords: n.keywords || '',
    blocks: n.blocks || [],
    createdAt: n.createdAt || Date.now(),
    updatedAt: n.updatedAt || Date.now(),
    workspaceId: n.workspaceId || 'default',
    reviewCount: n.reviewCount || 0,
    nextReview: n.nextReview || 0,
  };
}

interface StoreState {
  notes: Note[];
  showEditor: boolean;
  editingNoteId: string | null;
  newNoteAnimationId: string | null;
  bubbleMessage: string | null;

  workspaces: Workspace[];
  currentWorkspaceId: string;
  searchQuery: string;
  focusNoteId: string | null;
  reviewNoteId: string | null;
  reviewRevealed: boolean;
  timelinePosition: number;

  addNote: (title: string, keywords: string, blocks: Block[], workspaceId?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => Note | undefined;

  setShowEditor: (show: boolean) => void;
  setEditingNoteId: (id: string | null) => void;
  setNewNoteAnimationId: (id: string | null) => void;
  setBubbleMessage: (msg: string | null) => void;

  setSearchQuery: (q: string) => void;
  setFocusNoteId: (id: string | null) => void;
  setTimelinePosition: (pos: number) => void;
  setCurrentWorkspaceId: (id: string) => void;
  addWorkspace: (name: string) => string;
  deleteWorkspace: (id: string) => void;

  setReviewNoteId: (id: string | null) => void;
  setReviewRevealed: (revealed: boolean) => void;
  startReview: () => string | null;
  markReviewed: (id: string) => void;

  exportNotesAsJson: () => string;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      notes: [],
      showEditor: false,
      editingNoteId: null,
      newNoteAnimationId: null,
      bubbleMessage: null,

      workspaces: getDefaultWorkspaces(),
      currentWorkspaceId: 'default',
      searchQuery: '',
      focusNoteId: null,
      reviewNoteId: null,
      reviewRevealed: false,
      timelinePosition: 1,

      addNote: (title, keywords, blocks, workspaceId) => {
        const id = generateId();
        const now = Date.now();
        const note: Note = {
          id, title, keywords, blocks,
          createdAt: now, updatedAt: now,
          workspaceId: workspaceId || get().currentWorkspaceId,
          reviewCount: 0, nextReview: 0,
        };
        set(state => ({ notes: [...state.notes, note] }));
        const ws = get().workspaces.find(w => w.id === note.workspaceId);
        set({ bubbleMessage: `1 note added to ${ws?.name || 'Main'}` });
        setTimeout(() => { if (get().bubbleMessage) set({ bubbleMessage: null }) }, 2500);
        return id;
      },

      updateNote: (id, updates) => {
        set(state => ({
          notes: state.notes.map(n =>
            n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
          ),
        }));
      },

      deleteNote: (id) => {
        set(state => ({
          notes: state.notes.filter(n => n.id !== id),
        }));
      },

      getNote: (id) => get().notes.find(n => n.id === id),

      setShowEditor: (show) => set({ showEditor: show }),
      setEditingNoteId: (id) => set({ editingNoteId: id }),
      setNewNoteAnimationId: (id) => set({ newNoteAnimationId: id }),
      setBubbleMessage: (msg) => set({ bubbleMessage: msg }),

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFocusNoteId: (id) => set({ focusNoteId: id }),
      setTimelinePosition: (pos) => set({ timelinePosition: pos }),
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

      addWorkspace: (name) => {
        const id = generateId();
        const colors = ['#ff6ec7', '#ffd700', '#7fff00', '#ff4500', '#9370db', '#00fa9a'];
        const usedColors = get().workspaces.map(w => w.color);
        const color = colors.find(c => !usedColors.includes(c)) || '#ffffff';
        set(state => ({ workspaces: [...state.workspaces, { id, name, color }] }));
        set({ bubbleMessage: `Workspace "${name}" created` });
        setTimeout(() => { if (get().bubbleMessage) set({ bubbleMessage: null }) }, 2500);
        return id;
      },

      deleteWorkspace: (id) => {
        const state = get();
        if (state.workspaces.length <= 1) return;
        const newWs = state.workspaces.find(w => w.id !== id);
        set({
          workspaces: state.workspaces.filter(w => w.id !== id),
          notes: state.notes.map(n => n.workspaceId === id ? { ...n, workspaceId: newWs!.id } : n),
          currentWorkspaceId: state.currentWorkspaceId === id ? newWs!.id : state.currentWorkspaceId,
        });
      },

      setReviewNoteId: (id) => set({ reviewNoteId: id, reviewRevealed: false }),
      setReviewRevealed: (revealed) => set({ reviewRevealed: revealed }),

      startReview: () => {
        const now = Date.now();
        const due = get().notes.filter(n => n.nextReview > 0 && n.nextReview <= now);
        if (due.length === 0) return null;
        const sorted = due.sort((a, b) => a.nextReview - b.nextReview);
        set({ reviewNoteId: sorted[0].id, reviewRevealed: false });
        return sorted[0].id;
      },

      markReviewed: (id) => {
        set(state => ({
          notes: state.notes.map(n =>
            n.id === id ? {
              ...n,
              reviewCount: n.reviewCount + 1,
              nextReview: computeNextReview(n.reviewCount + 1),
            } : n
          ),
          reviewNoteId: null,
          reviewRevealed: false,
        }));
        set({ bubbleMessage: 'Review recorded' });
        setTimeout(() => { if (get().bubbleMessage) set({ bubbleMessage: null }) }, 2500);
      },

      exportNotesAsJson: () => {
        const notes = get().notes;
        const workspaces = get().workspaces;
        const connectionMap = computeConnectionMap(notes);
        const noteById = new Map(notes.map(note => [note.id, note]));
        const data = {
          exportedAt: new Date().toISOString(),
          workspaces,
          notes: notes.map(n => ({
            id: n.id,
            title: n.title,
            keywords: n.keywords,
            workspace: workspaces.find(w => w.id === n.workspaceId)?.name || 'Main',
            createdAt: new Date(n.createdAt).toISOString(),
            content: n.blocks.map(b => {
              if (b.type === 'text') return b.content;
              if (b.type === 'bullet') return b.items.join('\n');
              return b.items.map(i => `[${i.checked ? 'x' : ' '}] ${i.text}`).join('\n');
            }).join('\n\n'),
            connections: (connectionMap.get(n.id) || [])
              .map(id => noteById.get(id))
              .filter((other): other is Note => Boolean(other))
              .map(m => ({ id: m.id, title: m.title })),
          })),
        };
        return JSON.stringify(data, null, 2);
      },
    }),
    {
      name: 'neural-notes-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notes: state.notes,
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
        timelinePosition: state.timelinePosition,
      }),
      merge: (persisted, current) => {
        const p = persisted as any;
        return {
          ...current,
          ...p,
          notes: (p.notes || []).map(normalizeNote),
          workspaces: p.workspaces || getDefaultWorkspaces(),
        };
      },
    }
  )
);
