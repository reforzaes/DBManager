import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_URL = "api.php";
const SPECIAL_NAME = 'KPI ESTRATÉGICOS VENDEDORES';
const SPECIAL_URL = 'https://gonzalezjavier.com/AMP/';

const MANAGERS = [
    { id: 'm1', name: 'Manuel Castillo', avatar: 'MC', color: '#3b82f6' },
    { id: 'm2', name: 'Maria Victoria Roger', avatar: 'VR', color: '#f43f5e' },
    { id: 'm3', name: 'Desiree Gragera', avatar: 'DG', color: '#10b981' },
    { id: 'm4', name: 'Elia Sanchis', avatar: 'ES', color: '#f59e0b' },
    { id: 'm5', name: 'Enrique Alcaniz', avatar: 'EA', color: '#8b5cf6' },
    { id: 'm6', name: 'Javier Campagnoli', avatar: 'JC', color: '#ec4899' },
    { id: 'm7', name: 'Jeremias Escriva', avatar: 'JE', color: '#06b6d4' },
    { id: 'm8', name: 'Oscar Fernandez', avatar: 'OF', color: '#b45309' },
    { id: 'm9', name: 'Vicente Donet', avatar: 'VD', color: '#475569' },
    { id: 'm10', name: 'Melisa Sanjuan', avatar: 'MS', color: '#84cc16' }
];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const getMonthLabel = (idx: number) => {
    const labels: Record<number, string> = {
        2: 'Marzo 1 Trimestre',
        5: 'Junio 2 Trimestre',
        8: 'Septiembre 3 Trimestre',
        11: 'Diciembre 4 Trimestre'
    };
    return labels[idx] || MONTHS[idx];
};

const OBJECTIVE_RULES: any = {
    's1': { label: 'VENTA', target: (m: any, mId: string) => (mId === 'm2' ? 10.6 : (mId === 'm1' ? 6.4 : 10.0)), base: 0.0, unit: '%' },      
    's2': { label: 'STOCK: ROTACION', target: (m: any, mId: string) => mId === 'm2' ? 35.40 : 59.50, base: (m: any, mId: string) => mId === 'm2' ? 44.60 : 60.80, unit: ' Días' },       
    's3': { label: 'STOCK: AVS + TÓXICO+ MUERTO', target: 10.50, base: (m: any, mId: string) => mId === 'm2' ? 11.63 : 11.80, unit: '%' },     
    's4': { label: '% MDH', target: (m: any, mId: string) => mId === 'm2' ? 43.50 : 41.00, base: (m: any, mId: string) => mId === 'm2' ? 41.26 : 36.37, unit: '%' },
    'f1': { label: 'Demarca Con.', target: 80, base: 59, unit: ' pts' },    
    'f2': { label: 'Demarca Des.', target: 80, base: 59, unit: ' pts' },    
    'f3': { label: 'Rev. Descuentos.', target: 80, base: 59, unit: ' pts' },    
    'f4': { label: 'Rev. Cod 48.', target: 80, base: 59, unit: ' pts' },    
    't1': { label: 'Formaciones', target: (m: number) => [0,0,9,0,0,18,0,0,27,0,0,36][m], base: (m: number) => [0,0,5,0,0,9,0,0,18,0,0,20][m], unit: 'h' },
    't2': { label: 'One & One', target: 100, base: 50, unit: '%' },    
    't3': { label: 'PDI', target: 100, base: 50, unit: '%' },    
    't5': { label: SPECIAL_NAME, target: 100, base: 50, unit: '%' },
    'nps_val': { label: 'NPS', target: 70, base: 60, unit: '' }
};

const OBJECTIVES = [
    { id: 'obj1', name: 'PERFORMANCE', sub: [{id:'s1'}, {id:'s2'}, {id:'s3'}, {id:'s4'}] },
    { id: 'obj3', name: 'FULLGREEN', sub: [{id:'f1'}, {id:'f2'}, {id:'f3'}, {id:'f4'}] },
    { id: 'obj4', name: 'TALENTO', sub: [{id:'t1'}, {id:'t2'}, {id:'t3'}, {id:'t5'}], quarterly: true },
    { id: 'obj2', name: 'NPS', sub: [{id:'nps_val'}] }
];

const calculateAch = (id: string, val: number, month: number, mId: string, customBase?: number, customTarget?: number) => {
    const rule = OBJECTIVE_RULES[id];
    if (!rule) return 0;
    if (val === 0) return 0;

    const target = customTarget !== undefined ? customTarget : (typeof rule.target === 'function' ? rule.target(month, mId) : rule.target);
    const base = customBase !== undefined ? customBase : (typeof rule.base === 'function' ? rule.base(month, mId) : rule.base);
    
    if (base < target) {
        if (val <= base) return 0;
        if (val >= target) return 100;
        return Math.max(0, Math.min(100, Math.round(((val - base) / (target - base)) * 100)));
    } else {
        if (val >= base) return 0;
        if (val <= target) return 100;
        return Math.max(0, Math.min(100, Math.round(((base - val) / (base - target)) * 100)));
    }
};

const getHeatColor = (ach: number) => {
    if (ach < 50) return '#ef4444'; // Rojo < 50
    if (ach < 70) return '#f59e0b'; // Naranja 50-70
    return '#8bc34a'; // Verde > 70
};

const SmartNumericInput = ({ initialValue, onSave, label, disabled, placeholder }: { initialValue: number, onSave: (val: number) => void, label?: string, disabled?: boolean, placeholder?: string }) => {
    const [localVal, setLocalVal] = useState(initialValue === 0 ? "" : initialValue.toString());
    useEffect(() => { setLocalVal(initialValue === 0 ? "" : initialValue.toString()); }, [initialValue]);
    return (
        <div className="flex flex-col flex-grow">
            {label && <span className="text-[9px] font-black uppercase text-slate-400 mb-1">{label}</span>}
            <input 
                type="text" inputMode="decimal" value={localVal} disabled={disabled}
                onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    if (v === "" || /^-?[0-9]*\.?[0-9]*$/.test(v)) {
                        setLocalVal(v);
                        if (v !== "" && !v.endsWith(".") && v !== "-") onSave(parseFloat(v));
                        else if (v === "") onSave(0);
                    }
                }}
                className={`bg-white border border-slate-200 rounded-lg py-1.5 text-center font-black text-xs focus:ring-2 focus:ring-indigo-400 outline-none transition-all ${disabled ? 'opacity-50 bg-slate-50 cursor-not-allowed' : ''}`}
                placeholder={placeholder || "0.0"}
            />
        </div>
    );
};

const App = () => {
    const [activeMonth, setActiveMonth] = useState('accumulated');
    const [view, setView] = useState('comparison');
    const [editorRole, setEditorRole] = useState<null | 'standard' | 'super'>(null); 
    const [password, setPassword] = useState('');
    const [data, setData] = useState<any>(null);
    const [comp, setComp] = useState<any>(null);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [monthMenuOpen, setMonthMenuOpen] = useState(false);
    const [trendManagers, setTrendManagers] = useState(MANAGERS.map(m => m.id));
    const [trendMenuOpen, setTrendMenuOpen] = useState(false);

    const managerMenuRef = useRef<HTMLDivElement>(null);
    const monthMenuRef = useRef<HTMLDivElement>(null);
    const trendMenuRef = useRef<HTMLDivElement>(null);

    const isAccumulated = activeMonth === 'accumulated';
    const isQuarter = activeMonth.startsWith('q');
    
    const mIdx = useMemo(() => {
        if (isAccumulated) return 11;
        if (activeMonth === 'q1') return 2;
        if (activeMonth === 'q2') return 5;
        if (activeMonth === 'q3') return 8;
        if (activeMonth === 'q4') return 11;
        return parseInt(activeMonth);
    }, [activeMonth, isAccumulated]);

    const initializeDefault = () => {
        const initData: any = {};
        const initComp: any = {};
        MANAGERS.forEach(m => {
            initData[m.id] = {}; initComp[m.id] = {};
            OBJECTIVES.forEach(o => {
                initData[m.id][o.id] = {};
                MONTHS.forEach((_, i) => {
                    initData[m.id][o.id][String(i)] = { e: true, s: o.sub.reduce((acc, s) => ({ ...acc, [s.id]: { v: 0, b: undefined, t: undefined } }), {}) };
                    initComp[m.id][String(i)] = false;
                });
            });
        });
        setData(initData); setComp(initComp);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(API_URL + "?t=" + Date.now());
                const json = await res.json();
                if (json && json.data) { setData(json.data); setComp(json.completions); }
                else initializeDefault();
            } catch (e) { initializeDefault(); }
        };
        load();
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (managerMenuRef.current && !managerMenuRef.current.contains(target)) setManagerMenuOpen(false);
            if (monthMenuRef.current && !monthMenuRef.current.contains(target)) setMonthMenuOpen(false);
            if (trendMenuRef.current && !trendMenuRef.current.contains(target)) setTrendMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveToDb = async (newData: any, newComp: any) => {
        try { await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: newData, completions: newComp }) }); }
        catch (e) { console.error(e); }
    };

    const handleUpdate = (newData: any, newComp: any) => {
        if (isAccumulated || isQuarter) return;
        setData({...newData}); setComp({...newComp}); saveToDb(newData, newComp);
    };

    const getObjectiveAchievement = (mId: string, oId: string, monthIndex: number) => {
        const key = String(monthIndex);
        if (!data?.[mId]?.[oId]?.[key]) return 0;
        const objData = data[mId][oId][key];
        const objMeta = OBJECTIVES.find(o => o.id === oId);
        if (!objMeta || !objData.e) return 0;

        const subAchievements = objMeta.sub.map(s => {
            const val = objData.s?.[s.id]?.v ?? 0;
            const b = objData.s?.[s.id]?.b;
            const t = objData.s?.[s.id]?.t;
            return calculateAch(s.id, val, monthIndex, mId, b, t);
        });

        const sum = subAchievements.reduce((acc, curr) => acc + curr, 0);
        return Math.round(sum / objMeta.sub.length);
    };

    const calculateTimeframeAvg = (mId: string, oId: string, timeframe: string) => {
        if (!comp?.[mId]) return 0;
        let monthsToAverage: string[] = [];
        if (timeframe === 'accumulated') {
            monthsToAverage = Object.keys(comp[mId]).filter(mKey => comp[mKey] === true);
        } else if (timeframe.startsWith('q')) {
            const q = parseInt(timeframe.charAt(1));
            const start = (q - 1) * 3;
            monthsToAverage = [start, start + 1, start + 2].map(String).filter(mKey => comp[mId][mKey] === true);
        }
        
        const scores = monthsToAverage.map(mKey => getObjectiveAchievement(mId, oId, parseInt(mKey)));
        if (scores.length === 0) return 0;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    };

    const getGlobalScore = (mId: string, timeframe: string) => {
        const scores = OBJECTIVES.map(o => calculateTimeframeAvg(mId, o.id, timeframe));
        return Math.round(scores.reduce((a, b) => a + b, 0) / OBJECTIVES.length);
    };

    const radarData = useMemo(() => {
        if (!data || !comp) return [];
        return OBJECTIVES.map(o => {
            const point: any = { subject: o.name };
            MANAGERS.forEach(m => {
                point[m.id] = (isAccumulated || isQuarter) 
                    ? calculateTimeframeAvg(m.id, o.id, activeMonth)
                    : (comp[m.id]?.[String(mIdx)] ? getObjectiveAchievement(m.id, o.id, mIdx) : 0);
            });
            return point;
        });
    }, [data, activeMonth, comp, mIdx]);

    const evolutionData = useMemo(() => {
        if (!data || !comp) return [];
        return MONTHS.map((m, i) => {
            const row: any = { name: m };
            MANAGERS.forEach(mgr => {
                if (comp[mgr.id]?.[String(i)]) {
                    const scores = OBJECTIVES.map(o => getObjectiveAchievement(mgr.id, o.id, i));
                    row[mgr.id] = Math.round(scores.reduce((a, b) => a + b, 0) / OBJECTIVES.length);
                }
            });
            return row;
        });
    }, [data, comp]);

    const ranking = useMemo(() => {
        return MANAGERS.map(m => ({ ...m, score: getGlobalScore(m.id, 'accumulated') }))
            .sort((a, b) => b.score - a.score);
    }, [data, comp]);

    const activeManager = view !== 'comparison' && view !== 'editor' ? MANAGERS.find(m => m.id === view) : null;

    if (!data) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-400 uppercase">Cargando datos...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white/95 backdrop-blur-xl border-b sticky top-0 z-[1000] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm w-full">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('comparison')}>
                    <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-chart-line"></i></div>
                    <h1 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none">Management Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setView('comparison')} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${view === 'comparison' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Vista Global</button>
                    
                    <div className="relative" ref={managerMenuRef}>
                        <button onClick={() => setManagerMenuOpen(!managerMenuOpen)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 border min-w-[180px] transition-all ${activeManager ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}>
                            {activeManager ? activeManager.name : 'Seleccionar Manager'}<i className="fas fa-chevron-down ml-auto"></i>
                        </button>
                        {managerMenuOpen && <div className="dropdown-menu">
                            {MANAGERS.map(m => <button key={m.id} onClick={() => { setView(m.id); setManagerMenuOpen(false); }} className="w-full text-left p-3 rounded-xl flex items-center gap-3 hover:bg-slate-50 text-[10px] font-bold uppercase"><span className="w-2 h-2 rounded-full" style={{backgroundColor: m.color}}></span> {m.name}</button>)}
                            {editorRole && <button onClick={() => { setView('editor'); setManagerMenuOpen(false); }} className="w-full text-left p-3 mt-2 rounded-xl font-black bg-amber-100 text-amber-700 border border-amber-200">Editor de Datos</button>}
                        </div>}
                    </div>

                    <div className="relative" ref={monthMenuRef}>
                        <button onClick={() => setMonthMenuOpen(!monthMenuOpen)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 border transition-all">
                            {isAccumulated ? 'Acumulado' : getMonthLabel(parseInt(activeMonth))}<i className="fas fa-calendar-alt ml-2"></i>
                        </button>
                        {monthMenuOpen && <div className="dropdown-menu max-h-[70vh] overflow-y-auto">
                            <button onClick={() => { setActiveMonth('accumulated'); setMonthMenuOpen(false); }} className="w-full text-left p-3 mb-2 rounded-xl font-black bg-indigo-50 text-indigo-600 border border-indigo-100">Año Acumulado</button>
                            {MONTHS.map((m, idx) => {
                                const isQuarterEnd = [2, 5, 8, 11].includes(idx);
                                return (
                                    <button 
                                        key={idx} 
                                        onClick={() => { setActiveMonth(idx.toString()); setMonthMenuOpen(false); }} 
                                        className={`w-full text-left p-3 rounded-xl hover:bg-slate-50 text-[10px] font-bold uppercase transition-colors ${isQuarterEnd ? 'bg-indigo-50/50 text-indigo-700 border-l-4 border-indigo-400 pl-2' : ''}`}
                                    >
                                        {getMonthLabel(idx)}
                                    </button>
                                );
                            })}
                        </div>}
                    </div>

                    <div className="flex items-center bg-slate-900 rounded-2xl px-2 border shadow-sm">
                        {!editorRole ? <input type="password" value={password} onChange={e => { const val = e.target.value; setPassword(val); if(val === '047') { setEditorRole('standard'); setView('editor'); setPassword(''); } if(val === '30104750') { setEditorRole('super'); setView('editor'); setPassword(''); } }} placeholder="PIN" className="w-12 bg-transparent text-white text-center text-[10px] py-3 font-black focus:outline-none" />
                        : <button onClick={() => { setEditorRole(null); setView('comparison'); }} className="text-emerald-400 text-[10px] py-3 font-black uppercase px-2">{editorRole.toUpperCase()}</button>}
                    </div>
                </div>
            </header>

            <main className="w-full flex-grow py-8 px-6">
                {view === 'comparison' && <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
                    <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col h-[650px]">
                        <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight mb-8">Rendimiento Estratégico</h3>
                        <div className="flex-grow">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                                    <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                                    {MANAGERS.map(m => (
                                        <Radar key={m.id} name={m.name} dataKey={m.id} stroke={m.color} fill={m.color} fillOpacity={0.05} strokeWidth={2} />
                                    ))}
                                    <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'}} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border shadow-sm">
                            <h3 className="text-xs font-black uppercase mb-6 text-slate-400 tracking-widest">Ranking Acumulado</h3>
                            <div className="space-y-4">
                                {ranking.map((m, i) => (
                                    <div key={m.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <span className="w-6 text-[10px] font-black text-slate-300">#{i+1}</span>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-md" style={{backgroundColor: m.color}}>{m.avatar}</div>
                                        <div className="flex-grow"><div className="text-[10px] font-black text-slate-800 uppercase leading-none">{m.name}</div></div>
                                        <div className="text-xs font-black" style={{color: getHeatColor(m.score)}}>{m.score}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col h-[500px]">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Evolución Performance</h3>
                                <div className="relative" ref={trendMenuRef}>
                                    <button onClick={() => setTrendMenuOpen(!trendMenuOpen)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2"><i className="fas fa-filter"></i> Filtrar Evolución <i className="fas fa-chevron-down"></i></button>
                                    {trendMenuOpen && <div className="dropdown-menu right-0 w-[200px]">
                                        {MANAGERS.map(m => (
                                            <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                                <input type="checkbox" checked={trendManagers.includes(m.id)} onChange={() => setTrendManagers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} />
                                                <span className="text-[9px] font-bold uppercase">{m.name}</span>
                                            </label>
                                        ))}
                                    </div>}
                                </div>
                            </div>
                            <div className="flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                                        <Legend iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: '900', textTransform: 'uppercase'}} />
                                        {MANAGERS.filter(m => trendManagers.includes(m.id)).map(m => (
                                            <Line key={m.id} name={m.name} type="monotone" dataKey={m.id} stroke={m.color} strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}} activeDot={{r: 6}} animationDuration={1000} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>}

                {view === 'editor' && <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    {isAccumulated && <div className="col-span-full bg-amber-50 border border-amber-200 p-6 rounded-3xl text-amber-800 text-center font-black uppercase text-xs">El acumulado es un promedio de meses cerrados y no es editable.</div>}
                    {MANAGERS.map(m => <div key={m.id} className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b pb-4"><h3 className="font-black uppercase text-slate-800 text-xs tracking-widest">{m.name}</h3>
                            {!isAccumulated && <button onClick={() => handleUpdate(data, {...comp, [m.id]: {...comp[m.id], [String(mIdx)]: !comp[m.id]?.[String(mIdx)]}})} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${comp[m.id]?.[String(mIdx)] ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                                {comp[m.id]?.[String(mIdx)] ? '✓ Cerrado' : 'Validar'}</button>}
                        </div>
                        <div className="space-y-4">
                            {OBJECTIVES.map(obj => {
                                if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                                const oData = data[m.id]?.[obj.id]?.[String(mIdx)] || { e: true, s: {} };
                                return <div key={obj.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex justify-between mb-4"><span className="text-[10px] font-black uppercase text-slate-500">{obj.name}</span>
                                        {editorRole === 'super' && !isAccumulated && <input type="checkbox" checked={oData.e} onChange={e => { const newData = {...data}; newData[m.id][obj.id][String(mIdx)].e = e.target.checked; handleUpdate(newData, comp); }} />}
                                    </div>
                                    <div className="space-y-4">
                                        {obj.sub.map(s => {
                                            const rule = OBJECTIVE_RULES[s.id];
                                            const defBase = typeof rule.base === 'function' ? rule.base(mIdx, m.id) : rule.base;
                                            const defTarget = typeof rule.target === 'function' ? rule.target(mIdx, m.id) : rule.target;
                                            
                                            return (
                                            <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                                                <div className="text-[10px] font-black uppercase text-slate-700">{rule.label}</div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <SmartNumericInput 
                                                        initialValue={oData.s?.[s.id]?.b ?? defBase} 
                                                        disabled={isAccumulated || editorRole === 'standard'} 
                                                        label="Mín (Base)" 
                                                        onSave={(v) => { const newData = {...data}; newData[m.id][obj.id][String(mIdx)].s[s.id].b = v; handleUpdate(newData, comp); }} 
                                                    />
                                                    <SmartNumericInput 
                                                        initialValue={oData.s?.[s.id]?.v || 0} 
                                                        disabled={isAccumulated} 
                                                        label="Valor" 
                                                        onSave={(v) => { const newData = {...data}; newData[m.id][obj.id][String(mIdx)].s[s.id].v = v; handleUpdate(newData, comp); }} 
                                                    />
                                                    <SmartNumericInput 
                                                        initialValue={oData.s?.[s.id]?.t ?? defTarget} 
                                                        disabled={isAccumulated || editorRole === 'standard'} 
                                                        label="Máx (Obj)" 
                                                        onSave={(v) => { const newData = {...data}; newData[m.id][obj.id][String(mIdx)].s[s.id].t = v; handleUpdate(newData, comp); }} 
                                                    />
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>;
                            })}
                        </div>
                    </div>)}
                </div>}

                {activeManager && <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {OBJECTIVES.map(obj => {
                            if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                            const timeframeAch = (isAccumulated || isQuarter) ? calculateTimeframeAvg(activeManager.id, obj.id, activeMonth) : getObjectiveAchievement(activeManager.id, obj.id, mIdx);
                            const oData = data[activeManager.id]?.[obj.id]?.[String(mIdx)] || { e: true, s: {} };
                            if (!oData.e) return null;

                            return <div key={obj.id} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-12">
                                    <h4 className="text-xl font-black uppercase text-slate-900 tracking-tighter">{obj.name}</h4>
                                    <span className="text-4xl font-black tabular-nums" style={{ color: getHeatColor(timeframeAch) }}>{timeframeAch}%</span>
                                </div>
                                <div className="grid grid-cols-1 gap-12">
                                    {obj.sub.map(s => {
                                        const rule = OBJECTIVE_RULES[s.id];
                                        let rawVal: number = 0;
                                        let customB: number | undefined;
                                        let customT: number | undefined;

                                        if (isAccumulated || isQuarter) {
                                            const closedMonths = Object.keys(comp[activeManager.id]).filter(mKey => comp[activeManager.id][mKey] === true);
                                            const values = closedMonths.map(mKey => data[activeManager.id][obj.id][mKey]?.s?.[s.id]?.v || 0);
                                            rawVal = values.length > 0 ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;
                                            
                                            const bases = closedMonths.map(mKey => data[activeManager.id][obj.id][mKey]?.s?.[s.id]?.b ?? (typeof rule.base === 'function' ? rule.base(parseInt(mKey), activeManager.id) : rule.base));
                                            customB = Number((bases.reduce((a, b) => a + b, 0) / bases.length).toFixed(2));
                                            const targets = closedMonths.map(mKey => data[activeManager.id][obj.id][mKey]?.s?.[s.id]?.t ?? (typeof rule.target === 'function' ? rule.target(parseInt(mKey), activeManager.id) : rule.target));
                                            customT = Number((targets.reduce((a, b) => a + b, 0) / targets.length).toFixed(2));
                                        } else {
                                            rawVal = oData.s?.[s.id]?.v || 0;
                                            customB = oData.s?.[s.id]?.b;
                                            customT = oData.s?.[s.id]?.t;
                                        }
                                        
                                        const targetValue = customT !== undefined ? customT : (typeof rule.target === 'function' ? rule.target(mIdx, activeManager.id) : rule.target);
                                        const baseValue = customB !== undefined ? customB : (typeof rule.base === 'function' ? rule.base(mIdx, activeManager.id) : rule.base);
                                        const sAch = calculateAch(s.id, rawVal, mIdx, activeManager.id, customB, customT);
                                        const color = getHeatColor(sAch);
                                        
                                        const isSpecialKpi = rule.label === SPECIAL_NAME;

                                        return (
                                            <div key={s.id} className="flex flex-col gap-3">
                                                <div className="flex justify-between items-end mb-1 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-slate-500 uppercase tracking-tighter">
                                                            {isAccumulated ? 'PROM. ' : ''}{rule.label}
                                                        </span>
                                                        {isSpecialKpi && (
                                                            <a 
                                                                href={SPECIAL_URL} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-500 hover:text-indigo-700 transition-colors text-[10px] flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"
                                                                title="Abrir enlace externo"
                                                            >
                                                                Ver AMP <i className="fas fa-external-link-alt"></i>
                                                            </a>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black" style={{ color: color }}>{sAch}%</span>
                                                </div>
                                                <div className="relative w-full h-11 bg-[#f1f5f9] rounded-xl overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] border border-slate-100">
                                                    <div className="h-full heat-bar-transition rounded-r-xl" style={{ width: `${sAch}%`, backgroundColor: color, opacity: 0.8 }} />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <span className="text-base font-black text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">{rawVal}{rule.unit}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between mt-1 px-1 text-sm font-black text-slate-400 uppercase tracking-widest">
                                                    <span>Min: {baseValue}</span>
                                                    <span>Max: {targetValue}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>;
                        })}
                    </div>
                </div>}
            </main>
            <footer className="w-full bg-slate-900 py-10 text-center flex flex-col items-center gap-2">
                <div className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em]">Management Performance Dashboard 2026 — DB MANAGER</div>
                <div className="text-white text-[10px] font-bold">By Javier González</div>
            </footer>
        </div>
    );
};
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);