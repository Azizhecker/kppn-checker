'use client';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle } from 'lucide-react';

export default function AdminCard({ log }: any) {
  const handleApprove = async () => {
    await supabase.from('checklist_logs').update({ status: 'Disetujui' }).eq('id', log.id);
    alert('Laporan disetujui!');
    window.location.reload();
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div className="flex justify-between mb-4">
        <h3 className="font-black text-slate-800">{log.locations.name}</h3>
        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold">{log.status}</span>
      </div>
      
      {/* Daftar Tugas yang sudah dikerjakan */}
      <div className="space-y-2 mb-6">
        {log.checklist_items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {item.is_completed ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} />}
            {item.task_templates.task_name}
          </div>
        ))}
      </div>

      <button onClick={handleApprove} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-all">
        SETUJUI PEKERJAAN
      </button>
    </div>
  );
}