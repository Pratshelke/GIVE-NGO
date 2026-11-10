/**
 * In-browser demo database + dispatcher.
 *
 * Mirrors the Express/MongoDB backend in /server (same data shapes, same rules,
 * same "nearest NGO within 20 km, one at a time" dispatch algorithm as the CRON
 * job) but lives entirely in localStorage, so the app runs with zero API keys,
 * zero servers and zero setup. Data is shared between tabs of the same browser.
 */
import type { Donation, DonationRequest, Notification, User } from '../types'
import { haversineKm, MAX_DISTANCE_KM } from '../geo'

export type DbUser = User & { password: string; bot?: boolean }
export type DbDonation = Omit<Donation, 'donorId' | 'currentNgoId'> & {
  donorId: string
  currentNgoId?: string | null
  /** demo-only: when a bot NGO accepted, used to animate pickup/delivery */
  botAcceptedAt?: string
}
export type DbRequest = Omit<DonationRequest, 'distanceKm' | 'ngoName'> & { distanceKm: number }

export type Db = {
  version: number
  users: DbUser[]
  donations: DbDonation[]
  requests: DbRequest[]
  notifications: Notification[]
}

const KEY = 'givengo-demo-db'
const VERSION = 4
export const DB_EVENT = 'givengo:db'

/** Timings (ms). Request window matches the backend; bots respond fast so demos flow. */
export const REQUEST_WINDOW_MS = 10 * 60 * 1000
const BOT_RESPONSE_MS = 7_000
const BOT_PICKUP_MS = 25_000
const BOT_DELIVER_MS = 50_000

export const DEMO_ACCOUNTS = {
  donor: { email: 'donor@demo.com', password: 'demo123' },
  ngo: { email: 'ngo@demo.com', password: 'demo123' },
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const iso = (msFromNow = 0) => new Date(Date.now() + msFromNow).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function seed(): Db {
  const donor: DbUser = {
    _id: 'u_donor',
    name: 'Annapurna Kitchens',
    email: DEMO_ACCOUNTS.donor.email,
    password: DEMO_ACCOUNTS.donor.password,
    role: 'Donor',
    phoneNumber: '+91 98220 11111',
    address: 'FC Road, Shivajinagar, Pune',
    location: { type: 'Point', coordinates: [73.8414, 18.5236] },
    createdAt: iso(-60 * DAY),
  }
  const ngo: DbUser = {
    _id: 'u_ngo',
    name: 'Seva Food Bank',
    email: DEMO_ACCOUNTS.ngo.email,
    password: DEMO_ACCOUNTS.ngo.password,
    role: 'NGO',
    phoneNumber: '+91 98220 22222',
    address: 'Deccan Gymkhana, Pune',
    location: { type: 'Point', coordinates: [73.8389, 18.5167] },
    isAvailable: true,
    createdAt: iso(-90 * DAY),
  }
  const bot = (id: string, name: string, address: string, c: [number, number], available = true): DbUser => ({
    _id: id,
    name,
    email: `${id}@demo.org`,
    password: 'demo123',
    role: 'NGO',
    phoneNumber: '+91 90000 ' + id.slice(-5).padStart(5, '0'),
    address,
    location: { type: 'Point', coordinates: c },
    isAvailable: available,
    bot: true,
    createdAt: iso(-120 * DAY),
  })
  const bots = [
    bot('u_ngo_10001', 'Roti Ghar Trust', 'Koregaon Park, Pune', [73.8937, 18.5362]),
    bot('u_ngo_10002', 'Hope Shelter Foundation', 'Kothrud, Pune', [73.8077, 18.5074]),
    bot('u_ngo_10003', 'Annadaan Seva Samiti', 'Hadapsar, Pune', [73.9259, 18.5089]),
    bot('u_ngo_10004', 'Little Hands Orphanage', 'Viman Nagar, Pune', [73.9143, 18.5679]),
    bot('u_ngo_10005', 'Green Plate Collective', 'Baner, Pune', [73.7868, 18.559], false),
    bot('u_ngo_10006', 'Sahara Old Age Home', 'Camp, Pune', [73.8795, 18.5158]),
  ]
  const otherDonors: DbUser[] = [
    {
      _id: 'u_donor_2',
      name: 'Hotel Blue Lotus',
      email: 'bluelotus@demo.com',
      password: 'demo123',
      role: 'Donor',
      phoneNumber: '+91 98220 33333',
      address: 'MG Road, Camp, Pune',
      createdAt: iso(-40 * DAY),
    },
    {
      _id: 'u_donor_3',
      name: 'Daily Bread Bakery',
      email: 'dailybread@demo.com',
      password: 'demo123',
      role: 'Donor',
      phoneNumber: '+91 98220 44444',
      address: 'Aundh, Pune',
      createdAt: iso(-30 * DAY),
    },
  ]

  const d = (
    id: string,
    donorId: string,
    title: string,
    category: DbDonation['category'],
    quantity: string,
    servings: number,
    description: string,
    address: string,
    c: [number, number],
    status: DbDonation['status'],
    createdAgo: number,
    ngoId?: string,
  ): DbDonation => ({
    _id: id,
    donorId,
    title,
    category,
    quantity,
    servings,
    description,
    address,
    location: { type: 'Point', coordinates: c },
    status,
    currentNgoId: ngoId ?? null,
    createdAt: iso(-createdAgo),
    expiresAt: iso(-createdAgo + 2 * HOUR),
  })

  const donations: DbDonation[] = [
    // Active, waiting on the demo NGO right now
    d('d_live1', 'u_donor_2', 'Veg biryani & dal — wedding surplus', 'cooked', '18 kg', 70,
      'Freshly cooked at 1 pm, kept hot. Packed in sealed trays. Please bring containers.',
      'MG Road, Camp, Pune', [73.8744, 18.5196], 'pending', 4 * MIN),
    // Demo donor: one reserved by demo NGO, one in transit by a bot
    d('d_live2', 'u_donor', 'Chapatis and paneer curry', 'cooked', '9 kg', 35,
      'Lunch buffet surplus. Prepared today, refrigerated.',
      'FC Road, Shivajinagar, Pune', [73.8414, 18.5236], 'reserved', 25 * MIN, 'u_ngo'),
    d('d_live3', 'u_donor_3', 'Assorted breads and buns', 'bakery', '60 pieces', 40,
      'Baked this morning, unsold. Good for 2 days.',
      'Aundh, Pune', [73.8077, 18.558], 'in_transit', 50 * MIN, 'u_ngo'),
  ]

  // History for impact numbers and the donor's "past" tab
  const history: [string, string, DbDonation['category'], string, number, number, string][] = [
    ['Rice, sambar & sabzi', 'u_donor', 'cooked', '12 kg', 48, 1, 'u_ngo'],
    ['Fresh vegetables crate', 'u_donor', 'produce', '25 kg', 60, 10, 'u_ngo_10001'],
    ['Packaged snacks', 'u_donor', 'packaged', '80 packs', 80, 19, 'u_ngo'],
    ['Milk and curd', 'u_donor', 'dairy', '20 L', 40, 26, 'u_ngo_10002'],
    ['Pulao & raita', 'u_donor_2', 'cooked', '15 kg', 60, 2, 'u_ngo_10006'],
    ['Bread loaves', 'u_donor_3', 'bakery', '45 loaves', 90, 4, 'u_ngo'],
    ['Fruit boxes', 'u_donor_2', 'produce', '30 kg', 75, 8, 'u_ngo_10003'],
    ['Thali meals', 'u_donor', 'cooked', '22 kg', 85, 40, 'u_ngo_10004'],
    ['Biscuits & juice', 'u_donor_3', 'packaged', '120 packs', 120, 15, 'u_ngo'],
  ]
  history.forEach(([title, donorId, cat, qty, servings, daysAgo, ngoId], i) => {
    const donorUser = [donor, ...otherDonors].find((u) => u._id === donorId)!
    donations.push(
      d(`d_hist${i}`, donorId, title, cat, qty, servings, 'Delivered via GiveNGo.',
        donorUser.address!, donor.location!.coordinates, 'completed', daysAgo * DAY, ngoId),
    )
  })
  donations.push(
    d('d_exp', 'u_donor', 'Leftover sweets', 'other', '3 kg', 20, 'Cancelled by donor.',
      donor.address!, donor.location!.coordinates, 'expired', 5 * DAY),
  )

  const requests: DbRequest[] = [
    {
      _id: 'r_live1a', donationId: 'd_live1', ngoId: 'u_ngo_10006', status: 'rejected',
      createdAt: iso(-4 * MIN), expiresAt: iso(6 * MIN), respondedAt: iso(-3 * MIN), distanceKm: 0.8,
    },
    {
      _id: 'r_live1b', donationId: 'd_live1', ngoId: 'u_ngo', status: 'pending',
      createdAt: iso(-3 * MIN), expiresAt: iso(7 * MIN), distanceKm: 3.6,
    },
    {
      _id: 'r_live2', donationId: 'd_live2', ngoId: 'u_ngo', status: 'accepted',
      createdAt: iso(-24 * MIN), expiresAt: iso(-14 * MIN), respondedAt: iso(-22 * MIN), distanceKm: 0.8,
    },
    {
      _id: 'r_live3', donationId: 'd_live3', ngoId: 'u_ngo', status: 'accepted',
      createdAt: iso(-49 * MIN), expiresAt: iso(-39 * MIN), respondedAt: iso(-47 * MIN), distanceKm: 4.7,
    },
  ]

  const notifications: Notification[] = [
    { _id: uid(), userId: 'u_ngo', text: 'New pickup request: “Veg biryani & dal — wedding surplus” (3.6 km away)', createdAt: iso(-3 * MIN), read: false, link: '/ngo' },
    { _id: uid(), userId: 'u_donor', text: 'Seva Food Bank accepted “Chapatis and paneer curry”. They will call you shortly.', createdAt: iso(-22 * MIN), read: false, link: '/donor' },
    { _id: uid(), userId: 'u_donor', text: 'Thank you! “Rice, sambar & sabzi” fed ~48 people yesterday.', createdAt: iso(-1 * DAY), read: true, link: '/donor' },
  ]

  return { version: VERSION, users: [donor, ngo, ...bots, ...otherDonors], donations, requests, notifications }
}

let memoryFallback: Db | null = null

export function loadDb(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as Db
      if (db.version === VERSION) return db
    }
  } catch {
    if (memoryFallback) return memoryFallback
  }
  const fresh = seed()
  saveDb(fresh, false)
  return fresh
}

export function saveDb(db: Db, notify = true) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    memoryFallback = db
  }
  if (notify) window.dispatchEvent(new Event(DB_EVENT))
}

export function resetDb() {
  saveDb(seed())
}

export function notify(db: Db, userId: string, text: string, link?: string) {
  db.notifications.unshift({ _id: uid(), userId, text, createdAt: iso(), read: false, link })
  db.notifications = db.notifications.slice(0, 200)
}

/**
 * One tick of the dispatcher — a faithful port of server/cron/donationRequestScheduler.js
 * plus simulated behaviour for the seeded "bot" NGOs so a single presenter can
 * demo the whole lifecycle.
 */
export function dispatchTick() {
  const db = loadDb()
  const now = Date.now()
  let changed = false
  const userById = new Map(db.users.map((u) => [u._id, u]))

  // 1. Expire pending donations past their window (+ their pending requests)
  for (const d of db.donations) {
    if (d.status === 'pending' && Date.parse(d.expiresAt) <= now) {
      d.status = 'expired'
      changed = true
      notify(db, d.donorId, `“${d.title}” expired before an NGO could collect it.`, '/donor')
      for (const r of db.requests) if (r.donationId === d._id && r.status === 'pending') r.status = 'expired'
    }
  }

  // 2. Expire timed-out requests
  for (const r of db.requests) {
    if (r.status === 'pending' && Date.parse(r.expiresAt) <= now) {
      r.status = 'expired'
      r.respondedAt = iso()
      changed = true
    }
  }

  // 3. Bot NGOs respond. They pass to the real demo NGO when it is still eligible,
  //    otherwise they accept and then progress pickup → delivery on their own.
  for (const r of db.requests) {
    if (r.status !== 'pending') continue
    const ngo = userById.get(r.ngoId)
    if (!ngo?.bot || now - Date.parse(r.createdAt) < BOT_RESPONSE_MS) continue
    const donation = db.donations.find((x) => x._id === r.donationId)
    if (!donation || donation.status !== 'pending') continue
    const humanNgoWaiting = db.users.some(
      (u) =>
        u.role === 'NGO' && !u.bot && u.isAvailable !== false && u.location &&
        haversineKm(donation.location.coordinates, u.location.coordinates) <= MAX_DISTANCE_KM &&
        !db.requests.some((q) => q.donationId === donation._id && q.ngoId === u._id),
    )
    r.respondedAt = iso()
    changed = true
    if (humanNgoWaiting) {
      r.status = 'rejected'
    } else {
      r.status = 'accepted'
      donation.status = 'reserved'
      donation.currentNgoId = ngo._id
      donation.botAcceptedAt = iso()
      notify(db, donation.donorId, `${ngo.name} accepted “${donation.title}”. They will call you shortly.`, '/donor')
    }
  }
  for (const d of db.donations) {
    if (!d.botAcceptedAt) continue
    const t = now - Date.parse(d.botAcceptedAt)
    const ngo = userById.get(d.currentNgoId ?? '')
    if (d.status === 'reserved' && t > BOT_PICKUP_MS) {
      d.status = 'in_transit'
      changed = true
      notify(db, d.donorId, `${ngo?.name ?? 'The NGO'} picked up “${d.title}”.`, '/donor')
    } else if (d.status === 'in_transit' && t > BOT_DELIVER_MS) {
      d.status = 'completed'
      changed = true
      notify(db, d.donorId, `Delivered! “${d.title}” is feeding ~${d.servings ?? 'many'} people. Thank you 💚`, '/donor')
    }
  }

  // 4. Assign the nearest eligible NGO (within 20 km, not yet asked) to each
  //    pending donation that has no pending request.
  for (const d of db.donations) {
    if (d.status !== 'pending' || Date.parse(d.expiresAt) <= now) continue
    if (db.requests.some((r) => r.donationId === d._id && r.status === 'pending')) continue
    const asked = new Set(db.requests.filter((r) => r.donationId === d._id).map((r) => r.ngoId))
    const candidates = db.users
      .filter((u) => u.role === 'NGO' && u.isAvailable !== false && u.location && !asked.has(u._id))
      .map((u) => ({ u, km: haversineKm(d.location.coordinates, u.location!.coordinates) }))
      .filter((x) => x.km <= MAX_DISTANCE_KM)
      .sort((a, b) => a.km - b.km)
    const nearest = candidates[0]
    if (!nearest) continue
    db.requests.push({
      _id: uid(),
      donationId: d._id,
      ngoId: nearest.u._id,
      status: 'pending',
      createdAt: iso(),
      expiresAt: iso(REQUEST_WINDOW_MS),
      distanceKm: Math.round(nearest.km * 10) / 10,
    })
    if (!nearest.u.bot) {
      notify(db, nearest.u._id, `New pickup request: “${d.title}” (${nearest.km.toFixed(1)} km away)`, '/ngo')
    }
    changed = true
  }

  if (changed) saveDb(db)
}

let timer: number | undefined
export function startDispatcher() {
  if (timer) return
  dispatchTick()
  timer = window.setInterval(dispatchTick, 2500)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) window.dispatchEvent(new Event(DB_EVENT))
  })
}
