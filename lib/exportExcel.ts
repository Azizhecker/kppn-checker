import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(log => ({
    Tanggal: new Date(log.created_at).toLocaleDateString(),
    Lokasi: log.locations.name,
    Petugas: log.worker_name,
    Status: log.status,
    Hasil: `${log.checklist_items.filter((i:any) => i.is_completed).length} dari ${log.checklist_items.length} Tugas`
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kebersihan");
  XLSX.writeFile(workbook, `Laporan_KPPN_${Date.now()}.xlsx`);
};