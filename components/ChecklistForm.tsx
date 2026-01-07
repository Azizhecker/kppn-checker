'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function ChecklistForm({ locationId, tasks }: any) {
  const [workerName, setWorkerName] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!workerName) return alert('Nama Petugas wajib diisi!');
    setIsSaving(true);
    try {
      const { data: log } = await supabase.from('checklist_logs').insert([{ location_id: locationId, worker_name: workerName }]).select().single();
      const details = tasks.map((t: any) => ({
        log_id: log.id,
        task_id: t.id,
        is_completed: checkedIds.includes(t.id)
      }));
      await supabase.from('checklist_items').insert(details);
      
      alert('Berhasil! Mengarahkan ke Dashboard...');
      router.push('/dashboard-cs'); // Otomatis kembali
    } catch (e) {
      alert('Gagal simpan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <input 
          className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
          placeholder="Nama Anda..."
          onChange={(e) => setWorkerName(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {tasks.map((task: any) => (
          <div 
            key={task.id} 
            onClick={() => setCheckedIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
            className="flex items-center p-5 border-b border-slate-50 active:bg-slate-50 cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${checkedIds.includes(task.id) ? 'bg-green-500 border-green-500' : 'border-slate-200'}`}>
              {checkedIds.includes(task.id) && <CheckCircle size={14} className="text-white" />}
            </div>
            <span className={`ml-4 font-bold text-sm ${checkedIds.includes(task.id) ? 'text-slate-900' : 'text-slate-400'}`}>{task.task_name}</span>
          </div>
        ))}
      </div>

      <button disabled={isSaving} onClick={handleSave} className="w-full py-5 bg-[#003366] text-white rounded-[2rem] font-black shadow-xl shadow-blue-100">
        {isSaving ? 'MEMPROSES...' : 'KIRIM LAPORAN'}
      </button>
    </div>
  );
}