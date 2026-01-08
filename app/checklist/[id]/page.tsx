'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle2, Navigation, Send } from 'lucide-react';

export default function ChecklistFormPage() {
  const { id } = useParams(); // Mengambil ID Ruangan dari URL (hasil scan)
  const router = useRouter();
  const [locationName, setLocationName] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [workerName, setWorkerName] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoomAndTasks();
  }, [id]);

  async function fetchRoomAndTasks() {
    // 1. Cari Nama Lokasi berdasarkan ID (misal: T1)
    const { data: loc } = await supabase.from('locations').select('name').eq('id', id).single();
    if (loc) setLocationName(loc.name);

    // 2. Ambil daftar tugas yang harus dikerjakan
    const { data: tsk } = await supabase.from('task_templates').select('*');
    if (tsk) setTasks(tsk);
  }

  const handleSubmit = async () => {
    if (!workerName) return alert("Masukkan Nama Petugas!");
    setLoading(true);

    try {
      // 1. Simpan ke checklist_logs
      const { data: log, error: logError } = await supabase
        .from('checklist_logs')
        .insert([{ location_id: id, worker_name: workerName, status: 'Diserahkan' }])
        .select()
        .single();

      if (logError) throw logError;

      // 2. Simpan detail item yang diceklist
      const details = tasks.map(t => ({
        log_id: log.id,
        task_id: t.id,
        is_completed: checkedIds.includes(t.id)
      }));

      const { error: itemError } = await supabase.from('checklist_items').insert(details);
      if (itemError) throw itemError;

      alert("Data berhasil dikirim!");
      router.push('/dashboard-cs'); // Kembali ke halaman scan
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-md mx-auto">
        <div className="bg-[#003366] p-8 rounded-[2.5rem] text-white shadow-xl mb-6">
          <h1 className="text-2xl font-black uppercase italic">{locationName || 'Memuat...'}</h1>
          <p className="text-xs opacity-70 font-bold uppercase tracking-widest">Formulir Kebersihan Ruangan</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border mb-6">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Nama Petugas Pramubhakti</label>
          <input 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
            placeholder="Ketik nama Anda..."
            onChange={(e) => setWorkerName(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden mb-8">
          <div className="p-5 bg-slate-50 border-b">
            <h3 className="text-xs font-black text-slate-500 uppercase">Daftar Kelengkapan Keberisihan</h3>
          </div>
          {tasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => setCheckedIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
              className="flex items-center p-5 border-b last:border-0 cursor-pointer active:bg-blue-50 transition-colors"
            >
              <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${checkedIds.includes(task.id) ? 'bg-green-500 border-green-500 shadow-lg shadow-green-100' : 'border-slate-200'}`}>
                {checkedIds.includes(task.id) && <CheckCircle2 size={18} className="text-white" />}
              </div>
              <span className={`ml-4 font-bold text-sm ${checkedIds.includes(task.id) ? 'text-slate-900' : 'text-slate-400'}`}>
                {task.task_name}
              </span>
            </div>
          ))}
        </div>

        <button 
          disabled={loading}
          onClick={handleSubmit}
          className="w-full py-5 bg-[#003366] text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Send size={20} />
          {loading ? 'MENGIRIM...' : 'KIRIM LAPORAN SEKARANG'}
        </button>
      </div>
    </div>
  );
}