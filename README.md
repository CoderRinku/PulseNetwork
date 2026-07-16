# PulseNetwork 🩸
**সরাসরি রক্তদাতা ও ব্লাড ব্যাংক যোগাযোগ নেটওয়ার্ক**

PulseNetwork বাংলাদেশ জুড়ে রক্তদাতা, ব্লাড ব্যাংক এবং জরুরি রক্তের প্রয়োজনে থাকা রোগীদের মধ্যে সরাসরি সংযোগ তৈরি করার জন্য একটি সহজ এবং প্রিমিয়াম প্ল্যাটফর্ম। এটি রিয়েল-টাইম লাইভ ডাটার ওপর ভিত্তি করে কাজ করে।

🌐 **লাইভ ওয়েবসাইট লিংক:** [https://pulsenetwork.onrender.com](https://pulsenetwork.onrender.com)  
📄 **প্রেজেন্টেশন স্লাইড পিডিএফ:** [PulseNetwork_Presentation.pdf](PulseNetwork_Presentation.pdf)  
🖥️ **ইন্টারেক্টিভ প্রেজেন্টেশন (HTML স্লাইড):** [presentation.html](presentation.html)

---

## 📊 প্রজেক্ট প্রেজেন্টেশন

### ১. সমস্যা
জরুরি রক্তের প্রয়োজনে মানুষ সাধারণত সামাজিক যোগাযোগ মাধ্যমে পোস্ট করে বা পরিচিতদের ফোন করে। এতে মূল্যবান সময় নষ্ট হয়।
- **পুরোনো তথ্য:** বিভিন্ন গ্রুপে থাকা ফোন নম্বর অনেক সময় বন্ধ বা পুরোনো থাকে।
- **দূরত্ব:** রোগী ও ডোনারের মধ্যে দূরত্ব ম্যাপে না দেখে সহজে অনুমান করা যায় না।
- **অস্বচ্ছতা:** কোন হাসপাতালে কোন গ্রুপের রক্ত মজুদ আছে তা তাৎক্ষণিক জানার উপায় থাকে না।

### ২. সমাধান
PulseNetwork সরাসরি রক্তদাতা ও গ্রহীতাকে যুক্ত করে সময় বাঁচায়।
- **ইন্টারেক্টিভ মানচিত্র:** ম্যাপে ক্লিক করে লাইভ রক্তদাতার তথ্য জানা যায়।
- **রিয়েল-টাইম চ্যাট:** যোগাযোগের জন্য মেসেঞ্জারের মতো চ্যাট সিস্টেম।
- **ইনভেন্টরি ট্র্যাকিং:** ব্লাড ব্যাংকগুলোর লাইভ রক্তের স্টক দেখার সুবিধা।

### ৩. বর্তমান ফিচার
- **বিভাগীয় মানচিত্র:**Glowing নিওন থিমে মানচিত্র দৃশ্যমান।
- **লাইভ চ্যাটিং:** রোগী ও ডোনারের মধ্যে সরাসরি চ্যাট।
- **কুলডাউন পলিসি:** রক্তদানের পর ডোনার আইডি ৯০ দিনের জন্য হাইড থাকে।
- **১-ক্লিক ডেমো:** এডমিন, ডোনার ও ব্লাড ব্যাংক ভিউ পরীক্ষা করার সুবিধা।

### ৪. ভবিষ্যৎ পরিকল্পনা
- **অফলাইন এসএমএস:** ইন্টারনেট ছাড়া এসএমএস রিকোয়েস্ট পাঠানো।
- **মোবাইল অ্যাপ:** অ্যান্ড্রয়েড এবং আইওএস অ্যাপ্লিকেশন।
- **ভেরিফাইড ব্যাজ:** NID ভেরিফিকেশনের মাধ্যমে সক্রিয় ডোনার ব্যাজ।
- **হাসপাতাল নেটওয়ার্ক:** দেশের সকল হাসপাতালের ব্লাড ব্যাংক যুক্ত করা।

### ৫. ব্যবহৃত প্রযুক্তি
- **ফ্রন্টএন্ড:** Next.js (React) & Tailwind CSS
- **ব্যাকএন্ড:** Node.js & Express.js
- **রিয়েল-টাইম চ্যাট:** WebSockets
- **ডাটা সংরক্ষণ:** JSON ফাইল ডাটাবেজ

---

## 🛠️ রান করার নিয়ম

### লোকাল কম্পিউটারে রান করার নিয়ম:
টার্মিনালে নিচের কমান্ডগুলো রান করুন:

```bash
npm install
npm run build
npm start
```
ব্রাউজারে গিয়ে ওপেন করুন: `http://localhost:3000`

---

## 💻 কোড উদাহরণ

### ১. রিয়েল-টাইম চ্যাট সিস্টেম

```javascript
ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'CHAT_MSG') {
        const { receiver_id, message: text } = data;

        const messageObj = {
            id: `msg-${crypto.randomBytes(4).toString('hex')}`,
            sender_id: authenticatedUserId,
            receiver_id,
            message: text,
            timestamp: new Date().toISOString()
        };

        dbData.messages.push(messageObj);
        db.write(dbData);

        const receiverSocket = CLIENTS[receiver_id];
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
            receiverSocket.send(JSON.stringify({ 
                type: 'CHAT_MSG_INCOMING', 
                message: messageObj 
            }));
        }
    }
});
```

### ২. ইন্টারেক্টিভ ম্যাপ হ্যান্ডলার

```jsx
const handleDivisionClick = async (divisionName) => {
  setSelectedDivision(divisionName);
  
  try {
    const response = await fetch(`/api/donors?division=${divisionName}`);
    if (response.ok) {
      const donorsList = await response.json();
      setSearchResults(donorsList);
      setCurrentView('search-results-view');
    }
  } catch (error) {
    console.error(error);
  }
};
```

### ৩. স্বয়ংক্রিয় ডোনার কুলডাউন পলিসি

```javascript
function checkDonorEligibilityCooldown() {
    const data = db.read();
    const now = new Date();

    data.donors.forEach(donor => {
        if (!donor.is_eligible) {
            const lastDonation = new Date(donor.last_donation_date);
            const diffTime = Math.abs(now - lastDonation);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 90) {
                donor.is_eligible = true;
            }
        }
    });
    db.write(data);
}
```

---

## 🛠️ প্রযুক্তি নির্বাচনের কারণ

### ১. জাভাস্ক্রিপ্ট
ফ্রন্টএন্ড এবং ব্যাকএন্ড দুই জায়গাতেই জাভাস্ক্রিপ্ট ব্যবহার করা হয়েছে কোড বেস সহজ ও একমুখী রাখার জন্য।

### ২. Next.js ও React
রক্ত খোঁজার ক্ষেত্রে দ্রুত গতি অত্যন্ত গুরুত্বপূর্ণ। রিঅ্যাক্ট ব্যবহারের ফলে পেজ রিলোড ছাড়াই চোখের পলকে কাজ করে।

### ৩. Node.js ও Express.js
রিয়েল-টাইম লাইভ চ্যাটের জন্য WebSockets যুক্ত করা হয়েছে, যা ইনস্ট্যান্ট মেসেজ আদান-প্রদান নিশ্চিত করে।

### ৪. JSON ইঞ্জিন
সহজ হোস্টিং ও খরচ নিয়ন্ত্রণে ডেটা ফাইল হিসেবেPersistent Disk মেমোরির মাধ্যমে সেভ রাখা হয়েছে।
