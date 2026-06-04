import { useState, useEffect, useMemo } from 'react'
import { useStore, createBlock } from '../store/useStore'
import { Block } from '../types'
import { computeBacklinks, computeConnections } from '../utils/similarity'

export default function NoteEditor() {
  const notes = useStore(s => s.notes)
  const workspaces = useStore(s => s.workspaces)
  const showEditor = useStore(s => s.showEditor)
  const editingNoteId = useStore(s => s.editingNoteId)
  const setShowEditor = useStore(s => s.setShowEditor)
  const setEditingNoteId = useStore(s => s.setEditingNoteId)
  const addNote = useStore(s => s.addNote)
  const updateNote = useStore(s => s.updateNote)
  const deleteNote = useStore(s => s.deleteNote)
  const setFocusNoteId = useStore(s => s.setFocusNoteId)
  const setBubbleMessage = useStore(s => s.setBubbleMessage)

  const existingNote = editingNoteId ? notes.find(n => n.id === editingNoteId) : null

  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title)
      setKeywords(existingNote.keywords)
      setBlocks(existingNote.blocks.length > 0 ? [...existingNote.blocks] : [])
    } else {
      setTitle('')
      setKeywords('')
      setBlocks([])
    }
  }, [existingNote, showEditor])

  const backlinks = useMemo(() => {
    if (!editingNoteId) return []
    return computeBacklinks(notes, editingNoteId)
  }, [notes, editingNoteId])

  const connectedIds = useMemo(() => {
    if (!editingNoteId) return new Set<string>()
    return new Set(computeConnections(notes, editingNoteId))
  }, [notes, editingNoteId])

  const connectedNotes = notes.filter(n => connectedIds.has(n.id) && n.id !== editingNoteId)

  const ws = existingNote ? workspaces.find(w => w.id === existingNote.workspaceId) : undefined
  const wsColor = ws?.color || '#00ffff'

  if (!showEditor) return null

  const addBlock = (type: Block['type']) => {
    setBlocks([...blocks, createBlock(type)])
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } as Block : b))
  }

  const handleSave = () => {
    if (!title.trim()) return

    if (editingNoteId && existingNote) {
      updateNote(editingNoteId, { title, keywords, blocks })
      setBubbleMessage('Note updated')
    } else {
      addNote(title, keywords, blocks)
    }
    setTimeout(() => setBubbleMessage(null), 2500)
    setShowEditor(false)
    setEditingNoteId(null)
  }

  const handleDelete = () => {
    if (editingNoteId && existingNote) {
      deleteNote(editingNoteId)
      setBubbleMessage('Note deleted')
      setTimeout(() => setBubbleMessage(null), 2000)
      setShowEditor(false)
      setEditingNoteId(null)
    }
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingNoteId(null)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: 540, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
        background: '#111', border: `1px solid ${wsColor}33`,
        borderRadius: 12, padding: 24, color: '#fff', fontFamily: 'monospace',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: wsColor, fontSize: 16 }}>
            {editingNoteId ? 'Edit Note' : 'New Note'}
          </h2>
          {editingNoteId && (
            <button onClick={handleDelete} style={{
              background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)',
              borderRadius: 6, padding: '4px 12px', color: '#ff5555', fontSize: 11,
              cursor: 'pointer', fontFamily: 'monospace',
            }}>Delete</button>
          )}
        </div>

        <label style={{ display: 'block', marginBottom: 4, fontSize: 11, color: '#888' }}>TITLE</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Note title..."
          style={{
            width: '100%', padding: '8px 10px', marginBottom: 12,
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 6,
            color: '#fff', fontSize: 14, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = wsColor }}
          onBlur={e => { e.target.style.borderColor = '#333' }}
        />

        <label style={{ display: 'block', marginBottom: 4, fontSize: 11, color: '#888' }}>KEYWORDS</label>
        <input value={keywords} onChange={e => setKeywords(e.target.value)}
          placeholder="keywords for auto-grouping..."
          style={{
            width: '100%', padding: '8px 10px', marginBottom: 16,
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 6,
            color: '#888', fontSize: 12, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = wsColor }}
          onBlur={e => { e.target.style.borderColor = '#333' }}
        />

        <label style={{ display: 'block', marginBottom: 8, fontSize: 11, color: '#888' }}>CONTENT</label>
        {blocks.map((block) => (
          <BlockEditor key={block.id} block={block}
            onUpdate={(updates) => updateBlock(block.id, updates)}
            onRemove={() => removeBlock(block.id)}
          />
        ))}

        <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 20 }}>
          <button onClick={() => addBlock('text')} style={blockBtnStyle}>+ Text</button>
          <button onClick={() => addBlock('bullet')} style={blockBtnStyle}>+ Bullets</button>
          <button onClick={() => addBlock('checklist')} style={blockBtnStyle}>+ Checklist</button>
        </div>

        {editingNoteId && (backlinks.length > 0 || connectedNotes.length > 0) && (
          <div style={{
            marginBottom: 16, padding: 12,
            background: 'rgba(0,255,255,0.03)',
            borderRadius: 8, border: `1px solid ${wsColor}22`,
          }}>
            <div style={{ fontSize: 11, color: wsColor, marginBottom: 8 }}>
              CONNECTIONS & BACKLINKS
            </div>
            {connectedNotes.length > 0 && (
              <div style={{ marginBottom: backlinks.length > 0 ? 10 : 0 }}>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Forward links:</div>
                {connectedNotes.map(n => (
                  <div key={n.id}
                    onClick={() => { setEditingNoteId(n.id); setTitle(n.title); setKeywords(n.keywords); setBlocks([...n.blocks]) }}
                    style={{
                      padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      color: wsColor, fontSize: 12, marginBottom: 2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${wsColor}11` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {'->'} {n.title}
                  </div>
                ))}
              </div>
            )}
            {backlinks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Backlinks (notes mentioning this title):</div>
                {backlinks.map(bl => (
                  <div key={bl.id}
                    onClick={() => { setEditingNoteId(bl.id); setTitle(bl.title); setKeywords(''); setBlocks([]) }}
                    style={{
                      padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      color: '#aaa', fontSize: 12, marginBottom: 2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#222' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {'<-'} {bl.title}
                    <span style={{ color: '#555', fontSize: 10, marginLeft: 6 }}>
                      "{bl.excerpt}"
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleCancel} style={{
            ...actionBtnStyle, background: 'transparent', border: '1px solid #333', color: '#888',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            ...actionBtnStyle, background: 'rgba(0,255,255,0.15)',
            border: '1px solid rgba(0,255,255,0.4)', color: '#00ffff',
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function BlockEditor({ block, onUpdate, onRemove }: {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
  onRemove: () => void
}) {
  switch (block.type) {
    case 'text':
      return (
        <div style={blockWrapperStyle}>
          <div style={blockHeaderStyle}>
            <span style={{ fontSize: 10, color: '#666' }}>TEXT</span>
            <button onClick={onRemove} style={removeBtnStyle}>x</button>
          </div>
          <textarea value={block.content} onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Write something..." rows={3}
            style={{
              width: '100%', padding: 8, background: '#1a1a1a',
              border: '1px solid #333', borderRadius: 6, color: '#ccc',
              fontSize: 13, resize: 'vertical', fontFamily: 'monospace', outline: 'none',
            }}
          />
        </div>
      )

    case 'bullet':
      return (
        <div style={blockWrapperStyle}>
          <div style={blockHeaderStyle}>
            <span style={{ fontSize: 10, color: '#666' }}>BULLETS</span>
            <button onClick={onRemove} style={removeBtnStyle}>x</button>
          </div>
          {block.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
              <span style={{ color: '#00ffff', fontSize: 12 }}>*</span>
              <input value={item} onChange={e => {
                const items = [...block.items]; items[i] = e.target.value; onUpdate({ items })
              }} placeholder="Bullet item..."
                style={{
                  flex: 1, padding: '6px 8px', background: '#1a1a1a',
                  border: '1px solid #333', borderRadius: 4, color: '#ccc', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          ))}
          <button onClick={() => onUpdate({ items: [...block.items, ''] })}
            style={{ ...miniBtnStyle, marginTop: 4 }}>+ item</button>
        </div>
      )

    case 'checklist':
      return (
        <div style={blockWrapperStyle}>
          <div style={blockHeaderStyle}>
            <span style={{ fontSize: 10, color: '#666' }}>CHECKLIST</span>
            <button onClick={onRemove} style={removeBtnStyle}>x</button>
          </div>
          {block.items.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
              <input type="checkbox" checked={item.checked}
                onChange={e => {
                  const items = [...block.items]; items[i] = { ...items[i], checked: e.target.checked }; onUpdate({ items })
                }}
                style={{ accentColor: '#00ffff' }}
              />
              <input value={item.text} onChange={e => {
                const items = [...block.items]; items[i] = { ...items[i], text: e.target.value }; onUpdate({ items })
              }} placeholder="Task..."
                style={{
                  flex: 1, padding: '6px 8px', background: '#1a1a1a',
                  border: '1px solid #333', borderRadius: 4,
                  color: item.checked ? '#666' : '#ccc', fontSize: 13,
                  textDecoration: item.checked ? 'line-through' : 'none', outline: 'none',
                }}
              />
            </div>
          ))}
          <button onClick={() => onUpdate({
            items: [...block.items, { id: crypto.randomUUID(), text: '', checked: false }]
          })} style={{ ...miniBtnStyle, marginTop: 4 }}>+ item</button>
        </div>
      )
  }
}

const blockWrapperStyle: React.CSSProperties = {
  marginBottom: 8, padding: 8,
  background: 'rgba(255,255,255,0.02)', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.05)',
}

const blockHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
}

const removeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 16, padding: '0 4px',
}

const blockBtnStyle: React.CSSProperties = {
  padding: '6px 12px', background: 'rgba(0,255,255,0.06)',
  border: '1px solid rgba(0,255,255,0.2)', borderRadius: 6, color: '#00ffff',
  fontSize: 11, cursor: 'pointer',
}

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
}

const miniBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: 'rgba(0,255,255,0.06)',
  border: '1px solid rgba(0,255,255,0.15)', borderRadius: 4, color: '#00ffff',
  fontSize: 10, cursor: 'pointer',
}
