import { connectToDatabase } from '../db.js';
import { OfficeLocation } from '../models/OfficeLocation.js';

/**
 * Calculates Great-Circle distance between two Lat/Lng coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Validates digital check-in coordinates against configured office geofence locations.
 */
export async function validateGeofenceCheckIn(latitude, longitude, clientIp = null) {
    await connectToDatabase();

    const activeOffices = await OfficeLocation.find({ isActive: true }).lean();

    // If no offices are configured or active, default check-in to valid
    if (!activeOffices || activeOffices.length === 0) {
        return { isValid: true, matchedOffice: null, distanceMeters: 0 };
    }

    if (latitude == null || longitude == null) {
        return {
            isValid: false,
            error: 'Location coordinates (Latitude & Longitude) are required for digital check-in.',
        };
    }

    let minDistance = Infinity;
    let closestOffice = null;

    for (const office of activeOffices) {
        const dist = calculateDistanceMeters(latitude, longitude, office.latitude, office.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            closestOffice = office;
        }

        if (dist <= office.radiusMeters) {
            return {
                isValid: true,
                matchedOffice: office.name,
                officeCode: office.code,
                distanceMeters: dist,
                radiusLimitMeters: office.radiusMeters,
            };
        }
    }

    return {
        isValid: false,
        error: `You are outside the approved office geofence radius. Closest office: ${closestOffice?.name || 'Main Office'} (${minDistance}m away, allowed: ${closestOffice?.radiusMeters || 150}m).`,
        closestOffice: closestOffice?.name,
        distanceMeters: minDistance,
        radiusLimitMeters: closestOffice?.radiusMeters,
    };
}
