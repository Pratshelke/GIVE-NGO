import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, BellRing, CheckCheck } from 'lucide-react'
import { api } from '../lib/axios'
import { timeAgo, useLiveQuery } from '../lib/hooks'
import type { Notification } from '../lib/types'
import { useToast } from './Toast'

export function NotificationsBell() {
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const seen = useRef<Set<string> | null>(null)
  const { data } = useLiveQuery(async () => (await api.get('/notifications')).data.notifications as Notification[], [], 4000)
  const list = data ?? []
  const unread = list.filter((n) => !n.read).length

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    if (!data) return
    if (seen.current) for (const n of data) if (!seen.current.has(n._id) && !n.read) toast(n.text, 'info')
    seen.current = new Set(data.map((n) => n._id))
  }, [data, toast])

  const toggle = () => {
    setOpen((o) => !o)
    if (!open && unread) api.post('/notifications/read').catch(() => {})
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={toggle} whileTap={{ scale: 0.92 }}>
        <motion.span key={unread} animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : {}} transition={{ duration: 0.7 }} style={{ display: 'grid' }}>
          {unread ? <BellRing /> : <Bell />}
        </motion.span>
        {unread > 0 && <span className="dot-n">{unread}</span>}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover glass" role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} style={{ transformOrigin: 'top right' }}>
            <div className="row between" style={{ padding: '6px 10px 8px' }}>
              <span className="eyebrow">Updates</span>
              <span className="tiny muted row nw" style={{ gap: 4 }}><CheckCheck size={14} /> All read</span>
            </div>
            {list.length === 0 && <p className="muted small" style={{ padding: '8px 12px 14px' }}>No updates yet.</p>}
            {list.slice(0, 8).map((n) => (
              <button key={n._id} className={`pop-item ${n.read ? '' : 'unread'}`} onClick={() => (setOpen(false), n.link && navigate(n.link))}>
                <span className="ico"><Bell /></span>
                <span className="stack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 650, fontSize: '0.88rem' }}>{n.text}</span>
                  <span className="muted tiny">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
