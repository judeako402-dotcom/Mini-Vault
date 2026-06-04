import { useStore } from '../store/useStore'

export default function ReviewOverlay() {
  const notes = useStore(s => s.notes)
  const workspaces = useStore(s => s.workspaces)
  const reviewNoteId = useStore(s => s.reviewNoteId)
  const reviewRevealed = useStore(s => s.reviewRevealed)
  const setReviewRevealed = useStore(s => s.setReviewRevealed)
  const markReviewed = useStore(s => s.markReviewed)
  const setReviewNoteId = useStore(s => s.setReviewNoteId)

  if (!reviewNoteId) return null

  const note = notes.find(n => n.id === reviewNoteId)
  if (!note) return null

  const ws = workspaces.find(w => w.id === note.workspaceId)
  const wsColor = ws?.color || '#00ffff'

  const handleReveal = () => {
    setReviewRevealed(true)
  }

  const handleReviewed = () => {
    markReviewed(note.id)
  }

  const handleSkip = () => {
    setReviewNoteId(null)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 460, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
        background: '#111', border: `1px solid ${wsColor}44`,
        borderRadius: 12, padding: 28, color: '#fff', fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        <div style={{ color: wsColor, fontSize: 11, marginBottom: 8 }}>
          SPACED REPETITION REVIEW
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Can you recall this note?
        </div>

        <div style={{
          fontSize: 20, color: '#fff', marginBottom: 24,
          padding: '16px 0', borderTop: '1px solid #222', borderBottom: '1px solid #222',
        }}>
          {note.title}
        </div>

        {!reviewRevealed ? (
          <button onClick={handleReveal} style={{
            padding: '10px 32px', borderRadius: 8, fontSize: 14,
            background: `${wsColor}22`, border: `1px solid ${wsColor}66`,
            color: wsColor, cursor: 'pointer', fontFamily: 'monospace',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${wsColor}44` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${wsColor}22` }}
          >
            Reveal Content
          </button>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              background: '#1a1a1a', borderRadius: 8, padding: 16,
              border: '1px solid #222', textAlign: 'left', marginBottom: 20,
              color: '#ccc', fontSize: 13, lineHeight: 1.6,
            }}>
              {note.blocks.length === 0 ? (
                <span style={{ color: '#555' }}>No content</span>
              ) : (
                note.blocks.map(b => {
                  if (b.type === 'text') return <div key={b.id} style={{ marginBottom: 8 }}>{b.content}</div>
                  if (b.type === 'bullet') return (
                    <ul key={b.id} style={{ margin: '4px 0', paddingLeft: 20 }}>
                      {b.items.map((item, i) => <li key={i} style={{ marginBottom: 2 }}>{item}</li>)}
                    </ul>
                  )
                  return (
                    <div key={b.id} style={{ marginBottom: 8 }}>
                      {b.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ color: item.checked ? '#00ff88' : '#555' }}>
                            {item.checked ? '[x]' : '[ ]'}
                          </span>
                          <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#666' : '#ccc' }}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleReviewed} style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 13,
                background: '#00ff8822', border: '1px solid #00ff8866',
                color: '#00ff88', cursor: 'pointer', fontFamily: 'monospace',
              }}>
                Remembered
              </button>
              <button onClick={handleSkip} style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 13,
                background: 'transparent', border: '1px solid #333',
                color: '#888', cursor: 'pointer', fontFamily: 'monospace',
              }}>
                Skip
              </button>
            </div>
          </div>
        )}

        {!reviewRevealed && (
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSkip} style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 12,
              background: 'transparent', border: '1px solid #333',
              color: '#666', cursor: 'pointer', fontFamily: 'monospace',
            }}>
              Skip
            </button>
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 10, color: '#444' }}>
          Reviewed {note.reviewCount} time{note.reviewCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
