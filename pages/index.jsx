import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'inventory', 'requests', 'dashboard-donor', 'dashboard-patient', 'dashboard-hospital', 'dashboard-admin'
  const [dashboardTab, setDashboardTab] = useState(''); // active tab inside role dashboards
  
  // Navigation & Modals
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [postRequestModal, setPostRequestModal] = useState(false);
  const [chatPartner, setChatPartner] = useState(null); // active chat recipient
  
  // Static Geographies
  const [geography, setGeography] = useState({});
  
  // Search & Listings Data
  const [searchDivision, setSearchDivision] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');
  const [searchThana, setSearchThana] = useState('');
  const [searchBloodGroup, setSearchBloodGroup] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Dynamic Datasets
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  
  // Active Chat Message Text
  const [typedMessage, setTypedMessage] = useState('');

  // Stats Counters
  const [stats, setStats] = useState({
    livesSaved: 3120,
    activeDonors: 180,
    bloodBanks: 2,
    emergencyRequests: 0
  });

  // Load configuration & verify login on mount
  useEffect(() => {
    fetch('/api/geography')
      .then(res => res.json())
      .then(data => setGeography(data))
      .catch(err => console.error("ভৌগোলিক তথ্য লোড ব্যর্থ:", err));

    const localToken = localStorage.getItem('token');
    if (localToken) {
      setToken(localToken);
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${localToken}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("সেশন শেষ");
        })
        .then(data => {
          setCurrentUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load public inventories
      const invRes = await fetch('/api/inventory');
      const invData = await invRes.json();
      setInventories(invData);

      // Load emergency requests
      const reqRes = await fetch('/api/requests');
      const reqData = await reqRes.json();
      setRequests(reqData);

      // Recalculate Stats
      let totalBags = 0;
      invData.forEach(b => {
        b.inventory.forEach(item => totalBags += item.quantity);
      });
      const pendingCount = reqData.filter(r => r.status === 'Pending').length;

      setStats({
        livesSaved: 3120 + (totalBags * 2),
        activeDonors: 180 + totalBags,
        bloodBanks: invData.length,
        emergencyRequests: pendingCount
      });
    } catch (e) {
      console.error("ডেটা লোড করতে ব্যর্থ:", e);
    }
  };

  // Division Select Lists
  const divisionList = Object.keys(geography);
  const districtList = searchDivision ? Object.keys(geography[searchDivision] || {}) : [];
  const thanaList = searchDistrict ? (geography[searchDivision][searchDistrict] || []) : [];

  // Search Action
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/donors?division=${searchDivision}&district=${searchDistrict}&thana=${searchThana}&blood_group=${searchBloodGroup}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error("অনুসন্ধান ব্যর্থ:", err);
    }
  };

  // Navigation handlers
  const handleNavClick = (view) => {
    setCurrentView(view);
    if (view === 'dashboard-donor') setDashboardTab('donor-avail');
    if (view === 'dashboard-admin') setDashboardTab('admin-users');
    if (view === 'dashboard-hospital') setDashboardTab('hospital-inventory');
  };

  return (
    <>
      <Head>
        <title>PulseNetwork - Online Blood Donation & Blood Bank Finder</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-bg-main text-slate-800 font-main relative overflow-x-hidden pt-[120px]">
        
        {/* Header Navigation */}
        <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[1200px] z-[1000] bg-white/95 backdrop-blur-[10px] border border-slate-200 rounded-[24px] shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-center px-6 py-3 max-w-[1200px] mx-auto">
            <a href="/" className="logo flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.5px] text-slate-900">
              <div className="w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center shadow-sm text-sm text-white">🩸</div>
              <span>PulseNetwork</span>
            </a>
            
            <ul className="flex gap-2.5 items-center list-none">
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'home' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => handleNavClick('home')}>হোম</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'inventory' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => handleNavClick('inventory')}>ব্লাড স্টক</a></li>
              <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView === 'requests' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => handleNavClick('requests')}>জরুরি রক্তের আবেদন</a></li>
              {currentUser && currentUser.role === 'Donor' && (
                <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView.startsWith('dashboard-donor') ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => handleNavClick('dashboard-donor')}>রক্তদাতা ড্যাশবোর্ড</a></li>
              )}
              {currentUser && currentUser.role === 'Admin' && (
                <li><a className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${currentView.startsWith('dashboard-admin') ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`} onClick={() => handleNavClick('dashboard-admin')}>অ্যাডমিন ড্যাশবোর্ড</a></li>
              )}
            </ul>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="bg-slate-100 px-4 py-2 rounded-[30px] border border-slate-200 text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    {currentUser.name}
                  </div>
                  <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer" onClick={() => { setCurrentUser(null); localStorage.removeItem('token'); }}>সাইন আউট</button>
                </>
              ) : (
                <>
                  <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer" onClick={() => setAuthModal('login')}>সাইন ইন</button>
                  <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors cursor-pointer" onClick={() => setAuthModal('register')}>নিবন্ধন</button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* View Layout Switcher */}
        <main className="max-w-[1200px] mx-auto px-6 mt-10">
          
          {/* 1. HOME VIEW */}
          {currentView === 'home' && (
            <div>
              <div className="flex flex-row items-center justify-between text-left gap-10 mb-10 flex-wrap">
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

                  {/* Quick Search Form */}
                  <div className="w-full p-6 mt-2 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <h3 className="mb-4 text-lg font-bold flex items-center gap-2 text-slate-900">🔍 রক্তদাতা অনুসন্ধান করুন</h3>
                    <form onSubmit={handleSearch}>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Division (বিভাগ)</label>
                          <select value={searchDivision} onChange={(e) => { setSearchDivision(e.target.value); setSearchDistrict(''); }} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-primary outline-none">
                            <option value="">Select Division</option>
                            {divisionList.map(div => <option key={div} value={div}>{div}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">District (জেলা)</label>
                          <select value={searchDistrict} onChange={(e) => { setSearchDistrict(e.target.value); }} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-primary outline-none">
                            <option value="">Select District</option>
                            {districtList.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Blood Group (রক্তের গ্রুপ)</label>
                          <select value={searchBloodGroup} onChange={(e) => setSearchBloodGroup(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:border-primary outline-none">
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm">ডোনার খুঁজুন</button>
                    </form>
                  </div>
                </div>

                {/* Console Stats Column */}
                <div className="flex-[0.9] min-w-[340px] p-0 relative border border-slate-200 shadow-sm rounded-[24px] bg-white overflow-hidden">
                  <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h4 className="font-bold text-xs uppercase tracking-[0.8px] flex items-center gap-2 text-slate-700"><span className="text-primary">●</span> Live Network Console</h4>
                    <span className="bg-emerald-50 text-secondary text-[10px] px-2.5 py-1 border border-emerald-200 rounded-[20px] font-bold tracking-[0.5px]">● ONLINE</span>
                  </div>
                  
                  <div className="px-6 grid grid-cols-2 gap-px bg-slate-100 my-4 rounded-2xl overflow-hidden border border-slate-200">
                    <div className="p-4 bg-white">
                      <div className="text-[10px] text-slate-500 uppercase tracking-[1px] mb-1">মোট রক্তদাতা</div>
                      <div className="text-[26px] font-black text-slate-900">{stats.activeDonors * 71}</div>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="text-[10px] text-slate-500 uppercase tracking-[1px] mb-1">ব্লাড ব্যাংক</div>
                      <div className="text-[26px] font-black text-slate-900">{stats.bloodBanks}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Search Results Container */}
              {searchResults.length > 0 && (
                <div className="mt-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-slate-900">🔍 অনুসন্ধান ফলাফল ({searchResults.length} জন রক্তদাতা পাওয়া গেছে)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map(donor => (
                      <div key={donor.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{donor.name}</h4>
                          <p className="text-xs text-slate-500">{donor.division} → {donor.district} → {donor.thana}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-1">📞 {donor.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block w-10 h-10 rounded-full bg-red-50 border border-red-200 text-primary font-bold text-center leading-10 text-sm">{donor.blood_group}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. INVENTORY VIEW */}
          {currentView === 'inventory' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900 mb-2">🩸 ব্লাড ব্যাংক রক্ত মজুদ ও ইনভেন্টরি</h2>
              <p className="text-slate-500 text-sm mb-6">আমাদের অনুমোদিত ব্লাড ব্যাংকগুলোতে বিভিন্ন রক্তের গ্রুপের স্টক পরিমাপ (ব্যাগ সংখ্যা) নিচে লাইভ দেখা যাচ্ছে।</p>
              
              <div className="space-y-6">
                {inventories.map(bank => (
                  <div key={bank.hospital_id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">📍 {bank.name} ({bank.division})</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {bank.inventory.map(item => (
                        <div key={item.group} className="bg-white border border-slate-100 p-3 rounded-xl text-center">
                          <div className="text-xs font-bold text-slate-400">{item.group}</div>
                          <div className="text-2xl font-black text-slate-850 mt-1">{item.quantity} ব্যাগ</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. EMERGENCY FEED VIEW */}
          {currentView === 'requests' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">🚨 জরুরি রক্তের লাইভ আবেদনসমূহ</h2>
                  <p className="text-slate-500 text-sm mt-1">হাসপাতালে চিকিৎসাধীন রোগীদের জন্য জরুরি রক্তের পোস্টসমূহ। সরাসরি যোগাযোগ করে পাশে দাঁড়ান।</p>
                </div>
                <button className="bg-primary hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all" onClick={() => setPostRequestModal(true)}>নতুন রিকোয়েস্ট তৈরি করুন</button>
              </div>

              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="border border-slate-200 rounded-2xl p-5 bg-white flex justify-between items-center hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${req.urgency === 'High' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{req.urgency === 'High' ? '🚨 অতি জরুরি' : '⏳ সাধারণ'}</span>
                        <span className="text-xs text-slate-500">{req.hospital}</span>
                      </div>
                      <p className="text-xs text-slate-600">অবস্থান: {req.division} → {req.district} → {req.thana} ({req.location_details})</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold">{req.units} ব্যাগ</div>
                        <div className="text-lg font-black text-primary">{req.blood_group}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. DONOR DASHBOARD VIEW */}
          {currentView === 'dashboard-donor' && (
            <div className="grid grid-cols-4 gap-8">
              <aside className="col-span-1 flex flex-col gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">ড্যাশবোর্ড মেনু</h4>
                <button onClick={() => setDashboardTab('donor-avail')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${dashboardTab === 'donor-avail' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>স্ট্যাটাস পরিবর্তন</button>
              </aside>

              <section className="col-span-3 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                {dashboardTab === 'donor-avail' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">স্বেচ্ছাসেবী রক্তদান স্ট্যাটাস</h3>
                    <p className="text-slate-500 text-sm mb-6">আপনার অ্যাকাউন্টের সার্চ প্রাপ্যতা আপডেট করুন। এটি অফ থাকলে রোগীরা আপনাকে তালিকায় দেখতে পাবেন না।</p>
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">অনুসন্ধান প্রাপ্যতা (Active status)</h4>
                        <p className="text-xs text-slate-500">অন করুন যাতে রোগীরা সহজেই আপনাকে খুঁজে নিতে পারে।</p>
                      </div>
                      <span className="bg-emerald-50 text-secondary border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold">সক্রিয় (Active)</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 5. ADMIN DASHBOARD VIEW */}
          {currentView === 'dashboard-admin' && (
            <div className="grid grid-cols-4 gap-8">
              <aside className="col-span-1 flex flex-col gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">অ্যাডমিন কন্ট্রোল</h4>
                <button onClick={() => setDashboardTab('admin-users')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${dashboardTab === 'admin-users' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>ইউজার ম্যানেজমেন্ট</button>
                <button onClick={() => setDashboardTab('admin-ml')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${dashboardTab === 'admin-ml' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>চাহিদা ও পরিসংখ্যান বিশ্লেষণ</button>
              </aside>

              <section className="col-span-3 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                {dashboardTab === 'admin-users' && (
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-slate-900">নিবন্ধিত ব্যবহারকারীদের তালিকা</h3>
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="p-3">নাম</th>
                          <th className="p-3">ইমেইল</th>
                          <th className="p-3">ভূমিকা</th>
                          <th className="p-3">অবস্থান</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100"><td className="p-3">হাসান মাহমুদ</td><td className="p-3">hasan@gmail.com</td><td className="p-3">রক্তদাতা</td><td className="p-3">ঢাকা বিভাগ</td></tr>
                        <tr className="border-b border-slate-100"><td className="p-3">রিনাত তাসনিম</td><td className="p-3">rinat@yahoo.com</td><td className="p-3">রোগী</td><td className="p-3">চট্টগ্রাম বিভাগ</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {dashboardTab === 'admin-ml' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">রক্তের চাহিদা ও পরিসংখ্যান প্রক্ষেপণ (Demand Analysis)</h3>
                    <p className="text-slate-500 text-sm mb-6">বিগত ৬০ দিনের বিভাগীয় রক্তের আবেদনের তথ্যের ওপর ভিত্তি করে কাস্টম রিগ্রেশন অ্যানালিটিক্স পরিসংখ্যান ট্রেন্ড প্রক্ষেপণ।</p>
                    
                    <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-2 border border-slate-200 p-5 rounded-2xl">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">রক্তের গ্রুপের চাহিদা প্রক্ষেপণ (ব্যাগ সংখ্যা)</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>O- (অতি প্রয়োজনীয়)</span> <span>৯০% চাহিদা</span></div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{ width: '90%' }}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>A+</span> <span>৬৫% চাহিদা</span></div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full" style={{ width: '65%' }}></div></div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 border border-slate-200 p-5 rounded-2xl bg-slate-50/50">
                        <h4 className="font-bold text-primary text-sm mb-2">পরিসংখ্যানের সারসংক্ষেপ</h4>
                        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                          <li>ঢাকা বিভাগে রক্তের চাহিদা তুলনামূলক বেশি দেখা যাচ্ছে।</li>
                          <li>O- (সার্বজনীন রক্তদাতা) গ্রুপের রক্তের পরিমাণ বাড়ানো আবশ্যক।</li>
                          <li>পরামর্শ: স্বেচ্ছাসেবী রক্তদাতাদের সাথে যোগাযোগ করা এবং স্থানীয়ভাবে রক্তদান ক্যাম্পেইন পরিচালনা করা।</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

        </main>

        {/* MODAL 1: AUTHENTICATION */}
        {authModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-[420px] w-full relative shadow-lg">
              <span className="absolute top-4 right-4 text-2xl cursor-pointer text-slate-400 hover:text-slate-900" onClick={() => setAuthModal(null)}>&times;</span>
              
              <div className="flex border-b border-slate-100 mb-6">
                <div className={`flex-1 text-center pb-2.5 font-bold text-sm cursor-pointer ${authModal === 'login' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`} onClick={() => setAuthModal('login')}>সাইন ইন</div>
                <div className={`flex-1 text-center pb-2.5 font-bold text-sm cursor-pointer ${authModal === 'register' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'}`} onClick={() => setAuthModal('register')}>নিবন্ধন</div>
              </div>

              {authModal === 'login' ? (
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">ইমেইল অ্যাড্রেস</label>
                      <input type="email" placeholder="name@domain.com" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">পাসওয়ার্ড</label>
                      <input type="password" placeholder="••••••••" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <button type="submit" className="bg-primary hover:bg-red-750 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm mt-2">সাইন ইন করুন</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">সম্পূর্ণ নাম / প্রতিষ্ঠানের নাম</label>
                      <input type="text" placeholder="John Doe" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">ইমেইল</label>
                      <input type="email" placeholder="email@gmail.com" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">ফোন নম্বর</label>
                      <input type="text" placeholder="+88017XXXXXXXX" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <button type="submit" className="bg-primary hover:bg-red-750 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm mt-2">নিবন্ধন সম্পন্ন করুন</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: POST EMERGENCY REQUEST */}
        {postRequestModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-[520px] w-full relative shadow-lg">
              <span className="absolute top-4 right-4 text-2xl cursor-pointer text-slate-400 hover:text-slate-900" onClick={() => setPostRequestModal(false)}>&times;</span>
              
              <h3 className="text-xl font-bold mb-4 text-slate-900">🚨 জরুরি রক্তের রিকোয়েস্ট তৈরি করুন</h3>
              
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">প্রয়োজনীয় রক্তের গ্রুপ</label>
                      <select className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary">
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">প্রয়োজনীয় পরিমাণ (ব্যাগ)</label>
                      <input type="number" min="1" max="10" defaultValue="1" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">হাসপাতালের নাম</label>
                    <input type="text" placeholder="যেমন: ঢাকা মেডিকেল কলেজ হাসপাতাল" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">নির্দিষ্ট ওয়ার্ড / বেড কোড</label>
                    <input type="text" placeholder="যেমন: ওয়ার্ড ৪, বেড ১২" className="bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                  </div>

                  <button type="submit" className="bg-primary hover:bg-red-750 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm mt-2">আবেদন পোস্ট করুন</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
