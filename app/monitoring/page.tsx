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
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Monitoring_${location?.name}_${selectedMonth}_${selectedYear}.pdf`);
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
      {/* Tombol Kontrol (Tidak ikut ter-print) */}
      <div className="max-w-[110rem] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
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

      {/* AREA PRINT (Format sesuai gambar fisik) */}
      <div ref={printRef} className="bg-white p-10 shadow-2xl mx-auto w-full max-w-[110rem] text-black border border-slate-200">
        {/* Header Instansi */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h2 className="text-sm font-bold uppercase">Kementerian Keuangan Republik Indonesia</h2>
          <h2 className="text-sm font-bold uppercase text-black">Direktorat Jenderal Perbendaharaan</h2>
          <h2 className="text-sm font-bold uppercase text-black">Kantor Wilayah Provinsi Aceh</h2>
          <h1 className="text-lg font-black uppercase text-black">Kantor Pelayanan Perbendaharaan Negara Lhokseumawe</h1>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-md font-black underline uppercase">Monitoring Pelaksanaan Tugas Cleaning Service</h3>
          <p className="text-xs font-bold uppercase mt-1">Periode: {new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear}</p>
          <p className="text-xs font-bold uppercase mt-1">Ruangan: {location?.name}</p>
        </div>

        {/* Matrix Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-[9px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-2 w-8">No</th>
                <th className="border-2 border-black p-2 text-left min-w-[200px]">Kegiatan Pekerjaan</th>
                {dateArray.map(day => (
                  <th key={day} className={`border-2 border-black p-1 text-center w-8 ${isWeekend(day) ? 'bg-red-100' : ''}`}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td className="border-2 border-black text-center p-1">{idx + 1}</td>
                  <td className="border-2 border-black p-2 font-bold uppercase">{task.task_name}</td>
                  {dateArray.map(day => {
                    const status = getCheckStatus(task.id, day);
                    return (
                      <td key={day} className={`border-2 border-black text-center p-0 h-10 ${isWeekend(day) ? 'bg-red-50/50' : ''}`}>
                        {status === 'checked' ? <span className="text-blue-600 font-bold text-lg">✓</span> : status === 'unchecked' ? <span className="text-red-400">x</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Baris Status Approval */}
              <tr className="bg-slate-50">
                <td colSpan={2} className="border-2 border-black p-2 font-black italic uppercase text-right">Status Approval (Petugas/Pegawai)</td>
                {dateArray.map(day => {
                  const logAtDay = logs.find(l => new Date(l.created_at).getDate() === day);
                  const isApproved = logAtDay?.status === 'Disetujui'; // Sesuai kolom 'status' di gambar
                  return (
                    <td key={day} className="border-2 border-black p-1 text-center font-black text-[7px]">
                      {logAtDay ? (
                        <span className={isApproved ? 'text-green-600' : 'text-orange-500'}>
                          {isApproved ? 'OK' : 'PENDING'}
                        </span>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Tanda Tangan (Sesuai Gambar) */}
        <div className="mt-12 grid grid-cols-2 text-center text-xs">
          <div className="flex flex-col items-center">
            <p className="font-bold">Dikerjakan Oleh:</p>
            <div className="h-20 flex items-end font-black italic border-b border-black w-48 mb-1 uppercase">
              {logs.length > 0 ? logs[0].worker_name : '....................'}
            </div>
            <p className="font-bold">Cleaning Service</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold">Diperiksa Oleh:</p>
            <div className="h-20 flex items-end font-black border-b border-black w-48 mb-1 uppercase">
              MUHAMMAD ICHSAN RIDWAN
            </div>
            <p className="font-bold italic">NIP 199903092018121003</p>
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