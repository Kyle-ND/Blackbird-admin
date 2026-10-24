// import React, { useState, useEffect, useMemo } from "react";
// import {
//   ChevronLeft, ChevronRight, Plus, Trash2, Users, Menu, X,
//   Search, UserPlus, Home, CalendarDays, CalendarCheck,
//   Undo2, Check, Bell
// } from "lucide-react";

// const technicians = ["Naledi", "Mbali", "Nikki"];
// const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// const servicePricing = {
//   Manicures: { price: 250, duration: 60 },
//   Acrylics: { price: 450, duration: 120 },
//   Pedicures: { price: 300, duration: 75 },
//   "Lash Extensions": { price: 600, duration: 150 },
//   "Eyebrow Services": { price: 180, duration: 45 },
//   Waxing: { price: 200, duration: 30 },
//   "Makeup Services": { price: 550, duration: 90 },
//   "Men's Services": { price: 220, duration: 60 },
// };

// const serviceColors = {
//   Manicures: "bg-pink-100 text-pink-700",
//   Acrylics: "bg-purple-100 text-purple-700",
//   Pedicures: "bg-blue-100 text-blue-700",
//   "Lash Extensions": "bg-yellow-100 text-yellow-700",
//   "Eyebrow Services": "bg-amber-100 text-bronze",
//   Waxing: "bg-plum/15 text-plum",
//   "Makeup Services": "bg-berry/15 text-berry",
//   "Men's Services": "bg-gray-100 text-gray-700",
// };

// const formatDateKey = (date) => date.toISOString().split("T")[0];
// const todayKey = formatDateKey(new Date());

// const SidebarItem = ({ icon, label, active, onClick, open }) => (
//   <button
//     onClick={onClick}
//     className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${active ? "bg-black text-white" : "hover:bg-gray-100"}`}
//     title={!open ? label : ""}
//   >
//     {icon}
//     {open && <span className="font-medium">{label}</span>}
//   </button>
// );

// const NavItem = ({ icon, label, active, onClick }) => (
//   <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? "text-black" : "text-gray-500"}`}>
//     {icon}
//     <span className="text-xs">{label}</span>
//     {active && <div className="w-12 h-1 bg-black rounded-full mt-1" />}
//   </button>
// );

// const Dashboard = () => {
//   const [currentDate, setCurrentDate] = useState(new Date());
//   const [view, setView] = useState("month");
//   const [activeTab, setActiveTab] = useState("calendar");
//   const [isMobile, setIsMobile] = useState(false);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [selectedTechnician, setSelectedTechnician] = useState("");

//   const [clients, setClients] = useState([
//     { id: 1, name: "Sarah Johnson", phone: "082 123 4567", joined: "2024-03-15" },
//     { id: 2, name: "Lerato Mokoena", phone: "071 555 8899", joined: "2024-06-22" },
//     { id: 3, name: "Zoe Williams", phone: "063 444 1122", joined: "2025-01-10" },
//     { id: 4, name: "Aaliyah Patel", phone: "084 777 9900", joined: "2025-02-28" },
//     { id: 5, name: "Thandi Zungu", phone: "078 888 7766", joined: "2025-04-05" },
//   ]);

//   const [appointments, setAppointments] = useState({
//     "2025-11-18": [
//       { id: 101, time: "09:00", title: "Sarah Johnson", clientId: 1, technician: "Naledi", service: "Manicures", color: "bg-pink-100 text-pink-700", duration: 60, price: 250, endTime: "10:00" },
//       { id: 102, time: "11:00", title: "Lerato Mokoena", clientId: 2, technician: "Mbali", service: "Pedicures", color: "bg-blue-100 text-blue-700", duration: 75, price: 300, endTime: "12:15" },
//       { id: 105, time: "14:30", title: "Thandi Zungu", clientId: 5, technician: "Nikki", service: "Lash Extensions", color: "bg-yellow-100 text-yellow-700", duration: 150, price: 600, endTime: "17:00" },
//     ],
//     "2025-11-20": [
//       { id: 103, time: "14:00", title: "Zoe Williams", clientId: 3, technician: "Naledi", service: "Acrylics", color: "bg-purple-100 text-purple-700", duration: 120, price: 450, endTime: "16:00" },
//     ],
//   });

//   // Modals & UI
//   const [showModal, setShowModal] = useState(false);
//   const [showClientModal, setShowClientModal] = useState(false);
//   const [showConfirmation, setShowConfirmation] = useState(false);
//   const [confirmedAppointment, setConfirmedAppointment] = useState(null);
//   const [deletedAppointment, setDeletedAppointment] = useState(null);
//   const [undoTimeout, setUndoTimeout] = useState(null);

//   const [selectedDate, setSelectedDate] = useState(null);
//   const [clientSearch, setClientSearch] = useState("");
//   const [newClient, setNewClient] = useState({ name: "", phone: "" });
//   const [newAppointment, setNewAppointment] = useState({ time: "", title: "", clientId: null, technician: "", service: "" });
//   const [editingAppointment, setEditingAppointment] = useState(null);

//   const filteredClients = useMemo(() => {
//     if (!clientSearch.trim()) return [];
//     return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
//   }, [clientSearch, clients]);

//   const todayAppointments = (appointments[todayKey] || []).length;

//   useEffect(() => {
//     const checkMobile = () => {
//       const mobile = window.innerWidth < 768;
//       setIsMobile(mobile);
//       if (mobile) {
//         setView("day");
//         setSidebarOpen(false);
//       }
//     };
//     checkMobile();
//     window.addEventListener("resize", checkMobile);
//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   const getAppointmentsForDate = (date) => {
//     const key = formatDateKey(date);
//     const appts = appointments[key] || [];
//     return selectedTechnician ? appts.filter(a => a.technician === selectedTechnician) : appts;
//   };

//   const deleteAppointment = (date, apt) => {
//     const key = formatDateKey(date);
//     setDeletedAppointment({ apt, key, date });
//     setAppointments(prev => ({ ...prev, [key]: prev[key].filter(a => a.id !== apt.id) }));
//     clearTimeout(undoTimeout);
//     setUndoTimeout(setTimeout(() => setDeletedAppointment(null), 5000));
//   };

//   const undoDelete = () => {
//     if (!deletedAppointment) return;
//     clearTimeout(undoTimeout);
//     const { apt, key } = deletedAppointment;
//     setAppointments(prev => ({
//       ...prev,
//       [key]: [...(prev[key] || []), apt].sort((a, b) => a.time.localeCompare(b.time))
//     }));
//     setDeletedAppointment(null);
//   };

//   const handleAddAppointment = (e) => {
//     e.preventDefault();
//     if (!newAppointment.service || !newAppointment.time || !newAppointment.technician || !newAppointment.title) return;

//     const dateKey = formatDateKey(selectedDate || currentDate);
//     const service = servicePricing[newAppointment.service];
//     const [h, m] = newAppointment.time.split(":").map(Number);
//     const end = new Date(selectedDate || currentDate);
//     end.setHours(h + Math.floor((m + service.duration) / 60), (m + service.duration) % 60);

//     const apt = {
//       ...newAppointment,
//       id: editingAppointment?.id || Date.now(),
//       price: service.price,
//       duration: service.duration,
//       endTime: end.toTimeString().slice(0, 5),
//       color: serviceColors[newAppointment.service],
//     };

//     setAppointments(prev => ({
//       ...prev,
//       [dateKey]: editingAppointment
//         ? prev[dateKey].map(a => a.id === editingAppointment.id ? apt : a)
//         : [...(prev[dateKey] || []), apt].sort((a, b) => a.time.localeCompare(b.time))
//     }));

//     setConfirmedAppointment({ ...apt, date: selectedDate || currentDate });
//     setShowConfirmation(true);
//     setShowModal(false);
//     setEditingAppointment(null);
//     setNewAppointment({ time: "", title: "", clientId: null, technician: selectedTechnician || technicians[0], service: "" });
//   };

//   const daysInMonth = useMemo(() => {
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth();
//     const firstDay = new Date(year, month, 1).getDay();
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const days = [];

//     for (let i = firstDay - 1; i >= 0; i--) {
//       days.push({ day: new Date(year, month, -i).getDate(), current: false });
//     }
//     for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, current: true });
//     while (days.length < 42) days.push({ day: days.length - 35 + 1, current: false });
//     return days;
//   }, [currentDate]);

//   const timeSlots = Array.from({ length: 22 }, (_, i) => {
//     const h = Math.floor(i / 2) + 8;
//     const m = i % 2 === 0 ? "00" : "30";
//     return `${String(h).padStart(2, "0")}:${m}`;
//   });

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
//       {/* Desktop Sidebar */}
//       {!isMobile && (
//         <aside className={`fixed inset-y-0 left-0 bg-white border-r z-50 flex flex-col transition-all ${sidebarOpen ? 'w-64' : 'w-20'}`}>
//           <div className="p-6 border-b flex justify-between items-center">
//             <h1 className={`text-2xl font-bold transition-all ${sidebarOpen ? '' : 'opacity-0 w-0'}`}>Blackbird</h1>
//             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-gray-100 rounded-xl">
//               {sidebarOpen ? <ChevronLeft /> : <Menu />}
//             </button>
//           </div>
//           <nav className="p-4 space-y-2">
//             <SidebarItem icon={<Home className="w-5 h-5" />} label="Dashboard" open={sidebarOpen} />
//             <SidebarItem icon={<CalendarDays className="w-5 h-5" />} label="Calendar" active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} open={sidebarOpen} />
//             <SidebarItem icon={<CalendarCheck className="w-5 h-5" />} label="Today's Schedule" active={activeTab === "today"} onClick={() => setActiveTab("today")} open={sidebarOpen} />
//             <SidebarItem icon={<Users className="w-5 h-5" />} label="Clients" active={activeTab === "clients"} onClick={() => setActiveTab("clients")} open={sidebarOpen} />
//           </nav>
//         </aside>
//       )}

//       <div className={`flex-1 transition-all ${!isMobile ? (sidebarOpen ? 'ml-64' : 'ml-20') : ''}`}>
//         <header className="bg-white border-b sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
//           <h1 className="text-2xl font-bold">Blackbird</h1>
//           <button onClick={() => setActiveTab("today")} className="relative p-3 hover:bg-gray-100 rounded-xl">
//             <Bell className="w-6 h-6" />
//             {todayAppointments > 0 && (
//               <span className="absolute -top-1 -right-1 bg-berry text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
//                 {todayAppointments}
//               </span>
//             )}
//           </button>
//         </header>

//         {/* Calendar Header */}
//         {activeTab === "calendar" && (
//           <header className="bg-white border-b sticky top-16 z-30 px-6 py-5">
//             <div className="flex flex-wrap items-center justify-between gap-4">
//               <h1 className="text-2xl font-bold">
//                 {view === "month"
//                   ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
//                   : currentDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
//               </h1>
//               <div className="flex items-center gap-3 flex-wrap">
//                 <select value={selectedTechnician} onChange={(e) => setSelectedTechnician(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
//                   <option value="">All Technicians</option>
//                   {technicians.map(t => <option key={t} value={t}>{t}</option>)}
//                 </select>
//                 {!isMobile && (
//                   <div className="flex bg-gray-100 rounded-lg p-1">
//                     <button onClick={() => setView("month")} className={`px-4 py-2 rounded-md text-sm font-medium ${view === "month" ? "bg-white shadow-sm" : ""}`}>Month</button>
//                     <button onClick={() => setView("day")} className={`px-4 py-2 rounded-md text-sm font-medium ${view === "day" ? "bg-white shadow-sm" : ""}`}>Day</button>
//                   </div>
//                 )}
//                 <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Today</button>
//                 <div className="flex">
//                   <button onClick={() => setCurrentDate(d => { const nd = new Date(d); view === "month" ? nd.setMonth(nd.getMonth() - 1) : nd.setDate(nd.getDate() - 1); return nd; })} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft /></button>
//                   <button onClick={() => setCurrentDate(d => { const nd = new Date(d); view === "month" ? nd.setMonth(nd.getMonth() + 1) : nd.setDate(nd.getDate() + 1); return nd; })} className="p-2 hover:bg-gray-100 rounded"><ChevronRight /></button>
//                 </div>
//               </div>
//             </div>
//           </header>
//         )}

//         {/* Views */}
//         {activeTab === "calendar" && view === "month" && (
//           <div className="grid grid-cols-7 text-xs font-bold text-gray-600 uppercase bg-gray-50 border-b">
//             {dayNames.map(d => <div key={d} className="py-4 text-center">{d}</div>)}
//           </div>
//         )}

//         {/* Render content based on tab and view */}
//         {activeTab === "calendar" && (
//           view === "month" ? (
//             <div className="grid grid-cols-7 bg-white">
//               {daysInMonth.map((d, i) => {
//                 const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d.day);
//                 const appts = getAppointmentsForDate(date);
//                 const isToday = formatDateKey(date) === todayKey;

//                 return (
//                   <div key={i} onClick={() => d.current && (setSelectedDate(date), setCurrentDate(date), setView("day"), setShowModal(true))}
//                     className={`border-r border-b p-3 min-h-32 cursor-pointer hover:bg-gray-50 ${isToday ? "bg-indigo-50" : ""} ${d.current ? "bg-white" : "bg-gray-50 text-gray-400"}`}>
//                     <div className={`text-sm font-semibold ${isToday ? "text-indigo-700" : ""}`}>{d.day}</div>
//                     {appts.slice(0, 4).map(a => (
//                       <div key={a.id} className="relative group mt-1">
//                         <div onClick={(e) => { e.stopPropagation(); setEditingAppointment(a); setNewAppointment(a); setShowModal(true); }}
//                           className={`${a.color} px-2 py-1 rounded text-xs truncate cursor-pointer hover:pr-8 transition`}>
//                           {a.time} {a.title}
//                         </div>
//                         <button onClick={(e) => { e.stopPropagation(); deleteAppointment(date, a); }}
//                           className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-berry text-white rounded-full p-1">
//                           <Trash2 className="w-3 h-3" />
//                         </button>
//                       </div>
//                     ))}
//                     {appts.length > 4 && <div className="text-xs text-gray-500 text-center">+{appts.length - 4} more</div>}
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <div className="bg-white overflow-y-auto">
//               <div className="max-w-5xl mx-auto">
//                 {timeSlots.map(slot => {
//                   const appts = getAppointmentsForDate(currentDate).filter(a => a.time === slot);
//                   return (
//                     <div key={slot} className="flex border-b min-h-24">
//                       <div className="w-24 py-6 pr-6 text-right text-sm font-medium text-gray-500">{slot}</div>
//                       <div className="flex-1 py-4">
//                         {appts.length > 0 ? appts.map(apt => (
//                           <div key={apt.id} className="relative group mb-4">
//                             <button onClick={() => deleteAppointment(currentDate, apt)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-berry text-white rounded-full p-2 z-10">
//                               <Trash2 className="w-4 h-4" />
//                             </button>
//                             <div onClick={() => { setEditingAppointment(apt); setNewAppointment(apt); setShowModal(true); }}
//                               className={`${apt.color} border-l-4 -ml-4 pl-6 pr-12 py-4 rounded-r-xl shadow-sm cursor-pointer hover:shadow-lg transition`}>
//                               <div className="font-bold">{apt.title}</div>
//                               <div className="text-sm text-gray-700">{apt.service} • {apt.technician}</div>
//                               <div className="text-xs text-gray-600">{apt.time} – {apt.endTime} • R{apt.price}</div>
//                             </div>
//                           </div>
//                         )) : (
//                           <div onClick={() => { setSelectedDate(currentDate); setNewAppointment(prev => ({ ...prev, time: slot })); setShowModal(true); }}
//                             className="h-20 hover:bg-gray-50 rounded-xl cursor-pointer -mx-4 px-4" />
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )
//         )}

//         {activeTab === "today" && (
//           <div className="p-6 bg-white min-h-screen">
//             <div className="max-w-4xl mx-auto">
//               <h1 className="text-3xl font-bold mb-2">Today's Schedule</h1>
//               <p className="text-gray-600 text-lg mb-8">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
//               <div className="flex gap-3 flex-wrap mb-8">
//                 <button onClick={() => setSelectedTechnician("")} className={`px-6 py-3 rounded-xl font-medium ${selectedTechnician === "" ? "bg-black text-white" : "bg-gray-100"}`}>All</button>
//                 {technicians.map(t => (
//                   <button key={t} onClick={() => setSelectedTechnician(t)} className={`px-6 py-3 rounded-xl font-medium ${selectedTechnician === t ? "bg-black text-white" : "bg-gray-100"}`}>{t}</button>
//                 ))}
//               </div>
//               {(() => {
//                 const appts = (appointments[todayKey] || []).filter(a => !selectedTechnician || a.technician === selectedTechnician).sort((a, b) => a.time.localeCompare(b.time));
//                 return appts.length === 0 ? (
//                   <div className="text-center py-20 text-gray-500">
//                     <CalendarCheck className="w-20 h-20 mx-auto mb-6 opacity-30" />
//                     <p className="text-2xl font-medium">No appointments today</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-6">
//                     {appts.map(apt => (
//                       <div key={apt.id} className="bg-white border border-gray-200 rounded-2xl p-8 flex justify-between items-center hover:shadow-xl transition-shadow">
//                         <div className="flex items-center gap-8">
//                           <div className="text-4xl font-bold text-gray-400 w-20 text-right">{apt.time}</div>
//                           <div>
//                             <div className="text-2xl font-bold">{apt.title}</div>
//                             <div className="text-lg text-gray-600 mt-1">{apt.service} with <span className="font-bold text-black">{apt.technician}</span></div>
//                           </div>
//                         </div>
//                         <div className="text-right">
//                           <div className="text-3xl font-bold text-black">R{apt.price}</div>
//                           <div className="text-sm text-gray-500 mt-1">{apt.duration} min</div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 );
//               })()}
//             </div>
//           </div>
//         )}

//         {/* Clients Tab */}
//         {activeTab === "clients" && (
//           <div className="p-6 bg-white">
//             <h1 className="text-2xl font-bold mb-6">Clients</h1>
//             <div className="space-y-4">
//               {clients.map(c => (
//                 <div key={c.id} className="bg-gray-50 rounded-2xl p-5 flex justify-between items-center">
//                   <div>
//                     <div className="font-semibold text-lg">{c.name}</div>
//                     <div className="text-sm text-gray-600">{c.phone || "No phone"}</div>
//                   </div>
//                   <button className="text-berry"><Trash2 className="w-5 h-5" /></button>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Mobile Nav & FAB */}
//       {isMobile && (
//         <>
//           <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
//             <div className="grid grid-cols-4 h-20">
//               <NavItem icon={<Home className="w-6 h-6" />} label="Home" />
//               <NavItem icon={<CalendarDays className="w-6 h-6" />} label="Calendar" active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} />
//               <NavItem icon={<CalendarCheck className="w-6 h-6" />} label="Today" active={activeTab === "today"} onClick={() => setActiveTab("today")} />
//               <NavItem icon={<Users className="w-6 h-6" />} label="Clients" active={activeTab === "clients"} onClick={() => setActiveTab("clients")} />
//             </div>
//           </nav>
//           {(activeTab === "calendar" || activeTab === "today") && (
//             <button onClick={() => { setSelectedDate(new Date()); setShowModal(true); }} className="fixed right-6 bottom-24 w-14 h-14 bg-black text-white rounded-full shadow-2xl z-40 flex items-center justify-center">
//               <Plus className="w-7 h-7" />
//             </button>
//           )}
//         </>
//       )}

//       {/* Undo Toast */}
//       {deletedAppointment && (
//         <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
//           <Check className="w-5 h-5 text-green-400" />
//           <span>Appointment deleted</span>
//           <button onClick={undoDelete} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2">
//             <Undo2 className="w-4 h-4" /> Undo
//           </button>
//         </div>
//       )}

//       {/* Booking Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl p-6 w-full max-w-md">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-xl font-bold">{editingAppointment ? "Edit" : "New"} Appointment</h2>
//               <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
//             </div>
//             <form onSubmit={handleAddAppointment} className="space-y-4">
//               <div className="relative">
//                 <label className="block text-sm font-medium mb-1">Client</label>
//                 <input type="text" placeholder="Search or type name..." className="w-full px-4 py-3 border rounded-xl pl-12" value={clientSearch || newAppointment.title || ""} onChange={(e) => { setClientSearch(e.target.value); setNewAppointment(prev => ({ ...prev, title: e.target.value, clientId: null })); }} />
//                 <Search className="w-5 h-5 text-gray-400 absolute left-4 top-10" />
//                 {filteredClients.length > 0 && (
//                   <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto">
//                     {filteredClients.map(c => (
//                       <button key={c.id} type="button" onClick={() => { setNewAppointment(prev => ({ ...prev, title: c.name, clientId: c.id })); setClientSearch(""); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
//                         <div className="font-medium">{c.name}</div>
//                         <div className="text-xs text-gray-500">{c.phone}</div>
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Service</label>
//                 <select className="w-full px-4 py-3 border rounded-xl" value={newAppointment.service} onChange={(e) => setNewAppointment(prev => ({ ...prev, service: e.target.value }))} required>
//                   <option value="">Select service</option>
//                   {Object.keys(servicePricing).map(s => <option key={s} value={s}>{s}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Technician</label>
//                 <select className="w-full px-4 py-3 border rounded-xl" value={newAppointment.technician} onChange={(e) => setNewAppointment(prev => ({ ...prev, technician: e.target.value }))} required>
//                   <option value="">Select technician</option>
//                   {technicians.map(t => <option key={t} value={t}>{t}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Time</label>
//                 <input type="time" className="w-full px-4 py-3 border rounded-xl" value={newAppointment.time} onChange={(e) => setNewAppointment(prev => ({ ...prev, time: e.target.value }))} required />
//               </div>
//               <div className="flex gap-3 pt-4">
//                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
//                 <button type="submit" className="flex-1 py-3 bg-black text-white rounded-xl">{editingAppointment ? "Save" : "Book"}</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Confirmation Modal */}
//       {showConfirmation && confirmedAppointment && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
//             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
//               <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
//               </svg>
//             </div>
//             <h2 className="text-2xl font-bold mb-8">Booking Confirmed!</h2>
//             <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4">
//               <div className="flex justify-between"><span className="text-gray-600">Client</span><span className="font-semibold">{confirmedAppointment.title}</span></div>
//               <div className="flex justify-between"><span className="text-gray-600">Service</span><span className="font-semibold">{confirmedAppointment.service}</span></div>
//               <div className="flex justify-between"><span className="text-gray-600">Date & Time</span><span className="font-semibold">{confirmedAppointment.date.toLocaleDateString("en-GB")} {confirmedAppointment.time}</span></div>
//               <div className="border-t pt-4 flex justify-between"><span className="text-lg font-bold">Total</span><span className="text-2xl font-bold">R{confirmedAppointment.price}</span></div>
//             </div>
//             <button onClick={() => setShowConfirmation(false)} className="mt-8 w-full py-4 bg-black text-white rounded-xl">Done</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Dashboard;