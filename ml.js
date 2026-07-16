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

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function predictDonorAvailability(donor) {
    const now = new Date();
    const lastDonation = new Date(donor.last_donation_date);
    const msSinceLast = now - lastDonation;
    const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);

    if (daysSinceLast < 90 || !donor.is_eligible) {
        return {
            probability: 0,
            status: "Unavailable (Cooldown)",
            daysRemaining: Math.ceil(90 - daysSinceLast),
            reason: "Must wait 90 days between donations"
        };
    }

    let prob = 70;

    if (daysSinceLast > 120) {
        prob += 10;
    } else {
        prob += (daysSinceLast - 90) * 0.33;
    }

    const responseFactor = (donor.response_rate || 0) * 0.10;
    prob += responseFactor;

    const activityFactor = (donor.activity_score || 0) * 0.10;
    prob += activityFactor;

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

function rankDonors(patientBloodGroup, patientLat, patientLng, donorsList, usersList) {
    const eligibleDonors = donorsList.filter(d => {
        const u = usersList.find(user => user.id === d.user_id);
        return u && u.status === 'Active';
    });

    const ranked = eligibleDonors.map(donor => {
        const user = usersList.find(u => u.id === donor.user_id);
        const distance = calculateDistance(patientLat, patientLng, donor.lat, donor.lng);
        
        let compatibilityScore = 0;
        if (donor.blood_group === patientBloodGroup) {
            compatibilityScore = 1.0;
        } else if (COMPATIBILITY_MAP[patientBloodGroup]?.includes(donor.blood_group)) {
            compatibilityScore = 0.6;
        }

        if (compatibilityScore === 0) return null;

        const distanceScore = 1 / (1 + 0.15 * distance);

        const availability = predictDonorAvailability(donor);

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
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

    return ranked;
}

function predictBloodDemand(requests) {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const divisions = ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', 'Barisal', 'Rajshahi', 'Rangpur', 'Mymensingh'];
    
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentRequests = requests.filter(r => r.status !== 'Cancelled');

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

    const predictions = groups.map(g => {
        const currentDemand = stats[g].past_30_days;
        const previousDemand = stats[g].past_60_to_30_days;

        let trend = 0;
        if (previousDemand > 0) {
            trend = (currentDemand - previousDemand) / previousDemand;
            trend = Math.max(-0.5, Math.min(0.5, trend));
        } else if (currentDemand > 0) {
            trend = 0.2;
        }

        let predictedUnits = Math.round(currentDemand * (1 + trend) + 1.2);
        predictedUnits = Math.max(1, predictedUnits);

        let peakDivision = "Dhaka";
        let maxDivCount = -1;
        divisions.forEach(div => {
            if (stats[g].division_distribution[div] > maxDivCount) {
                maxDivCount = stats[g].division_distribution[div];
                peakDivision = div;
            }
        });

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
