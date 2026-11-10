/** Tiny dependency-free confetti burst. */
export function confetti(originX = window.innerWidth / 2, originY = window.innerHeight / 2) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const canvas = document.createElement('canvas')
  canvas.className = 'confetti'
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  const colors = ['#ffad1f', '#22b573', '#0e6b43', '#e5533c', '#2f6fd6', '#ffd36b']
  const parts = Array.from({ length: 140 }, () => {
    const a = Math.random() * Math.PI * 2
    const v = 6 + Math.random() * 10
    return {
      x: originX,
      y: originY,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 7,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0],
      life: 0,
    }
  })
  let frame = 0
  const tick = () => {
    frame++
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const p of parts) {
      p.vy += 0.32
      p.vx *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.globalAlpha = Math.max(0, 1 - frame / 140)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)))
      ctx.restore()
    }
    if (frame < 140) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}
