import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
  getDaysInMonth,
  isBefore,
  isAfter,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Zap,
  UserPlus,
  Calendar as CalendarIcon,
  Users,
  Building2,
  FileSpreadsheet,
  Info,
  BookOpen,
  Volume2,
  VolumeX,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Howl, Howler } from 'howler';
import { cn } from './lib/utils';
import { Professional, Shift, AreaData } from './types';
import { logger } from './utils/logger';
import { supabase } from './lib/supabase';

const sanitize = (str: string) => str.replace(/[<>]/g, '');

const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-fuchsia-500'
];

// Audio Assets (using placeholders for now, but initialized with Howler)
const sfx = {
  acerto: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'], volume: 0.5 }),
  erro: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'], volume: 0.5 }),
  click: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-light-button-click-1182.mp3'], volume: 0.3 }),
  drag: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-paper-slide-1530.mp3'], volume: 0.3 })
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [areaData, setAreaData] = useState<AreaData>({
    unidade: 'UAC',
    sigla: 'GSPA',
    gerencia: 'GSPA',
    area: 'Arquitetura TI Robotizacao Processos',
    descricao: 'Descrição Sobreaviso',
    pcn: 'Nome do PCN',
    horasSobreaviso: '15:45'
  });
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  React.useEffect(() => {
    async function loadData() {
      // 1. Fetch Area Configs
      const { data: area } = await supabase.from('area_data').select('*').limit(1).single();
      if (area) {
        setAreaData({
          unidade: area.unidade,
          sigla: area.sigla,
          gerencia: area.gerencia,
          area: area.area,
          descricao: area.descricao,
          pcn: area.pcn,
          horasSobreaviso: area.horas_sobreaviso
        });
      }

      // 2. Fetch Professionals
      const { data: profs } = await supabase.from('professionals').select('*');
      if (profs) setProfessionals(profs);

      // 3. Fetch Shifts
      const { data: allShifts } = await supabase.from('shifts').select('*');
      if (allShifts) setShifts(allShifts);
    }
    loadData();
  }, []);
  const [newProfName, setNewProfName] = useState('');
  const [newProfMatricula, setNewProfMatricula] = useState('');
  const [newProfSpecialty, setNewProfSpecialty] = useState('');
  const [activeTab, setActiveTab] = useState<'escala' | 'config' | 'periodo'>('escala');

  // Initial Screen & User State
  const [userName, setUserName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period Registration State
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodProfId, setPeriodProfId] = useState('');
  const [periodType, setPeriodType] = useState<'diurno' | 'noturno' | 'ambos'>('ambos');

  // Update period defaults when month changes
  React.useEffect(() => {
    setPeriodStart(format(startOfMonth(currentDate), 'yyyy-MM-dd'));
    setPeriodEnd(format(endOfMonth(currentDate), 'yyyy-MM-dd'));
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthShifts = useMemo(() => {
    return shifts.filter(s => {
      const parts = s.date.split('-'); // YYYY-MM-DD
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      return sMonth === currentDate.getMonth() && sYear === currentDate.getFullYear();
    });
  }, [shifts, currentDate]);

  const addProfessional = async () => {
    if (!newProfName.trim() || !newProfMatricula.trim()) {
      setError("Nome e matrícula são obrigatórios.");
      logger.warn("Tentativa de adicionar profissional sem nome ou matrícula.");
      return;
    }
    const cleanName = sanitize(newProfName);
    const cleanMatricula = sanitize(newProfMatricula);
    const cleanSpecialty = sanitize(newProfSpecialty || 'Geral');

    const newProf = {
      name: cleanName,
      matricula: cleanMatricula,
      specialty: cleanSpecialty,
      color: COLORS[professionals.length % COLORS.length]
    };

    // Insert into Supabase
    const { data, error } = await supabase.from('professionals').insert([newProf]).select();

    if (error) {
      setError("Erro ao cadastrar profissional.");
      sfx.erro.play();
    } else if (data && data.length > 0) {
      setProfessionals([...professionals, data[0] as Professional]);
      setNewProfName('');
      setNewProfMatricula('');
      setNewProfSpecialty('');
    }
  };

  const removeProfessional = async (id: string) => {
    // Delete from Supabase (Cascade delete on shifts is handled by DB)
    const { error } = await supabase.from('professionals').delete().eq('id', id);
    if (!error) {
      setProfessionals(professionals.filter(p => p.id !== id));
      setShifts(shifts.filter(s => s.professionalId !== id));
    } else {
      setError("Erro ao remover profissional.");
    }
  };

  const toggleShift = async (date: Date, type: 'diurno' | 'noturno', profId: string | null) => {
    // Note: Due to date/string conversion issues, ensure format is correct for Supabase YYYY-MM-DD
    const dateStr = format(date, 'yyyy-MM-dd');

    const existingIndex = shifts.findIndex(s =>
      s.date === dateStr && s.type === type
    );

    if (existingIndex >= 0) {
      if (profId === null) {
        // Delete shift
        const shiftId = shifts[existingIndex].id;
        const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
        if (!error) {
          const newShifts = [...shifts];
          newShifts.splice(existingIndex, 1);
          setShifts(newShifts);
        }
      } else {
        // Update shift
        const shiftId = shifts[existingIndex].id;
        const { data, error } = await supabase.from('shifts').update({ professional_id: profId }).eq('id', shiftId).select();
        if (!error && data) {
          const newShifts = [...shifts];
          newShifts[existingIndex] = data[0] as Shift;
          // Re-map column format back to our interface format (handling snake_case difference if any, though ideally types should match exactly)
          newShifts[existingIndex].professionalId = data[0].professional_id;
          setShifts(newShifts);
        }
      }
    } else if (profId !== null) {
      // Insert shift
      const newShift = { date: dateStr, type, professional_id: profId };
      const { data, error } = await supabase.from('shifts').insert([newShift]).select();
      if (!error && data) {
        const returnedShift = data[0] as Shift;
        returnedShift.professionalId = data[0].professional_id;
        setShifts([...shifts, returnedShift]);
      }
    }
  };

  const clearMonthShifts = async () => {
    // Collect IDs of shifts in the current month
    const idsToDelete = monthShifts.map(s => s.id);
    if (idsToDelete.length === 0) return;

    const { error } = await supabase.from('shifts').delete().in('id', idsToDelete);

    if (!error) {
      setShifts(shifts.filter(s => {
        const sDate = new Date(s.date + 'T00:00:00'); // parsing the internal YYYY-MM-DD back to verify
        return sDate.getMonth() !== currentDate.getMonth() || sDate.getFullYear() !== currentDate.getFullYear();
      }));
    }
  };

  const autoGenerate = async () => {
    if (professionals.length === 0) return;

    const shiftsToInsert: any[] = [];
    const simulatedShifts = [...shifts]; // to keep track internally while looping

    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      ['diurno', 'noturno'].forEach(type => {
        const existing = simulatedShifts.find(s => s.date === dateStr && s.type === type);

        if (!existing) {
          const otherShiftType = type === 'diurno' ? 'noturno' : 'diurno';
          const otherShift = simulatedShifts.find(s => s.date === dateStr && s.type === otherShiftType);

          let availableProfs = professionals;
          if (otherShift) {
            availableProfs = professionals.filter(p => p.id !== otherShift.professionalId);
          }

          const pool = availableProfs.length > 0 ? availableProfs : professionals;
          const randomProf = pool[Math.floor(Math.random() * pool.length)];

          const newShift = { date: dateStr, type: type as 'diurno' | 'noturno', professional_id: randomProf.id };
          shiftsToInsert.push(newShift);

          simulatedShifts.push({
            id: 'temp-' + Math.random(),
            date: dateStr,
            type: type as 'diurno' | 'noturno',
            professionalId: randomProf.id
          });
        }
      });
    });

    if (shiftsToInsert.length > 0) {
      const { data, error } = await supabase.from('shifts').insert(shiftsToInsert).select();
      if (!error && data) {
        const newFormattedShifts = data.map(dbShift => ({
          id: dbShift.id,
          date: dbShift.date,
          type: dbShift.type,
          professionalId: dbShift.professional_id
        }));
        setShifts([...shifts, ...newFormattedShifts]);
      }
    }
  };

  const applyPeriod = async () => {
    if (!periodProfId || !periodStart || !periodEnd) return;

    const start = startOfDay(new Date(periodStart + 'T00:00:00'));
    const end = startOfDay(new Date(periodEnd + 'T00:00:00'));

    if (isAfter(start, end)) return;

    const intervalDays = eachDayOfInterval({ start, end });

    const shiftsToInsert: any[] = [];
    const idsToDelete: string[] = []; // those that need updating (replace logic via delete+insert is safer for multiple updates or we can do upserts if db constraints permit)

    intervalDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const types: ('diurno' | 'noturno')[] =
        periodType === 'ambos' ? ['diurno', 'noturno'] : [periodType];

      types.forEach(type => {
        const existingIndex = shifts.findIndex(s =>
          s.date === dateStr && s.type === type
        );

        if (existingIndex >= 0) {
          idsToDelete.push(shifts[existingIndex].id);
        }

        shiftsToInsert.push({ date: dateStr, type, professional_id: periodProfId });
      });
    });

    // We do delete matching conflicts + insert new batch to avoid constraint errors
    if (idsToDelete.length > 0) {
      await supabase.from('shifts').delete().in('id', idsToDelete);
    }

    if (shiftsToInsert.length > 0) {
      const { data, error } = await supabase.from('shifts').insert(shiftsToInsert).select();

      if (!error && data) {
        const newInsertedShifts = data.map(dbShift => ({
          id: dbShift.id,
          date: dbShift.date,
          type: dbShift.type,
          professionalId: dbShift.professional_id
        }));

        // update local state
        const remainingShifts = shifts.filter(s => !idsToDelete.includes(s.id));
        setShifts([...remainingShifts, ...newInsertedShifts]);
      }
    }

    setActiveTab('escala'); // Switch back to calendar view
  };

  const exportExcel = () => {
    // 1. Prepare "Area" Sheet
    const areaSheetData = [
      ['Sobreaviso', ''],
      ['Unidade:', areaData.unidade],
      ['Gerência:', areaData.gerencia],
      ['Área:', areaData.area],
      ['Descrição:', areaData.descricao],
      ['PCN:', areaData.pcn],
      ['Horas de Sobreaviso:', areaData.horasSobreaviso]
    ];
    const wsArea = XLSX.utils.aoa_to_sheet(areaSheetData);

    // Set column widths for Area
    wsArea['!cols'] = [
      { wch: 25 }, // Column A
      { wch: 60 }  // Column B
    ];

    // Merge header
    wsArea['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } } // A1:B1
    ];

    // 2. Prepare "Funcionarios" Sheet
    const profRanges: any[] = [];

    professionals.forEach(prof => {
      const profShifts = monthShifts
        .filter(s => s.professionalId === prof.id)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (profShifts.length === 0) return;

      let currentRange: { start: Date; end: Date } | null = null;

      profShifts.forEach((shift, index) => {
        if (!currentRange) {
          currentRange = { start: shift.date, end: shift.date };
        } else {
          const prevDate = profShifts[index - 1].date;
          const diffDays = Math.round((shift.date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) {
            currentRange.end = shift.date;
          } else {
            profRanges.push({
              'Nome': prof.name,
              'Matricula': prof.matricula,
              'Período Inicial': format(currentRange.start, 'dd/MM/yyyy'),
              'Período Final': format(currentRange.end, 'dd/MM/yyyy'),
              'Horas (Robô)': ''
            });
            currentRange = { start: shift.date, end: shift.date };
          }
        }

        if (index === profShifts.length - 1 && currentRange) {
          profRanges.push({
            'Nome': prof.name,
            'Matricula': prof.matricula,
            'Período Inicial': format(currentRange.start, 'dd/MM/yyyy'),
            'Período Final': format(currentRange.end, 'dd/MM/yyyy'),
            'Horas (Robô)': ''
          });
        }
      });
    });

    const wsFunc = XLSX.utils.json_to_sheet(profRanges);

    // Set column widths for Funcionarios
    wsFunc['!cols'] = [
      { wch: 35 }, // Nome
      { wch: 15 }, // Matricula
      { wch: 18 }, // Período Inicial
      { wch: 18 }, // Período Final
      { wch: 20 }  // Horas (Robô)
    ];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsArea, "Area");
    XLSX.utils.book_append_sheet(wb, wsFunc, "Funcionarios");

    // Generate filename
    const start = format(daysInMonth[0], 'dd_MM_yy');
    const end = format(daysInMonth[daysInMonth.length - 1], 'dd_MM_yy');
    const filename = `#Sobreaviso - ${areaData.sigla} - Período ${start} a ${end}.xlsx`;

    XLSX.writeFile(wb, filename);
    sfx.acerto.play();
  };

  const generateCertificate = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Certificado de Conclusão', 105, 40, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`Certificamos que ${userName || 'Usuário'}`, 105, 60, { align: 'center' });
    doc.text('concluiu com sucesso a organização da escala de sobreaviso.', 105, 70, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 105, 110, { align: 'center' });
    doc.save(`certificado_${userName || 'usuario'}.pdf`);
    sfx.acerto.play();
  };

  const shareResults = () => {
    const text = `PlantoGen APM: ${userName} concluiu a escala de sobreaviso para a área ${areaData.sigla}!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    sfx.click.play();
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    Howler.mute(newState);
    localStorage.setItem('planto-mute', JSON.stringify(newState));
  };

  React.useEffect(() => {
    const savedMute = localStorage.getItem('planto-mute');
    if (savedMute) {
      const muted = JSON.parse(savedMute);
      setIsMuted(muted);
      Howler.mute(muted);
    }
  }, []);

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-indigo-200">
              <CalendarIcon size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">PlantoGen APM</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Gestão de Sobreaviso com Persistência em Nuvem</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Seu Nome</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(sanitize(e.target.value))}
                placeholder="Como quer ser chamado?"
                aria-label="Digite seu nome"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <button
              onClick={() => {
                if (userName) {
                  setIsStarted(true);
                  sfx.click.play();
                } else {
                  setError("Por favor, preencha seu nome.");
                  sfx.erro.play();
                }
              }}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
            >
              Iniciar Aplicativo
            </button>

            {error && <p className="text-rose-500 text-[10px] font-bold text-center">{error}</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema de Gestão</p>
            <p className="text-xs font-black text-slate-600">PlantoGen APM</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative">
      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center space-y-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Pausado</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Retomar
              </button>
              <button
                onClick={() => {
                  clearMonthShifts();
                  setIsPaused(false);
                }}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Reiniciar Mês
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-bold hover:bg-rose-100 transition-all"
              >
                Finalizar Aplicativo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full space-y-6">
              <div className="flex items-center gap-3 text-indigo-600">
                <Plus size={24} className="rotate-45" />
                <h2 className="text-xl font-black uppercase tracking-widest">Regras do Aplicativo</h2>
              </div>
              <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                <p>1. <strong>Objetivo</strong>: Organizar a escala de sobreaviso da sua área de forma eficiente.</p>
                <p>2. <strong>Persistência</strong>: Seus dados são salvos automaticamente no banco de dados (Supabase).</p>
                <p>3. <strong>Equipe</strong>: Cadastre todos os profissionais com suas matrículas corretas.</p>
                <p>4. <strong>Escala</strong>: Você pode preencher dia a dia ou usar a aba "Período" para cadastros rápidos.</p>
                <p>5. <strong>Exportação</strong>: O arquivo gerado segue o padrão APM para processamento automático.</p>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PlantoGen APM</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestão de Sobreaviso</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-bold min-w-[140px] text-center capitalize text-sm">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2" />

          <button
            onClick={() => {
              setIsPaused(true);
              sfx.click.play();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Pausar"
          >
            <Pause size={20} />
          </button>

          <button
            onClick={() => {
              setShowRules(true);
              sfx.click.play();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Regras"
          >
            <BookOpen size={20} />
          </button>

          <button
            onClick={toggleMute}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title={isMuted ? "Ativar Som" : "Mudar Som"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="h-8 w-px bg-slate-200 mx-2" />

          <button
            onClick={autoGenerate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
          >
            <Zap size={18} />
            Gerar Automático
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
          >
            <FileSpreadsheet size={18} />
            Gerar Planilha APM
          </button>

          <button
            onClick={generateCertificate}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Certificado
          </button>

          <button
            onClick={shareResults}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            <Users size={18} />
            Compartilhar
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-10">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('escala')}
              className={cn(
                "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'escala' ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Equipe
            </button>
            <button
              onClick={() => setActiveTab('periodo')}
              className={cn(
                "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'periodo' ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Período
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={cn(
                "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'config' ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Área
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'escala' ? (
              <div className="p-6 space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <UserPlus size={16} />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Novo Profissional</h2>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={newProfName}
                      onChange={(e) => setNewProfName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Matrícula (ex: B12345)"
                      value={newProfMatricula}
                      onChange={(e) => setNewProfMatricula(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Especialidade"
                      value={newProfSpecialty}
                      onChange={(e) => setNewProfSpecialty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                    <button
                      onClick={addProfessional}
                      className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={16} />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Equipe ({professionals.length})</h2>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {professionals.map((prof) => (
                        <motion.div
                          key={prof.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-1.5 h-8 rounded-full", prof.color)} />
                            <div>
                              <p className="text-xs font-bold text-slate-800 leading-tight">{prof.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{prof.matricula}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{prof.specialty}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeProfessional(prof.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg opacity-0 group-hover:opacity-100"
                            aria-label="Remover profissional"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : activeTab === 'periodo' ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <CalendarIcon size={16} />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Cadastro por Período</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Profissional</label>
                    <select
                      value={periodProfId}
                      onChange={(e) => setPeriodProfId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    >
                      <option value="">Selecionar Profissional</option>
                      {professionals.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Início</label>
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fim</label>
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Turno</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['diurno', 'noturno', 'ambos'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setPeriodType(type)}
                          className={cn(
                            "py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter border transition-all",
                            periodType === type
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {type === 'ambos' ? 'Ambos' : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={applyPeriod}
                    disabled={!periodProfId}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    Aplicar Período
                  </button>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                  <Info className="text-indigo-500 shrink-0" size={18} />
                  <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                    Isso preencherá todos os dias do intervalo selecionado para o profissional escolhido.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <Building2 size={16} />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Configuração da Área</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unidade</label>
                    <input
                      type="text"
                      value={areaData.unidade}
                      onChange={(e) => setAreaData({ ...areaData, unidade: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Sigla da Área</label>
                    <input
                      type="text"
                      value={areaData.sigla}
                      onChange={(e) => setAreaData({ ...areaData, sigla: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Gerência</label>
                    <input
                      type="text"
                      value={areaData.gerencia}
                      onChange={(e) => setAreaData({ ...areaData, gerencia: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Área</label>
                    <input
                      type="text"
                      value={areaData.area}
                      onChange={(e) => setAreaData({ ...areaData, area: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descrição</label>
                    <textarea
                      value={areaData.descricao}
                      onChange={(e) => setAreaData({ ...areaData, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">PCN</label>
                    <input
                      type="text"
                      value={areaData.pcn}
                      onChange={(e) => setAreaData({ ...areaData, pcn: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Horas de Sobreaviso</label>
                    <input
                      type="text"
                      value={areaData.horasSobreaviso}
                      onChange={(e) => setAreaData({ ...areaData, horasSobreaviso: e.target.value })}
                      placeholder="ex: 15:45"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const payload = {
                        id: 1, // Assume single row config
                        unidade: areaData.unidade,
                        sigla: areaData.sigla,
                        gerencia: areaData.gerencia,
                        area: areaData.area,
                        descricao: areaData.descricao,
                        pcn: areaData.pcn,
                        horas_sobreaviso: areaData.horasSobreaviso
                      };
                      // We use insert with upsert flag just to make sure
                      const { error } = await supabase.from('area_data').upsert(payload);
                      if (error) {
                        setError("Erro ao salvar configurações.");
                        sfx.erro.play();
                      } else {
                        sfx.click.play();
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 mt-4"
                  >
                    Salvar Configurações
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                  <Info className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Estes dados serão utilizados na aba <strong>"Area"</strong> da planilha exportada conforme o padrão APM.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={clearMonthShifts}
              className="w-full flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Trash2 size={14} />
              Limpar Escala Mensal
            </button>
          </div>
        </aside>

        {/* Calendar Section */}
        <section className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-slate-50/80 backdrop-blur-sm p-4 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</span>
                </div>
              ))}

              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`pad-${i}`} className="bg-white/40 min-h-[160px]" />
              ))}

              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayShifts = monthShifts.filter(s => s.date === dateStr);
                const diurno = dayShifts.find(s => s.type === 'diurno');
                const noturno = dayShifts.find(s => s.type === 'noturno');

                return (
                  <div key={day.toString()} className="bg-white min-h-[160px] p-3 flex flex-col gap-2 group hover:bg-indigo-50/30 transition-all relative">
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-xs font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                        format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110"
                          : "text-slate-300 group-hover:text-slate-500"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-3 mt-2">
                      {/* Diurno Slot */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diurno</span>
                          {diurno && <div className={cn("w-1.5 h-1.5 rounded-full", professionals.find(p => p.id === diurno.professionalId)?.color)} />}
                        </div>
                        <select
                          value={diurno?.professionalId || ''}
                          onChange={(e) => toggleShift(day, 'diurno', e.target.value || null)}
                          className={cn(
                            "w-full text-[10px] font-bold p-2 rounded-lg border transition-all cursor-pointer appearance-none",
                            diurno
                              ? "bg-white border-indigo-100 text-slate-700 shadow-sm ring-1 ring-indigo-50"
                              : "bg-slate-50/50 border-transparent text-slate-300 hover:border-slate-200 hover:bg-white"
                          )}
                        >
                          <option value="">Vago</option>
                          {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Noturno Slot */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Noturno</span>
                          {noturno && <div className={cn("w-1.5 h-1.5 rounded-full", professionals.find(p => p.id === noturno.professionalId)?.color)} />}
                        </div>
                        <select
                          value={noturno?.professionalId || ''}
                          onChange={(e) => toggleShift(day, 'noturno', e.target.value || null)}
                          className={cn(
                            "w-full text-[10px] font-bold p-2 rounded-lg border transition-all cursor-pointer appearance-none",
                            noturno
                              ? "bg-white border-indigo-100 text-slate-700 shadow-sm ring-1 ring-indigo-50"
                              : "bg-slate-50/50 border-transparent text-slate-300 hover:border-slate-200 hover:bg-white"
                          )}
                        >
                          <option value="">Vago</option>
                          {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>Usuário: {userName}</span>
        </div>
        <div>
          Gestão de Escalas <span className="text-slate-600">PlantoGen APM</span>
        </div>
      </footer>
    </div>
  );
}
