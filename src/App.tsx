import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  FileDown, 
  Box, 
  Square, 
  HardHat, 
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CalculationMode = '3D' | '2D';

interface ConstructionItem {
  id: string;
  nama: string;
  mode: CalculationMode;
  dimensi: {
    p: number;
    l: number;
    t?: number;
  };
  jumlah: number;
  hasil: number; // m3 for 3D, m2 for 2D
}

export default function App() {
  const [mode, setMode] = useState<CalculationMode>('3D');
  const [items, setItems] = useState<ConstructionItem[]>([]);
  
  // Form State
  const [nama, setNama] = useState('');
  const [p, setP] = useState<number | string>('');
  const [l, setL] = useState<number | string>('');
  const [t, setT] = useState<number | string>('');
  const [jumlah, setJumlah] = useState<number | string>(1);

  // Totals
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      if (item.mode === '3D') acc.volume += item.hasil;
      else acc.luas += item.hasil;
      return acc;
    }, { volume: 0, luas: 0 });
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !p || !l || (mode === '3D' && !t)) return;

    const valP = Number(p);
    const valL = Number(l);
    const valT = mode === '3D' ? Number(t) : 0;
    const valJumlah = Number(jumlah) || 1;

    let hasil = 0;
    if (mode === '3D') {
      // cm to m3: (cm/100) * (cm/100) * (cm/100)
      hasil = (valP / 100) * (valL / 100) * (valT / 100) * valJumlah;
    } else {
      // m to m2: m * m
      hasil = valP * valL * valJumlah;
    }

    const newItem: ConstructionItem = {
      id: crypto.randomUUID(),
      nama,
      mode,
      dimensi: { p: valP, l: valL, t: mode === '3D' ? valT : undefined },
      jumlah: valJumlah,
      hasil
    };

    setItems([newItem, ...items]);
    
    // Reset Form
    setNama('');
    setP('');
    setL('');
    setT('');
    setJumlah(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Smart Construction Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tanggal: ${date}`, 14, 30);
    doc.text('Laporan Estimasi Material Konstruksi', 14, 35);

    // Table
    const tableData = items.map((item, index) => [
      index + 1,
      item.nama,
      item.mode === '3D' ? 'Volume (3D)' : 'Luas (2D)',
      item.mode === '3D' 
        ? `${item.dimensi.p}x${item.dimensi.l}x${item.dimensi.t} cm`
        : `${item.dimensi.p}x${item.dimensi.l} m`,
      item.jumlah,
      item.hasil.toFixed(3) + (item.mode === '3D' ? ' m³' : ' m²')
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['No', 'Nama Item', 'Mode', 'Dimensi', 'Jumlah', 'Hasil']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Volume Keseluruhan: ${totals.volume.toFixed(3)} m³`, 14, finalY);
    doc.text(`Total Luas Keseluruhan: ${totals.luas.toFixed(3)} m²`, 14, finalY + 7);

    doc.save(`Construction_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <HardHat size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Smart Construction Calculator</h1>
          </div>
          <button 
            onClick={exportPDF}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">Download PDF Report</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" />
                Input Item Baru
              </h2>
            </div>
            
            <div className="p-6">
              {/* Mode Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  onClick={() => setMode('3D')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === '3D' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Box size={16} />
                  Mode Volume (3D)
                </button>
                <button 
                  onClick={() => setMode('2D')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === '2D' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Square size={16} />
                  Mode Luas (2D)
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Item</label>
                  <input 
                    required
                    type="text" 
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Balok Kamar A"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Lebar ({mode === '3D' ? 'cm' : 'm'})
                    </label>
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={p}
                      onChange={(e) => setP(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {mode === '3D' ? 'Panjang (cm)' : 'Panjang/Tinggi (m)'}
                    </label>
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={l}
                      onChange={(e) => setL(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {mode === '3D' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tinggi (cm)</label>
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={t}
                      onChange={(e) => setT(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah (pcs)</label>
                  <input 
                    required
                    type="number" 
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                  <Plus size={20} />
                  Tambah ke Daftar
                </button>
              </form>
            </div>
          </section>

          {/* Totals Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Volume</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{totals.volume.toFixed(3)}</span>
                <span className="text-xs font-bold text-slate-500">m³</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Luas</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{totals.luas.toFixed(3)}</span>
                <span className="text-xs font-bold text-slate-500">m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                Daftar Item
              </h2>
              <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
                {items.length} Item
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Dimensi</th>
                    <th className="px-6 py-4">Hasil</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <AlertCircle size={40} strokeWidth={1.5} />
                            <p className="text-sm font-medium">Belum ada item yang ditambahkan.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{item.nama}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              {item.mode === '3D' ? <Box size={10} /> : <Square size={10} />}
                              {item.mode === '3D' ? 'Volume' : 'Luas'} • {item.jumlah} pcs
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">
                            {item.mode === '3D' 
                              ? `${item.dimensi.p}x${item.dimensi.l}x${item.dimensi.t}`
                              : `${item.dimensi.p}x${item.dimensi.l}`}
                            <span className="text-[10px] ml-1">{item.mode === '3D' ? 'cm' : 'm'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900">
                              {item.hasil.toFixed(3)}
                              <span className="text-[10px] ml-1 font-bold text-slate-400">
                                {item.mode === '3D' ? 'm³' : 'm²'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-8">
        Smart Construction Calculator • Professional Quantity Surveying Tool
      </footer>
    </div>
  );
}
