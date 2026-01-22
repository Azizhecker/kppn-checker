'use client';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Send, MapPin, User, AlertCircle, Loader2 } from 'lucide-react';

function ChecklistFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // 1. TANGKAP NAMA DARI WEBSITE ABSENSI (STRATEGI 1)
  useEffect(() => {
    fetchLocations();
    
    // Ambil parameter ?worker=...
    const nameFromUrl = searchParams.get('worker');
    if (nameFromUrl) {
      setWorkerName(nameFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // 2. AMBIL DAFTAR LOKASI UNTUK DIPILIH MANUAL
  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  }

  // 3. FILTER TUGAS BERDASARKAN LOKASI YANG DIPILIH MANUAL
  useEffect(() => {
    if (selectedLocation) {
      fetchFilteredTasks();
    } else {
      setTasks([]); 
    }
  }, [selectedLocation, locations]);

  async function fetchFilteredTasks() {
  const loc = locations.find(l => l.id === selectedLocation);
  if (!loc) return;

  // Mengambil tugas yang kategorinya SAMA dengan tipe lokasi 
  // ATAU yang kategorinya adalah 'umum' (tugas wajib semua ruangan)
  const { data: tsks } = await supabase
    .from('task_templates')
    .select('*')
    .in('category', [loc.type, 'umum']); // loc.type akan berisi kategori apa pun yang anda buat

  if (tsks) {
    setTasks(tsks);
    setCheckedIds([]); 
  }
}

  const handleCheckAll = () => {
    if (checkedIds.length === tasks.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(tasks.map(t => t.id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedLocation) return alert("Pilih Lokasi Ruangan!");
    if (!workerName) return alert("Identitas petugas tidak ditemukan! Silahkan masuk melalui web absensi.");
    if (checkedIds.length === 0) return alert("Centang minimal satu tugas!");

    setLoading(true);
    try {
      const { data: log, error: logError } = await supabase
        .from('checklist_logs')
        .insert([{ 
          location_id: selectedLocation, 
          worker_name: workerName.toUpperCase(), 
          status: 'Diserahkan',
          notes: notes 
        }])
        .select().single();

      if (logError) throw logError;

      const details = tasks.map(t => ({
        log_id: log.id,
        task_id: t.id,
        is_completed: checkedIds.includes(t.id)
      }));

      const { error: itemError } = await supabase.from('checklist_items').insert(details);
      if (itemError) throw itemError;

      alert("Laporan Berhasil Terkirim!");
      router.push('/dashboard-cs');
    } catch (err) {
      alert("Gagal mengirim laporan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-black text-[#003366] uppercase italic mb-6">Formulir Kebersihan</h1>

      {/* 1. Nama Petugas - OTOMATIS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4 border-l-4 border-l-blue-500">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
          <User size={12}/> Nama Petugas
        </label>
        <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-black text-xs">CS</div>
          <span className="font-black text-slate-700">{workerName || "Mencari Nama..."}</span>
        </div>
        <p className="text-[9px] text-blue-500 font-bold mt-2 uppercase italic tracking-tighter">
          ✓ Terkoneksi dengan Sistem Absensi
        </p>
      </div>

      {/* 2. Pemilihan Lokasi - MANUAL */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
          <MapPin size={12}/> Pilih Ruangan
        </label>
        <select 
          className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all text-slate-700 appearance-none cursor-pointer"
          onChange={(e) => setSelectedLocation(e.target.value)}
          value={selectedLocation}
        >
          <option value="">-- Klik Untuk Memilih --</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {selectedLocation && (
        <>
          {/* Daftar Checklist */}
          <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden mb-4">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kelengkapan</h3>
              <button 
                onClick={handleCheckAll}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-all"
              >
                {checkedIds.length === tasks.length ? 'BATAL SEMUA' : 'PILIH SEMUA'}
              </button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center p-10 gap-2">
                <Loader2 className="animate-spin text-blue-500" size={20}/>
                <p className="text-xs font-bold text-slate-300 italic">Memuat tugas...</p>
              </div>
            ) : tasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => setCheckedIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
                className="flex items-center p-5 border-b last:border-0 cursor-pointer active:bg-blue-50"
              >
                <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${checkedIds.includes(task.id) ? 'bg-green-500 border-green-500 shadow-lg' : 'border-slate-200'}`}>
                  {checkedIds.includes(task.id) && <CheckCircle2 size={18} className="text-white" />}
                </div>
                <span className={`ml-4 font-bold text-sm ${checkedIds.includes(task.id) ? 'text-slate-900' : 'text-slate-400'}`}>
                  {task.task_name}
                </span>
              </div>
            ))}
          </div>

          {/* Catatan */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border mb-8">
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
              <AlertCircle size={12}/> Catatan/Keterangan
            </label>
            <textarea 
              className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none text-slate-700 min-h-[80px] text-sm border-2 border-transparent focus:border-blue-100 transition-all"
              placeholder="Isi jika ada kerusakan atau pesan tertentu..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </>
      )}

      {/* Tombol Kirim */}
      <button 
        disabled={loading || !selectedLocation || !workerName}
        onClick={handleSubmit}
        className={`w-full py-5 text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${(!selectedLocation || !workerName) ? 'bg-slate-300' : 'bg-[#003366]'}`}
      >
        {loading ? 'MENGIRIM...' : 'KIRIM LAPORAN SEKARANG'}
        <Send size={18} />
      </button>
    </div>
  );
}

export default function ChecklistManualPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-10">
      <Suspense fallback={<div className="flex justify-center p-20 font-black italic opacity-20 uppercase tracking-widest text-xs">Inisialisasi Form...</div>}>
        <ChecklistFormContent />
      </Suspense>
    </div>
  );
}