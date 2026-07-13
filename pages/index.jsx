import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  // App States
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('home-view');
  const [geography, setGeography] = useState({});
  const [wsMessages, setWsMessages] = useState([]);
  
  // Form States
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [authRole, setAuthRole] = useState('Donor');
  
  // Search Form
  const [searchDivision, setSearchDivision] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchThana, setSearchThana] = useState('');
  const [searchBloodGroup, setSearchBloodGroup] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    livesSaved: 3120,
    activeDonors: 180,
    bloodBanks: 2,
    emergencyRequests: 0
  });

  // Map Hover Tooltip
  const [mapTooltip, setMapTooltip] = useState({
    visible: false,
    name: '',
    donors: 0,
    banks: 0,
    requests: 0,
    groups: {},
    x: 0,
    y: 0
  });

  // Load Initial Session & Data
  useEffect(() => {
    // 1. Fetch Geographies
    fetch('/api/geography')
      .then(res => res.json())
      .then(data => setGeography(data))
      .catch(err => console.error("Geography fetch failed", err));

    // 2. Hydrate token and user
    const localToken = localStorage.getItem('token');
    if (localToken) {
      setToken(localToken);
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${localToken}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Session expired");
        })
        .then(data => {
          setCurrentUser(data.user);
          setupWebSocket(localToken);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }

    // 3. Load stats
    loadPublicStats();
  }, []);

  const loadPublicStats = async () => {
    try {
      const res = await fetch('/api/inventory');
      const inventories = await res.json();
      let totalBags = 0;
      inventories.forEach(b => {
        b.inventory.forEach(item => totalBags += item.quantity);
      });

      const reqRes = await fetch('/api/requests');
      const requests = await reqRes.json();
      const pendingCount = requests.filter(r => r.status === 'Pending').length;

      setStats({
        livesSaved: 3120 + (totalBags * 2),
        activeDonors: 180 + totalBags,
        bloodBanks: inventories.length,
        emergencyRequests: pendingCount
      });
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  };

  const setupWebSocket = (authToken) => {
    // Setup ws client
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?token=${authToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[WebSocket] Connection established");
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("[WebSocket] Incoming message:", msg);
      // Handle websocket events
    };
  };

  // Division select lists
  const divisionList = Object.keys(geography);
  const districtList = searchDivision ? Object.keys(geography[searchDivision] || {}) : [];
  const thanaList = searchDistrict ? (geography[searchDivision][searchDistrict] || []) : [];

  return (
    <>
      <Head>
        <title>PulseNetwork - Online Blood Donation & Blood Bank Finder</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-bg-main text-white font-main relative overflow-x-hidden pt-[100px] before:content-[''] before:fixed before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] before:bg-[size:40px_40px] before:z-[-2] before:pointer-events-none">
        
        {/* Navigation Bar */}
        <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[1200px] z-[1000] bg-[rgba(8,8,12,0.7)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.05)] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(255,59,92,0.12)]">
          <div className="flex justify-between items-center px-6 py-2.5 max-w-[1200px] mx-auto">
            <a href="/" className="logo flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.5px]">
              <div className="w-[30px] height-[30px] rounded-full bg-[linear-gradient(135deg,#ff3b5c,#a21caf)] flex items-center justify-center shadow-[0_0_15px_rgba(255,59,92,0.35)] text-sm">🩸</div>
              <span className="bg-[linear-gradient(135deg,#ffffff_30%,#ff3b5c_100%)] bg-clip-text text-transparent">PulseNetwork</span>
            </a>
            
            <ul className="flex gap-2.5 items-center list-none">
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'home-view' ? 'bg-[rgba(255,255,255,0.05)] text-white' : 'text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`} onClick={() => setCurrentView('home-view')}>Home</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'inventory-view' ? 'bg-[rgba(255,255,255,0.05)] text-white' : 'text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`} onClick={() => setCurrentView('inventory-view')}>Blood Stock</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'requests-view' ? 'bg-[rgba(255,255,255,0.05)] text-white' : 'text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`} onClick={() => setCurrentView('requests-view')}>Emergency Feed</a></li>
            </ul>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="bg-[rgba(255,255,255,0.04)] px-4 py-2 rounded-[30px] border border-[rgba(255,255,255,0.05)] text-sm font-semibold flex items-center gap-2 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-secondary before:shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                    {currentUser.name}
                  </div>
                  <button className="bg-[rgba(255,255,255,0.03)] text-white border border-[rgba(255,255,255,0.05)] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[rgba(255,255,255,0.08)] cursor-pointer" onClick={() => { setCurrentUser(null); localStorage.removeItem('token'); }}>Sign Out</button>
                </>
              ) : (
                <>
                  <button className="bg-[rgba(255,255,255,0.03)] text-white border border-[rgba(255,255,255,0.05)] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[rgba(255,255,255,0.08)] cursor-pointer" onClick={() => setAuthModal('login')}>Sign In</button>
                  <button className="bg-[linear-gradient(135deg,#ff3b5c,#d946ef)] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-[0_4px_20px_rgba(255,59,92,0.35)] hover:shadow-[0_6px_30px_rgba(255,59,92,0.6)] cursor-pointer" onClick={() => setAuthModal('register')}>Register</button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* View Switcher Container */}
        <main className="max-w-[1200px] mx-auto px-6 mt-10">
          {currentView === 'home-view' && (
            <div className="flex flex-row items-center justify-between text-left gap-10 mb-10 flex-wrap">
              {/* Hero Column */}
              <div className="flex-1.2 min-w-[320px] relative">
                <div className="flex items-center gap-2 bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.3)] rounded-[30px] px-3.5 py-1.5 mb-[18px]">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_#ff3b5c]"></span>
                  <span className="text-[12px] font-bold text-[#fda4af] tracking-[0.8px]">🇧🇩 BANGLADESH BLOOD NETWORK — LIVE</span>
                </div>
                <h1 className="text-[clamp(32px,4vw,52px)] font-black leading-[1.45] mb-6 tracking-[-1px]">
                  রক্ত দিন, জীবন বাঁচান<br />
                  <span className="bg-[linear-gradient(135deg,#ff3b5c_0%,#d946ef_50%,#3b82f6_100%)] bg-clip-text text-transparent">In Real-Time</span>
                </h1>
                <p className="text-text-muted text-base leading-[1.8] mb-8 max-w-[480px] tracking-[0.01em]">
                  Bangladesh-এর সবচেয়ে বড় blood donation network। AI-powered matching দিয়ে নিকটতম donor খুঁজুন এবং verified blood banks-এর সাথে সংযুক্ত হন।
                </p>

                {/* Form quick search */}
                <div className="glass-panel w-full p-6 mt-2 border-[rgba(255,59,92,0.15)] rounded-2xl bg-bg-card backdrop-blur-[20px] border">
                  <h3 className="mb-4 text-lg font-bold flex items-center gap-2">🔍 Search Nearby Donors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.5px]">Division</label>
                      <select value={searchDivision} onChange={(e) => { setSearchDivision(e.target.value); setSearchDistrict(''); }} className="bg-[rgba(18,18,26,0.7)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                        <option value="">Select Division</option>
                        {divisionList.map(div => <option key={div} value={div}>{div}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.5px]">District</label>
                      <select value={searchDistrict} onChange={(e) => { setSearchDistrict(e.target.value); }} className="bg-[rgba(18,18,26,0.7)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 text-sm text-white focus:border-primary outline-none">
                        <option value="">Select District</option>
                        {districtList.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console Graphic */}
              <div className="glass-panel flex-[0.9] min-w-[340px] p-0 relative border-[rgba(255,59,92,0.2)] shadow-[0_0_80px_rgba(255,59,92,0.08)] rounded-[24px] bg-[linear-gradient(160deg,rgba(8,5,20,0.98)_0%,rgba(3,3,8,0.99)_100%)] overflow-hidden border">
                <div className="px-6 py-4.5 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase tracking-[0.8px] flex items-center gap-2"><span className="text-primary font-bold">●</span> Live Network Console</h4>
                  <span className="bg-[rgba(16,185,129,0.15)] text-[#10b981] text-[10px] px-2.5 py-1 border border-[rgba(16,185,129,0.35)] rounded-[20px] font-bold tracking-[0.5px]">● ONLINE</span>
                </div>
                
                <div className="px-6 grid grid-cols-2 gap-px bg-[rgba(255,255,255,0.04)] my-4 rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
                  <div className="p-4 bg-[rgba(5,5,10,0.9)]">
                    <div className="text-[10px] text-text-muted uppercase tracking-[1px] mb-1">Total Donors</div>
                    <div className="text-[26px] font-black">{stats.activeDonors * 71}</div>
                  </div>
                  <div className="p-4 bg-[rgba(5,5,10,0.9)]">
                    <div className="text-[10px] text-text-muted uppercase tracking-[1px] mb-1">Blood Banks</div>
                    <div className="text-[26px] font-black">{stats.bloodBanks}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
