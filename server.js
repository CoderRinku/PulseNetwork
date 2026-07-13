const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const db = require('./db');
const ml = require('./ml');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory sessions map (token -> user details)
const SESSIONS = {};

// Active WebSocket connections map (userId -> ws client socket)
const CLIENTS = {};

// ----------------------------------------------------
// BACKGROUND WORKER: Auto-reset donor eligibility after 90 days
// ----------------------------------------------------
function checkDonorEligibilityCooldown() {
    const data = db.read();
    let updated = false;
    const now = new Date();

    data.donors.forEach(donor => {
        if (!donor.is_eligible) {
            const lastDonation = new Date(donor.last_donation_date);
            const diffTime = Math.abs(now - lastDonation);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 90) {
                donor.is_eligible = true;
                updated = true;
                console.log(`[Auto-Cooldown] Donor ${donor.user_id} eligibility restored automatically. (90+ days reached).`);
            }
        }
    });

    if (updated) {
        db.write(data);
    }
}

// Run cooldown check immediately on startup and then every 30 seconds
checkDonorEligibilityCooldown();
setInterval(checkDonorEligibilityCooldown, 30000);

// Helper function to extract user from session
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. Token missing." });

    const sessionUser = SESSIONS[token];
    if (!sessionUser) return res.status(403).json({ error: "Invalid or expired token." });

    req.user = sessionUser;
    next();
}

// ----------------------------------------------------
// REST API: AUTHENTICATION & SECURITY
// ----------------------------------------------------

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, phone, nid_birth_cert, division, district, thana, extra } = req.body;

    if (!name || !email || !password || !role || !phone || !nid_birth_cert || !division || !district || !thana) {
        return res.status(400).json({ error: "Please fill out all required fields." });
    }

    const data = db.read();
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "An account with this email already exists." });
    }

    const userId = `user-${crypto.randomBytes(4).toString('hex')}`;
    const hashedPassword = require('bcryptjs').hashSync(password, 10);

    const newUser = {
        id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        phone,
        nid_birth_cert,
        status: (role === 'Blood Bank / Hospital') ? 'Pending' : 'Active', // Blood banks require approval
        created_at: new Date().toISOString()
    };

    data.users.push(newUser);

    const latLng = db.getLatLng(division, district, thana);

    // Save sub-role configurations
    if (role === 'Donor') {
        const age = parseInt(extra?.age || 25);
        const weight = parseInt(extra?.weight || 70);
        const blood_group = extra?.blood_group || 'O+';
        const permanent_area = extra?.permanent_area || `${thana}, ${district}`;

        data.donors.push({
            user_id: userId,
            blood_group,
            age,
            weight,
            permanent_area,
            division,
            district,
            thana,
            lat: latLng.lat + (Math.random() - 0.5) * 0.02, // Add tiny dispersion for visual separation on maps
            lng: latLng.lng + (Math.random() - 0.5) * 0.02,
            last_donation_date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // set default past date (100 days ago = eligible)
            is_eligible: true,
            response_rate: 100,
            activity_score: 80,
            total_donations: 0
        });
    } else if (role === 'Blood Bank / Hospital') {
        data.blood_banks.push({
            user_id: userId,
            name,
            verification_status: 'Pending',
            division,
            district,
            thana,
            lat: latLng.lat,
            lng: latLng.lng,
            contact_no: phone
        });

        // Initialize inventory with 0 units for each blood group
        const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        groups.forEach(g => {
            data.blood_inventory.push({
                blood_bank_id: userId,
                blood_group: g,
                quantity: 0,
                updated_at: new Date().toISOString()
            });
        });
    }

    db.write(data);

    // Auto log in if role is not Blood Bank (which requires Admin approval)
    if (newUser.status === 'Active') {
        const token = crypto.randomBytes(16).toString('hex');
        SESSIONS[token] = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
        return res.json({ message: "Registration successful!", token, user: SESSIONS[token] });
    }

    res.json({ message: "Registration successful! Account is pending verification by administration.", requiresApproval: true });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    const data = db.read();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        return res.status(400).json({ error: "Invalid email or password." });
    }

    if (user.status === 'Pending') {
        return res.status(403).json({ error: "Your account is pending administrator approval." });
    }

    if (user.status === 'Inactive') {
        return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
    }

    const isMatch = require('bcryptjs').compareSync(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = crypto.randomBytes(16).toString('hex');
    SESSIONS[token] = { id: user.id, name: user.name, email: user.email, role: user.role };

    res.json({ message: "Login successful!", token, user: SESSIONS[token] });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // Delete session token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) delete SESSIONS[token];
    res.json({ message: "Logout successful." });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const data = db.read();
    const user = data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const response = { ...user };
    delete response.password;

    if (user.role === 'Donor') {
        response.donorProfile = data.donors.find(d => d.user_id === user.id);
    } else if (user.role === 'Blood Bank / Hospital') {
        response.bloodBankProfile = data.blood_banks.find(b => b.user_id === user.id);
        response.inventory = data.blood_inventory.filter(i => i.blood_bank_id === user.id);
    }

    res.json(response);
});

// ----------------------------------------------------
// GEOGRAPHY DATA
// ----------------------------------------------------
app.get('/api/geography', (req, res) => {
    res.json(db.getGeography());
});

// ----------------------------------------------------
// PUBLIC API: GET ALL ACTIVE DONORS FOR COVERAGE MAP
// ----------------------------------------------------
app.get('/api/donors/all', (req, res) => {
    const data = db.read();
    const result = data.donors.map(d => {
        const u = data.users.find(user => user.id === d.user_id);
        if (u && u.status === 'Active') {
            return {
                user_id: d.user_id,
                name: u.name,
                blood_group: d.blood_group,
                lat: d.lat,
                lng: d.lng,
                thana: d.thana,
                district: d.district
            };
        }
        return null;
    }).filter(Boolean);
    res.json(result);
});

// ----------------------------------------------------
// SEARCH FILTER & DISTANCE RANKING APIs
// ----------------------------------------------------
app.get('/api/donors/search', (req, res) => {
    const { division, district, thana, bloodGroup, lat, lng } = req.query;

    if (!division || !district || !thana || !bloodGroup) {
        return res.status(400).json({ error: "Division, district, thana and blood group are required filters." });
    }

    const pLat = parseFloat(lat || 23.8103);
    const pLng = parseFloat(lng || 90.4125);

    const data = db.read();
    
    // Perform standard search filters
    let searchResult = data.donors.filter(donor => {
        return donor.division === division &&
               donor.district === district &&
               donor.thana === thana;
    });

    // Run ML Donor Ranking (calculates distance, compatibility, response rates)
    const rankedResults = ml.rankDonors(bloodGroup, pLat, pLng, searchResult, data.users);

    res.json(rankedResults);
});

app.post('/api/donors/toggle-status', authenticateToken, (req, res) => {
    const { donorId, status } = req.body; // status: 'Active' or 'Inactive'
    const data = db.read();

    const targetUser = data.users.find(u => u.id === donorId);
    if (!targetUser) return res.status(404).json({ error: "Donor account not found." });

    // Allow Admin to toggle, or Donor to toggle their own account
    if (req.user.role !== 'Admin' && req.user.id !== donorId) {
        return res.status(403).json({ error: "Unauthorized operation." });
    }

    targetUser.status = status;
    db.write(data);

    res.json({ message: `Donor status set to ${status} successfully.`, donorId, status });
});

app.post('/api/donors/log-donation', authenticateToken, (req, res) => {
    const { donorId, unitsDonated, recipientId, recipientType } = req.body;
    
    // Only Admin or Blood Bank can log a donation
    if (req.user.role !== 'Admin' && req.user.role !== 'Blood Bank / Hospital') {
        return res.status(403).json({ error: "Only admins and blood banks can log donations." });
    }

    const data = db.read();
    const donor = data.donors.find(d => d.user_id === donorId);
    if (!donor) return res.status(404).json({ error: "Donor record not found." });

    const now = new Date().toISOString();

    // 90 days cooldown updates automatically
    donor.last_donation_date = now;
    donor.is_eligible = false;
    donor.total_donations += parseInt(unitsDonated || 1);
    donor.activity_score = Math.min(100, (donor.activity_score || 70) + 5); // Boost activity

    // Log to history
    const historyId = `don-h-${crypto.randomBytes(4).toString('hex')}`;
    data.donation_history.push({
        id: historyId,
        donor_id: donorId,
        recipient_id: recipientId || req.user.id,
        recipient_type: recipientType || req.user.role,
        donation_date: now,
        units_donated: parseInt(unitsDonated || 1)
    });

    // If recipient is a blood bank, add stock automatically
    if (recipientType === 'BloodBank' || req.user.role === 'Blood Bank / Hospital') {
        const bbId = recipientId || req.user.id;
        const stockItem = data.blood_inventory.find(i => i.blood_bank_id === bbId && i.blood_group === donor.blood_group);
        if (stockItem) {
            stockItem.quantity += parseInt(unitsDonated || 1);
            stockItem.updated_at = now;
        }
    }

    db.write(data);
    res.json({ message: "Donation logged successfully. Donor enters 90-day cooldown.", donor });
});

// ----------------------------------------------------
// INVENTORY DASHBOARD
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
    const data = db.read();
    
    // Return aggregated stocks for patients/guests, or detailed stocks grouped by blood bank
    const result = data.blood_banks.map(bb => {
        const inventory = data.blood_inventory.filter(i => i.blood_bank_id === bb.user_id);
        return {
            blood_bank_id: bb.user_id,
            name: bb.name,
            division: bb.division,
            district: bb.district,
            thana: bb.thana,
            lat: bb.lat,
            lng: bb.lng,
            contact_no: bb.contact_no,
            verification_status: bb.verification_status,
            inventory: inventory
        };
    }).filter(bb => bb.verification_status === 'Verified');

    res.json(result);
});

app.post('/api/inventory/update', authenticateToken, (req, res) => {
    const { bloodGroup, quantity } = req.body;

    if (req.user.role !== 'Blood Bank / Hospital') {
        return res.status(403).json({ error: "Only Blood Bank accounts can update stock levels." });
    }

    const data = db.read();
    const stockItem = data.blood_inventory.find(i => i.blood_bank_id === req.user.id && i.blood_group === bloodGroup);

    if (!stockItem) {
        return res.status(404).json({ error: "Inventory item not found." });
    }

    stockItem.quantity = Math.max(0, parseInt(quantity || 0));
    stockItem.updated_at = new Date().toISOString();

    db.write(data);

    // Notify all clients of inventory updates via WebSockets
    broadcastMessage({
        type: 'INVENTORY_UPDATE',
        blood_bank_id: req.user.id,
        blood_group: bloodGroup,
        quantity: stockItem.quantity
    });

    res.json({ message: "Inventory updated successfully.", stockItem });
});

// ----------------------------------------------------
// EMERGENCY BLOOD REQUESTS & ALERTS
// ----------------------------------------------------
app.get('/api/requests', (req, res) => {
    const data = db.read();
    
    // Sort Emergency Requests: Urgent level High first, then newest
    const sorted = [...data.emergency_requests].sort((a, b) => {
        if (a.urgency_level === 'High' && b.urgency_level !== 'High') return -1;
        if (a.urgency_level !== 'High' && b.urgency_level === 'High') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json(sorted);
});

app.post('/api/requests/create', authenticateToken, (req, res) => {
    const { blood_group, units_needed, hospital_name, location_details, division, district, thana, urgency_level } = req.body;

    if (!blood_group || !units_needed || !hospital_name || !division || !district || !thana) {
        return res.status(400).json({ error: "Required fields missing." });
    }

    const data = db.read();
    const latLng = db.getLatLng(division, district, thana);

    const requestId = `req-${crypto.randomBytes(4).toString('hex')}`;
    const newRequest = {
        id: requestId,
        patient_id: req.user.id,
        blood_group,
        units_needed: parseInt(units_needed),
        hospital_name,
        location_details: location_details || `${hospital_name}, ${thana}`,
        division,
        district,
        thana,
        lat: latLng.lat,
        lng: latLng.lng,
        urgency_level: urgency_level || 'Medium',
        status: 'Pending',
        created_at: new Date().toISOString()
    };

    data.emergency_requests.push(newRequest);
    db.write(data);

    // Notify surrounding donors/blood banks based on location matching!
    broadcastMessage({
        type: 'EMERGENCY_ALERT',
        request: newRequest
    });

    res.json({ message: "Emergency blood request posted successfully!", request: newRequest });
});

app.post('/api/requests/status', authenticateToken, (req, res) => {
    const { requestId, status } = req.body; // status: Pending, Approved, Completed, Cancelled
    
    // Only Admin, Patient (creator), or Blood Bank staff can change status
    const data = db.read();
    const request = data.emergency_requests.find(r => r.id === requestId);

    if (!request) return res.status(404).json({ error: "Emergency request not found." });

    if (req.user.role !== 'Admin' && req.user.role !== 'Blood Bank / Hospital' && req.user.id !== request.patient_id) {
        return res.status(403).json({ error: "Unauthorized operation." });
    }

    request.status = status;
    db.write(data);

    broadcastMessage({
        type: 'REQUEST_STATUS_CHANGE',
        requestId,
        status
    });

    res.json({ message: `Request status changed to ${status}.`, request });
});

// ----------------------------------------------------
// MACHINE LEARNING INSIGHTS & REPORTS
// ----------------------------------------------------
app.get('/api/ml/demand', authenticateToken, (req, res) => {
    const data = db.read();
    // Run the ML demand forecasting module
    const forecast = ml.predictBloodDemand(data.emergency_requests);
    res.json(forecast);
});

app.get('/api/ml/recommend', authenticateToken, (req, res) => {
    const { requestId } = req.query;
    if (!requestId) return res.status(400).json({ error: "requestId query parameter is required." });

    const data = db.read();
    const request = data.emergency_requests.find(r => r.id === requestId);
    if (!request) return res.status(404).json({ error: "Emergency request not found." });

    // Run ML Donor ranking matching this request group and location
    const matchedDonors = data.donors.filter(d => {
        return d.division === request.division && d.district === request.district;
    });

    const recommendations = ml.rankDonors(request.blood_group, request.lat, request.lng, matchedDonors, data.users);
    
    res.json({
        request: request,
        recommendations: recommendations.slice(0, 3) // Return top 3 matches
    });
});

// ----------------------------------------------------
// ADMIN ONLY OPERATIONS
// ----------------------------------------------------
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Unauthorized." });
    
    const data = db.read();
    const usersList = data.users.map(u => {
        const userCopy = { ...u };
        delete userCopy.password;
        if (u.role === 'Donor') {
            userCopy.donorProfile = data.donors.find(d => d.user_id === u.id);
        } else if (u.role === 'Blood Bank / Hospital') {
            userCopy.bloodBankProfile = data.blood_banks.find(b => b.user_id === u.id);
        }
        return userCopy;
    });
    res.json(usersList);
});

app.post('/api/admin/approve-bb', authenticateToken, (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Unauthorized." });
    
    const { bloodBankId, action } = req.body; // action: 'Verify' or 'Reject'
    const data = db.read();

    const user = data.users.find(u => u.id === bloodBankId);
    const bb = data.blood_banks.find(b => b.user_id === bloodBankId);

    if (!user || !bb) return res.status(404).json({ error: "Blood bank record not found." });

    if (action === 'Verify') {
        user.status = 'Active';
        bb.verification_status = 'Verified';
    } else {
        user.status = 'Inactive';
        bb.verification_status = 'Rejected';
    }

    db.write(data);
    res.json({ message: `Blood bank verified status set to ${bb.verification_status}.`, bloodBankId });
});

// Admin chat monitoring API
app.get('/api/admin/chats', authenticateToken, (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: "Access denied." });
    
    const data = db.read();
    // Group messages by pairs of communicators
    const conversations = {};
    data.messages.forEach(msg => {
        const key = [msg.sender_id, msg.receiver_id].sort().join(' & ');
        if (!conversations[key]) {
            const senderUser = data.users.find(u => u.id === msg.sender_id);
            const receiverUser = data.users.find(u => u.id === msg.receiver_id);
            conversations[key] = {
                sender_name: senderUser ? senderUser.name : "Unknown",
                receiver_name: receiverUser ? receiverUser.name : "Unknown",
                sender_role: senderUser ? senderUser.role : "Unknown",
                receiver_role: receiverUser ? receiverUser.role : "Unknown",
                messages: []
            };
        }
        conversations[key].messages.push(msg);
    });

    res.json(conversations);
});

// ----------------------------------------------------
// REAL-TIME MESSAGING CHAT APIs
// ----------------------------------------------------
app.get('/api/chat/history/:partnerId', authenticateToken, (req, res) => {
    const { partnerId } = req.params;
    const currentUserId = req.user.id;

    const data = db.read();
    // Fetch conversations between current user and partner
    const history = data.messages.filter(msg => {
        return (msg.sender_id === currentUserId && msg.receiver_id === partnerId) ||
               (msg.sender_id === partnerId && msg.receiver_id === currentUserId);
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Mark these messages as read
    let updated = false;
    data.messages.forEach(msg => {
        if (msg.sender_id === partnerId && msg.receiver_id === currentUserId && !msg.is_read) {
            msg.is_read = true;
            updated = true;
        }
    });

    if (updated) {
        db.write(data);
    }

    res.json(history);
});

app.get('/api/chat/unread', authenticateToken, (req, res) => {
    const currentUserId = req.user.id;
    const data = db.read();

    const counts = {};
    data.messages.forEach(msg => {
        if (msg.receiver_id === currentUserId && !msg.is_read) {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        }
    });

    res.json(counts);
});

// ----------------------------------------------------
// WEBSOCKET SERVER LOGIC (Real-time Messaging)
// ----------------------------------------------------
wss.on('connection', (ws) => {
    console.log('[WebSocket] Connection established.');

    let authenticatedUserId = null;

    ws.on('message', (messageStr) => {
        try {
            const data = JSON.parse(messageStr);

            // 1. Connection Authentication
            if (data.type === 'REGISTER') {
                const token = data.token;
                const sessionUser = SESSIONS[token];
                if (sessionUser) {
                    authenticatedUserId = sessionUser.id;
                    CLIENTS[authenticatedUserId] = ws;
                    console.log(`[WebSocket] Registered user: ${sessionUser.name} (${authenticatedUserId})`);
                    ws.send(JSON.stringify({ type: 'REGISTER_OK' }));
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', error: 'Authentication failed.' }));
                    ws.close();
                }
            }

            // 2. Chat messaging flow
            if (data.type === 'CHAT_MSG') {
                if (!authenticatedUserId) return;

                const { receiver_id, message } = data;
                if (!receiver_id || !message) return;

                const dbData = db.read();

                // Build message object
                const messageObj = {
                    id: `msg-${crypto.randomBytes(4).toString('hex')}`,
                    sender_id: authenticatedUserId,
                    receiver_id,
                    message,
                    is_read: false,
                    timestamp: new Date().toISOString()
                };

                dbData.messages.push(messageObj);
                db.write(dbData);

                // Send back to sender for confirmation
                ws.send(JSON.stringify({ type: 'CHAT_MSG_CONFIRM', message: messageObj }));

                // Dispatch to receiver if online
                const receiverSocket = CLIENTS[receiver_id];
                if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
                    receiverSocket.send(JSON.stringify({ type: 'CHAT_MSG_INCOMING', message: messageObj }));
                }
            }
        } catch (err) {
            console.error('[WebSocket] Message error:', err);
        }
    });

    ws.on('close', () => {
        if (authenticatedUserId) {
            delete CLIENTS[authenticatedUserId];
            console.log(`[WebSocket] Connection closed for user: ${authenticatedUserId}`);
        }
    });
});

// Broadcast Helper
function broadcastMessage(payload) {
    const msgStr = JSON.stringify(payload);
    Object.values(CLIENTS).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msgStr);
        }
    });
}

// Fallback to Index.html for Single Page Routing
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Spin up server
server.listen(PORT, () => {
    console.log(`[Express] Blood Donation System Server running on http://localhost:${PORT}`);
});
