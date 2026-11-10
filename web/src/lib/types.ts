export type Role = 'Donor' | 'NGO'

export type GeoPoint = {
  type: 'Point'
  /** [longitude, latitude] — GeoJSON order, same as the MongoDB models */
  coordinates: [number, number]
}

export type User = {
  _id: string
  name: string
  email: string
  role: Role
  phoneNumber?: string
  address?: string
  location?: GeoPoint
  isAvailable?: boolean
  createdAt?: string
}

export type PublicUser = Pick<User, '_id' | 'name' | 'phoneNumber' | 'address' | 'email'>

export type DonationStatus = 'pending' | 'reserved' | 'in_transit' | 'completed' | 'expired'
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type Category = 'cooked' | 'produce' | 'bakery' | 'packaged' | 'dairy' | 'other'

export type Donation = {
  _id: string
  title: string
  description: string
  quantity: string
  category?: Category
  servings?: number
  donorId: string | PublicUser
  address: string
  location: GeoPoint
  status: DonationStatus
  currentNgoId?: { _id: string; name: string; phoneNumber?: string } | null
  createdAt: string
  expiresAt: string
}

export type DonationRequest = {
  _id: string
  donationId: string
  ngoId: string
  status: RequestStatus
  createdAt: string
  expiresAt: string
  respondedAt?: string
  distanceKm?: number
  ngoName?: string
}

export type Notification = {
  _id: string
  userId: string
  text: string
  createdAt: string
  read: boolean
  link?: string
}

export type PublicStats = {
  mealsServed: number
  kgSaved: number
  donationsCompleted: number
  activeDonations: number
  ngos: number
  donors: number
}

export type NgoPin = {
  _id: string
  name: string
  address?: string
  location: GeoPoint
  isAvailable: boolean
}
