type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AcceptModal({ open, onClose, onConfirm }: Props) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, minWidth: 280 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Confirm Accept</div>
        <p style={{ marginBottom: 12 }}>Mark this match as accepted for demo purposes?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}>Accept</button>
        </div>
      </div>
    </div>
  )
}


