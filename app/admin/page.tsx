'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import QRCode from "react-qr-code";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Check, X, ClipboardList, LayoutDashboard, 
  MapPin, ListChecks, Trash2, LogOut, ChevronRight, 
  CheckCircle2, Download, User, CheckSquare, Tags, PlusCircle,
  Filter, Briefcase, ShieldCheck, Clock, MessageSquare, ExternalLink, AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'locations' | 'tasks' | 'categories'>('overview');
  const [locations, setLocations] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [categories, setCategories] = useState<string[]>(['umum', 'toilet']);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [filterType, setFilterType] = useState<'daily' | 'monthly'>('daily');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  // State ID dikosongkan karena akan diisi otomatis sistem
  const [newLoc, setNewLoc] = useState({ id: '', name: '', type: 'umum' });
  const [newTask, setNewTask] = useState({ name: '', category: 'umum' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monitoring') fetchLogs();
  }, [activeTab, filterDate, filterMonth, filterType]);

async function fetchData() {
    setIsLoading(true);
    
    // 1. Ambil Data Lokasi & Task
    const { data: locs } = await supabase.from('locations').select('*').order('name');
    const { data: tsks } = await supabase.from('task_templates').select('*').order('category');
    
    setLocations(locs || []);
    setAllTasks(tsks || []);

    // 2. Ambil Logs KHUSUS HARI INI untuk keperluan Dashboard/Overview
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase
      .from('checklist_logs')
      .select('location_id, status')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      // Hanya anggap bersih jika statusnya DISETUJUI atau Diserahkan
      .in('status', ['DISETUJUI', 'Diserahkan']);

    setLogs(todayLogs || []); // Isi logs dengan data hari ini

    // 3. Kelola Kategori
    const dbCategoriesFromTasks = tsks?.map(t => t.category.toLowerCase()) || [];
    const dbCategoriesFromLocs = locs?.map(l => l.type.toLowerCase()) || [];
    const combined = Array.from(new Set(['umum', 'toilet', ...dbCategoriesFromTasks, ...dbCategoriesFromLocs]));
    setCategories(combined);
    
    setIsLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // --- FUNGSI MONITORING ---
  async function fetchLogs() {
    let query = supabase
      .from('checklist_logs')
      .select(`
        *,
        locations(name),
        checklist_items(
          is_completed, 
          task_templates(task_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (filterType === 'daily') {
      query = query.gte('created_at', `${filterDate}T00:00:00`).lte('created_at', `${filterDate}T23:59:59`);
    } else {
      const year = filterMonth.split('-')[0];
      const month = filterMonth.split('-')[1];
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      query = query.gte('created_at', `${filterMonth}-01T00:00:00`).lte('created_at', `${filterMonth}-${lastDay}T23:59:59`);
    }

    const { data } = await query;
    setLogs(data || []);
  }

  const handleApprove = async (logId: string) => {
      const { error } = await supabase.from('checklist_logs').update({ status: 'DISETUJUI' }).eq('id', logId);
      if (!error) {
        // Panggil fetchData agar state 'logs' terupdate dan Dashboard ikut berubah
        fetchData(); 
        if (activeTab === 'monitoring') fetchLogs();
      }
    };

  const handleApproveAll = async () => {
    const pendingLogs = logs.filter(l => l.status !== 'DISETUJUI').map(l => l.id);
    if (pendingLogs.length === 0) return alert("Semua data sudah disetujui.");
    if (confirm(`Setujui ${pendingLogs.length} laporan sekaligus?`)) {
      const { error } = await supabase.from('checklist_logs').update({ status: 'DISETUJUI' }).in('id', pendingLogs);
      if (!error) fetchLogs();
    }
  };

const exportToExcel = () => {
  const reportData = logs.map(log => {
    // Ambil string waktu murni dari DB
    const rawDate = log.created_at ? log.created_at.replace('T', ' ').split('.')[0] : '-';
    
    return {
      'Tanggal & Waktu': rawDate, // Akan muncul sesuai teks di database
      'Lokasi': log.locations?.name,
      'Petugas': log.worker_name,
      'Status': log.status || 'PENDING',
      'Keterangan': log.notes || '-'
    };
  });
  
  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  XLSX.writeFile(workbook, `Laporan_Kebersihan_${filterDate}.xlsx`);
};

  // --- FUNGSI LOKASI (DENGAN ID OTOMATIS) ---
  const handleAddLocation = async () => {
    if (!newLoc.name) return alert("Nama Ruangan wajib diisi!");
    
    // GENERATE ID OTOMATIS: Gabungan LOC + 4 Angka Terakhir Waktu Sekarang
    const generatedId = `LOC-${Date.now().toString().slice(-4)}`;
    
    const { error } = await supabase.from('locations').insert([{ 
      id: generatedId.toUpperCase(), 
      name: newLoc.name, 
      type: newLoc.type 
    }]);

    if (error) alert(error.message);
    else { 
      setNewLoc({ id: '', name: '', type: 'umum' }); 
      fetchData(); 
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (confirm('Hapus data lokasi ini?')) {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) alert("Error: " + error.message);
      else fetchData();
    }
  };

  const downloadQR = (locId: string, locName: string) => {
    const svg = document.getElementById(`qr-${locId}`) as HTMLElement;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 300; canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 22, 40, 256, 256);
        ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#002B5B"; ctx.textAlign = "center";
        ctx.fillText(locName.toUpperCase(), canvas.width / 2, 340);
      }
      const link = document.createElement("a");
      link.download = `QR_${locName}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleAddTask = async () => {
    if (!newTask.name) return alert("Deskripsi wajib diisi!");
    const { error } = await supabase.from('task_templates').insert([{ task_name: newTask.name, category: newTask.category }]);
    if (error) alert(error.message);
    else { setNewTask({ name: '', category: 'umum' }); fetchData(); }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Hapus item pekerjaan ini?')) {
      const { error } = await supabase.from('task_templates').delete().eq('id', id);
      if (error) alert("Error: " + error.message);
      else fetchData();
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    const formattedCat = newCategoryName.toLowerCase().trim();
    if (!categories.includes(formattedCat)) {
      setCategories([...categories, formattedCat]);
      setNewCategoryName('');
    }
  };

const handleReject = async (logId: string, workerName: string, roomName: string) => {
    // Pesan konfirmasi cukup untuk internal admin saja
    if (!confirm(`Tolak laporan dari ${workerName} di ${roomName}? CS harus mengisi ulang.`)) return;
    
    const { error } = await supabase
      .from('checklist_logs')
      .update({ status: 'DITOLAK' })
      .eq('id', logId);

    if (!error) {
      // HAPUS bagian window.open(...)
      // Cukup panggil fetchLogs untuk memperbarui tampilan tabel
      fetchLogs();
    }
  };

const getUncleanedRooms = () => {
    // Ambil semua ID lokasi yang SUDAH dibersihkan hari ini (berdasarkan logs yang di-fetch)
    const cleanedLocationIds = logs.map(log => log.location_id);
    
    // Filter lokasi yang ID-nya TIDAK ADA di dalam daftar cleanedLocationIds
    return locations.filter(loc => !cleanedLocationIds.includes(loc.id));
  };

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col md:flex-row font-sans text-slate-700 text-sm">
      {/* Sidebar Kedinasan */}
      <aside className="w-full md:w-64 bg-[#002B5B] text-white flex flex-col shadow-xl z-20 border-r-4 border-[#E9C46A]">
        <div className="p-6 border-b border-white/10 bg-[#001F41]">
          <div className="flex items-center gap-3">
            <div className="bg-[#E9C46A] p-2 rounded-lg">
              <ShieldCheck size={20} className="text-[#002B5B]" />
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-tighter">E-CHECKLIST</h1>
              <p className="text-[9px] font-bold text-white/60 tracking-widest uppercase">KPPN Lhokseumawe</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1 flex-1">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'monitoring', label: 'Data Kebersihan', icon: CheckCircle2 },
            { id: 'categories', label: 'Kelola Kategori', icon: Tags },
            { id: 'locations', label: 'Kelola Ruangan', icon: MapPin },
            { id: 'tasks', label: 'Master Task', icon: ListChecks },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs transition-all uppercase tracking-wider ${activeTab === item.id ? 'bg-[#E9C46A] text-[#002B5B] shadow-lg' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
              <item.icon size={16}/> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 font-bold text-xs hover:bg-red-500/10 rounded-lg transition-all uppercase tracking-wider">
            <LogOut size={16}/> Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden text-center">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <h2 className="text-lg font-black text-[#002B5B] uppercase tracking-tight italic">
            {activeTab === 'overview' && "Ringkasan Eksekutif"}
            {activeTab === 'monitoring' && "Laporan Kebersihan Harian"}
            {activeTab === 'locations' && "Daftar Inventaris Ruangan"}
            {activeTab === 'tasks' && "Daftar Item Pekerjaan"}
            {activeTab === 'categories' && "Klasifikasi Kategori"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* TAB MONITORING */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between font-bold">
                 <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400"/>
                    <select value={filterType} onChange={(e:any) => setFilterType(e.target.value)} className="text-[11px] uppercase border p-1 rounded cursor-pointer">
                      <option value="daily">Harian</option>
                      <option value="monthly">Bulanan</option>
                    </select>
                    <input type={filterType === 'daily' ? "date" : "month"} value={filterType === 'daily' ? filterDate : filterMonth} onChange={(e) => filterType === 'daily' ? setFilterDate(e.target.value) : setFilterMonth(e.target.value)} className="text-[11px] border rounded p-1 font-black"/>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={handleApproveAll} className="flex items-center gap-2 bg-[#E9C46A] text-[#002B5B] px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-sm">
                        <CheckSquare size={14}/> Approve All
                    </button>
                    <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#2A9D8F] text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-sm">
                        <Download size={14}/> Export Excel
                    </button>
                 </div>
              </div>

              <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                <table className="w-full text-center">
                  <thead>
                    <tr className="bg-[#002B5B] text-white uppercase text-[10px] tracking-widest">
                      <th className="p-4 w-12 border-r border-white/10">No</th>
                      <th className="p-4 border-r border-white/10">Lokasi & Petugas</th>
                      <th className="p-4 border-r border-white/10">Waktu Ceklist</th>
                      <th className="p-4 border-r border-white/10">Hasil Pekerjaan</th>
                      <th className="p-4 border-r border-white/10">Catatan CS</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-400 text-xs">{index + 1}</td>
                        <td className="p-4 text-left pl-6">
                          <p className="font-black text-[#002B5B] text-xs uppercase">{log.locations?.name}</p>
                          <p className="text-[10px] font-bold text-blue-500 uppercase mt-1 italic">Oleh: {log.worker_name || 'Petugas'}</p>
                        </td>
                        <td className="p-4">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-600">
                                <Clock size={12} className="text-slate-400"/>
                                {log.created_at ? (
                                    (() => {
                                        // log.created_at formatnya: "2026-01-30T14:30:00+00:00" atau "2026-01-30T14:30:00"
                                        // Kita ambil cuma tanggal dan jam depannya saja
                                        const tSep = log.created_at.split('T');
                                        const datePart = tSep[0]; // 2026-01-30
                                        const timePart = tSep[1].substring(0, 5); // 14:30
                                        
                                        const [y, m, d] = datePart.split('-');
                                        return `${d}/${m}/${y} ${timePart}`;
                                    })()
                                ) : '-'}
                            </div>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-wrap justify-center gap-1">
                              {log.checklist_items?.map((item: any, idx: number) => (
                                <span key={idx} className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${item.is_completed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {item.task_templates?.task_name}
                                </span>
                              ))}
                           </div>
                        </td>
                        <td className="p-4">
                            {log.notes ? (
                                <div className="flex items-center justify-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 p-2 rounded border border-orange-100 italic">
                                    <MessageSquare size={12}/> {log.notes}
                                </div>
                            ) : <span className="text-slate-300 text-[10px] italic">Tidak ada catatan</span>}
                        </td>
                        <td className="p-4">
                          {log.status === 'DISETUJUI' ? (
                            <div className="flex items-center justify-center gap-1 text-green-600 font-black text-[10px] uppercase">
                              <CheckCircle2 size={14}/> Valid
                            </div>
                          ) : log.status === 'DITOLAK' ? (
                            <div className="flex items-center justify-center gap-1 text-red-500 font-black text-[10px] uppercase border border-red-200 bg-red-50 p-1 rounded">
                              <X size={14}/> Ditolak
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button 
                                onClick={() => handleApprove(log.id)} 
                                className="bg-[#2A9D8F] text-white px-2 py-1 rounded font-black text-[9px] uppercase hover:brightness-110 shadow-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReject(log.id, log.worker_name, log.locations?.name)} 
                                className="bg-red-500 text-white px-2 py-1 rounded font-black text-[9px] uppercase hover:brightness-110 shadow-sm"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </td> 
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB LOCATIONS */}
          {activeTab === 'locations' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
              <div className="bg-[#002B5B] p-6 rounded-lg shadow-md text-white font-bold border-b-4 border-[#E9C46A]">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4 italic text-left">Pendaftaran Ruangan Baru (ID Dibuat Otomatis)</p>
                <div className="flex gap-4">
                  <input placeholder="Ketik Nama Ruangan Baru..." value={newLoc.name} onChange={e=>setNewLoc({...newLoc, name: e.target.value})} className="flex-1 bg-white/10 border border-white/20 p-3 rounded text-sm font-bold outline-none focus:bg-white focus:text-[#002B5B] uppercase transition-all placeholder:text-white/30 text-white"/>
                  <select value={newLoc.type} onChange={e=>setNewLoc({...newLoc, type: e.target.value})} className="w-56 bg-white/10 border border-white/20 p-3 rounded text-sm font-bold outline-none uppercase text-white cursor-pointer">
                    {categories.map(cat => <option key={cat} value={cat} className="text-slate-800 font-bold">{cat}</option>)}
                  </select>
                  <button onClick={handleAddLocation} className="bg-[#E9C46A] text-[#002B5B] px-8 rounded font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg">Daftarkan Ruangan</button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 p-4 bg-slate-50 border-b border-slate-200 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">
                  <div className="col-span-5 text-left">Deskripsi Ruangan</div>
                  <div className="col-span-3">Klasifikasi</div>
                  <div className="col-span-4">Opsi Kontrol</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {locations.map(loc => (
                    <div key={loc.id} className="grid grid-cols-12 p-4 items-center hover:bg-[#F0F7FF] transition-all border-l-4 border-transparent hover:border-[#002B5B]">
                      <div className="col-span-5 flex items-center gap-3">
                        <MapPin size={16} className="text-slate-300"/>
                        <div className="text-left uppercase">
                            <span className="font-black text-xs text-[#002B5B] block">{loc.name}</span>
                            <span className="text-[9px] font-bold text-slate-400">ID: {loc.id}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">{loc.type}</span>
                      </div>
                      <div className="col-span-4 flex justify-center gap-2">
                        <button onClick={() => window.open(`/monitoring?loc=${loc.id}`, '_blank')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <ExternalLink size={14}/> Cek Monitoring
                        </button>
                        <button onClick={() => downloadQR(loc.id, loc.name)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-[#002B5B] hover:text-white transition-all"><Download size={14}/> Cetak QR</button>
                        <button onClick={() => handleDeleteLocation(loc.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                      </div>
                      <div className="hidden"><QRCode id={`qr-${loc.id}`} value={`${typeof window !== 'undefined' ? window.location.origin : ''}/monitoring?loc=${loc.id}`} size={256}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <p className="text-[11px] font-black text-slate-400 uppercase mb-4 tracking-widest text-left">Klasifikasi Kategori Baru</p>
                <div className="flex gap-2">
                  <input placeholder="Ketik nama kategori..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 border border-slate-200 p-3 rounded text-sm font-bold outline-none focus:border-[#002B5B] uppercase"/>
                  <button onClick={handleAddCategory} className="bg-[#002B5B] text-white px-6 rounded font-black text-xs uppercase tracking-widest hover:bg-[#001F41]">Simpan</button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-left">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">
                  <span>Nama Klasifikasi</span>
                  <span>Aksi</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50/50">
                      <div className="flex items-center gap-3 uppercase font-black text-xs text-[#002B5B]">
                        <div className="w-1.5 h-6 rounded bg-[#E9C46A]"></div>
                        {cat}
                      </div>
                      <button className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB TASKS */}
          {activeTab === 'tasks' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 font-bold text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Master Item Pekerjaan CS</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input placeholder="Contoh: Menyapu dan Pel Lantai..." value={newTask.name} onChange={e=>setNewTask({...newTask, name: e.target.value})} className="flex-1 border border-slate-200 p-3 rounded text-sm font-bold outline-none focus:border-[#002B5B] uppercase shadow-inner bg-slate-50"/>
                  <select value={newTask.category} onChange={e=>setNewTask({...newTask, category: e.target.value})} className="w-full md:w-56 border border-slate-200 p-3 rounded text-sm font-bold outline-none uppercase bg-slate-50">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button onClick={handleAddTask} className="bg-[#002B5B] text-white px-8 py-3 rounded font-black text-xs uppercase tracking-widest hover:brightness-110 shadow-lg">Tambahkan</button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
                <div className="grid grid-cols-12 p-4 bg-[#F8FAFC] border-b border-slate-200 font-black text-[10px] text-[#002B5B] uppercase tracking-widest">
                  <div className="col-span-6 text-left pl-4">Uraian Tugas Pekerjaan</div>
                  <div className="col-span-4">Kategori</div>
                  <div className="col-span-2">Aksi</div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {allTasks.map(t => (
                    <div key={t.id} className="grid grid-cols-12 p-4 items-center hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-[#E9C46A]">
                      <div className="col-span-6 flex items-center gap-3">
                         <Briefcase size={14} className="text-[#002B5B]"/>
                         <span className="font-bold text-[11px] uppercase text-left">{t.task_name}</span>
                      </div>
                      <div className="col-span-4 font-black text-[9px] text-green-600 uppercase italic tracking-widest">{t.category}</div>
                      <div className="col-span-2">
                         <button onClick={() => handleDeleteTask(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              {/* BARIS CARD ATAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-xl border-l-8 border-[#002B5B] shadow-sm text-left">
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Total Unit Lokasi</p>
                  <h3 className="text-4xl font-black text-[#002B5B] italic leading-none">{locations.length} <span className="text-xs">Titik</span></h3>
                </div>
                <div className="bg-white p-8 rounded-xl border-l-8 border-[#E9C46A] shadow-sm text-left">
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Standar Pekerjaan</p>
                  <h3 className="text-4xl font-black text-[#002B5B] italic leading-none">{allTasks.length} <span className="text-xs">Items</span></h3>
                </div>
                <div className="bg-[#002B5B] p-8 rounded-xl shadow-lg relative overflow-hidden group">
                  <h3 className="text-white font-black text-lg italic uppercase leading-none mb-1 text-left">Database Live</h3>
                  <div className="mt-8 flex items-center gap-2 text-[#E9C46A] text-[10px] font-black uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-[#E9C46A] animate-pulse"></div>
                    Sistem Online • 2026
                  </div>
                </div>
              </div>

              {/* TAMPILAN MONITORING REAL-TIME HARI INI */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-left">
                <div className="p-4 bg-[#002B5B] text-white flex justify-between items-center">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={16} className="text-[#E9C46A]"/> Ruangan Belum Dibersihkan (Hari Ini)
                  </h3>
                  <span className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black italic">
                    {getUncleanedRooms().length} LOKASI LAGI
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getUncleanedRooms().length > 0 ? (
                    getUncleanedRooms().map(loc => (
                      <div key={loc.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <div className="p-2 bg-white rounded shadow-sm text-red-500">
                          <MapPin size={16}/>
                        </div>
                        <div>
                          <p className="font-black text-[#002B5B] text-[11px] uppercase">{loc.name}</p>
                          <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter italic">Belum Ada Laporan Valid</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center">
                      <CheckCircle2 size={40} className="mx-auto text-green-500 mb-2 opacity-20"/>
                      <p className="font-black text-slate-300 uppercase italic">Semua ruangan telah dibersihkan!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}