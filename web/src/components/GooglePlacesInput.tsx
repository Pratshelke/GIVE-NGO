/**
 * Google Places Autocomplete Input Component
 * Uses the NEW Google Maps Places API (PlaceAutocompleteElement)
 * Updated for March 2025+ compatibility
 */
import { useEffect, useRef, useState, useCallback } from 'react'

type PlaceResult = {
    lat: number
    lng: number
    formattedAddress: string
}

type GooglePlacesInputProps = {
    onPlaceSelect: (place: PlaceResult) => void
    placeholder?: string
    defaultValue?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleMapsAPI = any

// Extend Window interface for google maps
interface WindowWithGoogle extends Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any
}

// Load Google Maps JS API script dynamically
let googleMapsPromise: Promise<void> | null = null
let scriptInjected = false

const API_KEY = "AIzaSyBzOyDiCqSyksEVFuqwIIopUqJguPQvpmE"

function loadGoogleMapsAPI(): Promise<void> {
    if (googleMapsPromise) return googleMapsPromise

    googleMapsPromise = new Promise((resolve, reject) => {
        // If already loaded, resolve immediately
        if ((window as WindowWithGoogle).google?.maps?.places) {
            resolve()
            return
        }

        if (!API_KEY) {
            reject(new Error('Google Maps API key missing'))
            return
        }

        if (scriptInjected) {
            const interval = setInterval(() => {
                if ((window as WindowWithGoogle).google?.maps?.places) {
                    clearInterval(interval)
                    resolve()
                }
            }, 100)
            return
        }

        scriptInjected = true

        const script = document.createElement('script')
        // Use the new Places API
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Google Maps API'))

        document.head.appendChild(script)
    })

    return googleMapsPromise
}

// Get google object from window
function getGoogle(): GoogleMapsAPI {
    return (window as WindowWithGoogle).google
}

export function GooglePlacesInput({
    onPlaceSelect,
    placeholder = 'Search for a location...',
    defaultValue = '',
}: GooglePlacesInputProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [inputValue, setInputValue] = useState(defaultValue)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const sessionTokenRef = useRef<any>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Initialize Google Maps API
    useEffect(() => {
        let isMounted = true

        async function init() {
            try {
                await loadGoogleMapsAPI()
                if (isMounted) {
                    setIsLoading(false)
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize')
                    setIsLoading(false)
                }
            }
        }

        init()

        return () => {
            isMounted = false
        }
    }, [])

    // Create new session token for billing optimization
    const getSessionToken = useCallback(() => {
        const google = getGoogle()
        if (!sessionTokenRef.current && google?.maps?.places) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
        }
        return sessionTokenRef.current
    }, [])

    // Reset session token after place selection
    const resetSessionToken = useCallback(() => {
        sessionTokenRef.current = null
    }, [])

    // Fetch autocomplete suggestions using AutocompleteSuggestion
    const fetchSuggestions = useCallback(async (input: string) => {
        if (!input || input.length < 2) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        try {
            const google = getGoogle()
            if (!google?.maps?.places?.AutocompleteSuggestion) {
                // Fallback: Use the legacy service if new API not available
                const service = new google.maps.places.AutocompleteService()
                service.getPlacePredictions(
                    {
                        input,
                        componentRestrictions: { country: 'in' },
                        sessionToken: getSessionToken(),
                    },
                    (predictions: any[], status: string) => {
                        if (status === 'OK' && predictions) {
                            setSuggestions(predictions)
                            setShowSuggestions(true)
                        } else {
                            setSuggestions([])
                            setShowSuggestions(false)
                        }
                    }
                )
                return
            }

            // New API: Use AutocompleteSuggestion.fetchAutocompleteSuggestions
            const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input,
                includedRegionCodes: ['in'],
                sessionToken: getSessionToken(),
            })

            setSuggestions(results || [])
            setShowSuggestions(results && results.length > 0)
        } catch (err) {
            console.error('Autocomplete error:', err)
            setSuggestions([])
        }
    }, [getSessionToken])

    // Handle input change with debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            fetchSuggestions(value)
        }, 300)
    }

    // Handle place selection
    const handleSelectPlace = useCallback(async (suggestion: any) => {
        try {
            const google = getGoogle()

            // Get place details
            let placeId: string
            let displayText: string

            if (suggestion.placePrediction) {
                // New API format
                placeId = suggestion.placePrediction.placeId
                displayText = suggestion.placePrediction.text?.text || suggestion.placePrediction.mainText?.text || ''
            } else {
                // Legacy format
                placeId = suggestion.place_id
                displayText = suggestion.description || ''
            }

            setInputValue(displayText)
            setSuggestions([])
            setShowSuggestions(false)

            // Geocode to get coordinates
            const geocoder = new google.maps.Geocoder()
            geocoder.geocode(
                { placeId },
                (results: any[] | null, status: string) => {
                    if (status === 'OK' && results && results[0]) {
                        const location = results[0].geometry.location
                        onPlaceSelect({
                            lat: location.lat(),
                            lng: location.lng(),
                            formattedAddress: results[0].formatted_address || displayText,
                        })
                        resetSessionToken()
                    } else {
                        console.error('Geocoding failed:', status)
                    }
                }
            )
        } catch (err) {
            console.error('Place selection error:', err)
        }
    }, [onPlaceSelect, resetSessionToken])

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Error state
    if (error) {
        return (
            <div
                style={{
                    padding: '12px 14px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                }}
            >
                ⚠️ {error}
            </div>
        )
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={isLoading ? 'Loading...' : placeholder}
                disabled={isLoading}
                style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                    backgroundColor: isLoading ? '#f9fafb' : '#ffffff',
                }}
            />
            {isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '14px',
                    }}
                >
                    ⏳
                </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <ul
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        marginTop: '4px',
                        padding: 0,
                        listStyle: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        maxHeight: '250px',
                        overflowY: 'auto',
                    }}
                >
                    {suggestions.map((suggestion, index) => {
                        // Handle both new and legacy API formats
                        const text = suggestion.placePrediction?.text?.text
                            || suggestion.description
                            || 'Unknown place'
                        const secondaryText = suggestion.placePrediction?.structuredFormat?.secondaryText?.text
                            || suggestion.structured_formatting?.secondary_text
                            || ''

                        return (
                            <li
                                key={suggestion.placePrediction?.placeId || suggestion.place_id || index}
                                onClick={() => handleSelectPlace(suggestion)}
                                style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                            >
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>
                                    {text}
                                </div>
                                {secondaryText && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        {secondaryText}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                    <li
                        style={{
                            padding: '8px 14px',
                            fontSize: '11px',
                            color: '#9ca3af',
                            textAlign: 'right',
                            borderTop: '1px solid #f3f4f6',
                        }}
                    >
                        Powered by Google
                    </li>
                </ul>
            )}
        </div>
    )
}
