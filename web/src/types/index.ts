export type Donation = {
  id: string
  title: string
  lat: number
  lng: number
}

export type Recipient = {
  id: string
  name: string
  lat: number
  lng: number
}

export type Match = {
  donationId: string
  recipientId: string
  status: 'open' | 'accepted'
}

export type SeedData = {
  donations: Donation[]
  recipients: Recipient[]
  matches: Match[]
}


