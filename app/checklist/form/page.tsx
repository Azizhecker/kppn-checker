'use client';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Send, MapPin, User, AlertCircle, Loader2, Calendar } from 'lucide-react';

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

  const [isManualDate, setIsManualDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Ambil Lokasi
  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  // 2. Ambil Tugas berdasarkan Lokasi
  const fetchFilteredTasks = async (locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return;

    let query = supabase.from('task_templates').select('*');
    if (loc.type === 'toilet') {
      query = query.in('category', ['toilet']);
    } else {
      query = query.eq('category', loc.type);
    }

    const { data: tsks } = await query;
    if (tsks) {
      setTasks(tsks);
      setCheckedIds([]); 
    }
  };

  // 3. Logika Inisialisasi
  useEffect(() => {
    fetchLocations();
    
    const nameFromUrl = searchParams.get('worker');
    if (nameFromUrl) {
      const formattedName = decodeURIComponent(nameFromUrl).toUpperCase();
      setWorkerName(formattedName);
      localStorage.setItem('last_worker_name', formattedName);
    } else {
      const savedName = localStorage.getItem('last_worker_name');
      if (savedName) setWorkerName(savedName);
    }
  }, [searchParams]);

  // 4. Trigger Filter Tugas saat lokasi dipilih
  useEffect(() => {
    if (selectedLocation) {
      fetchFilteredTasks(selectedLocation);
    } else {
      setTasks([]); 
    }
  }, [selectedLocation]);

  // 5. Fungsi Pilih Semua
  const handleCheckAll = () => {
    if (checkedIds.length === tasks.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(tasks.map(t => t.id));
    }
  };

  // 6. Kirim Laporan
const handleSubmit = async () => {
  if (!selectedLocation) return alert("Pilih Lokasi Ruangan!");
  
  const finalWorkerName = workerName || localStorage.getItem('last_worker_name');
  if (!finalWorkerName) return alert("Nama petugas tidak ditemukan!");
  
  if (checkedIds.length === 0) return alert("Centang minimal satu tugas!");

  setLoading(true);

  const now = new Date();
  // Selalu ambil jam, menit, detik saat ini (real-time)
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  
  const timePart = `${hh}:${mm}:${ss}`;

  // finalTimestamp akan menggunakan tanggal pilihan CS (selectedDate) 
  // namun digabung dengan jam saat ini (timePart)
  const finalTimestamp = `${selectedDate}T${timePart}`;
  // -----------------------

  try {
    const { data: log, error: logError } = await supabase
      .from('checklist_logs')
      .insert([{ 
        location_id: selectedLocation, 
        worker_name: finalWorkerName.toUpperCase(), 
        status: 'Diserahkan',
        notes: notes,
        created_at: finalTimestamp // Waktu sekarang dikirim dengan info timezone WIB
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

      localStorage.setItem('last_worker_name', finalWorkerName.toUpperCase());
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
      {/* HEADER INSTANSI BARU */}
      <div className="flex flex-col items-center mb-3 animate-in fade-in duration-700">
        <div className="flex items-center gap-3 mb-2">
          {/* Logo Kemenkeu */}
          <div className="w-14 h-14 flex-shrink-0">
            <img 
              src="/Logo_kementerian_keuangan_republik_indonesia.png" 
              alt="Logo Kemenkeu" 
              className="w-full h-full object-contain"
            />
          </div>
          {/* Teks Instansi */}
          <div className="text-left border-l-2 border-slate-300 pl-4 py-1">
            <h2 className="text-[#003366] font-regular text-l md:text-1xl leading-[1.1] tracking-tight">
              DITJEN PERBENDAHARAAN KEMENKEU RI
            </h2>
            <p className="text-slate-800 text-[10px] md:text-xs font-black tracking-[0.20em] uppercase">
              LHOKSEUMAWE
            </p>
          </div>
        </div>
      </div>

      <h1 className="text-xl font-black text-[#003366] uppercase italic mb-6 text-center">
        Formulir Kebersihan dan Perawatan
      </h1>

      {/* TANGGAL */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
          <Calendar size={12}/> Waktu Pelaporan
        </label>
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-3">
          <button
            type="button"
            onClick={() => { setIsManualDate(false); setSelectedDate(new Date().toISOString().split('T')[0]); }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${!isManualDate ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500'}`}
          >
            HARI INI
          </button>
          <button
            type="button"
            onClick={() => setIsManualDate(true)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${isManualDate ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500'}`}
          >
            INPUT MANUAL
          </button>
        </div>
        {isManualDate && (
          <input 
            type="date" 
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 outline-none font-bold text-sm text-[#003366]"
          />
        )}
      </div>

      {/* NAMA PETUGAS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4 border-l-4 border-l-blue-500">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
          <User size={12}/> Nama Petugas
        </label>
        <input 
          type="text"
          value={workerName}
          onChange={(e) => setWorkerName(e.target.value.toUpperCase())}
          placeholder="KETIK NAMA PETUGAS..."
          className="w-full bg-slate-100 p-4 rounded-2xl border border-slate-200 font-black text-slate-700 outline-none focus:ring-2 ring-blue-500"
        />
      </div>

      {/* PILIH LOKASI */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4">
        <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
          <MapPin size={12}/> Pilih Ruangan/Kendaraan
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

      <button 
        disabled={loading || !selectedLocation || (!workerName && !localStorage.getItem('last_worker_name'))}
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
      <Suspense fallback={<div className="p-20 text-center opacity-20">Memuat...</div>}>
        <ChecklistFormContent />
      </Suspense>
    </div>
  );
}
