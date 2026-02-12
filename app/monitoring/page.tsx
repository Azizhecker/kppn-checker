'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, UserCheck, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

function RoomMonitoringContent() {
  const searchParams = useSearchParams();
  const locId = searchParams.get('loc');
  const printRef = useRef<HTMLDivElement>(null);
  
  const [location, setLocation] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk data admin yang sedang login
  const [verifier, setVerifier] = useState<any>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentUrl, setCurrentUrl] = useState('');

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const [supervisorData, setSupervisorData] = useState<{nama: string, nip: string} | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
    if (locId) {
        fetchData();
        fetchVerifier(); // Panggil data pemeriksa
    }
  }, [locId, selectedMonth, selectedYear]);

  // Fungsi ambil data pemeriksa (Admin)
  async function fetchVerifier() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Ambil nama, role, dan nip dari tabel profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nama, role, nip')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (profile) setVerifier(profile);
      }
    } catch (err) {
      console.error("Gagal mengambil data profil admin:", err);
    }
  }

async function fetchData() {
  setLoading(true);
  
  // 1. Ambil Data Lokasi
  const { data: locData } = await supabase.from('locations').select('*').eq('id', locId).single();
  setLocation(locData);

  // 2. Ambil Template Task
  if (locData) {
    const { data: taskData } = await supabase
      .from('task_templates')
      .select('*')
      .eq('category', locData.type.toLowerCase())
      .order('id', { ascending: true });
    setTasks(taskData || []);
  }

  const firstDay = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0).toISOString();
  const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

  // 3. Ambil Logs
  const { data: logsData } = await supabase
    .from('checklist_logs')
    .select('*, checklist_items(is_completed, task_id)')
    .eq('location_id', locId)
    .in('status', ['DISETUJUI', 'Diserahkan']) 
    .gte('created_at', firstDay)
    .lte('created_at', lastDay)
    .order('created_at', { ascending: true });

  setLogs(logsData || []);

  // 4. LOGIKA BARU: Cari NIP Supervisor berdasarkan nama di log
  const firstSupervisorName = logsData?.find(l => l.supervisor)?.supervisor;
  
  if (firstSupervisorName) {
    const { data: profData } = await supabase
      .from('profiles')
      .select('nama, nip')
      .eq('nama', firstSupervisorName) // Mencari di tabel profiles berdasarkan nama
      .single();
    
    if (profData) {
      setSupervisorData(profData);
    } else {
      // Jika tidak ketemu di profiles, tampilkan nama saja tanpa NIP
      setSupervisorData({ nama: firstSupervisorName, nip: '' });
    }
  } else {
    setSupervisorData(null);
  }

  setLoading(false);
}

  const exportToPDF = async () => {
    if (!printRef.current) return;
    try {
      const originalStyle = printRef.current.style.width;
      printRef.current.style.width = "1600px"; 

      const canvas = await html2canvas(printRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1600,
      });

      printRef.current.style.width = originalStyle;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, (pdfHeight - 10) / imgProps.height);
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;
      pdf.addImage(imgData, 'PNG', (pdfWidth - width) / 2, (pdfHeight - height) / 2, width, height);
      pdf.save(`Monitoring_${location?.name}_${selectedMonth}_${selectedYear}.pdf`);
    } catch (error) {
      console.error("Gagal mengekspor PDF:", error);
    }
  };

  const getLogAtDay = (day: number) => {
    return logs.find(l => new Date(l.created_at).getDate() === day);
  };

  const getCheckStatus = (taskId: number, day: number) => {
    const logAtDay = getLogAtDay(day);
    if (!logAtDay) return null;
    const item = logAtDay.checklist_items?.find((i: any) => i.task_id === taskId);
    return item?.is_completed ? 'checked' : 'unchecked';
  };

  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-blue-600">SABARR YAA...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-8">
      
      <div className="w-full max-w-[105rem] mx-auto mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm gap-4 no-print">
        <div className="flex gap-2 w-full md:w-auto">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="flex-1 md:flex-none border p-2 rounded-lg font-bold text-sm text-black bg-white">
                {Array.from({length:12}, (_,i)=> (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="flex-1 md:flex-none border p-2 rounded-lg font-bold text-sm text-black bg-white">
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
            </select>
        </div>
        <button onClick={exportToPDF} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
          <Download size={18} /> <span className="text-sm">Export PDF</span>
        </button>
      </div>

      <div 
        ref={printRef} 
        className="bg-white p-4 md:p-12 shadow-2xl mx-auto w-full max-w-[105rem] text-black border border-slate-200" 
        style={{ minHeight: '210mm' }}
      >
        <div className="text-center mb-6 md:mb-10 mt-4 px-2">
          <h3 className="text-sm md:text-xl font-black uppercase tracking-wider leading-tight">
            Monitoring Pelaksanaan Tugas Cleaning Service KPPN LHOKSEUMAWE
          </h3>
          <p className="text-[10px] md:text-sm font-bold uppercase mt-2">Periode: {new Date(0, selectedMonth-1).toLocaleString('id-ID', {month:'long'})} {selectedYear}</p>
          <p className="text-[10px] md:text-sm font-bold uppercase mt-1">Ruangan: {location?.name}</p>
        </div>

        <div className="overflow-x-auto border-2 border-black rounded-sm">
          <table className="w-full border-collapse text-[8px] md:text-[10px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-r-2 border-b-2 border-black p-1 w-6">No</th>
                <th className="border-r-2 border-b-2 border-black p-1 text-left min-w-[120px] md:min-w-[250px]">Kegiatan Pekerjaan</th>
                {dateArray.map(day => (
                  <th key={day} className={`border-r-2 border-b-2 border-black p-0.5 text-center w-5 md:w-8 ${isWeekend(day) ? 'bg-red-100 text-red-600' : ''}`}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td className="border-r-2 border-b-2 border-black text-center p-1 font-medium">{idx + 1}</td>
                  <td className="border-r-2 border-b-2 border-black p-1 font-bold uppercase whitespace-normal">{task.task_name}</td>
                  {dateArray.map(day => {
                    const status = getCheckStatus(task.id, day);
                    return (
                      <td key={day} className={`border-r-2 border-b-2 border-black text-center p-0 h-8 md:h-11 ${isWeekend(day) ? 'bg-red-50/30' : ''}`}>
                        {status === 'checked' ? <span className="text-blue-700 font-bold text-xs md:text-xl leading-none">✓</span> : status === 'unchecked' ? <span className="text-red-500 font-bold text-[8px] md:text-sm">x</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={2} className="border-r-2 border-black p-1 font-bold italic uppercase text-right bg-slate-100 text-[7px] md:text-[10px]">Status Approval</td>
                {dateArray.map(day => {
                  const logAtDay = getLogAtDay(day);
                  const isApproved = logAtDay?.status?.toLowerCase() === 'disetujui';
                  return (
                    <td key={day} className="border-r-2 border-black p-0 text-center font-black text-[6px] md:text-[8px]">
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

        <div className="mt-12 md:mt-16 grid grid-cols-2 text-center text-[10px] md:text-sm px-2 md:px-20 gap-4">
          <div className="flex flex-col items-center">
            <p className="font-bold mb-2">Dikerjakan Oleh:</p>
            <div className="mb-2 scale-75 md:scale-100">
                <QRCodeSVG value={currentUrl} size={48} md-size={64} />
            </div>
            <div className="w-full md:w-64 flex flex-col items-center px-1">
              <span className="font-black italic uppercase border-b border-black w-full pb-1 mb-1 truncate text-[9px] md:text-sm">
                {logs.length > 0 ? logs[0].worker_name : '................................'}
              </span>
              <p className="font-bold">Petugas</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold mb-2">Diperiksa Oleh:</p>
            <div className="mb-2 scale-75 md:scale-100">
                <QRCodeSVG value={currentUrl} size={48} md-size={64} />
            </div>
            <div className="w-full md:w-64 flex flex-col items-center px-1">
              <span className="font-black uppercase border-b border-black w-full pb-1 mb-1 truncate text-[9px] md:text-sm h-6">
                {/* Menampilkan nama supervisor yang melakukan approve */}
                {supervisorData ? supervisorData.nama : '................................'}
              </span>
              <p className="font-bold italic text-[8px] md:text-xs uppercase">
                {/* Menampilkan NIP dari tabel profiles jika ditemukan */}
                {supervisorData?.nip ? `NIP. ${supervisorData.nip}` : 'SUPERVISOR / PEMERIKSA'}
              </p>
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
