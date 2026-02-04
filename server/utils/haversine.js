// server/utils/haversine.js
// Calculates the Haversine distance between two geographic coordinates

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula
 * 
 * @param {number[]} coord1 - First coordinate as [longitude, latitude]
 * @param {number[]} coord2 - Second coordinate as [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
function haversineDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in kilometers

    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;

    // Convert degrees to radians
    const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
}

module.exports = { haversineDistance };
