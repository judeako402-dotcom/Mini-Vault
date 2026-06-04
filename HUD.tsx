import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'

export default function HUD() {
  const notes = useStore(s => s.notes)
  const workspaces = useStore(s => s.workspaces)
  const currentWorkspaceId = useStore(s => s.currentWorkspaceId)
  const bubbleMessage = useStore(s => s.bubbleMessage)
  const searchQuery = useStore(s => s.searchQuery)
  const timelinePosition = useStore(s => s.timelinePosition)
  const setShowEditor = useStore(s => s.setShowEditor)
  const setEditingNoteId = useStore(s => s.setEditingNoteId)
  const setSearchQuery = useStore(s => s.setSearchQuery)
  const setTimelinePosition = useStore(s => s.setTimelinePosition)
  const setCurrentWorkspaceId = useStore(s => s.setCurrentWorkspaceId)
  const addWorkspace = useStore(s => s.addWorkspace)
  const deleteWorkspace = useStore(s => s.deleteWorkspace)
  const exportNotesAsJson = useStore(s => s.exportNotesAsJson)
  const startReview = useStore(s => s.startReview)
  const setBubbleMessage = useStore(s => s.setBubbleMessage)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showWsMenu, setShowWsMenu] = useState(false)

  const handleAdd = () => {
    setEditingNoteId(null)
    setShowEditor(true)
  }

  const handleExport = () => {
    const json = exportNotesAsJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neural-notes-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBubbleMessage('Notes exported as JSON')
    setTimeout(() => { if (useStore.getState().bubbleMessage) useStore.getState().setBubbleMessage(null) }, 2500)
  }

  const handleReview = () => {
    const id = startReview()
    if (!id) {
      setBubbleMessage('No notes due for review')
      setTimeout(() => { if (useStore.getState().bubbleMessage) useStore.getState().setBubbleMessage(null) }, 2500)
    }
  }

  const currentWs = workspaces.find(w => w.id === currentWorkspaceId)

  const dueCount = notes.filter(n => n.nextReview > 0 && n.nextReview <= Date.now()).length
  const wsNoteCount = notes.filter(n => n.workspaceId === currentWorkspaceId).length

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 10,
    }}>
      {bubbleMessage && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,255,255,0.08)',
          border: '1px solid rgba(0,255,255,0.25)',
          borderRadius: 10,
          padding: '12px 28px',
          color: '#00ffff',
          fontSize: 17,
          fontFamily: 'monospace',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 20px rgba(0,255,255,0.05)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        }}>
          {bubbleMessage}
        </div>
      )}

      <div style={{
        position: 'absolute', top: 20, left: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        pointerEvents: 'auto',
      }}>
        <button
          onClick={handleAdd}
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(0,255,255,0.4)',
            background: 'rgba(0,255,255,0.08)',
            color: '#00ffff',
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            backdropFilter: 'blur(4px)',
            userSelect: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,255,0.2)'; e.currentTarget.style.borderColor = '#00ffff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,255,255,0.4)' }}
        >
          +
        </button>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace' }}>
          {wsNoteCount}
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 20, left: 80,
        display: 'flex', gap: 8, alignItems: 'flex-start', pointerEvents: 'auto',
      }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowWsMenu(!showWsMenu)} style={{
            padding: '6px 14px',
            background: 'rgba(0,0,0,0.5)',
            border: currentWs ? `1px solid ${currentWs.color}44` : '1px solid #333',
            borderRadius: 6,
            color: currentWs?.color || '#888',
            fontSize: 12,
            fontFamily: 'monospace',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentWs?.color || '#00ffff', display: 'inline-block' }} />
            {currentWs?.name || 'Main'}
            <span style={{ fontSize: 8, opacity: 0.5 }}>v</span>
          </button>
          {showWsMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#111', border: '1px solid #333', borderRadius: 8,
              padding: 4, minWidth: 150, zIndex: 20,
            }}>
              {workspaces.map(ws => (
                <div key={ws.id} onClick={() => { setCurrentWorkspaceId(ws.id); setShowWsMenu(false) }}
                  style={{
                    padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                    color: currentWorkspaceId === ws.id ? ws.color : '#aaa',
                    background: currentWorkspaceId === ws.id ? `${ws.color}11` : 'transparent',
                    fontSize: 12, fontFamily: 'monospace',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#222' }}
                  onMouseLeave={e => { e.currentTarget.style.background = currentWorkspaceId === ws.id ? `${ws.color}11` : 'transparent' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ws.color, display: 'inline-block' }} />
                  {ws.name}
                  <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>
                    {notes.filter(n => n.workspaceId === ws.id).length}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #222', marginTop: 4, paddingTop: 4 }}>
                <button onClick={() => {
                  const name = prompt('Workspace name:')
                  if (name?.trim()) { addWorkspace(name.trim()); setShowWsMenu(false) }
                }} style={{
                  width: '100%', padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                  background: 'transparent', border: 'none', color: '#00ffff',
                  fontSize: 11, fontFamily: 'monospace', textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#222' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >+ New Workspace</button>
                {workspaces.length > 1 && currentWs && (
                  <button onClick={() => {
                    if (confirm(`Delete workspace "${currentWs.name}"? Notes will move to Main.`)) {
                      deleteWorkspace(currentWs.id); setShowWsMenu(false)
                    }
                  }} style={{
                    width: '100%', padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                    background: 'transparent', border: 'none', color: '#ff5555',
                    fontSize: 11, fontFamily: 'monospace', textAlign: 'left',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#222' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >Delete Workspace</button>
                )}
              </div>
            </div>
          )}
        </div>

        <input ref={searchInputRef} value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          style={{
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.5)',
            border: searchQuery ? '1px solid #00ffff44' : '1px solid #333',
            borderRadius: 6, color: '#fff',
            fontSize: 12, fontFamily: 'monospace',
            width: 160, outline: 'none',
            backdropFilter: 'blur(4px)',
          }}
          onFocus={e => { e.target.style.borderColor = '#00ffff44' }}
          onBlur={e => { e.target.style.borderColor = '#333' }}
        />

        <button onClick={handleExport} style={{
          padding: '6px 12px',
          background: 'rgba(0,255,255,0.06)',
          border: '1px solid rgba(0,255,255,0.2)',
          borderRadius: 6, color: '#00ffff',
          fontSize: 11, fontFamily: 'monospace',
          cursor: 'pointer',
        }}>
          Export JSON
        </button>

        <button onClick={handleReview} style={{
          padding: '6px 12px',
          background: dueCount > 0 ? 'rgba(255,50,50,0.15)' : 'rgba(255,255,255,0.04)',
          border: dueCount > 0 ? '1px solid rgba(255,50,50,0.3)' : '1px solid #333',
          borderRadius: 6,
          color: dueCount > 0 ? '#ff5555' : '#666',
          fontSize: 11, fontFamily: 'monospace',
          cursor: 'pointer',
        }}>
          Review{dueCount > 0 ? ` (${dueCount})` : ''}
        </button>
      </div>

      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(0,0,0,0.5)', padding: '8px 16px',
        borderRadius: 10, border: '1px solid #222',
        backdropFilter: 'blur(4px)', pointerEvents: 'auto',
      }}>
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>
          Timeline
        </span>
        <input type="range" min={0} max={1} step={0.01} value={timelinePosition}
          onChange={e => setTimelinePosition(parseFloat(e.target.value))}
          style={{
            width: 200, accentColor: '#00ffff', cursor: 'pointer',
            background: 'transparent',
          }}
        />
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace', minWidth: 30 }}>
          {Math.round(timelinePosition * 100)}%
        </span>
      </div>
    </div>
  )
}
