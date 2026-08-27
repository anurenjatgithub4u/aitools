"use client"

import { useEffect, useRef } from "react"

/**
 * An interactive neural-network orb: nodes distributed on a slowly rotating
 * sphere, wired to their nearest neighbours, rendered to canvas.
 *
 * Interaction:
 *  - moving the cursor lights nearby nodes and draws links from the pointer
 *  - the same nodes are pushed gently away, springing back when it leaves
 *  - clicking fires a shockwave that brightens and displaces nodes as it
 *    passes through them
 *
 * The mesh topology is computed once. The sphere is rigid, so neighbour pairs
 * never change — only their projected positions do, which keeps the per-frame
 * cost to a straight walk over the edge list instead of an O(n²) rescan.
 */

const NODE_COUNT = 82
const LINK_DISTANCE = 0.46 // in unit-sphere space
const POINTER_RADIUS = 130 // px
const WAVE_SPEED = 0.62 // px per ms
const WAVE_BAND = 70 // px — thickness of the shockwave front
const FOV = 3.2
// Radians per millisecond. 0.00009 ≈ one full revolution every ~70s.
const ROTATION_SPEED = 0.00009
// Sphere radius as a fraction of the canvas. Deliberately well under 0.5: the
// leftover margin is what stops click shockwaves from shoving nodes (and their
// glow halos) past the canvas edge, which clips the orb flat on four sides.
const ORB_RADIUS = 0.385
// Hard ceiling on how far a node can be displaced from its true position, so a
// rapid burst of clicks can't accumulate enough push to reach the edge. With
// the values above, a worst-case click (right on the silhouette) leaves ~14px
// between the furthest painted pixel and the canvas boundary.
const MAX_OFFSET = 16

type Node = {
  // Fixed position on the unit sphere.
  bx: number
  by: number
  bz: number
  // Projected screen position, written each frame.
  sx: number
  sy: number
  depth: number // 0 = far side, 1 = near side
  scale: number
  // Displacement + velocity for the springy pointer/click response.
  ox: number
  oy: number
  vx: number
  vy: number
  energy: number // 0..1 glow boost, decays every frame
  twinkle: number
}

type Wave = { x: number; y: number; born: number }

function buildNodes(): Node[] {
  const nodes: Node[] = []
  // Fibonacci sphere — even coverage without the clustering you get at the
  // poles from a naive lat/long grid.
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    nodes.push({
      bx: Math.cos(theta) * r,
      by: y,
      bz: Math.sin(theta) * r,
      sx: 0,
      sy: 0,
      depth: 0.5,
      scale: 1,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      energy: 0,
      twinkle: Math.random() * Math.PI * 2,
    })
  }
  return nodes
}

function buildEdges(nodes: Node[]): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].bx - nodes[j].bx
      const dy = nodes[i].by - nodes[j].by
      const dz = nodes[i].bz - nodes[j].bz
      if (Math.hypot(dx, dy, dz) < LINK_DISTANCE) edges.push([i, j])
    }
  }
  return edges
}

export function NeuralOrb({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const nodes = buildNodes()
    const edges = buildEdges(nodes)
    const waves: Wave[] = []

    let width = 0
    let height = 0
    let dpr = 1
    let yaw = 0
    let raf = 0
    let last = performance.now()

    const pointer = { x: 0, y: 0, active: false }

    // Palette follows the theme class next-themes puts on <html>.
    let isDark = document.documentElement.classList.contains("dark")
    const palette = () =>
      isDark
        ? { node: "255,255,255", link: "255,255,255", accent: "91,141,239" }
        : { node: "36,38,58", link: "70,74,105", accent: "99,102,241" }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function project() {
      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * ORB_RADIUS
      const tilt = -0.22
      const cosY = Math.cos(yaw)
      const sinY = Math.sin(yaw)
      const cosT = Math.cos(tilt)
      const sinT = Math.sin(tilt)

      for (const n of nodes) {
        // Rotate around Y, then tilt around X.
        const x1 = n.bx * cosY + n.bz * sinY
        const z1 = -n.bx * sinY + n.bz * cosY
        const y2 = n.by * cosT - z1 * sinT
        const z2 = n.by * sinT + z1 * cosT

        const persp = FOV / (FOV - z2)
        n.sx = cx + x1 * radius * persp + n.ox
        n.sy = cy + y2 * radius * persp + n.oy
        n.depth = (z2 + 1) / 2
        n.scale = persp
      }
    }

    function step(now: number) {
      const dt = Math.min(now - last, 50)
      last = now

      if (!reduceMotion) yaw += dt * ROTATION_SPEED

      project()

      const p = palette()

      // ── physics: pointer repulsion, click waves, spring back ──────────
      for (const n of nodes) {
        n.energy *= 0.94
        n.twinkle += dt * 0.002

        if (pointer.active) {
          const dx = n.sx - pointer.x
          const dy = n.sy - pointer.y
          const dist = Math.hypot(dx, dy)
          if (dist < POINTER_RADIUS && dist > 0.001) {
            const force = (1 - dist / POINTER_RADIUS) ** 2
            n.energy = Math.min(1, n.energy + force * 0.14)
            n.vx += (dx / dist) * force * 0.9
            n.vy += (dy / dist) * force * 0.9
          }
        }

        for (const w of waves) {
          const front = (now - w.born) * WAVE_SPEED
          const dx = n.sx - w.x
          const dy = n.sy - w.y
          const dist = Math.hypot(dx, dy)
          const delta = Math.abs(dist - front)
          if (delta < WAVE_BAND && dist > 0.001) {
            const hit = 1 - delta / WAVE_BAND
            n.energy = Math.min(1, n.energy + hit * 0.5)
            n.vx += (dx / dist) * hit * 2.6
            n.vy += (dy / dist) * hit * 2.6
          }
        }

        // Critically-damped-ish spring back to the node's true position.
        n.vx += -n.ox * 0.055
        n.vy += -n.oy * 0.055
        n.vx *= 0.86
        n.vy *= 0.86
        n.ox += n.vx
        n.oy += n.vy

        const offset = Math.hypot(n.ox, n.oy)
        if (offset > MAX_OFFSET) {
          n.ox = (n.ox / offset) * MAX_OFFSET
          n.oy = (n.oy / offset) * MAX_OFFSET
        }
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        if ((now - waves[i].born) * WAVE_SPEED > Math.max(width, height) * 1.3) waves.splice(i, 1)
      }

      // ── draw ──────────────────────────────────────────────────────────
      ctx!.clearRect(0, 0, width, height)

      // Mesh edges, painted before nodes so the dots sit on top.
      for (const [a, b] of edges) {
        const na = nodes[a]
        const nb = nodes[b]
        const depth = (na.depth + nb.depth) / 2
        const charge = Math.max(na.energy, nb.energy)
        const alpha = (0.04 + depth * 0.13 + charge * 0.5) * (isDark ? 1 : 0.85)
        if (alpha < 0.015) continue
        ctx!.strokeStyle = charge > 0.08 ? `rgba(${p.accent},${alpha})` : `rgba(${p.link},${alpha})`
        ctx!.lineWidth = 0.5 + depth * 0.5 + charge * 1.1
        ctx!.beginPath()
        ctx!.moveTo(na.sx, na.sy)
        ctx!.lineTo(nb.sx, nb.sy)
        ctx!.stroke()
      }

      // Links from the pointer into the nearest nodes.
      if (pointer.active) {
        for (const n of nodes) {
          const dist = Math.hypot(n.sx - pointer.x, n.sy - pointer.y)
          if (dist < POINTER_RADIUS) {
            const alpha = (1 - dist / POINTER_RADIUS) * 0.5
            ctx!.strokeStyle = `rgba(${p.accent},${alpha})`
            ctx!.lineWidth = 0.7
            ctx!.beginPath()
            ctx!.moveTo(pointer.x, pointer.y)
            ctx!.lineTo(n.sx, n.sy)
            ctx!.stroke()
          }
        }
      }

      // Expanding shockwave rings.
      for (const w of waves) {
        const front = (now - w.born) * WAVE_SPEED
        const life = 1 - front / (Math.max(width, height) * 1.3)
        if (life <= 0) continue
        ctx!.strokeStyle = `rgba(${p.accent},${life * 0.3})`
        ctx!.lineWidth = 1.4
        ctx!.beginPath()
        ctx!.arc(w.x, w.y, front, 0, Math.PI * 2)
        ctx!.stroke()
      }

      // Nodes.
      for (const n of nodes) {
        const pulse = 1 + Math.sin(n.twinkle) * 0.12
        const r = (1.05 + n.depth * 1.5) * n.scale * pulse + n.energy * 2.6
        const alpha = 0.25 + n.depth * 0.5 + n.energy * 0.5

        if (n.energy > 0.05) {
          const glow = ctx!.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, r * 5)
          glow.addColorStop(0, `rgba(${p.accent},${n.energy * 0.45})`)
          glow.addColorStop(1, `rgba(${p.accent},0)`)
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(n.sx, n.sy, r * 5, 0, Math.PI * 2)
          ctx!.fill()
        }

        ctx!.fillStyle =
          n.energy > 0.08 ? `rgba(${p.accent},${Math.min(1, alpha + 0.25)})` : `rgba(${p.node},${alpha})`
        ctx!.beginPath()
        ctx!.arc(n.sx, n.sy, r, 0, Math.PI * 2)
        ctx!.fill()
      }

      raf = requestAnimationFrame(step)
    }

    // ── events ──────────────────────────────────────────────────────────
    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active = true
    }
    function onPointerLeave() {
      pointer.active = false
    }
    function onPointerDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      waves.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, born: performance.now() })
    }

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains("dark")
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerleave", onPointerLeave)
    canvas.addEventListener("pointerdown", onPointerDown)

    resize()
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerleave", onPointerLeave)
      canvas.removeEventListener("pointerdown", onPointerDown)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full cursor-crosshair touch-none ${className}`}
      aria-hidden="true"
    />
  )
}
