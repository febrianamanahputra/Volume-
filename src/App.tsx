import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  FileDown, 
  Box, 
  Square, 
  Ruler, 
  Zap, 
  ChevronRight,
  MinusCircle,
  PlusCircle,
  Layers,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Mode = 'VOLUME' | 'LUAS' | 'METER_LARI';

interface SubItem {
  id: string;
  nama: string;
  p: number;
  l: number;
  t: number;
  jumlah: number;
  isVoid: boolean;
  hasil: number;
}

type GroupedData = Record<Mode, Record<string, SubItem[]>>;

export default function App() {
  const [activeTab, setActiveTab] = useState<Mode>('VOLUME');
  const [data, setData] = useState<GroupedData>({
    VOLUME: {},
    LUAS: {},
    METER_LARI: {}
  });

  // Form State
  const [judul, setJudul] = useState('');
  const [subItem, setSubItem] = useState('');
  const [p, setP] = useState<number | string>('');
  const [l, setL] = useState<number | string>('');
  const [t, setT] = useState<number | string>('');
  const [jumlah, setJumlah] = useState<number | string>(1);
  const [isVoid, setIsVoid] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !subItem || !p) return;

    const valP = Number(p);
    const valL = Number(l) || 0;
    const valT = Number(t) || 0;
    const valJumlah = Number(jumlah) || 1;

    let hasil = 0;
    if (activeTab === 'VOLUME') {
      hasil = (valP / 100) * (valL / 100) * (valT / 100) * valJumlah;
    } else if (activeTab === 'LUAS') {
      hasil = (valP / 100) * (valL / 100) * valJumlah;
      if (isVoid) hasil *= -1;
    } else if (activeTab === 'METER_LARI') {
      hasil = (valP / 100) * valJumlah;
    }

    const newItem: SubItem = {
      id: crypto.randomUUID(),
      nama: subItem,
      p: valP,
      l: valL,
      t: valT,
      jumlah: valJumlah,
      isVoid: activeTab === 'LUAS' ? isVoid : false,
      hasil
    };

    setData(prev => {
      const currentModeData = { ...prev[activeTab] };
      if (!currentModeData[judul]) {
        currentModeData[judul] = [];
      }
      currentModeData[judul] = [newItem, ...currentModeData[judul]];
      return { ...prev, [activeTab]: currentModeData };
    });

    setSubItem('');
    setP('');
    setL('');
    setT('');
    setJumlah(1);
    setIsVoid(false);
  };

  const removeItem = (mode: Mode, groupTitle: string, id: string) => {
    setData(prev => {
      const currentModeData = { ...prev[mode] };
      currentModeData[groupTitle] = currentModeData[groupTitle].filter(item => item.id !== id);
      if (currentModeData[groupTitle].length === 0) {
        delete currentModeData[groupTitle];
      }
      return { ...prev, [mode]: currentModeData };
    });
  };

  const calculateGroupTotal = (items: SubItem[]) => {
    return items.reduce((sum, item) => sum + item.hasil, 0);
  };

  const calculateTabTotal = (mode: Mode): number => {
    const groups = data[mode];
    return (Object.values(groups) as SubItem[][]).reduce((sum: number, items) => sum + calculateGroupTotal(items), 0);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    doc.setFontSize(22);
    doc.text('RENOVKI DIMENSION REPORT', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${date}`, 14, 28);

    let currentY = 35;

    (['VOLUME', 'LUAS', 'METER_LARI'] as Mode[]).forEach(mode => {
      const groups = data[mode];
      if (Object.keys(groups).length === 0) return;

      doc.setFontSize(16);
      doc.text(`KATEGORI: ${mode}`, 14, currentY);
      currentY += 10;

      Object.entries(groups).forEach(([title, items]) => {
        const subItems = items as SubItem[];
        doc.setFontSize(12);
        doc.text(`Pekerjaan: ${title}`, 14, currentY);
        currentY += 5;

        const tableData = subItems.map((item, idx) => [
          idx + 1,
          item.nama + (item.isVoid ? ' (VOID)' : ''),
          `${item.p}${item.l ? 'x'+item.l : ''}${item.t ? 'x'+item.t : ''} cm`,
          item.jumlah,
          item.hasil.toFixed(3) + (mode === 'VOLUME' ? ' m3' : mode === 'LUAS' ? ' m2' : ' m1')
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['No', 'Sub-Item', 'Dimensi', 'Jumlah', 'Hasil']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
          margin: { left: 14 },
          didDrawPage: (data) => {
            currentY = data.cursor?.y || currentY;
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text(`Sub-Total ${title}: ${calculateGroupTotal(subItems).toFixed(3)} ${mode === 'VOLUME' ? 'm3' : mode === 'LUAS' ? 'm2' : 'm1'}`, 14, currentY - 5);

        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
      });

      doc.setFontSize(12);
      doc.text(`TOTAL KESELURUHAN ${mode}: ${(calculateTabTotal(mode) as number).toFixed(3)} ${mode === 'VOLUME' ? 'm3' : mode === 'LUAS' ? 'm2' : 'm1'}`, 14, currentY);
      currentY += 20;

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save(`RenovkiDimension_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#333333] font-sans selection:bg-[#CCFF00] selection:text-black relative overflow-x-hidden">
      {/* Top Neon Accent Stripe */}
      <div className="h-1 w-full bg-[#CCFF00] fixed top-0 z-50" />
      
      {/* Subtle Anime Background Element - Minimalist Line Art */}
      <div className="fixed bottom-0 right-0 w-[30vw] h-[50vh] pointer-events-none opacity-[0.04] z-0 flex items-end justify-end p-12">
        <svg viewBox="0 0 100 100" className="w-full h-full text-black fill-current">
          <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z M50 20 C65 20 78 32 80 47 C75 45 70 45 65 47 C60 40 50 35 40 38 C35 35 30 35 25 38 C22 32 35 20 50 20 Z" />
        </svg>
      </div>

      {/* Header */}
      <header className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#CCFF00] rounded-none flex items-center justify-center relative">
            <Terminal size={20} className="text-black" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-none border border-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#333333] flex items-center gap-2">
              RENOVKI DIMENSION
            </h1>
          </div>
        </div>
        <button 
          onClick={exportPDF} 
          className="japandi-button bg-[#333333] text-white hover:bg-black flex items-center gap-3 border border-[#CCFF00]/50"
        >
          <FileDown size={18} />
          Export Report
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-5 space-y-6">
          <section className="japandi-card-neon p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-[#CCFF00] rounded-none" />
              <h2 className="text-lg font-bold tracking-tight">Input Parameters</h2>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#F8F9FA] p-1 rounded-none mb-6">
              {(['VOLUME', 'LUAS', 'METER_LARI'] as Mode[]).map((m) => (
                <button 
                  key={m}
                  onClick={() => setActiveTab(m)}
                  className={`flex-1 py-2 rounded-none text-[10px] font-bold tracking-wider transition-all ${activeTab === m ? 'bg-[#CCFF00] text-black' : 'text-black/30 hover:text-black/50'}`}
                >
                  {m === 'VOLUME' && 'VOLUME'}
                  {m === 'LUAS' && 'AREA'}
                  {m === 'METER_LARI' && 'LINEAR'}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Job Title</label>
                <input 
                  required
                  type="text" 
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="e.g. Living Room Floor"
                  className="japandi-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Sub-Item Name</label>
                <input 
                  required
                  type="text" 
                  value={subItem}
                  onChange={(e) => setSubItem(e.target.value)}
                  placeholder="e.g. Main Area"
                  className="japandi-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Length (cm)</label>
                  <input 
                    required
                    type="number" 
                    step="any"
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    className="japandi-input"
                  />
                </div>
                {activeTab !== 'METER_LARI' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Width (cm)</label>
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={l}
                      onChange={(e) => setL(e.target.value)}
                      className="japandi-input"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'VOLUME' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Height (cm)</label>
                    <input 
                      required
                      type="number" 
                      step="any"
                      value={t}
                      onChange={(e) => setT(e.target.value)}
                      className="japandi-input"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider ml-1">Quantity</label>
                  <input 
                    required
                    type="number" 
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    className="japandi-input"
                  />
                </div>
              </div>

              {activeTab === 'LUAS' && (
                <div 
                  onClick={() => setIsVoid(!isVoid)}
                  className={`p-4 rounded-none cursor-pointer transition-all flex items-center justify-between ${isVoid ? 'bg-red-50' : 'bg-[#F8F9FA] hover:bg-black/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-none flex items-center justify-center ${isVoid ? 'bg-red-500 text-white' : 'bg-[#CCFF00] text-black'}`}>
                      {isVoid ? <MinusCircle size={16} /> : <PlusCircle size={16} />}
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold ${isVoid ? 'text-red-600' : 'text-black'}`}>Void / Deduction</p>
                      <p className="text-[9px] text-black/30 font-medium">Subtract from total area</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-none border transition-all flex items-center justify-center ${isVoid ? 'border-red-500 bg-red-500' : 'border-black/10'}`}>
                    {isVoid && <div className="w-1.5 h-1.5 bg-white rounded-none" />}
                  </div>
                </div>
              )}

              <button type="submit" className="japandi-button w-full py-3 bg-[#CCFF00] text-black hover:bg-[#b8e600]">
                Add to Registry
              </button>
            </form>
          </section>

          {/* Tab Total Display */}
          <div className="japandi-card p-6 bg-[#333333] text-white">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Total {activeTab} Accumulation</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tighter text-[#CCFF00]">
                {calculateTabTotal(activeTab).toFixed(3)}
              </span>
              <span className="text-sm font-bold text-white/50 italic">
                {activeTab === 'VOLUME' ? 'm³' : activeTab === 'LUAS' ? 'm²' : 'm¹'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-7 space-y-6">
          <section className="japandi-card min-h-[600px] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#F8F9FA] rounded-none flex items-center justify-center">
                  <Layers size={16} className="text-black/40" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">Registry Database</h2>
              </div>
              <div className="px-3 py-1 bg-[#F8F9FA] rounded-none text-[10px] font-bold text-black/40 border border-black/5">
                {Object.keys(data[activeTab]).length} Active Groups
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <AnimatePresence initial={false}>
                {Object.keys(data[activeTab]).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-black/10 py-20">
                    <div className="w-16 h-16 bg-[#F8F9FA] rounded-none flex items-center justify-center mb-6 border border-black/5">
                      <Terminal size={32} strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em]">No entries found</p>
                  </div>
                ) : (
                  Object.entries(data[activeTab]).map(([title, items]) => {
                    const subItems = items as SubItem[];
                    return (
                      <motion.div 
                        key={title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-[#CCFF00] rounded-none" />
                            <h3 className="text-sm font-bold tracking-tight">{title}</h3>
                          </div>
                          <div className="text-[10px] font-bold text-black/30">
                            Group Total: <span className="text-black ml-1">{calculateGroupTotal(subItems).toFixed(3)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {subItems.map((item) => (
                            <div key={item.id} className="bg-[#F8F9FA] p-4 rounded-none flex items-center justify-between hover:bg-white transition-all border border-transparent hover:border-[#CCFF00]/40">
                              <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-none flex items-center justify-center ${item.isVoid ? 'bg-red-100 text-red-500' : 'bg-white text-black/20 border border-black/5'}`}>
                                  {item.isVoid ? <MinusCircle size={16} /> : <Box size={16} />}
                                </div>
                                <div>
                                  <p className={`text-xs font-bold ${item.isVoid ? 'text-red-600' : 'text-black'}`}>
                                    {item.nama}
                                    {item.isVoid && <span className="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-none font-black uppercase">Void</span>}
                                  </p>
                                  <p className="text-[9px] text-black/30 font-medium mt-0.5">
                                    {item.jumlah} Units • {item.p}{item.l ? 'x'+item.l : ''}{item.t ? 'x'+item.t : ''} cm
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${item.isVoid ? 'text-red-600' : 'text-black'}`}>
                                    {item.hasil.toFixed(3)}
                                    <span className="text-[9px] ml-1 text-black/30 uppercase">
                                      {activeTab === 'VOLUME' ? 'm³' : activeTab === 'LUAS' ? 'm²' : 'm¹'}
                                    </span>
                                  </p>
                                </div>
                                <button 
                                  onClick={() => removeItem(activeTab, title, item.id)}
                                  className="w-8 h-8 rounded-none flex items-center justify-center text-black/10 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-8 text-center border-t border-[#CCFF00] mt-8">
        <p className="text-[9px] font-bold text-black/10 uppercase tracking-[1.5em]">
          RENOVKI DIMENSION
        </p>
      </footer>
    </div>
  );
}
