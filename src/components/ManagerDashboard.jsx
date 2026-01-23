// // src/components/ManagerDashboard.jsx
// import React, { useState, useEffect } from "react";
// import {
//   Menu,
//   X,
//   LogOut,
//   CalendarDays,
//   Users,
//   Scissors,
//   Plus,
//   Edit3,
//   UserX,
//   Check,
//   ChevronLeft,
//   ChevronRight,
//   TrendingUp,
//   BarChart3,
//   UserCog,
//   Download,
//   Star,
//   Calendar,
//   Clock,
//   Search as SearchIcon,
// } from "lucide-react";

// const fixDecimalResponse = (text) => {
//   try {
//     return JSON.parse(text);
//   } catch {
//     const fixed = text
//       .replace(/Decimal\('([\d.]+)'\)/g, '"$1"')
//       .replace(/Decimal\("([\d.]+)"\)/g, '"$1"');
//     return JSON.parse(fixed);
//   }
// };

// export default function ManagerDashboard({ user, onLogout }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [selectedDate, setSelectedDate] = useState(new Date(2025, 11, 18));
//   const [viewMode, setViewMode] = useState("overview");

//   const [technicians, setTechnicians] = useState([]);
//   const [services, setServices] = useState([]);
//   const [stats, setStats] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [toast, setToast] = useState(null);
//   const [selectedClient, setSelectedClient] = useState(null);
//   const [clientHistory, setClientHistory] = useState(null);

//   const [showEditTechModal, setShowEditTechModal] = useState(false);
//   const [editingTech, setEditingTech] = useState(null);
//   const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
//   const [availabilityTech, setAvailabilityTech] = useState(null);
//   const [availability, setAvailability] = useState({});

//   const [showEditServiceModal, setShowEditServiceModal] = useState(false);
//   const [editingService, setEditingService] = useState(null);

//   const token = localStorage.getItem("access_token");

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!token) return;
//       try {
//         setLoading(true);
//         const [techRes, servRes, dailyRes, topTechRes, topServRes, weeklyRes, monthlyRes] = await Promise.all([
//           fetch("/proxy-api/agents/", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/proxy-api/services/", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch(`/proxy-api/manager/stats/daily?date=2025-12-18`, { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/proxy-api/manager/stats/top-technician", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/proxy-api/manager/stats/top-service", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/proxy-api/manager/revenue/weekly", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/proxy-api/manager/revenue/monthly", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         if (techRes.ok) {
//           const data = await techRes.json();
//           setTechnicians(data.map(t => ({ ...t, active_status: t.active_status ?? true })));
//         }
//         if (servRes.ok) {
//           const data = await servRes.json();
//           setServices(data.map(s => ({ ...s, price: parseFloat(s.price) })));
//         }

//         const statsData = {};
//         if (dailyRes.ok) statsData.daily = await dailyRes.json();
//         if (topTechRes.ok) statsData.topTech = await topTechRes.json();
//         if (topServRes.ok) statsData.topService = await topServRes.json();
//         if (weeklyRes.ok) statsData.weekly = await weeklyRes.json();
//         if (monthlyRes.ok) statsData.monthly = await monthlyRes.json();

//         setStats(statsData);
//       } catch (err) {
//         showToast("error", "Failed to load dashboard data");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [token]);

//   const showToast = (type, message) => {
//     setToast({ type, message });
//     setTimeout(() => setToast(null), 4000);
//   };

//   const getToastClasses = (type) => {
//     switch (type) {
//       case 'success': return 'bg-[#985f99] text-white';
//       case 'error': return 'bg-red-500 text-white';
//       case 'info': return 'bg-[#D4AF87] text-[#985f99]';
//       default: return 'bg-gray-500 text-white';
//     }
//   };

//   // Edit Service
//   const handleEditService = async (e) => {
//     e.preventDefault();
//     const form = e.target;
//     const payload = {
//       name: form.name.value,
//       price: parseFloat(form.price.value).toFixed(2),
//     };
//     try {
//       const res = await fetch(`/proxy-api/services/${editingService.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       if (res.ok) {
//         const updated = await res.json();
//         setServices(prev => prev.map(s => s.id === updated.id ? { ...updated, price: parseFloat(updated.price) } : s));
//         setShowEditServiceModal(false);
//         showToast("success", "Service updated");
//       } else {
//         throw new Error("Update failed");
//       }
//     } catch {
//       showToast("error", "Failed to update service");
//     }
//   };

//   // Edit Technician Details
//   const handleEditTech = async (e) => {
//     e.preventDefault();
//     const form = e.target;
//     const payload = {
//       name: form.name.value,
//       specialization: form.specialization.value || null,
//       email: form.email.value,
//     };
//     try {
//       const res = await fetch(`/proxy-api/agents/${editingTech.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       if (res.ok) {
//         const updated = await res.json();
//         setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
//         setShowEditTechModal(false);
//         showToast("success", "Technician updated");
//       }
//     } catch {
//       showToast("error", "Failed to update technician");
//     }
//   };

//   // Toggle Active Status
//   const toggleTechStatus = async (tech) => {
//     try {
//       const res = await fetch(`/proxy-api/agents/${tech.id}/status`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify({ active_status: !tech.active_status }),
//       });
//       if (res.ok) {
//         const updated = await res.json();
//         setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
//         showToast("success", `Technician ${updated.active_status ? "activated" : "deactivated"}`);
//       }
//     } catch {
//       showToast("error", "Failed to update status");
//     }
//   };

//   // Load Availability
//   const openAvailability = async (tech) => {
//     try {
//       const res = await fetch(`/proxy-api/agents/${tech.id}/availability`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.ok) {
//         const data = await res.json();
//         const availMap = {};
//         data.availability.forEach(d => {
//           availMap[d.day.toLowerCase()] = {
//             start: d.start_time,
//             end: d.end_time,
//             available: d.is_available,
//           };
//         });
//         setAvailability(availMap);
//         setAvailabilityTech(tech);
//         setShowAvailabilityModal(true);
//       }
//     } catch {
//       showToast("error", "Failed to load availability");
//     }
//   };

//   // Save Availability
//   const saveAvailability = async () => {
//     const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
//     const payload = {
//       availability: daysOrder.map(day => {
//         const d = availability[day.toLowerCase()] || { available: false };
//         return {
//           day,
//           start_time: d.available ? d.start || "09:00" : null,
//           end_time: d.available ? d.end || "17:00" : null,
//           is_available: d.available,
//         };
//       }),
//     };
//     try {
//       const res = await fetch(`/proxy-api/agents/${availabilityTech.id}/availability`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       if (res.ok) {
//         showToast("success", "Availability updated");
//         setShowAvailabilityModal(false);
//       }
//     } catch {
//       showToast("error", "Failed to save availability");
//     }
//   };

//   // Client History
//   const openClientHistory = async (clientId) => {
//     try {
//       const res = await fetch(`/proxy-api/clients/${clientId}/history`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.ok) {
//         const data = await res.json();
//         setClientHistory(data);
//         setSelectedClient({ id: clientId });
//       }
//     } catch {
//       showToast("error", "Failed to load client history");
//     }
//   };

//   return (
//     <>
//       <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
//       <div className="min-h-screen bg-[#F8F6F2] font-['Inter'] flex">
//         {/* Sidebar */}
//         <aside className={`fixed inset-y-0 left-0 w-72 bg-[#F8F6F2]/95 lg:bg-white/95 backdrop-blur-2xl shadow-2xl border-r border-[#D4AF87]/20 z-50 transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
//           <div className="p-6 border-b border-[#D4AF87]/20 relative">
//             <h1 className="text-3xl font-['Playfair_Display'] text-[#985f99]">Blackbird Spa</h1>
//             <p className="text-[#6B5E50] mt-1 text-sm">Manager</p>
//             <button className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-[#985f99]" onClick={() => setIsSidebarOpen(false)}>
//               <X className="w-7 h-7" />
//             </button>
//           </div>
//           <nav className="p-4 space-y-2">
//             <button onClick={() => setViewMode("overview")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "overview" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <BarChart3 className="w-5 h-5" /> Overview
//             </button>
//             <button onClick={() => setViewMode("technicians")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "technicians" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <UserCog className="w-5 h-5" /> Technicians
//             </button>
//             <button onClick={() => setViewMode("services")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "services" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <Scissors className="w-5 h-5" /> Services
//             </button>
//           </nav>
//           <div className="absolute bottom-0 w-full p-4 border-t border-[#D4AF87]/20">
//             <button onClick={onLogout} className="w-full flex items-center gap-3 text-red-700 hover:bg-red-50 px-4 py-4 rounded-2xl transition">
//               <LogOut className="w-5 h-5" /> Logout
//             </button>
//           </div>
//         </aside>

//         {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

//         <div className={`flex-1 ${isSidebarOpen ? 'ml-72' : ''}`}>
//           <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-[#D4AF87]/20 p-4 lg:p-8">
//             <div className="max-w-7xl mx-auto flex justify-between items-center">
//               <button className="text-[#985f99] p-2" onClick={() => setIsSidebarOpen(prev => !prev)}>
//                 <Menu className="w-6 h-6" />
//               </button>
//               <div className="flex-1 text-left px-4">
//                 <h2 className="text-xl sm:text-3xl lg:text-4xl font-['Playfair_Display'] text-[#985f99]">Sawubona, {user?.name || "Manager"}</h2>
//               </div>
//             </div>
//           </header>

//           <main className="p-4 lg:p-8 bg-[#F8F6F2] min-h-screen">
//             <div className="max-w-7xl mx-auto">
//               {loading ? (
//                 <p className="text-center text-xl">Loading dashboard...</p>
//               ) : (
//                 <>
//                   {viewMode === "overview" && (
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
//                       {/* Daily Stats */}
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                         <p className="text-[#6B5E50] text-sm">Today's Revenue</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">R{stats.daily?.revenue || "0.00"}</p>
//                       </div>
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                         <p className="text-[#6B5E50] text-sm">Bookings Today</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{stats.daily?.bookings_count || 0}</p>
//                       </div>
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                         <p className="text-[#6B5E50] text-sm">Occupancy Rate</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{stats.daily?.occupancy_rate || 0}%</p>
//                       </div>

//                       {/* Top Technician & Service */}
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                         <p className="text-[#6B5E50] text-sm">Top Technician (Week)</p>
//                         <p className="text-2xl font-['Playfair_Display'] text-[#985f99] mt-2">{stats.topTech?.agent_name || "-"}</p>
//                         <p className="text-sm text-[#6B5E50]">R{stats.topTech?.revenue || "0"}</p>
//                       </div>
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                         <p className="text-[#6B5E50] text-sm">Top Service (Month)</p>
//                         <p className="text-2xl font-['Playfair_Display'] text-[#985f99] mt-2">{stats.topService?.service_name || "-"}</p>
//                         <p className="text-sm text-[#6B5E50]">{stats.topService?.total_bookings || 0} bookings</p>
//                       </div>
//                     </div>
//                   )}

//                   {viewMode === "technicians" && (
//                     <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                       <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Technicians</h3>
//                       <div className="space-y-4">
//                         {technicians.map(tech => (
//                           <div key={tech.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
//                             <div className="flex items-center gap-4">
//                               <div className={`w-4 h-4 rounded-full ${tech.active_status ? "bg-green-500" : "bg-red-500"}`} />
//                               <div>
//                                 <p className="text-lg font-medium text-[#985f99]">{tech.name}</p>
//                                 <p className="text-sm text-[#6B5E50]">{tech.email} • {tech.specialization || "General"}</p>
//                               </div>
//                             </div>
//                             <div className="flex gap-3">
//                               <button onClick={() => { setEditingTech(tech); setShowEditTechModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20">
//                                 <Edit3 className="w-5 h-5 text-[#985f99]" />
//                               </button>
//                               <button onClick={() => toggleTechStatus(tech)} className="p-3 bg-red-100 rounded-xl hover:bg-red-200">
//                                 {tech.active_status ? <UserX className="w-5 h-5 text-red-600" /> : <Check className="w-5 h-5 text-green-600" />}
//                               </button>
//                               <button onClick={() => openAvailability(tech)} className="px-4 py-2 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20 text-[#985f99] text-sm">
//                                 Availability
//                               </button>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   {viewMode === "services" && (
//                     <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                       <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Services</h3>
//                       {Object.entries(services.reduce((acc, s) => {
//                         const cat = s.category || "General";
//                         if (!acc[cat]) acc[cat] = [];
//                         acc[cat].push(s);
//                         return acc;
//                       }, {})).map(([category, items]) => (
//                         <div key={category} className="mb-8">
//                           <h4 className="text-xl font-medium text-[#6B5E50] mb-4">{category}</h4>
//                           <div className="space-y-4">
//                             {items.map(service => (
//                               <div key={service.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
//                                 <div>
//                                   <p className="text-lg font-medium text-[#985f99]">{service.name}</p>
//                                   <p className="text-sm text-[#6B5E50]">R{service.price.toFixed(2)}</p>
//                                 </div>
//                                 <button onClick={() => { setEditingService(service); setShowEditServiceModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20">
//                                   <Edit3 className="w-5 h-5 text-[#985f99]" />
//                                 </button>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           </main>
//         </div>

//         {/* Toasts */}
//         {toast && (
//           <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-xl ${getToastClasses(toast.type)} z-50 flex items-center gap-4`}>
//             <span>{toast.message}</span>
//             <button onClick={() => setToast(null)}><X className="w-5 h-5" /></button>
//           </div>
//         )}

//         {/* Client History Modal */}
//         {selectedClient && clientHistory && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{clientHistory.client_name} History</h3>
//               <div className="space-y-4">
//                 <p className="text-[#6B5E50] text-lg">Total Spent: <span className="font-bold text-[#D4AF87]">R{clientHistory.total_spent}</span></p>
//                 <p className="text-[#6B5E50] text-lg">Visits: <span className="font-bold">{clientHistory.visits_count}</span></p>
//                 <p className="text-[#6B5E50] text-lg">Favorite: <span className="font-bold">{clientHistory.favorite_service}</span></p>
//                 <p className="text-[#6B5E50] text-lg">Last Visit: <span className="font-bold">{new Date(clientHistory.last_visit).toLocaleDateString()}</span></p>
//               </div>
//               <button onClick={() => { setSelectedClient(null); setClientHistory(null); }} className="mt-8 w-full py-4 bg-[#985f99] text-white rounded-2xl hover:bg-[#985f99]/90 transition font-medium">
//                 Close
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Edit Technician Modal */}
//         {showEditTechModal && editingTech && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Edit Technician</h3>
//               <form onSubmit={handleEditTech}>
//                 <input name="name" defaultValue={editingTech.name} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="email" type="email" defaultValue={editingTech.email} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="specialization" defaultValue={editingTech.specialization || ""} className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowEditTechModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}

//         {/* Edit Service Modal */}
//         {showEditServiceModal && editingService && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Edit Service</h3>
//               <form onSubmit={handleEditService}>
//                 <input name="name" defaultValue={editingService.name} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="price" type="number" step="0.01" defaultValue={editingService.price} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowEditServiceModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}

//         {/* Availability Modal */}
//         {showAvailabilityModal && availabilityTech && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{availabilityTech.name} Weekly Availability</h3>
//               <div className="space-y-4">
//                 {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
//                   const key = day.toLowerCase();
//                   const dayData = availability[key] || { available: true, start: "09:00", end: "17:00" };
//                   return (
//                     <div key={day} className="flex items-center gap-4">
//                       <input
//                         type="checkbox"
//                         checked={dayData.available}
//                         onChange={() => setAvailability(prev => ({
//                           ...prev,
//                           [key]: { ...prev[key], available: !dayData.available }
//                         }))}
//                         className="w-6 h-6"
//                       />
//                       <span className="w-32 font-medium text-[#985f99]">{day}</span>
//                       {dayData.available ? (
//                         <>
//                           <input
//                             type="time"
//                             value={dayData.start || "09:00"}
//                             onChange={e => setAvailability(prev => ({
//                               ...prev,
//                               [key]: { ...prev[key], start: e.target.value }
//                             }))}
//                             className="px-3 py-2 border rounded-lg"
//                           />
//                           <span>to</span>
//                           <input
//                             type="time"
//                             value={dayData.end || "17:00"}
//                             onChange={e => setAvailability(prev => ({
//                               ...prev,
//                               [key]: { ...prev[key], end: e.target.value }
//                             }))}
//                             className="px-3 py-2 border rounded-lg"
//                           />
//                         </>
//                       ) : (
//                         <span className="text-gray-500">Off</span>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//               <div className="flex gap-4 mt-8">
//                 <button onClick={() => setShowAvailabilityModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                 <button onClick={saveAvailability} className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// }

// // src/components/ManagerDashboard.jsx
// import React, { useState } from "react";
// import {
//   Menu,
//   X,
//   LogOut,
//   CalendarDays,
//   Users,
//   Scissors,
//   Plus,
//   Edit3,
//   UserX,
//   Check,
//   ChevronLeft,
//   ChevronRight,
//   TrendingUp,
//   BarChart3,
//   UserCog,
//   Download,
//   Star,
//   Calendar,
//   Clock,
//   Search as SearchIcon,
// } from "lucide-react";
// // Realistic South African mock data (prices in ZAR)
// const mockTechnicians = [
//   { id: 1, name: "Thandi Mbeki", email: "thandi@blackbirdspa.co.za", specialization: "Massage Therapy", active_status: true },
//   { id: 2, name: "Lerato Nkosi", email: "lerato@blackbirdspa.co.za", specialization: "Facials & Skin Care", active_status: true },
//   { id: 3, name: "Sipho Zuma", email: "sipho@blackbirdspa.co.za", specialization: "Nails & Waxing", active_status: false },
// ];
// const mockServices = [
//   { id: 1, name: "Swedish Massage", price: 950, duration: 60, category: "Massage" },
//   { id: 2, name: "Deep Tissue Massage", price: 1150, duration: 90, category: "Massage" },
//   { id: 3, name: "Hydrating Facial", price: 1050, duration: 60, category: "Facials" },
//   { id: 4, name: "Hot Stone Massage", price: 1300, duration: 90, category: "Massage" },
//   { id: 5, name: "Manicure & Pedicure", price: 750, duration: 90, category: "Nails" },
//   { id: 6, name: "Aromatherapy Massage", price: 1100, duration: 60, category: "Massage" },
// ];
// const mockBookings = {
//   "2025-12-18": [ // Today - Thursday, 18 December 2025
//     { id: 101, time: "09:00", client: "Naledi Mokoena", technician: "Thandi Mbeki", services: ["Swedish Massage"], totalPrice: 950, status: "confirmed" },
//     { id: 102, time: "11:00", client: "Kagiso Pillay", technician: "Lerato Nkosi", services: ["Hydrating Facial"], totalPrice: 1050, status: "confirmed" },
//     { id: 103, time: "13:30", client: "Zanele van der Merwe", technician: "Thandi Mbeki", services: ["Hot Stone Massage"], totalPrice: 1300, status: "no-show" },
//     { id: 104, time: "15:00", client: "Themba Naidoo", technician: "Lerato Nkosi", services: ["Aromatherapy Massage"], totalPrice: 1100, status: "confirmed" },
//     { id: 105, time: "17:00", client: "Aisha Patel", technician: "Thandi Mbeki", services: ["Deep Tissue Massage"], totalPrice: 1150, status: "late-cancel" },
//   ],
//   "2025-12-17": [
//     { id: 201, time: "10:00", client: "Lungile Dlamini", technician: "Thandi Mbeki", services: ["Swedish Massage"], totalPrice: 950, status: "confirmed" },
//     { id: 202, time: "14:00", client: "Bongani Khoza", technician: "Lerato Nkosi", services: ["Manicure & Pedicure"], totalPrice: 750, status: "confirmed" },
//   ],
//   "2025-12-19": [
//     { id: 301, time: "10:30", client: "Siphelele Ngcobo", technician: "Thandi Mbeki", services: ["Deep Tissue Massage"], totalPrice: 1150, status: "confirmed" },
//     { id: 302, time: "16:00", client: "Refilwe Mthembu", technician: "Lerato Nkosi", services: ["Hydrating Facial"], totalPrice: 1050, status: "confirmed" },
//   ],
//   "2025-12-01": [
//     { id: 401, time: "09:00", client: "Naledi Mokoena", technician: "Thandi Mbeki", services: ["Swedish Massage"], totalPrice: 950, status: "confirmed" },
//     { id: 402, time: "11:00", client: "Kagiso Pillay", technician: "Lerato Nkosi", services: ["Hydrating Facial"], totalPrice: 1050, status: "confirmed" },
//   ],
//   "2025-12-02": [
//     { id: 501, time: "09:00", client: "Zanele van der Merwe", technician: "Thandi Mbeki", services: ["Swedish Massage"], totalPrice: 950, status: "confirmed" },
//   ],
// };
// const todayRevenue = 5550;
// const todayBookingsCount = 5;
// const occupancyRate = 85;
// const noShowCount = 1;
// const lateCancelCount = 1;
// const weeklyRevenue = {
//   "Mon 15 Dec": 2450,
//   "Tue 16 Dec": 3200,
//   "Wed 17 Dec": 1700,
//   "Thu 18 Dec": 5550,
//   "Fri 19 Dec": 6200,
//   "Sat 20 Dec": 7500,
//   "Sun 21 Dec": 2800,
// };
// const monthlyRevenue = {
//   "Dec 1": 2650,
//   "Dec 2": 1800,
//   "Dec 3": 3200,
//   "Dec 4": 4500,
//   "Dec 5": 5100,
//   "Dec 6": 6800,
//   "Dec 7": 2400,
//   "Dec 8": 2900,
//   "Dec 9": 3500,
//   "Dec 10": 4200,
//   "Dec 11": 4900,
//   "Dec 12": 5500,
//   "Dec 13": 6100,
//   "Dec 14": 3000,
//   "Dec 15": 2450,
//   "Dec 16": 3200,
//   "Dec 17": 1700,
//   "Dec 18": 5550,
//   "Dec 19": 6200,
//   "Dec 20": 7500,
//   "Dec 21": 2800,
//   "Dec 22": 3400,
//   "Dec 23": 4100,
//   "Dec 24": 4800,
//   "Dec 25": 0,
//   "Dec 26": 5200,
//   "Dec 27": 5800,
//   "Dec 28": 2700,
//   "Dec 29": 3300,
//   "Dec 30": 4000,
//   "Dec 31": 4700,
// };
// const topTechnician = { name: "Thandi Mbeki", revenue: 3550 };
// const topService = { name: "Swedish Massage", bookings: 12, revenue: 11400 };
// const formatDateKey = (date) => date.toISOString().split("T")[0];
// export default function ManagerDashboard({ user, onLogout }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [selectedDate, setSelectedDate] = useState(new Date(2025, 11, 18)); // December 18, 2025
//   const [viewMode, setViewMode] = useState("overview");
//   const [scheduleSubView, setScheduleSubView] = useState("daily");
//   const [selectedTech, setSelectedTech] = useState("");
//   const [toast, setToast] = useState(null);
//   const [showAddTechModal, setShowAddTechModal] = useState(false);
//   const [showEditTechModal, setShowEditTechModal] = useState(false);
//   const [editingTech, setEditingTech] = useState(null);
//   const [showAddServiceModal, setShowAddServiceModal] = useState(false);
//   const [showEditServiceModal, setShowEditServiceModal] = useState(false);
//   const [editingService, setEditingService] = useState(null);
//   const [selectedClient, setSelectedClient] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [availability, setAvailability] = useState(() => {
//     const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
//     return mockTechnicians.reduce((acc, technician) => {
//       acc[technician.id] = days.reduce((dayObj, day) => {
//         dayObj[day] = true;
//         return dayObj;
//       }, {});
//       return acc;
//     }, {});
//   });
//   const selectedDateKey = formatDateKey(selectedDate);
//   const todayBookings = mockBookings[selectedDateKey] || [];
//   const filteredBookings = todayBookings
//     .filter(b => !selectedTech || b.technician === selectedTech)
//     .filter(b => !searchQuery || b.client.toLowerCase().includes(searchQuery.toLowerCase()));
//   const changeDate = (delta) => {
//     const newDate = new Date(selectedDate);
//     newDate.setDate(newDate.getDate() + delta);
//     setSelectedDate(newDate);
//   };
//   const showToast = (type, message) => {
//     setToast({ type, message });
//     setTimeout(() => setToast(null), 4000);
//   };
//   const getToastClasses = (type) => {
//     switch (type) {
//       case 'success': return 'bg-[#985f99] text-white';
//       case 'error': return 'bg-red-500 text-white';
//       case 'info': return 'bg-[#D4AF87] text-[#985f99]';
//       default: return 'bg-gray-500 text-white';
//     }
//   };
//   const handleAddTech = (newTech) => {
//     showToast('success', `${newTech.name} added!`);
//     setShowAddTechModal(false);
//   };
//   const handleEditTech = (updatedTech) => {
//     showToast('success', `${updatedTech.name} updated!`);
//     setShowEditTechModal(false);
//   };
//   const handleAddService = (newService) => {
//     showToast('success', `${newService.name} added!`);
//     setShowAddServiceModal(false);
//   };
//   const handleEditService = (updatedService) => {
//     showToast('success', `${updatedService.name} updated!`);
//     setShowEditServiceModal(false);
//   };
//   const handleExportRevenue = () => {
//     showToast('info', 'Revenue report exported to CSV!');
//   };
//   const getMonthlyBookings = (month, year) => {
//     return Object.keys(mockBookings).reduce((acc, key) => {
//       const date = new Date(key);
//       if (date.getMonth() === month && date.getFullYear() === year) {
//         acc[date.getDate()] = mockBookings[key].length;
//       }
//       return acc;
//     }, {});
//   };
//   const monthBookings = getMonthlyBookings(selectedDate.getMonth(), selectedDate.getFullYear());
//   const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
//   const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
//   const days = Array.from({ length: getDaysInMonth(selectedDate.getMonth(), selectedDate.getFullYear()) }, (_, i) => i + 1);
//   return (
//     <>
//       <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
//       <div className="min-h-screen bg-[#F8F6F2] font-['Inter'] flex">
//         {/* Sidebar */}
//         <aside className={`fixed inset-y-0 left-0 w-72 bg-[#F8F6F2]/95 lg:bg-white/95 backdrop-blur-2xl shadow-2xl border-r border-[#D4AF87]/20 z-50 transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
//           <div className="p-6 border-b border-[#D4AF87]/20 relative">
//             <h1 className="text-3xl font-['Playfair_Display'] text-[#985f99]">Blackbird Spa</h1>
//             <p className="text-[#6B5E50] mt-1 text-sm">Manager</p>
//             <button className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-[#985f99]" onClick={() => setIsSidebarOpen(false)}>
//               <X className="w-7 h-7" />
//             </button>
//           </div>
//           <nav className="p-4 space-y-2">
//             <button onClick={() => setViewMode("overview")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "overview" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <BarChart3 className="w-5 h-5" /> Overview
//             </button>
//             <button onClick={() => setViewMode("schedule")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "schedule" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <CalendarDays className="w-5 h-5" /> Schedule
//             </button>
//             <button onClick={() => setViewMode("revenue")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "revenue" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <TrendingUp className="w-5 h-5" /> Revenue Report
//             </button>
//             <button onClick={() => setViewMode("technicians")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "technicians" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <UserCog className="w-5 h-5" /> Technicians
//             </button>
//             <button onClick={() => setViewMode("services")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "services" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
//               <Scissors className="w-5 h-5" /> Services
//             </button>
//           </nav>
//           <div className="absolute bottom-0 w-full p-4 border-t border-[#D4AF87]/20">
//             <button onClick={onLogout} className="w-full flex items-center gap-3 text-red-700 hover:bg-red-50 px-4 py-4 rounded-2xl transition">
//               <LogOut className="w-5 h-5" /> Logout
//             </button>
//           </div>
//         </aside>
//         {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
//         <div className={`flex-1 ${isSidebarOpen ? 'ml-72' : ''}`}>
//           <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-[#D4AF87]/20 p-4 lg:p-8">
//             <div className="max-w-7xl mx-auto flex justify-between items-center">
//               <button className="text-[#985f99] p-2" onClick={() => setIsSidebarOpen(prev => !prev)}>
//                 <Menu className="w-6 h-6" />
//               </button>
//               <div className="flex-1 text-left px-4">
//                 <h2 className="text-xl sm:text-3xl lg:text-4xl font-['Playfair_Display'] text-[#985f99]">Sawubona, {user?.name || "Manager"}</h2>
//                 <p className="hidden sm:block text-[#6B5E50] text-sm sm:text-base lg:text-lg mt-1">
//                   {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
//                 </p>
//               </div>
//               <button onClick={onLogout} className="p-3 bg-[#f0ebe3] rounded-full hover:bg-[#D4AF87]/20 transition">
//                 <LogOut className="w-6 h-6 text-[#985f99]" />
//               </button>
//             </div>
//           </header>
//           <main className="p-4 lg:p-8 bg-[#F8F6F2] min-h-screen">
//             <div className="max-w-7xl mx-auto">
//               {viewMode === "overview" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Today's Revenue</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">R{todayRevenue.toFixed(2)}</p>
//                       </div>
//                       <div className="w-12 h-12 bg-[#D4AF87]/20 rounded-full flex items-center justify-center">
//                         <span className="text-2xl font-bold text-[#D4AF87]">R</span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Bookings Today</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{todayBookingsCount}</p>
//                       </div>
//                       <CalendarDays className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Occupancy Rate</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{occupancyRate}%</p>
//                       </div>
//                       <Users className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">No-Shows Today</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{noShowCount}</p>
//                       </div>
//                       <UserX className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Late Cancels Today</p>
//                         <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{lateCancelCount}</p>
//                       </div>
//                       <Clock className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Top Technician (Week)</p>
//                         <p className="text-2xl font-['Playfair_Display'] text-[#985f99] mt-2">{topTechnician.name}</p>
//                         <p className="text-sm text-[#6B5E50]">R{topTechnician.revenue}</p>
//                       </div>
//                       <Star className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                   <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="text-[#6B5E50] text-sm">Top Service (Month)</p>
//                         <p className="text-2xl font-['Playfair_Display'] text-[#985f99] mt-2">{topService.name}</p>
//                         <p className="text-sm text-[#6B5E50]">{topService.bookings} bookings • R{topService.revenue}</p>
//                       </div>
//                       <Star className="w-12 h-12 text-[#D4AF87]" />
//                     </div>
//                   </div>
//                 </div>
//               )}
//               {viewMode === "schedule" && (
//                 <>
//                   <div className="flex justify-between items-center mb-6">
//                     <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Schedule</h3>
//                     <select value={scheduleSubView} onChange={(e) => setScheduleSubView(e.target.value)} className="px-4 py-2 rounded-2xl border border-[#D4AF87]/30 bg-white/70 text-[#985f99]">
//                       <option value="daily">Daily</option>
//                       <option value="monthly">Monthly</option>
//                     </select>
//                   </div>
//                   {scheduleSubView === "daily" && (
//                     <>
//                       <div className="flex justify-between items-center mb-6">
//                         <div className="flex items-center gap-2">
//                           <SearchIcon className="w-5 h-5 text-[#6B5E50]" />
//                           <input
//                             type="text"
//                             placeholder="Search client..."
//                             value={searchQuery}
//                             onChange={(e) => setSearchQuery(e.target.value)}
//                             className="px-4 py-2 rounded-2xl border border-[#D4AF87]/30 bg-white/70 focus:outline-none text-[#985f99]"
//                           />
//                         </div>
//                         <div className="flex items-center gap-3">
//                           <button onClick={() => changeDate(-1)} className="p-3 bg-[#f0ebe3] rounded-full hover:bg-[#D4AF87]/20"><ChevronLeft className="w-6 h-6 text-[#985f99]" /></button>
//                           <button onClick={() => changeDate(1)} className="p-3 bg-[#f0ebe3] rounded-full hover:bg-[#D4AF87]/20"><ChevronRight className="w-6 h-6 text-[#985f99]" /></button>
//                         </div>
//                       </div>
//                       <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="mb-6 w-full max-w-xs px-4 py-3 rounded-2xl border border-[#D4AF87]/30 bg-white/70 backdrop-blur focus:outline-none focus:ring-4 focus:ring-[#D4AF87]/30 text-[#985f99]">
//                         <option value="">All Technicians</option>
//                         {mockTechnicians.filter(t => t.active_status).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
//                       </select>
//                       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                         {filteredBookings.length === 0 ? (
//                           <p className="text-center text-xl text-[#6B5E50] py-20">No bookings for this day</p>
//                         ) : (
//                           <div className="space-y-6">
//                             {filteredBookings.map(booking => (
//                               <div key={booking.id} className={`p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md border-l-8 ${booking.status === "confirmed" ? "border-[#985f99]" : booking.status === "no-show" ? "border-red-500" : "border-orange-500"}`}>
//                                 <div className="flex justify-between items-start">
//                                   <div>
//                                     <p className="text-2xl font-['Playfair_Display'] text-[#985f99]">{booking.time}</p>
//                                     <p className="text-lg font-medium text-[#985f99] mt-1 cursor-pointer hover:underline" onClick={() => setSelectedClient(booking.client)}>{booking.client}</p>
//                                     <p className="text-[#6B5E50] mt-2">{booking.services.join(" + ")}</p>
//                                     <p className="text-sm text-[#6B5E50] mt-1">with {booking.technician} • Status: {booking.status}</p>
//                                   </div>
//                                   <div className="text-right">
//                                     <p className="text-2xl font-bold text-[#D4AF87]">R{booking.totalPrice.toFixed(2)}</p>
//                                   </div>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     </>
//                   )}
//                   {scheduleSubView === "monthly" && (
//                     <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                       <h3 className="text-xl font-['Playfair_Display'] text-[#985f99] mb-4">Monthly Calendar</h3>
//                       <div className="grid grid-cols-7 gap-2 text-center text-[#985f99] font-medium">
//                         <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
//                       </div>
//                       <div className="grid grid-cols-7 gap-2 mt-2">
//                         {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="h-24" />)}
//                         {days.map(day => {
//                           const bookingsCount = monthBookings[day] || 0;
//                           const bgColor = bookingsCount > 0 ? `bg-[#985f99]/${Math.min(10 * bookingsCount, 80)}` : "bg-gray-100/50";
//                           return (
//                             <div key={day} className={`h-24 flex flex-col items-center justify-center rounded-lg border border-[#D4AF87]/20 ${bgColor} cursor-pointer hover:opacity-80 transition`} onClick={() => {
//                               setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day));
//                               setScheduleSubView("daily");
//                             }}>
//                               <p className="text-lg font-medium text-[#985f99]">{day}</p>
//                               <p className="text-sm text-[#6B5E50]">{bookingsCount} bookings</p>
//                             </div>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   )}
//                 </>
//               )}
//               {viewMode === "revenue" && (
//                 <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                   <div className="flex justify-between items-center mb-6">
//                     <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Revenue Report</h3>
//                     <button onClick={handleExportRevenue} className="px-6 py-3 bg-[#985f99] text-white rounded-2xl flex items-center gap-2 shadow-lg hover:bg-[#985f99]/90">
//                       <Download className="w-5 h-5" /> Export
//                     </button>
//                   </div>
//                   <h4 className="text-xl font-medium text-[#6B5E50] mb-4">Weekly Revenue</h4>
//                   <div className="space-y-4 mb-8">
//                     {Object.entries(weeklyRevenue).map(([day, amount]) => (
//                       <div key={day} className="flex items-center gap-4">
//                         <p className="w-32 text-lg text-[#985f99]">{day}</p>
//                         <div className="flex-1 h-8 bg-[#D4AF87]/20 rounded-full overflow-hidden">
//                           <div className="h-full bg-[#D4AF87] transition-all" style={{ width: `${(amount / 7500) * 100}%` }} />
//                         </div>
//                         <p className="w-24 text-right font-bold text-[#D4AF87]">R{amount.toFixed(2)}</p>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="p-6 bg-[#985f99]/10 rounded-3xl mb-8">
//                     <p className="text-xl font-medium text-[#985f99]">Week Total: <span className="font-bold text-[#D4AF87]">R29 400</span></p>
//                     <p className="text-sm text-[#6B5E50] mt-2">Average daily: R4 200 • Top day: Sat (R7 500)</p>
//                   </div>
//                   <h4 className="text-xl font-medium text-[#6B5E50] mb-4">Monthly Revenue</h4>
//                   <div className="space-y-4">
//                     {Object.entries(monthlyRevenue).map(([day, amount]) => (
//                       <div key={day} className="flex items-center gap-4">
//                         <p className="w-32 text-lg text-[#985f99]">{day}</p>
//                         <div className="flex-1 h-8 bg-[#D4AF87]/20 rounded-full overflow-hidden">
//                           <div className="h-full bg-[#D4AF87] transition-all" style={{ width: `${(amount / 7500) * 100}%` }} />
//                         </div>
//                         <p className="w-24 text-right font-bold text-[#D4AF87]">R{amount.toFixed(2)}</p>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="mt-8 p-6 bg-[#985f99]/10 rounded-3xl">
//                     <p className="text-xl font-medium text-[#985f99]">Month Total: <span className="font-bold text-[#D4AF87]">R105 450</span></p>
//                     <p className="text-sm text-[#6B5E50] mt-2">Average daily: R3 515 • Top day: Sat 20 Dec (R7 500)</p>
//                   </div>
//                 </div>
//               )}
//               {viewMode === "technicians" && (
//                 <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                   <div className="flex justify-between items-center mb-6">
//                     <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Technicians</h3>
//                     <button onClick={() => setShowAddTechModal(true)} className="px-6 py-3 bg-[#985f99] text-white rounded-2xl flex items-center gap-2 shadow-lg hover:bg-[#985f99]/90">
//                       <Plus className="w-5 h-5" /> Add Technician
//                     </button>
//                   </div>
//                   <div className="space-y-4">
//                     {mockTechnicians.map(tech => (
//                       <div key={tech.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
//                         <div className="flex items-center gap-4">
//                           <div className={`w-4 h-4 rounded-full ${tech.active_status ? "bg-green-500" : "bg-red-500"}`} />
//                           <div>
//                             <p className="text-lg font-medium text-[#985f99]">{tech.name}</p>
//                             <p className="text-sm text-[#6B5E50]">{tech.email} • {tech.specialization}</p>
//                           </div>
//                         </div>
//                         <div className="flex gap-3">
//                           <button onClick={() => { setEditingTech(tech); setShowEditTechModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20"><Edit3 className="w-5 h-5 text-[#985f99]" /></button>
//                           <button onClick={() => showToast('info', tech.active_status ? 'Deactivated' : 'Activated')} className="p-3 bg-red-100 rounded-xl hover:bg-red-200">
//                             {tech.active_status ? <UserX className="w-5 h-5 text-red-600" /> : <Check className="w-5 h-5 text-green-600" />}
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                   <h4 className="text-xl font-medium text-[#6B5E50] mt-8 mb-4">Staff Availability</h4>
//                   <div className="space-y-4">
//                     {mockTechnicians.map(tech => (
//                       <div key={tech.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md">
//                         <p className="text-lg font-medium text-[#985f99] mb-4">{tech.name} Availability</p>
//                         <div className="grid grid-cols-7 gap-3 text-center">
//                           <div className="font-medium text-[#6B5E50]">Mon</div>
//                           <div className="font-medium text-[#6B5E50]">Tue</div>
//                           <div className="font-medium text-[#6B5E50]">Wed</div>
//                           <div className="font-medium text-[#6B5E50]">Thu</div>
//                           <div className="font-medium text-[#6B5E50]">Fri</div>
//                           <div className="font-medium text-[#6B5E50]">Sat</div>
//                           <div className="font-medium text-[#6B5E50]">Sun</div>
//                           {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
//                             <button
//                               key={day}
//                               className={`p-3 rounded-lg font-medium transition ${
//                                 availability[tech.id]?.[day] ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
//                               }`}
//                               onClick={() => {
//                                 setAvailability(prev => ({
//                                   ...prev,
//                                   [tech.id]: {
//                                     ...prev[tech.id],
//                                     [day]: !prev[tech.id]?.[day]
//                                   }
//                                 }));
//                                 showToast('success', `${tech.name}'s ${day.charAt(0).toUpperCase() + day.slice(1)} availability updated`);
//                               }}
//                             >
//                               {availability[tech.id]?.[day] ? 'Available' : 'Off'}
//                             </button>
//                           ))}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               {viewMode === "services" && (
//                 <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
//                   <div className="flex justify-between items-center mb-6">
//                     <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Services</h3>
//                     <button onClick={() => setShowAddServiceModal(true)} className="px-6 py-3 bg-[#985f99] text-white rounded-2xl flex items-center gap-2 shadow-lg hover:bg-[#985f99]/90">
//                       <Plus className="w-5 h-5" /> Add Service
//                     </button>
//                   </div>
//                   {Object.entries(mockServices.reduce((acc, s) => {
//                     if (!acc[s.category]) acc[s.category] = [];
//                     acc[s.category].push(s);
//                     return acc;
//                   }, {})).map(([category, items]) => (
//                     <div key={category} className="mb-8">
//                       <h4 className="text-xl font-medium text-[#6B5E50] mb-4">{category}</h4>
//                       <div className="space-y-4">
//                         {items.map(service => (
//                           <div key={service.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
//                             <div>
//                               <p className="text-lg font-medium text-[#985f99]">{service.name}</p>
//                               <p className="text-sm text-[#6B5E50]">R{service.price.toFixed(2)} • {service.duration} minutes</p>
//                             </div>
//                             <button onClick={() => { setEditingService(service); setShowEditServiceModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20">
//                               <Edit3 className="w-5 h-5 text-[#985f99]" />
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </main>
//         </div>
//         {toast && (
//           <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-xl ${getToastClasses(toast.type)} z-50 flex items-center gap-4`}>
//             <span>{toast.message}</span>
//             <button onClick={() => setToast(null)}><X className="w-5 h-5" /></button>
//           </div>
//         )}
//         {/* Client History Modal - Always shows demo data */}
//         {selectedClient && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{selectedClient} History</h3>
//               <div className="space-y-4">
//                 <p className="text-[#6B5E50] text-lg">Total Spent: <span className="font-bold text-[#D4AF87]">R4 500</span></p>
//                 <p className="text-[#6B5E50] text-lg">Number of Visits: <span className="font-bold">5</span></p>
//                 <p className="text-[#6B5E50] text-lg">Favorite Treatment: <span className="font-bold">Swedish Massage</span></p>
//                 <p className="text-[#6B5E50] text-sm italic mt-6">* Demo data — real history will appear when connected to backend</p>
//               </div>
//               <button onClick={() => setSelectedClient(null)} className="mt-8 w-full py-4 bg-[#985f99] text-white rounded-2xl hover:bg-[#985f99]/90 transition font-medium">
//                 Close
//               </button>
//             </div>
//           </div>
//         )}
//         {/* Add Technician Modal */}
//         {showAddTechModal && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Add Technician</h3>
//               <form onSubmit={(e) => { e.preventDefault(); handleAddTech({ name: e.target.name.value, email: e.target.email.value, specialization: e.target.specialization.value }); }}>
//                 <input name="name" placeholder="Name" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="email" type="email" placeholder="Email" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="specialization" placeholder="Specialization" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowAddTechModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Add</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//         {/* Edit Technician Modal */}
//         {showEditTechModal && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Edit Technician</h3>
//               <form onSubmit={(e) => { e.preventDefault(); handleEditTech({ ...editingTech, name: e.target.name.value, email: e.target.email.value, specialization: e.target.specialization.value }); }}>
//                 <input name="name" defaultValue={editingTech?.name} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="email" type="email" defaultValue={editingTech?.email} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="specialization" defaultValue={editingTech?.specialization} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowEditTechModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//         {/* Add Service Modal */}
//         {showAddServiceModal && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Add Service</h3>
//               <form onSubmit={(e) => { e.preventDefault(); handleAddService({ name: e.target.name.value, price: parseFloat(e.target.price.value), duration: parseInt(e.target.duration.value), category: e.target.category.value }); }}>
//                 <input name="name" placeholder="Name" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="price" type="number" step="0.01" placeholder="Price (R)" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="duration" type="number" placeholder="Duration (min)" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="category" placeholder="Category" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowAddServiceModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Add</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//         {/* Edit Service Modal */}
//         {showEditServiceModal && (
//           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
//             <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
//               <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Edit Service</h3>
//               <form onSubmit={(e) => { e.preventDefault(); handleEditService({ ...editingService, name: e.target.name.value, price: parseFloat(e.target.price.value), duration: parseInt(e.target.duration.value), category: e.target.category.value }); }}>
//                 <input name="name" defaultValue={editingService?.name} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="price" type="number" step="0.01" defaultValue={editingService?.price} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="duration" type="number" defaultValue={editingService?.duration} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <input name="category" defaultValue={editingService?.category} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" />
//                 <div className="flex gap-4">
//                   <button type="button" onClick={() => setShowEditServiceModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
//                   <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// }

// src/components/ManagerDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  LogOut,
  CalendarDays,
  Users,
  Scissors,
  Plus,
  Edit3,
  UserX,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  UserCog,
  Download,
  Star,
  Search as SearchIcon,
} from "lucide-react";

export default function ManagerDashboard({ user, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("overview");
  const [scheduleSubView, setScheduleSubView] = useState("daily");
  const [selectedTech, setSelectedTech] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [technicians, setTechnicians] = useState([]);
  const [services, setServices] = useState([]);
  const [dailyStats, setDailyStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [monthlyCounts, setMonthlyCounts] = useState({});
  const [weeklyRevenue, setWeeklyRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);

  const [showEditTechModal, setShowEditTechModal] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityTech, setAvailabilityTech] = useState(null);
  const [availability, setAvailability] = useState({});

  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: '',
    duration_minutes: '',
    price: '',
    description: '',
  });

  const [topWeeklyClient, setTopWeeklyClient] = useState(null);
  const [topMonthlyClient, setTopMonthlyClient] = useState(null);
  const [topTechnicians, setTopTechnicians] = useState([]);

  const token = localStorage.getItem("access_token");
  const selectedDateKey = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    if (showEditServiceModal) {
      if (editingService) {
        setServiceForm({
          name: editingService.name || '',
          category: editingService.category || '',
          duration_minutes: editingService.duration_minutes.toString() || '',
          price: editingService.price.toString() || '',
          description: editingService.description || '',
        });
      } else {
        setServiceForm({
          name: '',
          category: '',
          duration_minutes: '',
          price: '',
          description: '',
        });
      }
    }
  }, [showEditServiceModal, editingService]);

  useEffect(() => {
    const fetchCoreData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [techRes, servRes, dailyRes] = await Promise.all([
          fetch("/proxy-api/agents", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/proxy-api/services/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/proxy-api/manager/stats/daily?date=${selectedDateKey}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        let error = false;

        if (techRes.ok) {
          setTechnicians((await techRes.json()).map(t => ({ ...t, active_status: t.active_status ?? true })));
        } else {
          error = true;
        }

        if (servRes.ok) {
          setServices((await servRes.json()).map(s => ({ ...s, price: parseFloat(s.price) })));
        } else {
          error = true;
        }

        if (dailyRes.ok) {
          setDailyStats(await dailyRes.json());
        } else {
          error = true;
        }

        if (error) {
          showToast("error", "Some core data could not be loaded");
        }
      } catch (err) {
        showToast("error", "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchCoreData();
  }, [token, selectedDateKey]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (viewMode !== "schedule" || !token) return;
      try {
        const res = await fetch(`/proxy-api/bookings/by-date?date=${selectedDateKey}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setBookings(await res.json());
        } else {
          setBookings([]);
          showToast("error", "Failed to load bookings");
        }
      } catch {
        setBookings([]);
        showToast("error", "Failed to load bookings");
      }
    };
    fetchBookings();
  }, [selectedDateKey, viewMode, token]);

  useEffect(() => {
    if (viewMode === "schedule" && scheduleSubView === "monthly" && token) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const fetchMonthlyCounts = async () => {
        try {
          const res = await fetch(`/proxy-api/bookings/counts?month=${monthKey}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setMonthlyCounts(await res.json());
          } else {
            showToast("error", "Failed to load monthly counts");
          }
        } catch {
          showToast("error", "Failed to load monthly counts");
        }
      };
      fetchMonthlyCounts();
    }
  }, [selectedDate, viewMode, scheduleSubView, token]);

  useEffect(() => {
    if (viewMode === "revenue" && !weeklyRevenue && token) {
      const fetchRevenueData = async () => {
        try {
          const weeklyRes = await fetch("/proxy-api/manager/revenue/weekly", { headers: { Authorization: `Bearer ${token}` } });
          if (weeklyRes.ok) {
            setWeeklyRevenue(await weeklyRes.json());
          } else {
            showToast("error", "Failed to load weekly revenue data");
          }
        } catch {
          showToast("error", "Failed to load revenue data");
        }
      };
      fetchRevenueData();
    }
  }, [viewMode, token, weeklyRevenue]);

  useEffect(() => {
    if (viewMode === "analytics" && token) {
      const fetchAnalytics = async () => {
        try {
          const [weeklyClientRes, monthlyClientRes, topTechsRes] = await Promise.all([
            fetch("/proxy-api/manager/top-clients?period=week&limit=1", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/proxy-api/manager/top-clients?period=month&limit=1", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/proxy-api/manager/top-technicians?period=month&limit=5", { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (weeklyClientRes.ok) {
            const data = await weeklyClientRes.json();
            setTopWeeklyClient(data[0] || null);
          }

          if (monthlyClientRes.ok) {
            const data = await monthlyClientRes.json();
            setTopMonthlyClient(data[0] || null);
          }

          if (topTechsRes.ok) {
            setTopTechnicians(await topTechsRes.json());
          }
        } catch {
          showToast("error", "Failed to load analytics");
        }
      };
      fetchAnalytics();
    }
  }, [viewMode, token]);

  const filteredBookings = bookings
    .filter(b => !selectedTech || b.agent?.name === selectedTech)
    .filter(b => !searchQuery || b.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const changeDate = (delta) => {
    const newDate = new Date(selectedDate);
    if (scheduleSubView === "daily") {
      newDate.setDate(newDate.getDate() + delta);
    } else {
      newDate.setMonth(newDate.getMonth() + delta);
    }
    setSelectedDate(newDate);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const getToastClasses = (type) => {
    switch (type) {
      case 'success': return 'bg-[#985f99] text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'info': return 'bg-[#D4AF87] text-[#985f99]';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };


  const handleSaveService = async (e) => {
  e.preventDefault();
  const trimmedName = serviceForm.name.trim();
  const trimmedCategory = serviceForm.category.trim();
  const trimmedDescription = serviceForm.description?.trim();
  if (!trimmedName) {
    showToast("error", "Name is required");
    return;
  }
  if (!trimmedCategory) {
    showToast("error", "Category is required");
    return;
  }
  const duration = parseInt(serviceForm.duration_minutes, 10);
  if (isNaN(duration) || duration <= 0) {
    showToast("error", "Duration must be a positive integer");
    return;
  }
  const priceValue = parseFloat(serviceForm.price);
  if (isNaN(priceValue) || priceValue <= 0) {
    showToast("error", "Price must be a positive number");
    return;
  }
  
  // Build payload, sending price as number; omit description if empty/null
  const payload = {
    name: trimmedName,
    category: trimmedCategory,
    duration_minutes: duration,
    price: priceValue, 
  };
  if (trimmedDescription) {
    payload.description = trimmedDescription;
  }
  
  console.log("Sending payload:", payload);
  
  try {
    let res;
    if (editingService) {
      res = await fetch(`/proxy-api/services/${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`/proxy-api/services/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    }
    
    console.log("Response status:", res.status);
    console.log("Response ok:", res.ok);
    
    if (!res.ok) {
      let errMessage = editingService ? "Failed to update service" : "Failed to create service";
      try {
        const errData = await res.json();
        console.error("Error response:", errData);
        errMessage = errData.detail || errData.message || errMessage;
      } catch (parseError) {
        console.error("Could not parse error response");
      }
      showToast("error", errMessage);
      return;
    }
    
    const updated = await res.json();
    console.log("Success response:", updated);
    console.log("Is array?", Array.isArray(updated));
    
    // Handle both single service and array response
    if (Array.isArray(updated)) {
      console.warn("Backend returned array instead of single service");
      console.log("Searching for service with name:", payload.name);
      
      const newService = updated.find(s => 
        s.name === payload.name && 
        s.category === payload.category &&
        (parseFloat(s.price) === payload.price || s.price === payload.price.toString()) &&
        s.duration_minutes === payload.duration_minutes
      );
      
      if (newService) {
        console.log("Found new service:", newService);
        setServices(updated.map(s => ({ ...s, price: parseFloat(s.price) })));
        showToast("success", editingService ? "Service updated" : "Service created");
      } else {
        console.error("Could not find newly created service in response");
        console.log("Attempting to refresh services list...");
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          const refreshRes = await fetch("/proxy-api/services/", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (refreshRes.ok) {
            const allServices = await refreshRes.json();
            console.log("Refreshed services count:", allServices.length);
            
            const foundAfterRefresh = allServices.find(s => 
              s.name === payload.name && 
              s.category === payload.category &&
              (parseFloat(s.price) === payload.price || s.price === payload.price.toString()) &&
              s.duration_minutes === payload.duration_minutes
            );
            
            if (foundAfterRefresh) {
              console.log("Service found after refresh:", foundAfterRefresh);
              setServices(allServices.map(s => ({ ...s, price: parseFloat(s.price) })));
              showToast("success", "Service created successfully");
            } else {
              console.error("Service still not found after refresh - backend may not have saved it");
              setServices(allServices.map(s => ({ ...s, price: parseFloat(s.price) })));
              showToast("error", "Service may not have been saved. Please check with backend team.");
            }
          }
        } catch (refreshError) {
          console.error("Failed to refresh services:", refreshError);
          showToast("error", "Could not verify service creation");
        }
      }
    } else {
      console.log("Single service returned:", updated);
      if (editingService) {
        setServices(prev => prev.map(s => s.id === updated.id ? { ...updated, price: parseFloat(updated.price) } : s));
        showToast("success", "Service updated");
      } else {
        setServices(prev => [...prev, { ...updated, price: parseFloat(updated.price) }]);
        showToast("success", "Service created");
      }
    }
    
    setShowEditServiceModal(false);
    setEditingService(null);
  } catch (err) {
    console.error("Exception during save:", err);
    showToast("error", editingService ? "Failed to update service" : "Failed to create service");
  }
};

  const handleSaveTech = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value,
      specialization: form.specialization.value || null,
      email: form.email.value,
    };
    if (!editingTech) {
      payload.password = form.password.value;
      payload.active_status = true;
    }
    try {
      let res;
      if (editingTech) {
        res = await fetch(`/proxy-api/agents/${editingTech.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/proxy-api/agents/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        let errMessage = editingTech ? "Failed to update technician" : "Failed to create technician";
        try {
          const errData = await res.json();
          errMessage = errData.message || errMessage;
        } catch {}
        showToast("error", errMessage);
        return;
      }
      const updated = await res.json();
      if (editingTech) {
        setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
        showToast("success", "Technician updated");
      } else {
        setTechnicians(prev => [...prev, updated]);
        showToast("success", "Technician created");
      }
      setShowEditTechModal(false);
    } catch {
      showToast("error", editingTech ? "Failed to update technician" : "Failed to create technician");
    }
  };

  const toggleTechStatus = async (tech) => {
    try {
      const res = await fetch(`/proxy-api/agents/${tech.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active_status: !tech.active_status }),
      });
      if (!res.ok) {
        let errMessage = "Failed to update status";
        try {
          const errData = await res.json();
          errMessage = errData.message || errMessage;
        } catch {}
        showToast("error", errMessage);
        return;
      }
      const updated = await res.json();
      setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
      showToast("success", `Technician ${updated.active_status ? "activated" : "deactivated"}`);
    } catch {
      showToast("error", "Failed to update status");
    }
  };

  const openAvailability = async (tech) => {
    try {
      const res = await fetch(`/proxy-api/agents/${tech.id}/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast("error", "Failed to load availability");
        return;
      }
      const data = await res.json();
      const availMap = {};
      data.availability.forEach(d => {
        availMap[d.day.toLowerCase()] = { start: d.start_time, end: d.end_time, available: d.is_available };
      });
      setAvailability(availMap);
      setAvailabilityTech(tech);
      setShowAvailabilityModal(true);
    } catch {
      showToast("error", "Failed to load availability");
    }
  };

  const saveAvailability = async () => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const payload = {
      availability: daysOrder.map(day => {
        const d = availability[day.toLowerCase()] || { available: false };
        return { day, start_time: d.available ? d.start || "09:00" : null, end_time: d.available ? d.end || "17:00" : null, is_available: d.available };
      }),
    };
    try {
      const res = await fetch(`/proxy-api/agents/${availabilityTech.id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errMessage = "Failed to save availability";
        try {
          const errData = await res.json();
          errMessage = errData.message || errMessage;
        } catch {}
        showToast("error", errMessage);
        return;
      }
      showToast("success", "Availability updated");
      setShowAvailabilityModal(false);
    } catch {
      showToast("error", "Failed to save availability");
    }
  };

  const openClientHistory = async (clientId) => {
    try {
      const res = await fetch(`/proxy-api/clients/${clientId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast("error", "Failed to load client history");
        return;
      }
      const data = await res.json();
      setClientHistory(data);
      setSelectedClient({ id: clientId });
    } catch {
      showToast("error", "Failed to load client history");
    }
  };

  const renderMonthlyCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const offset = (firstWeekday + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return (
      <div className="grid grid-cols-7 gap-2 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="font-bold text-[#985f99]">{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const count = monthlyCounts.counts?.[day] || 0;
          return (
            <div key={day} className="p-2 bg-[#f0ebe3] rounded-lg shadow">
              <span className="block">{day}</span>
              <span className="text-sm text-[#985f99]">{count} bookings</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="min-h-screen bg-[#F8F6F2] font-['Inter'] flex">

        {/* Sidebar – exactly the beautiful one you love */}
        <aside className={`fixed inset-y-0 left-0 w-72 bg-[#F8F6F2]/95 lg:bg-white/95 backdrop-blur-2xl shadow-2xl border-r border-[#D4AF87]/20 z-50 transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6 border-b border-[#D4AF87]/20 relative">
            <h1 className="text-3xl font-['Playfair_Display'] text-[#985f99]">Blackbird Spa</h1>
            <p className="text-[#6B5E50] mt-1 text-sm">Manager</p>
            <button className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-[#985f99]" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-7 h-7" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setViewMode("overview")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "overview" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <BarChart3 className="w-5 h-5" /> Overview
            </button>
            <button onClick={() => setViewMode("schedule")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "schedule" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <CalendarDays className="w-5 h-5" /> Schedule
            </button>
            <button onClick={() => setViewMode("revenue")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "revenue" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <TrendingUp className="w-5 h-5" /> Revenue Report
            </button>
            <button onClick={() => setViewMode("analytics")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "analytics" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <Star className="w-5 h-5" /> Analytics
            </button>
            <button onClick={() => setViewMode("technicians")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "technicians" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <UserCog className="w-5 h-5" /> Technicians
            </button>
            <button onClick={() => setViewMode("services")} className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 transition ${viewMode === "services" ? "bg-[#985f99] text-white shadow-lg" : "hover:bg-[#985f99]/5 text-[#985f99]"}`}>
              <Scissors className="w-5 h-5" /> Services
            </button>
          </nav>
          <div className="absolute bottom-0 w-full p-4 border-t border-[#D4AF87]/20">
            <button onClick={onLogout} className="w-full flex items-center gap-3 text-red-700 hover:bg-red-50 px-4 py-4 rounded-2xl transition">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

        <div className={`flex-1 ${isSidebarOpen ? 'ml-72' : ''}`}>
          <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-[#D4AF87]/20 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <button className="text-[#985f99] p-2" onClick={() => setIsSidebarOpen(prev => !prev)}>
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex-1 text-left px-4">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-['Playfair_Display'] text-[#985f99]">Hi, {user?.name || "Manager"}</h2>
                <p className="hidden sm:block text-[#6B5E50] text-sm sm:text-base lg:text-lg mt-1">
                  {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-8 bg-[#F8F6F2] min-h-screen">
            <div className="max-w-7xl mx-auto">
              {loading ? (
                <p className="text-center text-xl">Loading dashboard...</p>
              ) : (
                <>
                  {viewMode === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[#6B5E50] text-sm">Today's Revenue</p>
                            <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">R{formatCurrency(dailyStats.revenue)}</p>
                          </div>
                          <div className="w-12 h-12 bg-[#D4AF87]/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-[#D4AF87]">R</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[#6B5E50] text-sm">Bookings Today</p>
                            <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{dailyStats.bookings_count || 0}</p>
                          </div>
                          <CalendarDays className="w-12 h-12 text-[#D4AF87]" />
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#D4AF87]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[#6B5E50] text-sm">Occupancy Rate</p>
                            <p className="text-4xl font-['Playfair_Display'] text-[#985f99] mt-2">{dailyStats.occupancy_rate || 0}%</p>
                          </div>
                          <Users className="w-12 h-12 text-[#D4AF87]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {viewMode === "schedule" && (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Schedule</h3>
                        <select value={scheduleSubView} onChange={(e) => setScheduleSubView(e.target.value)} className="px-4 py-2 rounded-2xl border border-[#D4AF87]/30 bg-white/70 text-[#985f99]">
                          <option value="daily">Daily</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <SearchIcon className="w-5 h-5 text-[#6B5E50]" />
                          <input type="text" placeholder="Search client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 rounded-2xl border border-[#D4AF87]/30 bg-white/70 focus:outline-none text-[#985f99]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => changeDate(-1)} className="p-3 bg-[#f0ebe3] rounded-full hover:bg-[#D4AF87]/20"><ChevronLeft className="w-6 h-6 text-[#985f99]" /></button>
                          <span className="text-[#985f99] font-medium">
                            {scheduleSubView === "daily"
                              ? selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                              : selectedDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                          </span>
                          <button onClick={() => changeDate(1)} className="p-3 bg-[#f0ebe3] rounded-full hover:bg-[#D4AF87]/20"><ChevronRight className="w-6 h-6 text-[#985f99]" /></button>
                        </div>
                      </div>
                      {scheduleSubView === "daily" && (
                        <>
                          <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="mb-6 w-full max-w-xs px-4 py-3 rounded-2xl border border-[#D4AF87]/30 bg-white/70 backdrop-blur focus:outline-none text-[#985f99]">
                            <option value="">All Technicians</option>
                            {technicians.filter(t => t.active_status).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                            {filteredBookings.length === 0 ? (
                              <p className="text-center text-xl text-[#6B5E50] py-20">No bookings today</p>
                            ) : (
                              <div className="space-y-6">
                                {filteredBookings.map(booking => (
                                  <div key={booking.id} className={`p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md border-l-8 ${booking.status === "confirmed" ? "border-[#985f99]" : "border-orange-500"}`}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-2xl font-['Playfair_Display'] text-[#985f99]">{booking.start_time?.slice(11, 16)}</p>
                                        <p className="text-lg font-medium text-[#985f99] mt-1 cursor-pointer hover:underline" onClick={() => openClientHistory(booking.client.id)}>
                                          {booking.client.name}
                                        </p>
                                        <p className="text-[#6B5E50] mt-2">{booking.services.map(s => s.name).join(" + ")}</p>
                                        <p className="text-sm text-[#6B5E50] mt-1">with {booking.agent?.name} • {booking.status}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-[#D4AF87]">R{formatCurrency(booking.total_price)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {scheduleSubView === "monthly" && (
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                          {renderMonthlyCalendar()}
                        </div>
                      )}
                    </>
                  )}

                  {viewMode === "revenue" && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                      <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Revenue Report</h3>
                      <div className="p-6 bg-[#985f99]/10 rounded-3xl">
                        <p className="text-xl font-medium text-[#985f99]">Today</p>
                        <p className="text-4xl font-['Playfair_Display'] text-[#D4AF87] mt-2">R{formatCurrency(dailyStats.revenue)}</p>
                        <p className="text-sm text-[#6B5E50] mt-2">{dailyStats.bookings_count || 0} bookings • {dailyStats.occupancy_rate || 0}% occupancy</p>
                      </div>
                      {weeklyRevenue && (
                        <div className="mt-6 p-6 bg-[#D4AF87]/10 rounded-3xl">
                          <p className="text-xl font-medium text-[#985f99]">This Week</p>
                          <p className="text-4xl font-['Playfair_Display'] text-[#D4AF87] mt-2">R{formatCurrency(weeklyRevenue.revenue)}</p>
                          <p className="text-sm text-[#6B5E50] mt-2">{weeklyRevenue.bookings_count} bookings</p>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === "analytics" && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                      <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">Business Analytics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-[#985f99]/10 rounded-3xl">
                          <p className="text-xl font-medium text-[#985f99]">Most Visited Client (Week)</p>
                          {topWeeklyClient ? (
                            <>
                              <p className="text-3xl font-['Playfair_Display'] text-[#D4AF87] mt-2">{topWeeklyClient.name}</p>
                              <p className="text-sm text-[#6B5E50] mt-2">{topWeeklyClient.visits} visits</p>
                            </>
                          ) : (
                            <p className="text-sm text-[#6B5E50] mt-2">No data</p>
                          )}
                        </div>
                        <div className="p-6 bg-[#D4AF87]/10 rounded-3xl">
                          <p className="text-xl font-medium text-[#985f99]">Most Visited Client (Month)</p>
                          {topMonthlyClient ? (
                            <>
                              <p className="text-3xl font-['Playfair_Display'] text-[#D4AF87] mt-2">{topMonthlyClient.name}</p>
                              <p className="text-sm text-[#6B5E50] mt-2">{topMonthlyClient.visits} visits</p>
                            </>
                          ) : (
                            <p className="text-sm text-[#6B5E50] mt-2">No data</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-8">
                        <h4 className="text-xl font-medium text-[#6B5E50] mb-4">Top Performing Technicians (Month)</h4>
                        <div className="space-y-4">
                          {topTechnicians.length > 0 ? topTechnicians.map((tech, index) => (
                            <div key={tech.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <span className="text-2xl font-bold text-[#D4AF87]">{index + 1}</span>
                                <div>
                                  <p className="text-lg font-medium text-[#985f99]">{tech.name}</p>
                                  <p className="text-sm text-[#6B5E50]">{tech.bookings} bookings • R{formatCurrency(tech.revenue)}</p>
                                </div>
                              </div>
                              <Star className="w-6 h-6 text-[#D4AF87]" />
                            </div>
                          )) : (
                            <p className="text-center text-[#6B5E50]">No data available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {viewMode === "technicians" && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Technicians</h3>
                        <button onClick={() => { setEditingTech(null); setShowEditTechModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#985f99] text-white rounded-2xl hover:bg-[#985f99]/90">
                          <Plus className="w-5 h-5" /> Add Technician
                        </button>
                      </div>
                      <div className="space-y-4">
                        {technicians.map(tech => (
                          <div key={tech.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full ${tech.active_status ? "bg-green-500" : "bg-red-500"}`} />
                              <div>
                                <p className="text-lg font-medium text-[#985f99]">{tech.name}</p>
                                <p className="text-sm text-[#6B5E50]">{tech.email} • {tech.specialization || "General"}</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => { setEditingTech(tech); setShowEditTechModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20">
                                <Edit3 className="w-5 h-5 text-[#985f99]" />
                              </button>
                              <button onClick={() => toggleTechStatus(tech)} className="p-3 bg-red-100 rounded-xl hover:bg-red-200">
                                {tech.active_status ? <UserX className="w-5 h-5 text-red-600" /> : <Check className="w-5 h-5 text-green-600" />}
                              </button>
                              <button onClick={() => openAvailability(tech)} className="px-4 py-2 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20 text-[#985f99] text-sm">
                                Availability
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewMode === "services" && (
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#D4AF87]/20 p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99]">Services</h3>
                        <button onClick={() => { setEditingService(null); setShowEditServiceModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#985f99] text-white rounded-2xl hover:bg-[#985f99]/90">
                          <Plus className="w-5 h-5" /> Add Service
                        </button>
                      </div>
                      {Object.entries(services.reduce((acc, s) => {
                        const cat = s.category || "General";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(s);
                        return acc;
                      }, {})).map(([category, items]) => (
                        <div key={category} className="mb-8">
                          <h4 className="text-xl font-medium text-[#6B5E50] mb-4">{category}</h4>
                          <div className="space-y-4">
                            {items.map(service => (
                              <div key={service.id} className="p-6 rounded-3xl bg-gradient-to-r from-white to-[#f0ebe3]/50 shadow-md flex justify-between items-center">
                                <div>
                                  <p className="text-lg font-medium text-[#985f99]">{service.name}</p>
                                  <p className="text-sm text-[#6B5E50]">R{formatCurrency(service.price)} • {service.duration_minutes} min</p>
                                </div>
                                <button onClick={() => { setEditingService(service); setShowEditServiceModal(true); }} className="p-3 bg-[#985f99]/10 rounded-xl hover:bg-[#985f99]/20">
                                  <Edit3 className="w-5 h-5 text-[#985f99]" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {/* Toast – always visible */}
        {toast && (
          <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-xl ${getToastClasses(toast.type)} z-50 flex items-center gap-4`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)}><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* All 4 modals – complete and working */}
        {selectedClient && clientHistory && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{clientHistory.client_name} History</h3>
              <div className="space-y-4">
                <p className="text-[#6B5E50] text-lg">Total Spent: <span className="font-bold text-[#D4AF87]">R{formatCurrency(clientHistory.total_spent)}</span></p>
                <p className="text-[#6B5E50] text-lg">Visits: <span className="font-bold">{clientHistory.visits_count}</span></p>
                <p className="text-[#6B5E50] text-lg">Favorite: <span className="font-bold">{clientHistory.favorite_service}</span></p>
                <p className="text-[#6B5E50] text-lg">Last Visit: <span className="font-bold">{new Date(clientHistory.last_visit).toLocaleDateString()}</span></p>
              </div>
              <button onClick={() => { setSelectedClient(null); setClientHistory(null); }} className="mt-8 w-full py-4 bg-[#985f99] text-white rounded-2xl hover:bg-[#985f99]/90 transition font-medium">
                Close
              </button>
            </div>
          </div>
        )}

        {showEditTechModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{editingTech ? "Edit" : "Add"} Technician</h3>
              <form onSubmit={handleSaveTech}>
                <input name="name" defaultValue={editingTech?.name || ""} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" placeholder="Name" />
                <input name="email" type="email" defaultValue={editingTech?.email || ""} required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" placeholder="Email" />
                <input name="specialization" defaultValue={editingTech?.specialization || ""} className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" placeholder="Specialization" />
                {!editingTech && (
                  <input name="password" type="password" required className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30" placeholder="Password" />
                )}
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowEditTechModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditServiceModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{editingService ? "Edit" : "Add"} Service</h3>
              <form onSubmit={handleSaveService}>
                <input
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30"
                  placeholder="Name"
                />
                <input
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                  className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30"
                  placeholder="Category"
                />
                <input
                  type="number"
                  value={serviceForm.duration_minutes}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  required
                  className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30"
                  placeholder="Duration (minutes)"
                />
                <input
                  type="number"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                  className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30"
                  placeholder="Price"
                />
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mb-4 p-3 rounded-2xl border border-[#D4AF87]/30"
                  placeholder="Description"
                />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowEditServiceModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAvailabilityModal && availabilityTech && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-['Playfair_Display'] text-[#985f99] mb-6">{availabilityTech.name} Weekly Availability</h3>
              <div className="space-y-4">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                  const key = day.toLowerCase();
                  const dayData = availability[key] || { available: true, start: "09:00", end: "17:00" };
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={dayData.available}
                        onChange={() => setAvailability(prev => ({ ...prev, [key]: { ...prev[key], available: !dayData.available } }))}
                        className="w-6 h-6"
                      />
                      <span className="w-32 font-medium text-[#985f99]">{day}</span>
                      {dayData.available ? (
                        <>
                          <input type="time" value={dayData.start || "09:00"} onChange={e => setAvailability(prev => ({ ...prev, [key]: { ...prev[key], start: e.target.value } }))} className="px-3 py-2 border rounded-lg" />
                          <span>to</span>
                          <input type="time" value={dayData.end || "17:00"} onChange={e => setAvailability(prev => ({ ...prev, [key]: { ...prev[key], end: e.target.value } }))} className="px-3 py-2 border rounded-lg" />
                        </>
                      ) : (
                        <span className="text-gray-500">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowAvailabilityModal(false)} className="flex-1 py-3 border border-[#D4AF87] rounded-2xl text-[#985f99]">Cancel</button>
                <button onClick={saveAvailability} className="flex-1 py-3 bg-[#985f99] text-white rounded-2xl">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}