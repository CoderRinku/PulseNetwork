// Machine Learning & Statistical Prediction Engine for Blood Donation System

// Blood Compatibility Map (Receiver Key -> Set of compatible donor groups)
const COMPATIBILITY_MAP = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/**
 * Calculates the Haversine distance between two sets of GPS coordinates in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 1. Donor Availability Prediction
 * Predicts the likelihood (%) of a donor being active and accepting a request.
 */
function predictDonorAvailability(donor) {
    const now = new Date();
    const lastDonation = new Date(donor.last_donation_date);
    const msSinceLast = now - lastDonation;
    const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);

    // Cooldown check (90 days mandatory cooldown)
    if (daysSinceLast < 90 || !donor.is_eligible) {
        return {
            probability: 0,
            status: "Unavailable (Cooldown)",
            daysRemaining: Math.ceil(90 - daysSinceLast),
            reason: "Must wait 90 days between donations"
        };
    }

    // Heuristical Scoring Model
    // Base probability for eligible donor: 70%
    let prob = 70;

    // Time-based factor: donors who haven't donated in a long time (e.g. > 120 days) might be slightly readier
    if (daysSinceLast > 120) {
        prob += 10;
    } else {
        prob += (daysSinceLast - 90) * 0.33; // gradual scale from 90 to 120 days
    }

    // Response rate weight (out of 10%)
    const responseFactor = (donor.response_rate || 0) * 0.10;
    prob += responseFactor;

    // Activity score weight (out of 10%)
    const activityFactor = (donor.activity_score || 0) * 0.10;
    prob += activityFactor;

    // Cap probability at 99%
    prob = Math.min(Math.round(prob), 99);

    let status = "Highly Likely";
    if (prob < 60) status = "Moderate Likelihood";
    else if (prob < 80) status = "Likely";

    return {
        probability: prob,
        status: status,
        daysRemaining: 0,
        reason: `Eligible for ${Math.floor(daysSinceLast)} days. High response history.`
    };
}

/**
 * 2. Smart Donor Ranking & 4. Donor Recommendation
 * Ranks and recommends eligible donors for a specific patient location and blood group.
 */
function rankDonors(patientBloodGroup, patientLat, patientLng, donorsList, usersList) {
    const eligibleDonors = donorsList.filter(d => {
        // Find corresponding user account status
        const u = usersList.find(user => user.id === d.user_id);
        return u && u.status === 'Active';
    });

    const ranked = eligibleDonors.map(donor => {
        const user = usersList.find(u => u.id === donor.user_id);
        const distance = calculateDistance(patientLat, patientLng, donor.lat, donor.lng);
        
        // 1. Compatibility Weight
        let compatibilityScore = 0;
        if (donor.blood_group === patientBloodGroup) {
            compatibilityScore = 1.0; // Perfect match
        } else if (COMPATIBILITY_MAP[patientBloodGroup]?.includes(donor.blood_group)) {
            compatibilityScore = 0.6; // Compatible match (e.g., O- donating to A+)
        }

        // Skip incompatible donors
        if (compatibilityScore === 0) return null;

        // 2. Distance Weight (decay function: score close to 1 when near 0km, decays towards 0)
        // distance decay formula: 1 / (1 + 0.1 * distance)
        const distanceScore = 1 / (1 + 0.15 * distance);

        // 3. Availability Prediction
        const availability = predictDonorAvailability(donor);

        // 4. ML Combined Ranking Score
        // Weight distribution: Compatibility (40%), Proximity (30%), Availability (15%), Historical Activity (15%)
        const totalScore = (compatibilityScore * 40) +
                           (distanceScore * 30) +
                           ((availability.probability / 100) * 15) +
                           (((donor.activity_score || 70) / 100) * 15);

        return {
            user_id: donor.user_id,
            name: user ? user.name : "Anonymous",
            phone: user ? user.phone : "Private",
            email: user ? user.email : "Private",
            blood_group: donor.blood_group,
            distance_km: Math.round(distance * 10) / 10,
            availability_prediction: availability,
            score: Math.round(totalScore * 10) / 10,
            lat: donor.lat,
            lng: donor.lng,
            thana: donor.thana,
            district: donor.district
        };
    })
    .filter(Boolean) // remove nulls (incompatible donors)
    .sort((a, b) => b.score - a.score); // highest score first

    return ranked;
}

/**
 * 3. Blood Demand Prediction
 * Predicts next month's demand by blood group and division using request logs.
 */
function predictBloodDemand(requests) {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const divisions = ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', 'Barisal', 'Rajshahi', 'Rangpur', 'Mymensingh'];
    
    // Group requests by month/group/location
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Filter requests in the last 60 days
    const recentRequests = requests.filter(r => r.status !== 'Cancelled');

    // Count statistics
    const stats = {};
    groups.forEach(g => {
        stats[g] = { past_30_days: 0, past_60_to_30_days: 0, division_distribution: {} };
        divisions.forEach(div => {
            stats[g].division_distribution[div] = 0;
        });
    });

    recentRequests.forEach(req => {
        const reqDate = new Date(req.created_at);
        const group = req.blood_group;
        const division = req.division;

        if (!stats[group]) return;

        if (reqDate >= oneMonthAgo) {
            stats[group].past_30_days += (req.units_needed || 1);
            if (stats[group].division_distribution[division] !== undefined) {
                stats[group].division_distribution[division] += (req.units_needed || 1);
            }
        } else if (reqDate >= twoMonthsAgo) {
            stats[group].past_60_to_30_days += (req.units_needed || 1);
        }
    });

    // Generate forecast
    const predictions = groups.map(g => {
        const currentDemand = stats[g].past_30_days;
        const previousDemand = stats[g].past_60_to_30_days;

        // Simple ML forecasting: Linear growth + moving average base
        // Trend = (Current - Previous) / Previous (capped to prevent infinity/extreme volatility)
        let trend = 0;
        if (previousDemand > 0) {
            trend = (currentDemand - previousDemand) / previousDemand;
            trend = Math.max(-0.5, Math.min(0.5, trend)); // cap trend changes to +/- 50%
        } else if (currentDemand > 0) {
            trend = 0.2; // default 20% growth if starting from zero
        }

        // Predicted Demand = Current Demand * (1 + Trend) + baseline smoothing constant (1.0)
        let predictedUnits = Math.round(currentDemand * (1 + trend) + 1.2);
        
        // Add random biological noise to mimic real predictions (+/- 1 unit)
        // Keep it reproducible or positive
        predictedUnits = Math.max(1, predictedUnits);

        // Find primary hot division
        let peakDivision = "Dhaka";
        let maxDivCount = -1;
        divisions.forEach(div => {
            if (stats[g].division_distribution[div] > maxDivCount) {
                maxDivCount = stats[g].division_distribution[div];
                peakDivision = div;
            }
        });

        // If no requests, default peak division to Dhaka
        if (maxDivCount === 0) peakDivision = "Dhaka";

        let riskLevel = "Low";
        if (predictedUnits >= 5) riskLevel = "Critical Urgent";
        else if (predictedUnits >= 3) riskLevel = "Moderate";

        return {
            blood_group: g,
            current_30d_demand: currentDemand,
            predicted_30d_demand: predictedUnits,
            trend_percentage: Math.round(trend * 100),
            peak_division: peakDivision,
            risk_level: riskLevel
        };
    });

    return predictions;
}

module.exports = {
    calculateDistance,
    predictDonorAvailability,
    rankDonors,
    predictBloodDemand
};
