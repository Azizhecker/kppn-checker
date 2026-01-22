'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, UserCheck, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function RoomMonitoringContent() {
  const searchParams = useSearchParams();
  const locId = searchParams.get('loc');
  const printRef = useRef<HTMLDivElement>(null);
  
  const [location, setLocation] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (locId) fetchData();
  }, [locId, selectedMonth, selectedYear]);

  async function fetchData() {
    setLoading(true);
    const { data: locData } = await supabase.from('locations').select('*').eq('id', locId).single();
    setLocation(locData);

    if (locData) {
      const { data: taskData } = await supabase
        .from('task_templates')
        .select('*')
        .eq('category', locData.type.toLowerCase())
        .order('id', { ascending: true });
      setTasks(taskData || []);
    }

    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

    const { data: logsData } = await supabase
      .from('checklist_logs')
      .select('*, checklist_items(is_completed, task_id)')
      .eq('location_id', locId)
      .gte('created_at', firstDay)
      .lte('created_at', lastDay);

    setLogs(logsData || []);
    setLoading(false);
  }

  const exportToPDF = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, (pdfHeight - 20) / imgProps.height);
      
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;

      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(imgData, 'PNG', x, y, width, height);
      pdf.save(`Monitoring_${location?.name}_${selectedMonth}_${selectedYear}.pdf`);
    } catch (error) {
      console.error("Gagal mengekspor PDF:", error);
    }
  };

  const getCheckStatus = (taskId: number, day: number) => {
    const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
    if (!logAtDay) return null;
    const item = logAtDay.checklist_items?.find((i: any) => i.task_id === taskId);
    return item?.is_completed ? 'checked' : 'unchecked';
  };

  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600">MENYINKRONKAN...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {/* Tombol Kontrol */}
      <div className="max-w-[110rem] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm no-print">
        <div className="flex gap-4">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="border p-2 rounded-lg font-bold text-sm">
                {Array.from({length:12}, (_,i)=> (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="border p-2 rounded-lg font-bold text-sm text-black">
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
            </select>
        </div>
        <button onClick={exportToPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
          <Download size={18} /> Export PDF Resmi
        </button>
      </div>

      {/* AREA PRINT - Disesuaikan dengan margin dan layout baru */}
      <div ref={printRef} className="bg-white p-12 shadow-2xl mx-auto w-full max-w-[105rem] text-black border border-slate-200" style={{ minHeight: '210mm' }}>
        
        {/* Judul Monitoring */}
        <div className="text-center mb-10 mt-4">
          <h3 className="text-xl font-black uppercase tracking-wider">Monitoring Pelaksanaan Tugas Cleaning Service KPPN LHOKSEUMAWE</h3>
          <p className="text-sm font-bold uppercase mt-2">Periode: {new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear}</p>
          <p className="text-sm font-bold uppercase mt-1">Ruangan: {location?.name}</p>
        </div>

        {/* Matrix Tabel */}
        <div className="overflow-x-auto mb-10">
          <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-2 w-10">No</th>
                <th className="border-2 border-black p-2 text-left min-w-[250px]">Kegiatan Pekerjaan</th>
                {dateArray.map(day => (
                  <th key={day} className={`border-2 border-black p-1 text-center w-8 ${isWeekend(day) ? 'bg-red-50 text-red-600' : ''}`}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td className="border-2 border-black text-center p-2 font-medium">{idx + 1}</td>
                  <td className="border-2 border-black p-2 font-bold uppercase">{task.task_name}</td>
                  {dateArray.map(day => {
                    const status = getCheckStatus(task.id, day);
                    return (
                      <td key={day} className={`border-2 border-black text-center p-0 h-11 ${isWeekend(day) ? 'bg-red-50/30' : ''}`}>
                        {status === 'checked' ? <span className="text-blue-700 font-bold text-xl leading-none">✓</span> : status === 'unchecked' ? <span className="text-red-500 font-bold text-sm">x</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={2} className="border-2 border-black p-2 font-bold italic uppercase text-right bg-slate-100">Status Approval (Petugas/Pegawai)</td>
                {dateArray.map(day => {
                  const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
                  const isApproved = logAtDay?.status === 'Disetujui';
                  return (
                    <td key={day} className="border-2 border-black p-1 text-center font-black text-[8px]">
                      {logAtDay ? (
                        <span className={isApproved ? 'text-green-600' : 'text-orange-500'}>
                          {isApproved ? 'OK' : 'PND'}
                        </span>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Tanda Tangan - Perbaikan Posisi Nama agar Center & Tidak Terkena Garis */}
        <div className="mt-16 grid grid-cols-2 text-center text-sm px-20">
          <div className="flex flex-col items-center">
            <p className="font-bold mb-16">Dikerjakan Oleh:</p>
            <div className="w-64 flex flex-col items-center">
              <span className="font-black italic uppercase border-b-2 border-black w-full pb-1 mb-1">
                {logs.length > 0 ? logs[0].worker_name : '................................'}
              </span>
              <p className="font-bold">Cleaning Service</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold mb-16">Diperiksa Oleh:</p>
            <div className="w-64 flex flex-col items-center">
              <span className="font-black uppercase border-b-2 border-black w-full pb-1 mb-1">
                MUHAMMAD ICHSAN RIDWAN
              </span>
              <p className="font-bold italic text-xs">NIP 199903092018121003</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomMonitoringPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center uppercase font-black animate-bounce text-blue-600">Mempersiapkan Matrix...</div>}>
      <RoomMonitoringContent />
    </Suspense>
  );
}