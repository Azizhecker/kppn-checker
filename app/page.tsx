export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#003366] text-white p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">E-Checklist KPPN Lhokseumawe</h1>
      <p className="max-w-xs opacity-80 mb-8">
        Silahkan scan QR Code yang tertempel di setiap ruangan untuk memulai pengecekan.
      </p>
      <div className="bg-white/10 p-4 rounded-2xl text-sm italic">
        Contoh akses langsung: <br/> 
        <code className="bg-black/20 p-1 rounded">/checklist/T1</code>
      </div>
    </div>
  );
}