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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?token=${authToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[WebSocket] Connection established");
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("[WebSocket] Incoming message:", msg);
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

      <div className="min-h-screen bg-bg-main text-slate-800 font-main relative overflow-x-hidden pt-[120px]">
        
        {/* Navigation Bar */}
        <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[1200px] z-[1000] bg-white/95 backdrop-blur-[10px] border border-slate-200 rounded-[24px] shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-center px-6 py-3 max-w-[1200px] mx-auto">
            <a href="/" className="logo flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.5px] text-slate-900">
              <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center shadow-sm text-sm text-white">🩸</div>
              <span>PulseNetwork</span>
            </a>
            
            <ul className="flex gap-2.5 items-center list-none">
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'home-view' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => setCurrentView('home-view')}>Home</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'inventory-view' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => setCurrentView('inventory-view')}>Blood Stock</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'requests-view' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => setCurrentView('requests-view')}>Emergency Feed</a></li>
            </ul>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="bg-slate-100 px-4 py-2 rounded-[30px] border border-slate-200 text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    {currentUser.name}
                  </div>
                  <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer" onClick={() => { setCurrentUser(null); localStorage.removeItem('token'); }}>Sign Out</button>
                </>
              ) : (
                <>
                  <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer" onClick={() => setAuthModal('login')}>Sign In</button>
                  <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors cursor-pointer" onClick={() => setAuthModal('register')}>Register</button>
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
                <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-[30px] px-3.5 py-1.5 mb-[18px]">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="text-[12px] font-bold text-rose-700 tracking-[0.8px]">🇧🇩 BANGLADESH BLOOD NETWORK — LIVE</span>
                </div>
                <h1 className="text-[clamp(32px,4vw,52px)] font-black leading-[1.45] mb-6 tracking-[-1px] text-slate-900">
                  রক্ত দিন, জীবন বাঁচান<br />
                  <span className="text-primary">সরাসরি যোগাযোগ ও ম্যাচিং</span>
                </h1>
                <p className="text-slate-600 text-base leading-[1.8] mb-8 max-w-[480px]">
                  Bangladesh-এর সবচেয়ে বড় রক্তদান নেটওয়ার্ক। রিয়েল-টাইম ম্যাচিং অ্যালগরিদম দিয়ে নিকটতম রক্তদাতা খুঁজুন এবং ভেরিফাইড ব্লাড ব্যাংকগুলোর সাথে সহজেই সংযুক্ত হন।
                </p>

                {/* Form quick search */}
                <div className="w-full p-6 mt-2 border border-slate-200 rounded-2xl bg-white shadow-sm">
                  <h3 className="mb-4 text-lg font-bold flex items-center gap-2 text-slate-900">🔍 Search Nearby Donors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">Division</label>
                      <select value={searchDivision} onChange={(e) => { setSearchDivision(e.target.value); setSearchDistrict(''); }} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-primary outline-none">
                        <option value="">Select Division</option>
                        {divisionList.map(div => <option key={div} value={div}>{div}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5px]">District</label>
                      <select value={searchDistrict} onChange={(e) => { setSearchDistrict(e.target.value); }} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-primary outline-none">
                        <option value="">Select District</option>
                        {districtList.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console Graphic */}
              <div className="flex-[0.9] min-w-[340px] p-0 relative border border-slate-200 shadow-sm rounded-[24px] bg-white overflow-hidden">
                <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="font-bold text-xs uppercase tracking-[0.8px] flex items-center gap-2 text-slate-700"><span className="text-primary">●</span> Live Network Console</h4>
                  <span className="bg-emerald-50 text-secondary text-[10px] px-2.5 py-1 border border-emerald-200 rounded-[20px] font-bold tracking-[0.5px]">● ONLINE</span>
                </div>
                
                <div className="px-6 grid grid-cols-2 gap-px bg-slate-100 my-4 rounded-2xl overflow-hidden border border-slate-200">
                  <div className="p-4 bg-white">
                    <div className="text-[10px] text-slate-500 uppercase tracking-[1px] mb-1">Total Donors</div>
                    <div className="text-[26px] font-black text-slate-900">{stats.activeDonors * 71}</div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-[10px] text-slate-500 uppercase tracking-[1px] mb-1">Blood Banks</div>
                    <div className="text-[26px] font-black text-slate-900">{stats.bloodBanks}</div>
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
