import { useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

/** Swipe-style confirm: drag the knob to the end (or press Enter / click it) to accept. */
export function SlideToAccept({ onAccept, label = 'Slide to accept', disabled }: { onAccept: () => Promise<void> | void; label?: string; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const [max, setMax] = useState(200)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const x = useMotionValue(0)
  const fill = useTransform(x, (v) => (v + 50) / (max + 50))
  const labelOpacity = useTransform(x, [0, max * 0.6], [1, 0])

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setMax(el.clientWidth - 60)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fire = async () => {
    if (state !== 'idle' || disabled) return
    animate(x, max, { type: 'spring', stiffness: 400, damping: 35 })
    setState('busy')
    try {
      await onAccept()
      setState('done')
    } catch {
      setState('idle')
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 })
    }
  }

  return (
    <div ref={track} className="slider-accept" aria-disabled={disabled}>
      <motion.div className="s-fill" style={{ scaleX: fill }} />
      <motion.div className="s-label" style={{ opacity: labelOpacity }}>
        <span>{label}</span>
      </motion.div>
      <motion.button
        type="button"
        className="s-thumb"
        aria-label={label}
        drag={state === 'idle' && !disabled ? 'x' : false}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.02}
        dragMomentum={false}
        style={{ x, border: 0 }}
        onDragEnd={() => (x.get() > max * 0.82 ? fire() : animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 }))}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fire())}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {state === 'busy' ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : state === 'done' ? <Check /> : <ArrowRight />}
      </motion.button>
    </div>
  )
}
