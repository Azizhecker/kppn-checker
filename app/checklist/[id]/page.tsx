import { supabase } from '@/lib/supabase';
import ChecklistForm from '@/components/ChecklistForm';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { id: string } }) {
  // Ambil data lokasi berdasarkan ID di URL
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('qr_code_id', params.id)
    .single();

  if (!location) return notFound();

  // Ambil template tugas sesuai kategori lokasi
  const { data: tasks } = await supabase
    .from('task_templates')
    .select('*')
    .eq('category', location.category);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Biru Khas Kemenkeu */}
      <div className="bg-[#003366] text-white p-8 rounded-b-[3rem] shadow-xl shadow-blue-100">
        <h2 className="text-xs font-bold opacity-70 uppercase tracking-widest">KPPN Lhokseumawe</h2>
        <h1 className="text-2xl font-extrabold mt-1">{location.name}</h1>
        <p className="text-sm text-blue-200 mt-2 italic">Silahkan lakukan pengecekan rutin</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10">
        <ChecklistForm locationId={location.id} tasks={tasks || []} />
      </div>
    </div>
  );
}