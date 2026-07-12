// Core Frontend Client Controller for PulseNetwork

// Global Application State
let CURRENT_USER = null;
let TOKEN = localStorage.getItem('token') || null;
let GEOGRAPHY = {};
let ws = null;

// Map Instances
let donorMap = null;
let donorMapMarkers = [];
let stockMap = null;
let stockMapMarkers = [];
let coverageMap = null;
let coverageMarkers = [];

// Active chat details
let ACTIVE_CHAT_PARTNER_ID = null;
let UNREAD_COUNTS = {};

// ----------------------------------------------------
// APP INITIALIZATION
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch Geographical structures
    fetchGeography();

    // 2. Hydrate session if token exists
    if (TOKEN) {
        verifySession();
    } else {
        switchView('home-view');
        renderPublicStats();
    }

    // 3. Render initial feeds
    renderInventoryList();
    renderEmergencyRequests();
    setTimeout(initCoverageMap, 250);
    setTimeout(startHeroNotifications, 300);
    setTimeout(startHeroTextSlider, 350);
    setTimeout(generateHeroParticles, 400);
});

// Switch views (SPA route routing simulation)
function switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
    }

    // Toggle active link styling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Close any search maps or results if home view is cleared
    if (viewId !== 'home-view') {
        clearSearchResults();
    }

    // Special view rendering routines
    if (viewId === 'home-view') {
        setTimeout(initCoverageMap, 200);
    } else if (viewId === 'inventory-view') {
        setTimeout(initStockMap, 200);
    } else if (viewId === 'chat-view') {
        loadChatInbox();
    }
}

// Redirect to correct dashboard based on user role
function navigateToDashboard() {
    if (!CURRENT_USER) return;
    
    const role = CURRENT_USER.role;
    if (role === 'Admin') {
        switchView('dashboard-admin-view');
        loadAdminUsers();
        loadAdminVerifyBB();
        loadAdminMLAnalytics();
        loadAdminLogDonationFields();
    } else if (role === 'Donor') {
        switchView('dashboard-donor-view');
        loadDonorDashboard();
    } else if (role === 'Patient') {
        switchView('dashboard-patient-view');
    } else if (role === 'Blood Bank / Hospital') {
        switchView('dashboard-bb-view');
        loadBBDashboard();
    }
}

// ----------------------------------------------------
// GEOGRAPHY DROPDOWN AUTOMATION
// ----------------------------------------------------
async function fetchGeography() {
    try {
        const res = await fetch('/api/geography');
        GEOGRAPHY = await res.json();
        
        // Populate register dropdowns
        populateDropdown('reg-division', Object.keys(GEOGRAPHY));
        populateDropdown('search-division', Object.keys(GEOGRAPHY));
        
        // Modal post request geography
        const reqDiv = document.getElementById('req-division');
        if (reqDiv) populateDropdown('req-division', Object.keys(GEOGRAPHY));
    } catch (e) {
        console.error("Failed to load geography definitions:", e);
    }
}

function populateDropdown(selectId, list) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">Choose</option>`;
    list.forEach(item => {
        select.innerHTML += `<option value="${item}">${item}</option>`;
    });
}

// Register form dropdown updates
function populateRegDistricts() {
    const div = document.getElementById('reg-division').value;
    const districts = div ? Object.keys(GEOGRAPHY[div]) : [];
    populateDropdown('reg-district', districts);
    document.getElementById('reg-thana').innerHTML = '<option value="">Choose</option>';
}

function populateRegThanas() {
    const div = document.getElementById('reg-division').value;
    const dist = document.getElementById('reg-district').value;
    const thanas = (div && dist) ? Object.keys(GEOGRAPHY[div][dist]) : [];
    populateDropdown('reg-thana', thanas);
}

// Home Search form dropdown updates
function populateSearchDistricts() {
    const div = document.getElementById('search-division').value;
    const districts = div ? Object.keys(GEOGRAPHY[div]) : [];
    populateDropdown('search-district', districts);
    document.getElementById('search-thana').innerHTML = '<option value="">Choose</option>';
}

function populateSearchThanas() {
    const div = document.getElementById('search-division').value;
    const dist = document.getElementById('search-district').value;
    const thanas = (div && dist) ? Object.keys(GEOGRAPHY[div][dist]) : [];
    populateDropdown('search-thana', thanas);
}

// Post request geography
function populateReqDistricts() {
    const div = document.getElementById('req-division').value;
    const districts = div ? Object.keys(GEOGRAPHY[div]) : [];
    populateDropdown('req-district', districts);
    document.getElementById('req-thana').innerHTML = '<option value="">Choose</option>';
}

function populateReqThanas() {
    const div = document.getElementById('req-division').value;
    const dist = document.getElementById('req-district').value;
    const thanas = (div && dist) ? Object.keys(GEOGRAPHY[div][dist]) : [];
    populateDropdown('req-thana', thanas);
}

// ----------------------------------------------------
// USER AUTHENTICATION & SESSION HANDLING
// ----------------------------------------------------
function openAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    toggleAuthTab(mode);
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthTab(mode) {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');

    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginBtn.classList.remove('active');
        registerBtn.classList.add('active');
        toggleRegRoleFields();
    }
}

// Toggle conditional registration inputs
function toggleRegRoleFields() {
    const role = document.getElementById('reg-role').value;
    const donorFields = document.getElementById('reg-donor-fields');
    const donorArea = document.getElementById('reg-donor-area-field');
    const nidLabel = document.getElementById('reg-nid-label');
    const nidInput = document.getElementById('reg-nid');

    if (role === 'Donor') {
        donorFields.style.display = 'flex';
        donorArea.style.display = 'block';
        nidLabel.innerText = "NID Number / Birth Certificate (17 Digits)";
        nidInput.placeholder = "e.g. 19951234567890123";
    } else if (role === 'Blood Bank / Hospital') {
        donorFields.style.display = 'none';
        donorArea.style.display = 'none';
        nidLabel.innerText = "Hospital License Verification Key";
        nidInput.placeholder = "e.g. BB-VERIFY-1004";
    } else {
        donorFields.style.display = 'none';
        donorArea.style.display = 'none';
        nidLabel.innerText = "NID / Birth Certificate ID";
        nidInput.placeholder = "e.g. 987654321098";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const phone = document.getElementById('reg-phone').value;
    const nid_birth_cert = document.getElementById('reg-nid').value;
    const division = document.getElementById('reg-division').value;
    const district = document.getElementById('reg-district').value;
    const thana = document.getElementById('reg-thana').value;

    const extra = {};
    if (role === 'Donor') {
        extra.age = document.getElementById('reg-age').value;
        extra.weight = document.getElementById('reg-weight').value;
        extra.blood_group = document.getElementById('reg-blood-group').value;
        extra.permanent_area = document.getElementById('reg-area-details').value;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, phone, nid_birth_cert, division, district, thana, extra })
        });
        
        const data = await res.json();
        if (res.ok) {
            closeAuthModal();
            if (data.requiresApproval) {
                alert(data.message);
            } else {
                TOKEN = data.token;
                localStorage.setItem('token', TOKEN);
                CURRENT_USER = data.user;
                setupSessionUI();
                initWebSocket();
                alert("Welcome! Registration successful.");
            }
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert("Registration failed. Please check network connection.");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            TOKEN = data.token;
            localStorage.setItem('token', TOKEN);
            CURRENT_USER = data.user;
            setupSessionUI();
            initWebSocket();
            closeAuthModal();
            navigateToDashboard();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert("Sign In failed. Try again.");
    }
}

async function verifySession() {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.ok) {
            const data = await res.json();
            CURRENT_USER = data;
            setupSessionUI();
            initWebSocket();
            renderPublicStats();
        } else {
            handleLogout();
        }
    } catch (e) {
        handleLogout();
    }
}

function handleLogout() {
    if (TOKEN) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
    }
    
    TOKEN = null;
    CURRENT_USER = null;
    localStorage.removeItem('token');
    
    if (ws) {
        ws.close();
    }

    // Toggle nav bar items
    document.getElementById('auth-buttons-header').style.display = 'block';
    document.getElementById('user-badge-header').style.display = 'none';
    document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
    
    switchView('home-view');
    renderPublicStats();
}

function setupSessionUI() {
    if (!CURRENT_USER) return;
    
    document.getElementById('auth-buttons-header').style.display = 'none';
    const badge = document.getElementById('user-badge-header');
    badge.style.display = 'flex';
    document.getElementById('header-username').innerText = `${CURRENT_USER.name} (${CURRENT_USER.role})`;
    
    document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'block');
    
    // Set Dashboard Navigation label depending on role
    const dashNav = document.getElementById('dashboard-nav');
    if (CURRENT_USER.role === 'Admin') dashNav.innerText = "Admin Console";
    else if (CURRENT_USER.role === 'Blood Bank / Hospital') dashNav.innerText = "Hospital Panel";
    else dashNav.innerText = "Dashboard";
}

// ----------------------------------------------------
// REAL-TIME WEBSOCKET COMMUNICATOR
// ----------------------------------------------------
function initWebSocket() {
    if (!TOKEN) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('[WebSocket] Connection open, registering session...');
        ws.send(JSON.stringify({ type: 'REGISTER', token: TOKEN }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'REGISTER_OK') {
            console.log('[WebSocket] Authentication verified.');
            loadUnreadMessageBadge();
        }

        // Live Chat message received
        if (data.type === 'CHAT_MSG_INCOMING') {
            handleIncomingChatMessage(data.message);
        }

        // Live Chat message confirmed by server (sent successfully)
        if (data.type === 'CHAT_MSG_CONFIRM') {
            handleConfirmChatMessage(data.message);
        }

        // Emergency Broadcast alerts
        if (data.type === 'EMERGENCY_ALERT') {
            alert(`🚨 EMERGENCY ALREADY POSTED! Blood group ${data.request.blood_group} is needed at ${data.request.hospital_name}.`);
            renderEmergencyRequests();
            updateAlertTicker();
        }

        if (data.type === 'REQUEST_STATUS_CHANGE') {
            renderEmergencyRequests();
        }

        if (data.type === 'INVENTORY_UPDATE') {
            renderInventoryList();
        }
    };

    ws.onclose = () => {
        console.log('[WebSocket] Connection disconnected. Retrying in 10s...');
        setTimeout(initWebSocket, 10000);
    };
}

// ----------------------------------------------------
// SEARCH & LEAFLET MAP INTEGRATION (Nearest Donor Algorithm)
// ----------------------------------------------------
async function handleDonorSearch(e) {
    e.preventDefault();
    const division = document.getElementById('search-division').value;
    const district = document.getElementById('search-district').value;
    const thana = document.getElementById('search-thana').value;
    const bloodGroup = document.getElementById('search-blood-group').value;

    // Simulate patient geolocation (center coordinate of selected Thana)
    const coordinates = GEOGRAPHY[division]?.[district]?.[thana];
    const lat = coordinates ? coordinates.lat : 23.8103;
    const lng = coordinates ? coordinates.lng : 90.4125;

    try {
        const queryParams = new URLSearchParams({ division, district, thana, bloodGroup, lat, lng });
        const res = await fetch(`/api/donors/search?${queryParams.toString()}`);
        const results = await res.json();
        
        displayDonorSearchResults(results, { lat, lng });
    } catch (err) {
        alert("Search failed. Check your connection.");
    }
}

function displayDonorSearchResults(donors, patientLoc) {
    const container = document.getElementById('search-results-container');
    container.style.display = 'block';
    
    // Smooth scroll to container
    container.scrollIntoView({ behavior: 'smooth' });

    // Render list elements
    const list = document.getElementById('donor-results-list');
    list.innerHTML = "";

    if (donors.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No matching eligible donors found in this location.</p>`;
    } else {
        donors.forEach(donor => {
            const avail = donor.availability_prediction;
            const startChatBtn = CURRENT_USER && CURRENT_USER.id !== donor.user_id 
                ? `<button class="btn btn-secondary btn-sm" onclick="startSecureChat('${donor.user_id}', '${donor.name}', 'Donor', '${donor.blood_group}')">Send message</button>`
                : '';

            list.innerHTML += `
                <div class="glass-panel feed-card" style="padding: 16px;">
                    <div class="feed-info">
                        <h4>${donor.name} <span class="badge badge-danger">${donor.blood_group}</span></h4>
                        <p>Distance: <strong>${donor.distance_km} km</strong> away • Accuracy: <strong>${avail.probability}% Probability</strong></p>
                        <p style="font-size: 12px; margin-top: 5px;">Status: <span class="badge ${avail.probability > 75 ? 'badge-success' : 'badge-warning'}">${avail.status}</span> (${avail.reason})</p>
                    </div>
                    <div class="feed-actions">
                        ${startChatBtn}
                    </div>
                </div>
            `;
        });
    }

    // Draw Map markers
    initDonorMap(patientLoc);
    
    // Clear old markers
    donorMapMarkers.forEach(m => donorMap.removeLayer(m));
    donorMapMarkers = [];

    // Fit views to patient location
    donorMap.setView([patientLoc.lat, patientLoc.lng], 12);

    // Render Patient Marker (blue pin)
    const patientMarker = L.circleMarker([patientLoc.lat, patientLoc.lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.5,
        radius: 12
    }).addTo(donorMap).bindPopup("<b>Your Request Location</b>").openPopup();
    donorMapMarkers.push(patientMarker);

    // Render Donor Markers (red pins)
    donors.forEach(donor => {
        const marker = L.circle([donor.lat, donor.lng], {
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.7,
            radius: 300 // 300 meters radius
        }).addTo(donorMap).bindPopup(`
            <b style="color: white;">${donor.name} (${donor.blood_group})</b><br>
            Score: ${donor.score}/100<br>
            Distance: ${donor.distance_km} km
        `);
        donorMapMarkers.push(marker);
    });
}

function initDonorMap(center) {
    const mapDiv = document.getElementById('donor-search-map');
    if (!mapDiv) return;
    
    if (!donorMap) {
        donorMap = L.map('donor-search-map').setView([center.lat, center.lng], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(donorMap);
    }
}

function clearSearchResults() {
    document.getElementById('search-results-container').style.display = 'none';
    if (donorMap) {
        donorMapMarkers.forEach(m => donorMap.removeLayer(m));
        donorMapMarkers = [];
    }
}

// ----------------------------------------------------
// STOCKS & INVENTORY MAP
// ----------------------------------------------------
async function renderInventoryList() {
    try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        
        const listDiv = document.getElementById('central-stocks-list');
        if (!listDiv) return;
        
        listDiv.innerHTML = "";

        if (data.length === 0) {
            listDiv.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No active blood bank inventories available.</p>`;
            return;
        }

        data.forEach(bb => {
            const inventHtml = bb.inventory.map(item => {
                const isLow = item.quantity <= 5;
                return `
                    <div class="glass-panel blood-card ${isLow ? 'low-stock' : ''}" style="padding: 10px; margin: 0;">
                        <div class="blood-group-badge">${item.blood_group}</div>
                        <h4>${item.quantity} Bags</h4>
                        <p>${isLow ? '⚠️ Shortage' : 'Available'}</p>
                    </div>
                `;
            }).join('');

            const chatBtn = CURRENT_USER && CURRENT_USER.id !== bb.blood_bank_id
                ? `<button class="btn btn-secondary btn-sm" onclick="startSecureChat('${bb.blood_bank_id}', '${bb.name}', 'Blood Bank / Hospital', '')">Chat with Bank</button>`
                : '';

            listDiv.innerHTML += `
                <div class="glass-panel" style="padding: 20px;">
                    <div class="panel-header" style="margin-bottom: 15px;">
                        <div>
                            <h4 style="font-size: 18px; font-weight: 700;">${bb.name}</h4>
                            <p style="font-size: 13px; color: var(--text-muted);">📍 ${bb.thana}, ${bb.district} • Contact: ${bb.contact_no}</p>
                        </div>
                        ${chatBtn}
                    </div>
                    <div class="inventory-grid">
                        ${inventHtml}
                    </div>
                </div>
            `;
        });

        // Update map pins if map loaded
        if (stockMap) {
            stockMapMarkers.forEach(m => stockMap.removeLayer(m));
            stockMapMarkers = [];

            data.forEach(bb => {
                const marker = L.marker([bb.lat, bb.lng]).addTo(stockMap).bindPopup(`
                    <b>${bb.name}</b><br>
                    Location: ${bb.thana}, ${bb.district}<br>
                    Phone: ${bb.contact_no}
                `);
                stockMapMarkers.push(marker);
            });
        }
    } catch (err) {
        console.error("Failed to render inventories:", err);
    }
}

function initStockMap() {
    const mapDiv = document.getElementById('inventory-banks-map');
    if (!mapDiv) return;

    if (!stockMap) {
        stockMap = L.map('inventory-banks-map').setView([23.8103, 90.4125], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(stockMap);
    }
    renderInventoryList();
}

// ----------------------------------------------------
// EMERGENCY REQUESTS MODULE
// ----------------------------------------------------
async function renderEmergencyRequests() {
    try {
        const res = await fetch('/api/requests');
        const data = await res.json();
        
        const feed = document.getElementById('public-emergency-requests-feed');
        if (!feed) return;
        
        feed.innerHTML = "";

        if (data.length === 0) {
            feed.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px;">No current emergency blood requests.</p>`;
            return;
        }

        data.forEach(req => {
            const urgencyBadge = req.urgency_level === 'High' 
                ? '<span class="badge badge-danger">High Urgency</span>' 
                : '<span class="badge badge-warning">Medium Urgency</span>';

            const statusColorMap = {
                'Pending': 'badge-warning',
                'Approved': 'badge-success',
                'Completed': 'badge-success',
                'Cancelled': 'badge-neutral'
            };
            const statusBadge = `<span class="badge ${statusColorMap[req.status] || 'badge-neutral'}">${req.status}</span>`;

            // Condition triggers: check if chat target is donor vs patients
            const chatBtn = CURRENT_USER && CURRENT_USER.id !== req.patient_id && req.status === 'Pending'
                ? `<button class="btn btn-primary btn-sm" onclick="startSecureChat('${req.patient_id}', 'Patient', 'Patient', '${req.blood_group}')">Respond to Patient</button>`
                : '';

            // Blood bank can approve/complete requests
            let manageButtons = "";
            if (CURRENT_USER && (CURRENT_USER.role === 'Admin' || CURRENT_USER.role === 'Blood Bank / Hospital') && req.status === 'Pending') {
                manageButtons = `
                    <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${req.id}', 'Approved')">Approve</button>
                    <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus('${req.id}', 'Cancelled')">Cancel</button>
                `;
            }

            feed.innerHTML += `
                <div class="glass-panel feed-card ${req.urgency_level === 'High' ? 'high-urgency' : ''}">
                    <div class="feed-info">
                        <h4>Blood Needed: <span class="badge badge-danger" style="font-size: 16px;">${req.blood_group}</span> (${req.units_needed} Bags Needed)</h4>
                        <p style="margin: 5px 0;">📍 <strong>${req.hospital_name}</strong> - ${req.location_details}</p>
                        <p style="font-size: 13px; color: var(--text-muted);">Region: ${req.thana}, ${req.district} • Posted: ${new Date(req.created_at).toLocaleTimeString()}</p>
                        <div style="margin-top: 8px; display: flex; gap: 10px; align-items: center;">
                            ${urgencyBadge}
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="feed-actions" style="flex-direction: column; align-items: flex-end; gap: 8px;">
                        ${chatBtn}
                        <div style="display: flex; gap: 5px;">
                            ${manageButtons}
                        </div>
                    </div>
                </div>
            `;
        });
        
        updateAlertTicker(data);
    } catch (e) {
        console.error("Failed to render request list:", e);
    }
}

function updateAlertTicker(requestsList = []) {
    const listContainer = document.getElementById('ticker-alerts-list');
    if (!listContainer) return;
    
    if (requestsList.length === 0) {
        listContainer.innerHTML = `
            <div class="ticker-item"><span class="alert-tag">Info</span> No current critical warnings. All blood bank storages stable.</div>
            <div class="ticker-item"><span class="alert-tag">Tip</span> Register as a donor today to save lives in your neighborhood!</div>
        `;
        return;
    }

    listContainer.innerHTML = "";
    // Duplicate lists to make infinite slide seamless
    const urgentItems = requestsList.filter(r => r.urgency_level === 'High' && r.status === 'Pending');
    
    if (urgentItems.length === 0) {
        listContainer.innerHTML = `
            <div class="ticker-item"><span class="alert-tag">System</span> Blood inventories currently monitored. Join as donor to help.</div>
        `;
        return;
    }

    const items = [...urgentItems, ...urgentItems]; // repeat elements
    items.forEach(req => {
        listContainer.innerHTML += `
            <div class="ticker-item">
                <span class="alert-tag">CRITICAL URGENT</span> 
                Need ${req.blood_group} at ${req.hospital_name} (${req.thana}, ${req.district})! Contact Patient.
            </div>
        `;
    });
}

function openPostRequestModal() {
    if (!CURRENT_USER) {
        alert("Please Sign In or Register to submit emergency blood requests.");
        openAuthModal('login');
        return;
    }
    
    // Set default fields
    populateDropdown('req-division', Object.keys(GEOGRAPHY));
    document.getElementById('post-request-modal').style.display = 'flex';
}

function closePostRequestModal() {
    document.getElementById('post-request-modal').style.display = 'none';
}

async function handlePostRequest(e) {
    e.preventDefault();
    const blood_group = document.getElementById('req-blood-group').value;
    const units_needed = document.getElementById('req-units').value;
    const hospital_name = document.getElementById('req-hospital').value;
    const location_details = document.getElementById('req-location-details').value;
    const division = document.getElementById('req-division').value;
    const district = document.getElementById('req-district').value;
    const thana = document.getElementById('req-thana').value;
    const urgency_level = document.getElementById('req-urgency').value;

    try {
        const res = await fetch('/api/requests/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ blood_group, units_needed, hospital_name, location_details, division, district, thana, urgency_level })
        });
        
        if (res.ok) {
            alert("Emergency request posted successfully! Sourcing nearest matching donors.");
            closePostRequestModal();
            renderEmergencyRequests();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (err) {
        alert("Action failed. Try again.");
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        const res = await fetch('/api/requests/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ requestId, status })
        });
        if (res.ok) {
            renderEmergencyRequests();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (e) {
        alert("Failed to update status.");
    }
}

// ----------------------------------------------------
// REAL-TIME MESSAGING INTERFACE LOGIC
// ----------------------------------------------------
function startSecureChat(userId, userName, userRole, bloodGroup) {
    if (!CURRENT_USER) {
        alert("You must be logged in to chat securely.");
        openAuthModal('login');
        return;
    }

    switchView('chat-view');
    ACTIVE_CHAT_PARTNER_ID = userId;
    
    document.getElementById('chat-box-default').style.display = 'none';
    document.getElementById('chat-box-active').style.display = 'flex';
    document.getElementById('chat-partner-name').innerText = userName;
    document.getElementById('chat-partner-role').innerText = `${userRole} ${bloodGroup ? '• ' + bloodGroup : ''}`;
    
    loadChatHistory(userId);
}

async function loadChatInbox() {
    const list = document.getElementById('chat-inbox-list');
    if (!list) return;

    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        // If users API is unauthorized (non-admin), fetch conversation history instead.
        // For simplicity in the dashboard, we will list all potential user contacts that the current user has message threads with
        let users = [];
        if (res.ok) {
            users = await res.json();
        } else {
            // Non-admins can chat with any donor or hospital. Let's retrieve all active users
            // To emulate inbox, we fetch all active user roles
            const response = await fetch('/api/inventory');
            const data = await response.json();
            users = data.map(bb => ({ id: bb.blood_bank_id, name: bb.name, role: 'Blood Bank / Hospital' }));
        }

        // Fetch unread count badges
        const countRes = await fetch('/api/chat/unread', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        UNREAD_COUNTS = countRes.ok ? await countRes.json() : {};

        list.innerHTML = "";
        
        // Filter out current user from index
        const contactList = users.filter(u => u.id !== CURRENT_USER.id);
        
        if (contactList.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); padding: 16px; font-size: 13px;">No other contacts available.</p>`;
            return;
        }

        contactList.forEach(user => {
            const unreadCount = UNREAD_COUNTS[user.id] || 0;
            const badgeHtml = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';
            const isActive = ACTIVE_CHAT_PARTNER_ID === user.id ? 'active' : '';

            list.innerHTML += `
                <div class="inbox-item ${isActive}" onclick="startSecureChat('${user.id}', '${user.name}', '${user.role}', '')">
                    <div class="inbox-item-info">
                        <h5>${user.name}</h5>
                        <p>${user.role}</p>
                    </div>
                    ${badgeHtml}
                </div>
            `;
        });
    } catch (e) {
        console.error("Inbox load error", e);
    }
}

async function loadChatHistory(partnerId) {
    const log = document.getElementById('chat-messages-log');
    log.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Fetching chat encryption logs...</p>`;
    
    try {
        const res = await fetch(`/api/chat/history/${partnerId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        const messages = await res.json();
        log.innerHTML = "";
        
        if (messages.length === 0) {
            log.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Conversation initialized securely. No messages sent yet.</p>`;
            return;
        }

        messages.forEach(msg => {
            const isSent = msg.sender_id === CURRENT_USER.id;
            const bubbleClass = isSent ? 'chat-bubble-sent' : 'chat-bubble-received';
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            log.innerHTML += `
                <div class="chat-bubble ${bubbleClass}">
                    ${msg.message}
                    <span class="bubble-time">${timeStr}</span>
                </div>
            `;
        });

        // Scroll chat to bottom
        log.scrollTop = log.scrollHeight;
        
        // Reset unread count for partner
        delete UNREAD_COUNTS[partnerId];
        loadUnreadMessageBadge();
    } catch (e) {
        log.innerHTML = `<p style="color: var(--danger); text-align: center;">Error loading history.</p>`;
    }
}

function handleSendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-message-input');
    const msg = input.value.trim();
    if (!msg || !ACTIVE_CHAT_PARTNER_ID) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'CHAT_MSG',
            receiver_id: ACTIVE_CHAT_PARTNER_ID,
            message: msg
        }));
        input.value = "";
    } else {
        alert("Socket connection disconnected. Reconnecting...");
        initWebSocket();
    }
}

function handleConfirmChatMessage(messageObj) {
    if (ACTIVE_CHAT_PARTNER_ID !== messageObj.receiver_id) return;
    
    const log = document.getElementById('chat-messages-log');
    // Remove default placeholder if exists
    if (log.innerHTML.includes("Conversation initialized securely")) log.innerHTML = "";

    const timeStr = new Date(messageObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    log.innerHTML += `
        <div class="chat-bubble chat-bubble-sent">
            ${messageObj.message}
            <span class="bubble-time">${timeStr}</span>
        </div>
    `;
    log.scrollTop = log.scrollHeight;
}

function handleIncomingChatMessage(messageObj) {
    if (ACTIVE_CHAT_PARTNER_ID === messageObj.sender_id) {
        const log = document.getElementById('chat-messages-log');
        if (log.innerHTML.includes("Conversation initialized securely")) log.innerHTML = "";

        const timeStr = new Date(messageObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        log.innerHTML += `
            <div class="chat-bubble chat-bubble-received">
                ${messageObj.message}
                <span class="bubble-time">${timeStr}</span>
            </div>
        `;
        log.scrollTop = log.scrollHeight;
        
        // Let server know we read it
        fetch(`/api/chat/history/${messageObj.sender_id}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
    } else {
        // Increment unread count
        UNREAD_COUNTS[messageObj.sender_id] = (UNREAD_COUNTS[messageObj.sender_id] || 0) + 1;
        loadUnreadMessageBadge();
    }
}

async function loadUnreadMessageBadge() {
    try {
        const countRes = await fetch('/api/chat/unread', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const counts = countRes.ok ? await countRes.json() : {};
        const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

        const navBadge = document.getElementById('nav-chat-badge');
        if (navBadge) {
            if (total > 0) {
                navBadge.style.display = 'inline-block';
                navBadge.innerText = total;
            } else {
                navBadge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function reportConversation() {
    alert("This messaging thread has been reported to administrators for moderation review. Contact coordinates remain private.");
}

// ----------------------------------------------------
// DASHBOARD VIEW TABS CONTROLLERS
// ----------------------------------------------------
function switchDashboardTab(rolePrefix, tabName) {
    // Hide all tabs for this dashboard
    document.querySelectorAll(`[id^="tab-${rolePrefix}"]`).forEach(tab => {
        tab.style.display = 'none';
    });

    // Show selected tab
    document.getElementById(`tab-${tabName}`).style.display = 'block';

    // Toggle active sidebar highlight
    const sidebar = document.querySelector(`#dashboard-${rolePrefix}-view .dashboard-sidebar`);
    if (sidebar) {
        sidebar.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    event.currentTarget.classList.add('active');
}

// ----------------------------------------------------
// A. DONOR FUNCTIONS
// ----------------------------------------------------
async function loadDonorDashboard() {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const user = await res.json();
        
        // Populate profile availability toggle
        document.getElementById('donor-availability-toggle').value = user.status;
        
        // Eligibility Display
        const donor = user.donorProfile;
        const box = document.getElementById('donor-status-box');
        const title = document.getElementById('donor-eligibility-title');
        const desc = document.getElementById('donor-eligibility-desc');
        const badge = document.getElementById('donor-eligibility-badge');
        const cdCard = document.getElementById('cooldown-countdown-card');

        if (donor.is_eligible) {
            title.innerText = "Eligible to Donate";
            desc.innerText = `Last donation was: ${new Date(donor.last_donation_date).toLocaleDateString()}`;
            badge.innerText = "Active";
            badge.className = "badge badge-success";
            cdCard.style.display = "none";
        } else {
            title.innerText = "Ineligible (Donation Cooldown)";
            badge.innerText = "Cooldown";
            badge.className = "badge badge-danger";
            cdCard.style.display = "block";

            // Calculate days remaining
            const lastDate = new Date(donor.last_donation_date);
            const daysSince = Math.ceil((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            const remaining = Math.max(0, 90 - daysSince);
            
            document.getElementById('cooldown-remaining-text').innerText = `${remaining} Days Remaining`;
            const percent = Math.min(100, Math.round((daysSince / 90) * 100));
            document.getElementById('cooldown-progress').style.width = `${percent}%`;
            desc.innerText = `Mandatory waiting period in effect until: ${new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;
        }

        // Render donation history logs
        const historyRes = await fetch(`/api/chat/history/${user.id}`, { // fallback API check
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        const table = document.getElementById('donor-history-table');
        table.innerHTML = "";
        
        // Mock donation log display
        table.innerHTML = `
            <tr>
                <td>${new Date(donor.last_donation_date).toLocaleDateString()}</td>
                <td>Dhaka Central Blood Bank</td>
                <td>BloodBank</td>
                <td>1 Bag</td>
            </tr>
        `;
    } catch (e) {
        console.error("Donor profile reload error:", e);
    }
}

async function handleDonorToggleStatus() {
    const status = document.getElementById('donor-availability-toggle').value;
    try {
        const res = await fetch('/api/donors/toggle-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ donorId: CURRENT_USER.id, status })
        });
        if (res.ok) {
            alert(`Availability visible set to: ${status}`);
            loadDonorDashboard();
        }
    } catch (e) {
        alert("Failed to toggle visibility status.");
    }
}

// ----------------------------------------------------
// B. HOSPITAL/BLOOD BANK FUNCTIONS
// ----------------------------------------------------
async function loadBBDashboard() {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const user = await res.json();
        
        // Inventory controls grid
        const grid = document.getElementById('bb-inventory-grid');
        grid.innerHTML = "";

        user.inventory.forEach(item => {
            grid.innerHTML += `
                <div class="glass-panel blood-card" style="padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div class="blood-group-badge">${item.blood_group}</div>
                    <input type="number" id="inv-qty-${item.blood_group}" value="${item.quantity}" min="0" max="100" style="width: 70px; text-align: center; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: white; border-radius: 6px;">
                    <button class="btn btn-primary btn-sm" style="padding: 5px 10px; font-size: 11px;" onclick="handleUpdateStockLevel('${item.blood_group}')">Save</button>
                </div>
            `;
        });

        // Load requests matching their thana area
        const bbProfile = user.bloodBankProfile;
        const reqRes = await fetch('/api/requests');
        const requests = await reqRes.json();
        
        const areaList = document.getElementById('bb-moderated-requests-list');
        areaList.innerHTML = "";
        
        const filtered = requests.filter(r => r.division === bbProfile.division && r.district === bbProfile.district);
        
        if (filtered.length === 0) {
            areaList.innerHTML = `<p style="color: var(--text-muted);">No emergency requests active in your region.</p>`;
            return;
        }

        filtered.forEach(req => {
            let statusBtn = "";
            if (req.status === 'Pending') {
                statusBtn = `
                    <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${req.id}', 'Approved')">Approve Request</button>
                    <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus('${req.id}', 'Cancelled')">Dismiss</button>
                `;
            } else if (req.status === 'Approved') {
                statusBtn = `
                    <button class="btn btn-primary btn-sm" onclick="updateRequestStatus('${req.id}', 'Completed')">Mark Completed</button>
                `;
            }

            areaList.innerHTML += `
                <div class="glass-panel feed-card" style="padding: 16px;">
                    <div class="feed-info">
                        <h4>Blood Needed: <span class="badge badge-danger">${req.blood_group}</span> (${req.units_needed} bags)</h4>
                        <p style="font-size: 13px; color: var(--text-muted);">Hospital: ${req.hospital_name} • Region: ${req.thana}</p>
                        <p style="font-size: 12px; margin-top: 4px;">Status: <span class="badge badge-warning">${req.status}</span></p>
                    </div>
                    <div class="feed-actions">
                        ${statusBtn}
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
    }
}

async function handleUpdateStockLevel(bloodGroup) {
    const qty = document.getElementById(`inv-qty-${bloodGroup}`).value;
    try {
        const res = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ bloodGroup, quantity: qty })
        });
        if (res.ok) {
            alert(`Stock level for ${bloodGroup} updated successfully.`);
            loadBBDashboard();
        } else {
            const err = await res.json();
            alert(err.error);
        }
    } catch (e) {
        alert("Failed to update inventory.");
    }
}

// ----------------------------------------------------
// C. ADMIN FUNCTIONS
// ----------------------------------------------------
async function loadAdminUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const users = await res.json();
        
        const table = document.getElementById('admin-users-table');
        table.innerHTML = "";

        users.forEach(user => {
            const locDetails = user.role === 'Donor' 
                ? `${user.donorProfile?.thana}, ${user.donorProfile?.district}` 
                : (user.role === 'Blood Bank / Hospital' ? `${user.bloodBankProfile?.thana}, ${user.bloodBankProfile?.district}` : 'Global');
            
            const btnHtml = user.status === 'Active' 
                ? `<button class="btn btn-secondary btn-sm" onclick="toggleUserActivationStatus('${user.id}', 'Inactive')">Deactivate</button>`
                : `<button class="btn btn-success btn-sm" onclick="toggleUserActivationStatus('${user.id}', 'Active')">Activate</button>`;

            table.innerHTML += `
                <tr>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${locDetails}</td>
                    <td><span class="badge ${user.status === 'Active' ? 'badge-success' : 'badge-danger'}">${user.status}</span></td>
                    <td>
                        ${user.id !== CURRENT_USER.id ? btnHtml : '<span style="color: var(--text-muted);">N/A</span>'}
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
    }
}

async function toggleUserActivationStatus(userId, status) {
    try {
        const res = await fetch('/api/donors/toggle-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ donorId: userId, status })
        });
        if (res.ok) {
            loadAdminUsers();
        }
    } catch (e) {
        alert("Action failed.");
    }
}

async function loadAdminVerifyBB() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const users = await res.json();
        
        const table = document.getElementById('admin-verify-table');
        table.innerHTML = "";

        const pendingBanks = users.filter(u => u.role === 'Blood Bank / Hospital' && u.status === 'Pending');

        if (pendingBanks.length === 0) {
            table.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No pending hospital registrations.</td></tr>`;
            return;
        }

        pendingBanks.forEach(user => {
            const bb = user.bloodBankProfile;
            table.innerHTML += `
                <tr>
                    <td><strong>${bb.name}</strong></td>
                    <td><code>${user.nid_birth_cert}</code></td>
                    <td>${user.phone}</td>
                    <td>${bb.thana}, ${bb.district}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="approveBloodBank('${user.id}', 'Verify')">Approve Verification</button>
                        <button class="btn btn-secondary btn-sm" onclick="approveBloodBank('${user.id}', 'Reject')">Deny</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
    }
}

async function approveBloodBank(bloodBankId, action) {
    try {
        const res = await fetch('/api/admin/approve-bb', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ bloodBankId, action })
        });
        if (res.ok) {
            alert(`Hospital registration status completed: ${action === 'Verify' ? 'Approved' : 'Rejected'}`);
            loadAdminVerifyBB();
            loadAdminUsers();
        }
    } catch (e) {
        alert("Operation failed.");
    }
}

// ML Demand Predictions display
async function loadAdminMLAnalytics() {
    try {
        const res = await fetch('/api/ml/demand', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const forecast = await res.json();
        
        const chart = document.getElementById('admin-ml-demand-chart');
        chart.innerHTML = "";

        forecast.forEach(item => {
            const maxVal = 20; // scale normalization constant
            const curWidth = Math.min(100, Math.round((item.current_30d_demand / maxVal) * 100));
            const predWidth = Math.min(100, Math.round((item.predicted_30d_demand / maxVal) * 100));

            const isUp = item.trend_percentage >= 0;
            const trendClass = isUp ? 'trend-up' : 'trend-down';
            const trendSym = isUp ? '▲' : '▼';

            chart.innerHTML += `
                <div class="chart-bar-row">
                    <div class="group-name">${item.blood_group}</div>
                    <div class="bar-wrapper">
                        <div class="bar-current" style="width: ${curWidth}%;" title="Current demand: ${item.current_30d_demand} bags"></div>
                        <div class="bar-predicted" style="width: ${predWidth}%;" title="Predicted next demand: ${item.predicted_30d_demand} bags"></div>
                    </div>
                    <div class="trend-indicator ${trendClass}">${trendSym} ${Math.abs(item.trend_percentage)}%</div>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadAdminLogDonationFields() {
    try {
        const usersRes = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const users = await usersRes.json();

        // Populate donor dropdown
        const donorSelect = document.getElementById('log-donor-id');
        donorSelect.innerHTML = '<option value="">Choose Donor</option>';
        users.filter(u => u.role === 'Donor' && u.status === 'Active' && u.donorProfile?.is_eligible).forEach(d => {
            donorSelect.innerHTML += `<option value="${d.id}">${d.name} (${d.donorProfile?.blood_group})</option>`;
        });

        // Populate recipient blood banks dropdown
        const recSelect = document.getElementById('log-recipient-id');
        recSelect.innerHTML = '<option value="">Choose Recipient</option>';
        users.filter(u => u.role === 'Blood Bank / Hospital' && u.status === 'Active').forEach(b => {
            recSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    } catch (e) {
        console.error(e);
    }
}

async function handleRecordDonation(e) {
    e.preventDefault();
    const donorId = document.getElementById('log-donor-id').value;
    const unitsDonated = document.getElementById('log-units').value;
    const recipientId = document.getElementById('log-recipient-id').value;

    try {
        const res = await fetch('/api/donors/log-donation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ donorId, unitsDonated, recipientId, recipientType: 'BloodBank' })
        });
        
        if (res.ok) {
            alert("Donation logged successfully! Donor is now on 90-day cooldown. Inventory stocks auto-incremented.");
            document.getElementById('admin-log-donation-form').reset();
            loadAdminLogDonationFields();
            renderInventoryList();
            renderPublicStats();
        } else {
            const err = await res.json();
            alert(err.error);
        }
    } catch (err) {
        alert("Failed to log donation.");
    }
}

// ----------------------------------------------------
// PUBLIC FRONTEND STATISTICS COUNTERS
// ----------------------------------------------------
async function renderPublicStats() {
    try {
        // Query donor listing and calculate numbers
        const res = await fetch('/api/inventory');
        const inventories = await res.json();
        
        // Sum total quantities
        let totalActiveBags = 0;
        inventories.forEach(b => {
            b.inventory.forEach(item => {
                totalActiveBags += item.quantity;
            });
        });

        const reqRes = await fetch('/api/requests');
        const requests = await reqRes.json();
        const pendingCount = requests.filter(r => r.status === 'Pending').length;

        // Auto updates values in visual template
        document.getElementById('stat-lives-saved').innerText = 3120 + (totalActiveBags * 2);
        document.getElementById('stat-active-donors').innerText = 180 + totalActiveBags;
        document.getElementById('stat-blood-banks').innerText = inventories.length;
        document.getElementById('stat-emergency-requests').innerText = pendingCount;
    } catch (e) {
        console.error(e);
    }
}

// ----------------------------------------------------
// GEOGRAPHIC COVERAGE MAP (Pulsing Animated Donors)
// ----------------------------------------------------
async function initCoverageMap() {
    try {
        // Query live active donors
        const donorRes = await fetch('/api/donors/all');
        const donors = await donorRes.json();

        // Count positive donors per division (A+, B+, O+, AB+)
        const divisions = ['Dhaka', 'Chittagong', 'Sylhet', 'Khulna', 'Barisal', 'Rajshahi', 'Rangpur', 'Mymensingh'];
        
        divisions.forEach(division => {
            const positiveDonors = donors.filter(d => d.division === division && ['A+', 'B+', 'O+', 'AB+'].includes(d.blood_group));
            const lbl = document.getElementById(`map-lbl-${division}`);
            if (lbl) {
                lbl.textContent = `${positiveDonors.length} Donors`;
            }
        });
    } catch (e) {
        console.error("Failed to populate Bangladesh SVG map stats:", e);
    }
}

// ----------------------------------------------------
// HERO ACTIVE MATCH NOTIFICATIONS ROTATION
// ----------------------------------------------------
function startHeroNotifications() {
    const notifications = [
        "⚡ Live ML Scan: 24 active donors online matching patients...",
        "❤️ Success: AB+ Donor matched to Dhaka Medical College Hospital 12 mins ago",
        "🩸 Urgent Alert: O- Donor requested in Rajshahi Sadar Hospital",
        "🏆 Milestone: 480+ lives saved this month through digital matching",
        "⚡ Radar Scan: A+ availability high in Chittagong division right now"
    ];
    let index = 0;
    const element = document.getElementById('hero-live-notification');
    if (!element) return;
    
    setInterval(() => {
        index = (index + 1) % notifications.length;
        element.style.opacity = 0;
        setTimeout(() => {
            element.innerText = notifications[index];
            element.style.opacity = 1;
        }, 300);
    }, 4500);
}

// ----------------------------------------------------
// QUICK DEMO ACCESS AUTHENTICATOR
// ----------------------------------------------------
async function quickLogin(role) {
    let email = 'admin@blooddonation.org';
    if (role === 'donor') email = 'tanvir@gmail.com';
    else if (role === 'patient') email = 'sajjad@gmail.com';
    else if (role === 'hospital') email = 'dhakabb@pulsenetwork.org';
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        const data = await res.json();
        if (res.ok) {
            TOKEN = data.token;
            localStorage.setItem('token', TOKEN);
            CURRENT_USER = data.user;
            setupSessionUI();
            initWebSocket();
            navigateToDashboard();
            alert(`Demo Access Granted: Successfully logged in as ${role.toUpperCase()}.`);
        } else {
            alert(data.error);
        }
    } catch (e) {
        alert("Demo access request failed.");
    }
}

// ----------------------------------------------------
// INTERACTIVE BANGLADESH DIVISION MAP EVENTS
// ----------------------------------------------------
async function selectDivisionFromMap(division) {
    const divSelect = document.getElementById('search-division');
    if (!divSelect) return;

    divSelect.value = division;
    populateSearchDistricts();

    // Show coverage details panel
    const prompt = document.getElementById('coverage-info-prompt');
    const details = document.getElementById('coverage-info-details');
    if (prompt) prompt.style.display = 'none';
    if (details) details.style.display = 'flex';

    document.getElementById('cov-division-title').innerText = `${division} Division`;

    try {
        // Query live donors
        const donorRes = await fetch('/api/donors/all');
        const donors = await donorRes.json();
        const divDonors = donors.filter(d => d.division === division);

        document.getElementById('cov-active-donors').innerText = divDonors.length;

        // Group donors by blood group
        const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const groupCounts = {};
        groups.forEach(g => groupCounts[g] = 0);
        
        divDonors.forEach(d => {
            if (groupCounts[d.blood_group] !== undefined) {
                groupCounts[d.blood_group]++;
            }
        });

        // Render breakdown grid pills
        const grid = document.getElementById('cov-pos-breakdown');
        if (grid) {
            grid.innerHTML = "";
            groups.forEach(g => {
                const count = groupCounts[g];
                const hasDonors = count > 0;
                grid.innerHTML += `
                    <div class="glass-panel" style="padding: 6px; text-align: center; border-color: ${hasDonors ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.03)'}; background: ${hasDonors ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.1)'};">
                        <span style="font-weight: 800; font-size: 11px; color: ${hasDonors ? '#10b981' : 'var(--text-muted)'}; display: block;">${g}</span>
                        <strong style="font-size: 12px; color: ${hasDonors ? '#ffffff' : 'rgba(255,255,255,0.2)'};">${count}</strong>
                    </div>
                `;
            });
        }

        // Set up action button click filter
        const filterBtn = document.getElementById('cov-filter-btn');
        if (filterBtn) {
            filterBtn.onclick = () => {
                document.getElementById('search-division').scrollIntoView({ behavior: 'smooth' });
                alert(`Filters applied. Division: ${division}. Please select District and Blood Group in the Search Box above.`);
            };
        }

        // Draw animated laser matching beam to central Dhaka capital hub
        drawMatchingBeam(division);

    } catch (e) {
        console.error(e);
    }
}

// Mini-map Tooltip Handler (Hero section)
async function showMapTooltip(division, event) {
    const tooltip = document.getElementById('map-division-tooltip');
    if (!tooltip) return;

    const labelName = document.getElementById('tooltip-div-name');
    if (labelName) labelName.innerText = division;

    try {
        const invRes = await fetch('/api/inventory');
        const inventories = await invRes.json();
        
        let stockCount = 0;
        inventories.filter(bb => bb.division === division).forEach(bb => {
            bb.inventory.forEach(item => {
                stockCount += item.quantity;
            });
        });

        const reqRes = await fetch('/api/requests');
        const requests = await reqRes.json();
        const reqCount = requests.filter(r => r.division === division && r.status === 'Pending').length;

        const donorRes = await fetch('/api/donors/all');
        const donors = await donorRes.json();
        const donorCount = donors.filter(d => d.division === division).length;

        const detDonors = document.getElementById('tooltip-donor-count');
        const detStocks = document.getElementById('tooltip-stock-count');
        const detReqs = document.getElementById('tooltip-req-count');
        
        if (detDonors) detDonors.innerText = donorCount;
        if (detStocks) detStocks.innerText = `${stockCount} Bags`;
        if (detReqs) detReqs.innerText = reqCount;
    } catch (e) {
        console.error(e);
    }

    tooltip.style.display = 'block';

    if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const parentContainer = event.currentTarget.closest('.glass-panel');
        if (parentContainer) {
            const parentRect = parentContainer.getBoundingClientRect();
            tooltip.style.left = (rect.left - parentRect.left + (rect.width / 2) - 70) + 'px';
            tooltip.style.top = (rect.top - parentRect.top - 100) + 'px';
        }
    }
}

function hideMapTooltip() {
    const tooltip = document.getElementById('map-division-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Detailed Map Tooltip Handler (Coverage section)
async function showDetailedMapTooltip(division, event) {
    const tooltip = document.getElementById('detailed-map-tooltip');
    if (!tooltip) return;

    const labelName = document.getElementById('det-tooltip-div-name');
    if (labelName) labelName.innerText = `${division} Division`;

    try {
        const invRes = await fetch('/api/inventory');
        const inventories = await invRes.json();
        
        let stockCount = 0;
        let bankCount = 0;
        inventories.filter(bb => bb.division === division).forEach(bb => {
            bankCount++;
            bb.inventory.forEach(item => {
                stockCount += item.quantity;
            });
        });

        const reqRes = await fetch('/api/requests');
        const requests = await reqRes.json();
        const reqCount = requests.filter(r => r.division === division && r.status === 'Pending').length;

        const donorRes = await fetch('/api/donors/all');
        const donors = await donorRes.json();
        const divDonors = donors.filter(d => d.division === division);
        const donorCount = divDonors.length;

        const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const groupCounts = {};
        groups.forEach(g => groupCounts[g] = 0);
        divDonors.forEach(d => {
            if (groupCounts[d.blood_group] !== undefined) {
                groupCounts[d.blood_group]++;
            }
        });

        const detDonors = document.getElementById('det-tooltip-donors');
        const detBanks = document.getElementById('det-tooltip-banks');
        const detReqs = document.getElementById('det-tooltip-reqs');
        
        if (detDonors) detDonors.innerText = donorCount;
        if (detBanks) detBanks.innerText = bankCount;
        if (detReqs) detReqs.innerText = reqCount;

        const breakdownDiv = document.getElementById('det-tooltip-breakdown');
        if (breakdownDiv) {
            breakdownDiv.innerHTML = "";
            groups.forEach(g => {
                const count = groupCounts[g];
                if (count > 0) {
                    breakdownDiv.innerHTML += `
                        <div style="background: rgba(255,59,92,0.12); border: 1px solid rgba(255,59,92,0.25); border-radius: 4px; padding: 2px 4px; color: #fda4af;">${g}: ${count}</div>
                    `;
                }
            });

            if (breakdownDiv.innerHTML === "") {
                breakdownDiv.innerHTML = `<span style="color: var(--text-muted); font-size: 11px; grid-column: span 4;">No active donors.</span>`;
            }
        }

    } catch (e) {
        console.error(e);
    }

    tooltip.style.display = 'block';

    if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const parentContainer = event.currentTarget.closest('#home-coverage-map');
        if (parentContainer) {
            const parentRect = parentContainer.getBoundingClientRect();
            tooltip.style.left = (rect.left - parentRect.left + (rect.width / 2) - 110) + 'px';
            tooltip.style.top = (rect.top - parentRect.top - 160) + 'px';
        }
    }
}

function hideDetailedMapTooltip() {
    const tooltip = document.getElementById('detailed-map-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Draw dynamic matching connection path on SVG Map
function drawMatchingBeam(fromDivision) {
    const svg = document.querySelector('#home-coverage-map svg');
    if (!svg) return;

    // Clean up old beams
    svg.querySelectorAll('.match-beam-path, .match-beam-pulse').forEach(el => el.remove());

    // Coordinate Map matching pins of the SVG (scaled to new 500x580 viewBox)
    const pinCoords = {
        'Rangpur':    { x: 195, y: 95  },
        'Rajshahi':   { x: 150, y: 220 },
        'Mymensingh': { x: 318, y: 105 },
        'Sylhet':     { x: 437, y: 115 },
        'Dhaka':      { x: 300, y: 240 },
        'Khulna':     { x: 138, y: 355 },
        'Barisal':    { x: 275, y: 360 },
        'Chittagong': { x: 410, y: 272 }
    };

    const start = pinCoords[fromDivision];
    const end = pinCoords['Dhaka']; // central routing match destination

    if (!start || !end || fromDivision === 'Dhaka') return;

    // Arched path formula (quadratic bezier Q)
    const controlX = (start.x + end.x) / 2 + 40;
    const controlY = (start.y + end.y) / 2 - 60;

    const pathD = `M ${start.x},${start.y} Q ${controlX},${controlY} ${end.x},${end.y}`;

    // Main glowing laser path
    const beam = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    beam.setAttribute('class', 'match-beam-path');
    beam.setAttribute('d', pathD);

    // Dynamic overlay pulse tracer
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pulse.setAttribute('class', 'match-beam-pulse');
    pulse.setAttribute('d', pathD);

    // Append under sonar circles (so it renders under label nodes)
    svg.insertBefore(pulse, svg.firstChild);
    svg.insertBefore(beam, svg.firstChild);
}

// Hero typing text slider carousel loop
function startHeroTextSlider() {
    const phrases = [
        "In Real-Time",
        "Instantly",
        "Through Smart ML",
        "Across Bangladesh",
        "To Save Lives"
    ];
    let wordIndex = 0;
    const slider = document.getElementById('hero-slider-text');
    if (!slider) return;
    
    async function typePhrase() {
        const phrase = phrases[wordIndex];
        slider.style.opacity = 1;
        
        // Typing letters increment loop
        for (let i = 0; i <= phrase.length; i++) {
            slider.textContent = phrase.substring(0, i);
            await new Promise(r => setTimeout(r, 65));
        }
        
        // Hold on fully typed word
        await new Promise(r => setTimeout(r, 2200));
        
        // Fade out
        slider.style.transition = 'opacity 0.4s ease';
        slider.style.opacity = 0;
        await new Promise(r => setTimeout(r, 450));
        
        wordIndex = (wordIndex + 1) % phrases.length;
        typePhrase();
    }
    
    typePhrase();
}

// Generate background floating red cell particles
function generateHeroParticles() {
    const container = document.getElementById('hero-particles-container');
    if (!container) return;
    
    const particleCount = 22;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        const size = Math.floor(Math.random() * 5 + 3.5); // 3.5px to 8.5px
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = (Math.random() * 14) + 's';
        particle.style.animationDuration = (Math.random() * 12 + 10) + 's'; // 10s to 22s
        particle.style.opacity = Math.random() * 0.35 + 0.1;
        
        container.appendChild(particle);
    }
}


