/**
 * Geocoding utility using OpenStreetMap Nominatim API
 * Converts address text to latitude/longitude coordinates
 */

export type GeocodingResult = {
    lat: number
    lng: number
    displayName: string
}

/**
 * Geocode an address string to coordinates using Nominatim API
 * @param address - The address or location text to geocode
 * @returns GeocodingResult with coordinates, or null if not found
 * @throws Error if network request fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    // Validate input
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
        throw new Error('Address cannot be empty')
    }

    try {
        // Build Nominatim API URL
        const encodedAddress = encodeURIComponent(trimmedAddress)
        const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`

        // Make request with proper User-Agent (required by Nominatim usage policy)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GiveNGo-Donation-Platform/1.0',
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Geocoding request failed: ${response.status}`)
        }

        const data = await response.json()

        // Check if we got results
        if (!Array.isArray(data) || data.length === 0) {
            return null // No results found
        }

        const result = data[0]

        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
        }
    } catch (error) {
        // Re-throw with more context
        if (error instanceof Error) {
            throw new Error(`Geocoding failed: ${error.message}`)
        }
        throw new Error('Geocoding failed: Unknown error')
    }
}
