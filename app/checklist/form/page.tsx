'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Send, MapPin, User } from 'lucide-react';

export default function ChecklistManualPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Ambil daftar lokasi saat halaman dibuka
  useEffect(() => {
    fetchLocations();
  }, []);

  // 2. SETIAP KALI LOKASI BERUBAH, AMBIL TUGAS YANG SESUAI
  useEffect(() => {
    if (selectedLocation) {
      fetchFilteredTasks();
    } else {
      setTasks([]); // Kosongkan tugas jika lokasi belum dipilih
    }
  }, [selectedLocation]);

  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  }

  async function fetchFilteredTasks() {
    // Cari data lokasi yang sedang dipilih untuk tahu tipenya
    const loc = locations.find(l => l.id === selectedLocation);
    
    let query = supabase.from('task_templates').select('*');

    // LOGIKA FILTER:
    if (loc?.type === 'toilet') {
      // Jika toilet, ambil tugas kategori 'umum' DAN 'toilet'
      query = query.in('category', ['toilet']);
    } else {
      // Jika selain toilet, hanya ambil kategori 'umum'
      query = query.eq('category', 'umum');
    }

    const { data: tsks } = await query;
    if (tsks) {
        setTasks(tsks);
        setCheckedIds([]); // Reset centang setiap ganti lokasi agar tidak tertukar
    }
  }

  const handleSubmit = async () => {
    if (!selectedLocation) return alert("Pilih Lokasi Ruangan!");
    if (!workerName) return alert("Masukkan Nama Anda!");
    if (checkedIds.length === 0) return alert("Centang minimal satu tugas!");

    setLoading(true);
    try {
      const { data: log, error: logError } = await supabase
        .from('checklist_logs')
        .insert([{ location_id: selectedLocation, worker_name: workerName.toUpperCase(), status: 'Diserahkan' }])
        .select().single();

      if (logError) throw logError;

      // HANYA simpan tugas yang muncul di layar (sesuai filter)
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
    <div className="min-h-screen bg-slate-50 p-5 pb-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-black text-[#003366] uppercase italic mb-6">Formulir Kebersihan</h1>

        <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4">
          <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
            <MapPin size={12}/> Pilih Lokasi Ruangan
          </label>
          <select 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all text-slate-700 appearance-none"
            onChange={(e) => setSelectedLocation(e.target.value)}
            value={selectedLocation}
          >
            <option value="">-- Klik Untuk Memilih --</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border mb-4">
          <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
            <User size={12}/> Nama Petugas
          </label>
          <input 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none text-slate-700"
            placeholder="Ketik Nama Anda..."
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
          />
        </div>

        {selectedLocation && (
            <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-slate-50 border-b">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kelengkapan</h3>
            </div>
            {tasks.length === 0 ? (
                <p className="p-10 text-center text-xs font-bold text-slate-300 uppercase">Mengambil data tugas...</p>
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
        )}

        <button 
          disabled={loading || !selectedLocation}
          onClick={handleSubmit}
          className={`w-full py-5 text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${!selectedLocation ? 'bg-slate-300' : 'bg-[#003366]'}`}
        >
          {loading ? 'MENGIRIM...' : 'KIRIM LAPORAN SEKARANG'}
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}