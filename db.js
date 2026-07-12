const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Bangladesh Divisions, Districts, and Thanas with latitude and longitude coordinates
const GEOGRAPHY = {
    "Dhaka": {
        "Dhaka": {
            "Mirpur": { lat: 23.8041, lng: 90.3626 },
            "Dhanmondi": { lat: 23.7461, lng: 90.3742 },
            "Gulshan": { lat: 23.7925, lng: 90.4078 },
            "Uttara": { lat: 23.8759, lng: 90.3795 },
            "Motijheel": { lat: 23.7330, lng: 90.4172 },
            "Banani": { lat: 23.7937, lng: 90.4050 }
        },
        "Gazipur": {
            "Sadar": { lat: 23.9999, lng: 90.4203 },
            "Tongi": { lat: 23.8967, lng: 90.4017 }
        }
    },
    "Chittagong": {
        "Chittagong": {
            "Kotwali": { lat: 22.3350, lng: 91.8315 },
            "Halishahar": { lat: 22.3167, lng: 91.7833 },
            "Panchlaish": { lat: 22.3600, lng: 91.8250 },
            "Double Mooring": { lat: 22.3250, lng: 91.7900 }
        },
        "Coxs Bazar": {
            "Sadar": { lat: 21.4394, lng: 91.9754 },
            "Teknaf": { lat: 20.8653, lng: 92.3023 }
        }
    },
    "Sylhet": {
        "Sylhet": {
            "Zindabazar": { lat: 24.8949, lng: 91.8687 },
            "Amberkhana": { lat: 24.9080, lng: 91.8650 },
            "Shahjalal Uposhahar": { lat: 24.8920, lng: 91.8880 }
        }
    },
    "Khulna": {
        "Khulna": {
            "Sadar": { lat: 22.8156, lng: 89.5636 },
            "Daulatpur": { lat: 22.8878, lng: 89.5244 },
            "Khalishpur": { lat: 22.8583, lng: 89.5444 }
        }
    },
    "Barisal": {
        "Barisal": {
            "Sadar": { lat: 22.7010, lng: 90.3535 },
            "Babuganj": { lat: 22.8125, lng: 90.3167 }
        }
    },
    "Rajshahi": {
        "Rajshahi": {
            "Sadar": { lat: 24.3745, lng: 88.6042 },
            "Motihar": { lat: 24.3639, lng: 88.6294 }
        }
    },
    "Rangpur": {
        "Rangpur": {
            "Sadar": { lat: 25.7538, lng: 89.2467 },
            "Mithapukur": { lat: 25.5786, lng: 89.2667 }
        }
    },
    "Mymensingh": {
        "Mymensingh": {
            "Sadar": { lat: 24.7471, lng: 90.4203 },
            "Bhaluka": { lat: 24.3797, lng: 90.3772 }
        }
    }
};

// Pre-hashed password for testing: 'password123'
const SEED_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

function getInitialData() {
    return {
        users: [
            {
                id: "user-admin",
                name: "Super Administrator",
                email: "admin@blooddonation.org",
                password: SEED_PASSWORD_HASH,
                role: "Admin",
                phone: "+8801711111111",
                nid_birth_cert: "123456789012",
                status: "Active",
                created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-donor-1",
                name: "Tanvir Rahman",
                email: "tanvir@gmail.com",
                password: SEED_PASSWORD_HASH,
                role: "Donor",
                phone: "+8801722222222",
                nid_birth_cert: "987654321098",
                status: "Active",
                created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-donor-2",
                name: "Anika Tasnim",
                email: "anika@gmail.com",
                password: SEED_PASSWORD_HASH,
                role: "Donor",
                phone: "+8801733333333",
                nid_birth_cert: "456789012345",
                status: "Active",
                created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-donor-3",
                name: "Rakib Hasan",
                email: "rakib@gmail.com",
                password: SEED_PASSWORD_HASH,
                role: "Donor",
                phone: "+8801744444444",
                nid_birth_cert: "654321098765",
                status: "Active",
                created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-patient-1",
                name: "Sajjad Hossain",
                email: "sajjad@gmail.com",
                password: SEED_PASSWORD_HASH,
                role: "Patient",
                phone: "+8801755555555",
                nid_birth_cert: "321098765432",
                status: "Active",
                created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-bb-1",
                name: "Dhaka Central Blood Bank",
                email: "dhakabb@pulsenetwork.org",
                password: SEED_PASSWORD_HASH,
                role: "Blood Bank / Hospital",
                phone: "+8801766666666",
                nid_birth_cert: "BB-VERIFY-1002",
                status: "Active",
                created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "user-bb-2",
                name: "Sylhet Red Crescent Society",
                email: "sylhetred@pulsenetwork.org",
                password: SEED_PASSWORD_HASH,
                role: "Blood Bank / Hospital",
                phone: "+8801777777777",
                nid_birth_cert: "BB-VERIFY-1003",
                status: "Pending",
                created_at: new Date().toISOString()
            }
        ],
        donors: [
            {
                user_id: "user-donor-1",
                blood_group: "A+",
                age: 26,
                weight: 72,
                permanent_area: "Mirpur-10, Dhaka",
                division: "Dhaka",
                district: "Dhaka",
                thana: "Mirpur",
                lat: 23.8041,
                lng: 90.3626,
                last_donation_date: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(), // 95 days ago (eligible)
                is_eligible: true,
                response_rate: 92,
                activity_score: 85,
                total_donations: 4
            },
            {
                user_id: "user-donor-2",
                blood_group: "O-",
                age: 24,
                weight: 58,
                permanent_area: "Dhanmondi 27, Dhaka",
                division: "Dhaka",
                district: "Dhaka",
                thana: "Dhanmondi",
                lat: 23.7461,
                lng: 90.3742,
                last_donation_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago (ineligible)
                is_eligible: false,
                response_rate: 98,
                activity_score: 95,
                total_donations: 8
            },
            {
                user_id: "user-donor-3",
                blood_group: "B+",
                age: 31,
                weight: 80,
                permanent_area: "Amberkhana Point, Sylhet",
                division: "Sylhet",
                district: "Sylhet",
                thana: "Amberkhana",
                lat: 24.9080,
                lng: 91.8650,
                last_donation_date: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(), // 110 days ago (eligible)
                is_eligible: true,
                response_rate: 75,
                activity_score: 70,
                total_donations: 2
            }
        ],
        blood_banks: [
            {
                user_id: "user-bb-1",
                name: "Dhaka Central Blood Bank",
                verification_status: "Verified",
                division: "Dhaka",
                district: "Dhaka",
                thana: "Gulshan",
                lat: 23.7925,
                lng: 90.4078,
                contact_no: "+88029999999"
            },
            {
                user_id: "user-bb-2",
                name: "Sylhet Red Crescent Society",
                verification_status: "Pending",
                division: "Sylhet",
                district: "Sylhet",
                thana: "Zindabazar",
                lat: 24.8949,
                lng: 91.8687,
                contact_no: "+88082177777"
            }
        ],
        blood_inventory: [
            { blood_bank_id: "user-bb-1", blood_group: "A+", quantity: 25, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "A-", quantity: 8, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "B+", quantity: 18, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "B-", quantity: 5, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "AB+", quantity: 12, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "AB-", quantity: 2, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "O+", quantity: 30, updated_at: new Date().toISOString() },
            { blood_bank_id: "user-bb-1", blood_group: "O-", quantity: 4, updated_at: new Date().toISOString() }
        ],
        emergency_requests: [
            {
                id: "req-1",
                patient_id: "user-patient-1",
                blood_group: "A+",
                units_needed: 2,
                hospital_name: "Dhaka Medical College Hospital",
                location_details: "Ward 12, Bed 15, DMCH, Dhaka",
                division: "Dhaka",
                district: "Dhaka",
                thana: "Motijheel",
                lat: 23.7330,
                lng: 90.4172,
                urgency_level: "High",
                status: "Pending",
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                id: "req-2",
                patient_id: "user-patient-1",
                blood_group: "AB-",
                units_needed: 1,
                hospital_name: "Sylhet MAG Osmani Medical College",
                location_details: "ICU, Bed 4, Sylhet",
                division: "Sylhet",
                district: "Sylhet",
                thana: "Zindabazar",
                lat: 24.8949,
                lng: 91.8687,
                urgency_level: "High",
                status: "Approved",
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            }
        ],
        messages: [
            {
                id: "msg-1",
                sender_id: "user-patient-1",
                receiver_id: "user-donor-1",
                message: "Hello Tanvir, I see you are an eligible A+ donor near Mirpur. We urgently need 2 bags of A+ blood at DMCH. Can you help?",
                is_read: false,
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            },
            {
                id: "msg-2",
                sender_id: "user-donor-1",
                receiver_id: "user-patient-1",
                message: "Hi Sajjad, yes, I am available. I can come to DMCH by 5 PM today.",
                is_read: false,
                timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
            }
        ],
        donation_history: [
            {
                id: "don-h-1",
                donor_id: "user-donor-1",
                recipient_id: "user-bb-1",
                recipient_type: "BloodBank",
                donation_date: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
                units_donated: 1
            },
            {
                id: "don-h-2",
                donor_id: "user-donor-2",
                recipient_id: "user-patient-1",
                recipient_type: "Patient",
                donation_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                units_donated: 1
            }
        ]
    };
}

const db = {
    read() {
        try {
            if (!fs.existsSync(DB_PATH)) {
                const data = getInitialData();
                this.write(data);
                return data;
            }
            const content = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error("Database read error, restoring defaults...", error);
            const data = getInitialData();
            this.write(data);
            return data;
        }
    },

    write(data) {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf8');
            return true;
        } catch (error) {
            console.error("Database write error:", error);
            return false;
        }
    },

    getGeography() {
        return GEOGRAPHY;
    },

    getLatLng(division, district, thana) {
        try {
            const coordinates = GEOGRAPHY[division]?.[district]?.[thana];
            if (coordinates) return coordinates;
            return { lat: 23.8103, lng: 90.4125 };
        } catch (e) {
            return { lat: 23.8103, lng: 90.4125 };
        }
    }
};

module.exports = db;
