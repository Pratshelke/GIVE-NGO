/**
 * Axios adapter that serves the GiveNGo REST API from the in-browser demo store.
 * Routes, payloads and error messages follow server/index.js so the UI code is
 * identical in demo mode and against the real Express backend.
 */
import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { Db, DbDonation, DbUser } from './store'
import { loadDb, notify, resetDb, saveDb, uid, dispatchTick } from './store'

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const publicUser = (u: DbUser) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phoneNumber: u.phoneNumber,
  address: u.address,
  location: u.location,
  isAvailable: u.isAvailable,
  createdAt: u.createdAt,
})

function populate(db: Db, d: DbDonation) {
  const donor = db.users.find((u) => u._id === d.donorId)
  const ngo = d.currentNgoId ? db.users.find((u) => u._id === d.currentNgoId) : undefined
  const { botAcceptedAt: _ignored, ...rest } = d
  void _ignored
  return {
    ...rest,
    donorId: donor
      ? { _id: donor._id, name: donor.name, phoneNumber: donor.phoneNumber, address: donor.address, email: donor.email }
      : d.donorId,
    currentNgoId: ngo ? { _id: ngo._id, name: ngo.name, phoneNumber: ngo.phoneNumber } : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies are untyped JSON, validated per route
type Ctx = { db: Db; me: DbUser | null; body: any; params: string[]; query: URLSearchParams }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (ctx: Ctx) => { status?: number; data: any }

function requireAuth(ctx: Ctx): DbUser {
  if (!ctx.me) throw new HttpError(401, 'No token provided. Authorization denied.')
  return ctx.me
}

function findDonation(ctx: Ctx, id: string) {
  const d = ctx.db.donations.find((x) => x._id === id)
  if (!d) throw new HttpError(404, 'Donation not found')
  return d
}

const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/health$/, () => ({ data: { ok: true, message: 'Demo server running in your browser', mongoStatus: 'demo' } })],

  ['POST', /^\/auth\/register$/, ({ db, body }) => {
    const { name, email, password, role, phoneNumber, address, location } = body ?? {}
    if (!name || !email || !password || !role || !phoneNumber)
      throw new HttpError(400, 'Missing required fields: name, email, password, role, phoneNumber')
    if (role === 'NGO' && !address) throw new HttpError(400, 'Address is required for NGO registration')
    if (role === 'NGO' && !location?.coordinates) throw new HttpError(400, 'Location is required for NGO registration')
    if (db.users.some((u) => u.email === String(email).toLowerCase()))
      throw new HttpError(400, 'User with this email already exists')
    const user: DbUser = {
      _id: uid(), name, email: String(email).toLowerCase(), password, role, phoneNumber,
      address, location, isAvailable: true, createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    notify(db, user._id, role === 'NGO'
      ? 'Welcome to GiveNGo! Nearby donations will appear on your dashboard automatically.'
      : 'Welcome to GiveNGo! Post your first donation and we will find the nearest NGO.', role === 'NGO' ? '/ngo' : '/donor/create')
    saveDb(db)
    return { status: 201, data: { success: true, token: `demo.${user._id}`, user: publicUser(user) } }
  }],

  ['POST', /^\/auth\/login$/, ({ db, body }) => {
    const { email, password } = body ?? {}
    if (!email || !password) throw new HttpError(400, 'Email and password are required')
    const user = db.users.find((u) => u.email === String(email).toLowerCase().trim())
    if (!user || user.password !== password) throw new HttpError(401, 'Invalid email or password')
    return { data: { success: true, token: `demo.${user._id}`, user: publicUser(user) } }
  }],

  ['GET', /^\/auth\/me$/, (ctx) => ({ data: { success: true, user: publicUser(requireAuth(ctx)) } })],

  ['GET', /^\/users\/([^/]+)$/, ({ db, params }) => {
    const u = db.users.find((x) => x._id === params[0])
    if (!u) throw new HttpError(404, 'User not found')
    return { data: { success: true, user: publicUser(u) } }
  }],

  ['PUT', /^\/users\/([^/]+)$/, (ctx) => {
    const me = requireAuth(ctx)
    if (me._id !== ctx.params[0]) throw new HttpError(403, 'You can only update your own profile')
    const { name, phoneNumber, address, location, isAvailable } = ctx.body ?? {}
    if (name) me.name = name
    if (phoneNumber) me.phoneNumber = phoneNumber
    if (address) me.address = address
    if (location?.coordinates) me.location = location
    if (typeof isAvailable === 'boolean') me.isAvailable = isAvailable
    saveDb(ctx.db)
    return { data: { success: true, message: 'Profile updated successfully', user: publicUser(me) } }
  }],

  ['GET', /^\/ngos$/, ({ db }) => ({
    data: {
      success: true,
      ngos: db.users.filter((u) => u.role === 'NGO' && u.location).map((u) => ({
        _id: u._id, name: u.name, address: u.address, location: u.location, isAvailable: u.isAvailable !== false,
      })),
    },
  })],

  ['GET', /^\/stats$/, ({ db }) => {
    const done = db.donations.filter((d) => d.status === 'completed')
    const kg = done.reduce((s, d) => s + (/kg/i.test(d.quantity) ? parseFloat(d.quantity) || 0 : (d.servings ?? 0) * 0.3), 0)
    return {
      data: {
        success: true,
        stats: {
          mealsServed: done.reduce((s, d) => s + (d.servings ?? 0), 0),
          kgSaved: Math.round(kg),
          donationsCompleted: done.length,
          activeDonations: db.donations.filter((d) => ['pending', 'reserved', 'in_transit'].includes(d.status)).length,
          ngos: db.users.filter((u) => u.role === 'NGO').length,
          donors: db.users.filter((u) => u.role === 'Donor').length,
        },
      },
    }
  }],

  ['GET', /^\/donations\/public$/, ({ db }) => ({
    data: {
      success: true,
      donations: db.donations
        .filter((d) => ['pending', 'reserved', 'in_transit'].includes(d.status))
        .map((d) => {
          const p = populate(db, d)
          return { ...p, donorId: typeof p.donorId === 'object' ? { _id: p.donorId._id, name: p.donorId.name } : p.donorId }
        }),
    },
  })],

  ['POST', /^\/donations$/, (ctx) => {
    const me = requireAuth(ctx)
    if (me.role !== 'Donor') throw new HttpError(403, 'Only donors can create donations')
    const b = ctx.body ?? {}
    if (!b.title || !b.description || !b.quantity || !b.address || !b.location?.coordinates)
      throw new HttpError(400, 'Failed to create donation: title, description, quantity, address and location are required')
    const now = Date.now()
    const d: DbDonation = {
      _id: uid(),
      title: b.title,
      description: b.description,
      quantity: b.quantity,
      category: b.category,
      servings: b.servings ? Number(b.servings) : undefined,
      donorId: me._id,
      address: b.address,
      location: b.location,
      status: 'pending',
      currentNgoId: null,
      createdAt: new Date(now).toISOString(),
      expiresAt: b.expiresAt ?? new Date(now + 60 * 60 * 1000).toISOString(),
    }
    ctx.db.donations.push(d)
    saveDb(ctx.db)
    setTimeout(dispatchTick, 600) // matching kicks in almost immediately in the demo
    return { status: 201, data: { success: true, message: 'Donation created successfully', donation: populate(ctx.db, d) } }
  }],

  ['GET', /^\/donations$/, (ctx) => {
    const me = requireAuth(ctx)
    const list = me.role === 'Donor' ? ctx.db.donations.filter((d) => d.donorId === me._id) : ctx.db.donations
    return { data: { success: true, count: list.length, donations: list.map((d) => populate(ctx.db, d)) } }
  }],

  ['PUT', /^\/donations\/([^/]+)$/, (ctx) => {
    const me = requireAuth(ctx)
    const d = findDonation(ctx, ctx.params[0])
    if (d.donorId !== me._id) throw new HttpError(403, 'You are not authorized to edit this donation')
    if (d.status !== 'pending')
      throw new HttpError(400, `Cannot edit donation. Status is '${d.status}'. Only 'pending' donations can be edited.`)
    const { title, description, quantity, servings } = ctx.body ?? {}
    if (title) d.title = title
    if (description) d.description = description
    if (quantity) d.quantity = quantity
    if (servings) d.servings = Number(servings)
    saveDb(ctx.db)
    return { data: { success: true, message: 'Donation updated successfully', donation: populate(ctx.db, d) } }
  }],

  ['DELETE', /^\/donations\/([^/]+)$/, (ctx) => {
    const me = requireAuth(ctx)
    const d = findDonation(ctx, ctx.params[0])
    if (d.donorId !== me._id) throw new HttpError(403, 'You are not authorized to cancel this donation')
    if (d.status !== 'pending')
      throw new HttpError(400, `Cannot cancel donation. Status is '${d.status}'. Only 'pending' donations can be cancelled.`)
    d.status = 'expired'
    for (const r of ctx.db.requests) if (r.donationId === d._id && r.status === 'pending') r.status = 'expired'
    saveDb(ctx.db)
    return { data: { success: true, message: 'Donation cancelled successfully', donation: populate(ctx.db, d) } }
  }],

  ['GET', /^\/donations\/([^/]+)\/requests$/, (ctx) => {
    const me = requireAuth(ctx)
    const d = findDonation(ctx, ctx.params[0])
    if (me.role === 'Donor' && d.donorId !== me._id) throw new HttpError(403, 'Not your donation')
    const reqs = ctx.db.requests
      .filter((r) => r.donationId === d._id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => ({ ...r, ngoName: ctx.db.users.find((u) => u._id === r.ngoId)?.name ?? 'NGO' }))
    return { data: { success: true, requests: reqs } }
  }],

  ['GET', /^\/requests$/, (ctx) => {
    const me = requireAuth(ctx)
    if (me.role !== 'NGO') throw new HttpError(403, 'Only NGOs can view requests')
    const reqs = ctx.db.requests.filter((r) => r.ngoId === me._id)
    return { data: { success: true, count: reqs.length, requests: reqs } }
  }],

  ['POST', /^\/requests\/([^/]+)\/accept$/, (ctx) => {
    const me = requireAuth(ctx)
    const r = ctx.db.requests.find((x) => x._id === ctx.params[0])
    if (!r) throw new HttpError(404, 'Request not found')
    if (r.ngoId !== me._id) throw new HttpError(403, 'You are not authorized to accept this request')
    if (r.status !== 'pending') throw new HttpError(400, `Request is already ${r.status}`)
    const d = findDonation(ctx, r.donationId)
    const now = new Date()
    if (now.getTime() > Date.parse(d.expiresAt)) {
      d.status = 'expired'
      r.status = 'rejected'
      r.respondedAt = now.toISOString()
      saveDb(ctx.db)
      throw new HttpError(400, 'Donation has expired. Cannot accept request.')
    }
    if (d.status !== 'pending') throw new HttpError(400, `Donation is already ${d.status}. Cannot accept new requests.`)
    r.status = 'accepted'
    r.respondedAt = now.toISOString()
    d.status = 'reserved'
    d.currentNgoId = me._id
    for (const o of ctx.db.requests)
      if (o.donationId === d._id && o._id !== r._id && o.status === 'pending') {
        o.status = 'rejected'
        o.respondedAt = now.toISOString()
      }
    notify(ctx.db, d.donorId, `${me.name} accepted “${d.title}”. They will call you shortly.`, '/donor')
    saveDb(ctx.db)
    return { data: { success: true, message: 'Request accepted successfully. Donation reserved for NGO.', request: r, donation: populate(ctx.db, d) } }
  }],

  ['POST', /^\/requests\/([^/]+)\/reject$/, (ctx) => {
    const me = requireAuth(ctx)
    const r = ctx.db.requests.find((x) => x._id === ctx.params[0])
    if (!r) throw new HttpError(404, 'Request not found')
    if (r.ngoId !== me._id) throw new HttpError(403, 'You are not authorized to reject this request')
    if (r.status !== 'pending') throw new HttpError(400, `Request is already ${r.status}`)
    r.status = 'rejected'
    r.respondedAt = new Date().toISOString()
    saveDb(ctx.db)
    setTimeout(dispatchTick, 600)
    return { data: { success: true, message: 'Request rejected. Donation remains available.', request: r } }
  }],

  ['POST', /^\/donations\/([^/]+)\/confirm-pickup$/, (ctx) => {
    const me = requireAuth(ctx)
    const d = findDonation(ctx, ctx.params[0])
    if (d.currentNgoId !== me._id) throw new HttpError(403, 'You are not authorized to confirm pickup for this donation')
    if (d.status !== 'reserved')
      throw new HttpError(400, `Cannot confirm pickup. Donation status is '${d.status}'. Expected 'reserved'.`)
    d.status = 'in_transit'
    notify(ctx.db, d.donorId, `${me.name} picked up “${d.title}”.`, '/donor')
    saveDb(ctx.db)
    return { data: { success: true, message: 'Pickup confirmed. Donation is now in transit.', donation: populate(ctx.db, d) } }
  }],

  ['POST', /^\/donations\/([^/]+)\/complete$/, (ctx) => {
    const me = requireAuth(ctx)
    const d = findDonation(ctx, ctx.params[0])
    if (d.currentNgoId !== me._id) throw new HttpError(403, 'You are not authorized to complete this donation')
    if (d.status !== 'in_transit')
      throw new HttpError(400, `Cannot complete. Donation status is '${d.status}'. Expected 'in_transit'.`)
    d.status = 'completed'
    notify(ctx.db, d.donorId, `Delivered! “${d.title}” is feeding ~${d.servings ?? 'many'} people. Thank you 💚`, '/donor')
    saveDb(ctx.db)
    return { data: { success: true, message: 'Donation completed successfully!', donation: populate(ctx.db, d) } }
  }],

  ['GET', /^\/notifications$/, (ctx) => {
    const me = requireAuth(ctx)
    return { data: { success: true, notifications: ctx.db.notifications.filter((n) => n.userId === me._id).slice(0, 30) } }
  }],

  ['POST', /^\/notifications\/read$/, (ctx) => {
    const me = requireAuth(ctx)
    for (const n of ctx.db.notifications) if (n.userId === me._id) n.read = true
    saveDb(ctx.db)
    return { data: { success: true } }
  }],

  ['POST', /^\/demo\/reset$/, () => {
    resetDb()
    return { data: { success: true } }
  }],
]

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180)) // feel like a network
  const method = (config.method ?? 'get').toUpperCase()
  const url = new URL(config.url ?? '/', 'http://demo.local')
  const db = loadDb()
  const token = String(config.headers?.Authorization ?? '').replace('Bearer ', '')
  const me = token.startsWith('demo.') ? db.users.find((u) => u._id === token.slice(5)) ?? null : null
  let body: unknown = config.data
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      /* keep as string */
    }
  }

  const respond = (status: number, data: unknown): AxiosResponse => ({
    status,
    statusText: String(status),
    data,
    headers: {},
    config,
    request: { demo: true },
  })

  try {
    for (const [m, re, handler] of routes) {
      if (m !== method) continue
      const match = url.pathname.match(re)
      if (!match) continue
      const out = handler({ db, me, body, params: match.slice(1), query: url.searchParams })
      return respond(out.status ?? 200, out.data)
    }
    throw new HttpError(404, `No demo route for ${method} ${url.pathname}`)
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof Error ? e.message : 'Unknown error'
    const res = respond(status, { success: false, message })
    throw new AxiosError(message, String(status), config, res.request, res)
  }
}

