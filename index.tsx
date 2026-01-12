
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_URL = "api.php";
const SPECIAL_NAME = 'Objetivos de equipo';
const SPECIAL_LINK = 'https://gonzalezjavier.com/dbmanager/';

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

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const OBJECTIVE_RULES = {
    's1': { label: (v) => `Venta +${v}%`, target: 10, base: 0, unit: '%' },      
    's2': { label: (v) => `MAP +${v}%`, target: 1, base: 0, unit: '%' },       
    's3': { label: (v) => `Gama >${v}%`, target: 85, base: 80, unit: '%' },     
    'obj2': { label: (v) => `Satisfacción >${v}pts`, target: 70, base: 60, unit: 'pts' }, 
    'f1': { label: (v) => `Demarca Con. ${v}%`, target: 100, base: 50, unit: '%' },    
    'f2': { label: (v) => `Demarca Des. ${v}%`, target: 100, base: 50, unit: '%' },    
    'f3': { label: (v) => `Rev. Descuentos ${v}%`, target: 100, base: 50, unit: '%' },    
    'f4': { label: (v) => `Rev. Cod 48 ${v}%`, target: 100, base: 50, unit: '%' },    
    't1': { 
        label: (v) => `Formaciones ${v}h`,
        target: (m) => [0,0,9,0,0,18,0,0,27,0,0,36][m], 
        base: (m) => [0,0,5,0,0,9,0,0,18,0,0,20][m], 
        unit: 'h' 
    },
    't2': { label: (v) => `One & One ${v}%`, target: 100, base: 50, unit: '%' },    
    't3': { label: (v) => `PDI ${v}%`, target: 100, base: 50, unit: '%' },    
    't4': { label: (v) => `ENPS >${v}%`, target: 90, base: 60, unit: '%' },     
    'obj5': { label: (v) => `Estratégicos ${v}%`, target: 100, base: 50, unit: '%' }   
};

const getDynamicLabel = (id, target) => {
    const rule = OBJECTIVE_RULES[id];
    if (!rule) return id;
    return rule.label(target);
};

const calculateAch = (id, val, month, targetOverride = null, baseOverride = null) => {
    const rule = OBJECTIVE_RULES[id];
    if (!rule) return 0;
    
    const target = (targetOverride !== null && targetOverride !== undefined && targetOverride !== '') 
        ? parseFloat(targetOverride) 
        : (typeof rule.target === 'function' ? rule.target(month) : rule.target);
        
    const base = (baseOverride !== null && baseOverride !== undefined && baseOverride !== '')
        ? parseFloat(baseOverride)
        : (typeof rule.base === 'function' ? rule.base(month) : rule.base);
    
    if (val <= base) return 0;
    if (val >= target) return 100;
    const achievement = ((val - base) / (target - base)) * 100;
    const result = Math.max(0, Math.min(100, Math.round(achievement)));
    return isNaN(result) ? 0 : result;
};

const OBJECTIVES = [
    { id: 'obj1', name: 'Performance', sub: [{id:'s1', name:'Venta +10%'}, {id:'s2', name:'MAP +1%'}, {id:'s3', name:'Gama >85%'}] },
    { id: 'obj3', name: 'FullGreen', sub: [{id:'f1', name:'Demarca Con.'}, {id:'f2', name:'Demarca Des.'}, {id:'f3', name:'Rev. Descuentos'}, {id:'f4', name:'Rev. Cod 48'}] },
    { id: 'obj4', name: 'Talento', sub: [{id:'t1', name:'Formaciones'}, {id:'t2', name:'One & One'}, {id:'t3', name:'PDI'}, {id:'t4', name:'ENPS'}], quarterly: true },
    { id: 'obj2', name: 'Satisfacción Cliente' },
    { id: 'obj5', name: SPECIAL_NAME }
];

const getHeatColor = (val) => {
    if (val <= 0) return '#cbd5e1'; 
    if (val < 50) return '#ef4444'; 
    if (val < 85) return '#f59e0b'; 
    return '#10b981'; 
};

const App = () => {
    const [activeMonth, setActiveMonth] = useState('accumulated');
    const [view, setView] = useState('comparison');
    const [editorRole, setEditorRole] = useState(null); 
    const [editorFilter, setEditorFilter] = useState('all'); 
    const [password, setPassword] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [data, setData] = useState(null);
    const [comp, setComp] = useState(null);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [monthMenuOpen, setMonthMenuOpen] = useState(false);

    const managerMenuRef = useRef(null);
    const monthMenuRef = useRef(null);

    const isAccumulated = activeMonth === 'accumulated';
    const mIdx = isAccumulated ? 11 : parseInt(activeMonth);

    // FIX: Define activeManager based on the current view to resolve errors in the UI
    const activeManager = useMemo(() => MANAGERS.find(m => m.id === view), [view]);

    const initializeDefault = () => {
        const initData = {};
        const initComp = {};
        MANAGERS.forEach(m => {
            initData[m.id] = {};
            initComp[m.id] = {};
            OBJECTIVES.forEach(o => {
                initData[m.id][o.id] = {};
                MONTHS.forEach((_, i) => {
                    if (o.sub) {
                        initData[m.id][o.id][i] = {
                            e: true,
                            s: o.sub.reduce((acc, s) => ({
                                ...acc, 
                                [s.id]: { v: 0, e: true, t: null, b: null }
                            }), {})
                        };
                    } else {
                        initData[m.id][o.id][i] = { v: 0, e: true, t: null, b: null };
                    }
                    initComp[m.id][i] = false;
                });
            });
        });
        setData(initData);
        setComp(initComp);
    };

    useEffect(() => {
        const load = async () => {
            setIsSyncing(true);
            setApiError(null);
            try {
                const res = await fetch(API_URL + "?t=" + Date.now());
                if (!res.ok) throw new Error(`HTTP ${res.status}: No se encontró api.php`);
                
                const json = await res.json();
                if (json && json.data) {
                    setData(json.data);
                    setComp(json.completions);
                } else {
                    initializeDefault();
                }
            } catch (e: any) {
                console.error("API Load Error:", e);
                setApiError(e.message);
                initializeDefault();
            } finally { 
                setIsSyncing(false); 
            }
        };
        load();

        const handleClickOutside = (event) => {
            if (managerMenuRef.current && !managerMenuRef.current.contains(event.target)) setManagerMenuOpen(false);
            if (monthMenuRef.current && !monthMenuRef.current.contains(event.target)) setMonthMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveToDb = async (newData, newComp) => {
        setIsSyncing(true);
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: newData, completions: newComp })
            });
        } catch (e) { 
            console.error("Save Error:", e);
        } finally { setIsSyncing(false); }
    };

    const handleUpdate = (newData, newComp) => {
        if (isAccumulated) return;
        setData({...newData});
        setComp({...newComp});
        saveToDb(newData, newComp);
    };

    const getObjectiveAchievement = (mId, oId, monthIndex) => {
        if (!data || !data[mId] || !data[mId][oId] || !data[mId][oId][monthIndex]) return 0;
        const objData = data[mId][oId][monthIndex];
        const objMeta = OBJECTIVES.find(o => o.id === oId);
        if (!objMeta || !objData.e) return 0;

        if (!objMeta.sub) {
            return calculateAch(oId, objData.v, monthIndex, objData.t, objData.b);
        } else {
            const enabledSubs = objMeta.sub.filter(s => objData.s[s.id].e);
            if (enabledSubs.length === 0) return 0;
            const sum = enabledSubs.reduce((acc, s) => acc + calculateAch(s.id, objData.s[s.id].v, monthIndex, objData.s[s.id].t, objData.s[s.id].b), 0);
            return Math.round(sum / enabledSubs.length);
        }
    };

    const calculateAnualAvg = (mId, oId) => {
        if (!comp || !data || !comp[mId]) return 0;
        // Prioridad: Cálculo dinámico basado en completions validados estrictamente true
        const validatedMonths = Object.keys(comp[mId] || {}).filter(m => comp[mId][m] === true);
        if (validatedMonths.length === 0) return 0;
        
        const sum = validatedMonths.reduce((acc, mKey) => {
            const ach = getObjectiveAchievement(mId, oId, parseInt(mKey));
            return acc + (Number(ach) || 0);
        }, 0);
        
        const avg = sum / validatedMonths.length;
        return isNaN(avg) ? 0 : Math.round(avg);
    };

    const globalAvg = (mId) => {
        if (!data || !comp || !comp[mId]) return 0;
        const activeScores = OBJECTIVES.map(o => calculateAnualAvg(mId, o.id));
        if (activeScores.length === 0) return 0;
        const sum = activeScores.reduce((a, b) => a + (Number(b) || 0), 0);
        const result = Math.round(sum / OBJECTIVES.length);
        return isNaN(result) ? 0 : result;
    };

    const getMonthlyAch = (mId, monthIndex) => {
        if (!data || !data[mId]) return 0;
        const activeObjs = OBJECTIVES.filter(o => {
            const isQuarterlyOk = !o.quarterly || [2, 5, 8, 11].includes(monthIndex);
            return isQuarterlyOk && data[mId][o.id] && data[mId][o.id][monthIndex]?.e;
        });
        if (activeObjs.length === 0) return 0;
        const sum = activeObjs.reduce((acc, o) => acc + (Number(getObjectiveAchievement(mId, o.id, monthIndex)) || 0), 0);
        const result = Math.round(sum / activeObjs.length);
        return isNaN(result) ? 0 : result;
    };

    const radarData = useMemo(() => {
        if (!data || !comp) return [];
        return OBJECTIVES.map(o => {
            const point: any = { subject: o.name };
            MANAGERS.forEach(m => {
                let val = 0;
                if (isAccumulated) {
                    // Sin bloqueos por mes 11, directo al promedio de meses cerrados
                    val = calculateAnualAvg(m.id, o.id);
                } else {
                    const isClosed = comp[m.id] && comp[m.id][String(mIdx)] === true;
                    val = isClosed ? getObjectiveAchievement(m.id, o.id, mIdx) : 0;
                }
                // Seguridad: Number() || 0 para evitar fallos de renderizado
                point[m.id] = Number(val) || 0;
            });
            return point;
        });
    }, [data, activeMonth, comp, isAccumulated, mIdx]);

    const trendData = useMemo(() => {
        if (!data || !comp) return [];
        return MONTHS.map((mName, i) => {
            const monthPoint: any = { name: mName.substring(0, 3) };
            MANAGERS.forEach(m => {
                const isClosed = comp[m.id] && comp[m.id][String(i)] === true;
                const val = isClosed ? getMonthlyAch(m.id, i) : null; 
                monthPoint[m.id] = isNaN(val) || val === null ? null : Number(val);
            });
            return monthPoint;
        });
    }, [data, comp]);

    if (!data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-indigo-400">
            <i className="fas fa-spinner fa-spin mb-4 text-3xl"></i>
            <p className="uppercase tracking-widest text-xs">Sincronizando Dashboard...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white/95 backdrop-blur-xl border-b sticky top-0 z-[1000] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm w-full">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('comparison')}>
                    <div className="bg-slate-900 text-white w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-lg">
                        <i className="fas fa-layer-group text-xl"></i>
                    </div>
                    <div className="hidden sm:block text-left">
                        <h1 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">KPI Dashboard Javier</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">ESTRATÉGICOS</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="relative" ref={monthMenuRef}>
                        <button onClick={() => setMonthMenuOpen(!monthMenuOpen)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 border min-w-[200px] justify-between">
                            <span className="flex items-center gap-3">
                                <i className="far fa-calendar-alt opacity-40"></i>
                                {isAccumulated ? 'Acumulado' : MONTHS[mIdx]}
                            </span>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                        </button>
                        {monthMenuOpen && (
                            <div className="dropdown-menu w-72">
                                {MONTHS.map((m, idx) => (
                                    <button key={idx} onClick={() => { setActiveMonth(idx.toString()); setMonthMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase rounded-xl mb-1 ${activeMonth === idx.toString() ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                                        {m}
                                    </button>
                                ))}
                                <div className="border-t my-2"></div>
                                <button onClick={() => { setActiveMonth('accumulated'); setMonthMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase rounded-xl ${isAccumulated ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                    ✓ Año Acumulado
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={managerMenuRef}>
                        <button onClick={() => setManagerMenuOpen(!managerMenuOpen)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 border min-w-[240px] justify-between ${view === 'comparison' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                            <span className="flex items-center gap-3">
                                <i className="fas fa-users opacity-40"></i>
                                {activeManager ? activeManager.name : 'Vista Global'}
                            </span>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                        </button>
                        {managerMenuOpen && (
                            <div className="dropdown-menu w-80">
                                <button onClick={() => { setView('comparison'); setManagerMenuOpen(false); }} className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl mb-1 flex items-center gap-3 ${view === 'comparison' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <i className="fas fa-globe-americas"></i> Comparativa Global
                                </button>
                                <div className="border-t my-2"></div>
                                {MANAGERS.map(m => (
                                    <button key={m.id} onClick={() => { setView(m.id); setManagerMenuOpen(false); }} className={`w-full text-left px-3 py-3 text-[10px] font-bold uppercase rounded-xl mb-1 flex items-center gap-4 ${view === m.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                        <span className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-700">{m.avatar}</span>
                                        <span className="truncate">{m.name}</span>
                                    </button>
                                ))}
                                {editorRole && (
                                    <>
                                        <div className="border-t my-2"></div>
                                        <button onClick={() => { setView('editor'); setManagerMenuOpen(false); }} className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl ${view === 'editor' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-amber-50'}`}>
                                            <i className="fas fa-edit mr-2"></i> Editor
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center bg-slate-900 rounded-2xl px-3 border border-white/10 ml-2">
                        {!editorRole ? (
                            <input type="password" value={password} onChange={e => {
                                const val = e.target.value;
                                setPassword(val);
                                if(val === '047') { setEditorRole('standard'); setPassword(''); setView('editor'); }
                                if(val === '30104750') { setEditorRole('super'); setPassword(''); setView('editor'); }
                            }} placeholder="PIN" className="w-16 bg-transparent text-white text-center text-xs py-3 font-black focus:outline-none placeholder:text-white/20" />
                        ) : (
                            <button onClick={() => { setEditorRole(null); setView('comparison'); }} className="text-emerald-400 text-xs py-3 font-black uppercase px-2">
                                {editorRole.toUpperCase()}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="w-full flex-grow flex flex-col py-8 px-4 sm:px-6">
                {view === 'comparison' && (
                    <div className="w-full space-y-12 animate-fade-in max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                            <div className="lg:col-span-8 space-y-8 flex flex-col">
                                <div className="bg-white p-6 md:p-10 rounded-[3rem] border shadow-sm flex flex-col">
                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-800 mb-8">Rendimiento Estratégico</h3>
                                    {/* PRIORIDAD: Altura fija y ResponsiveContainer envuelto */}
                                    <div style={{ width: '100%', height: '450px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                                                {MANAGERS.map(m => (
                                                    <Radar key={m.id} name={m.name} dataKey={m.id} stroke={m.color} fill={m.color} fillOpacity={0.05} strokeWidth={2} />
                                                ))}
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900' }} />
                                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: '900' }} iconType="circle" />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 md:p-10 rounded-[3rem] border shadow-sm flex flex-col">
                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-800 mb-8">Evolución</h3>
                                    <div style={{ width: '100%', height: '350px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dx={-5} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '800' }} />
                                                {MANAGERS.map(m => (
                                                    <Line key={m.id} type="monotone" dataKey={m.id} stroke={m.color} strokeWidth={2.5} dot={false} name={m.name} connectNulls={true} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col">
                                <h4 className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-6 text-center">Ranking Global</h4>
                                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
                                    {MANAGERS.sort((a,b) => globalAvg(b.id) - globalAvg(a.id)).map((m, rank) => {
                                        const score = globalAvg(m.id);
                                        return (
                                            <div key={m.id} onClick={() => setView(m.id)} className="group flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-[10px] font-black w-4 opacity-20">{rank + 1}</div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[9px] font-black">{m.avatar}</div>
                                                    <p className="text-[10px] font-bold uppercase truncate w-24">{m.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black tabular-nums" style={{ color: getHeatColor(score) }}>{score}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'editor' && editorRole && (
                    <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {MANAGERS.filter(m => editorFilter === 'all' || editorFilter === m.id).map(m => (
                            <div key={m.id} className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
                                <div className="flex justify-between items-center border-b pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">{m.avatar}</div>
                                        <h3 className="text-lg font-black uppercase text-slate-800">{m.name}</h3>
                                    </div>
                                    {!isAccumulated && (
                                        <button onClick={() => handleUpdate(data, {...comp, [m.id]: {...comp[m.id], [String(mIdx)]: !comp[m.id][String(mIdx)]}})} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${comp[m.id][String(mIdx)] ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                                            {comp[m.id][String(mIdx)] ? '✓ Validado' : 'Validar'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    {OBJECTIVES.map(obj => {
                                        if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                                        const oData = data[m.id][obj.id][mIdx];
                                        const achVal = isAccumulated ? calculateAnualAvg(m.id, obj.id) : getObjectiveAchievement(m.id, obj.id, mIdx);
                                        return (
                                            <div key={obj.id} className="p-6 rounded-[2rem] border bg-slate-50 border-slate-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-[11px] font-black uppercase text-slate-700">{obj.name}</h4>
                                                    <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white border" style={{ color: getHeatColor(achVal) }}>{achVal}%</span>
                                                </div>
                                                {/* Controles simplificados para demo */}
                                                {!obj.sub ? (
                                                    <input disabled={isAccumulated} type="number" value={isAccumulated ? '' : oData.v} onChange={e => {
                                                        const newData = {...data};
                                                        newData[m.id][obj.id][mIdx].v = parseFloat(e.target.value) || 0;
                                                        handleUpdate(newData, comp);
                                                    }} className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 text-center text-2xl font-black outline-none" />
                                                ) : (
                                                    <div className="space-y-3">
                                                        {obj.sub.map(s => (
                                                            <div key={s.id} className="flex items-center gap-3">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase w-20 truncate">{s.name}</span>
                                                                <input disabled={isAccumulated} type="number" value={isAccumulated ? '' : oData.s[s.id].v} onChange={e => {
                                                                    const newData = {...data};
                                                                    newData[m.id][obj.id][mIdx].s[s.id].v = parseFloat(e.target.value) || 0;
                                                                    handleUpdate(newData, comp);
                                                                }} className="flex-grow bg-white border border-slate-200 rounded-lg py-1 text-center font-black" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeManager && (
                    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                        {OBJECTIVES.map(obj => {
                            if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                            const ach = isAccumulated ? calculateAnualAvg(view, obj.id) : getObjectiveAchievement(view, obj.id, mIdx);
                            const color = getHeatColor(ach);
                            return (
                                <div key={obj.id} className="glass-card p-10 rounded-[3.5rem] shadow-sm flex flex-col hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start mb-8">
                                        <h4 className="text-xl font-black uppercase text-slate-800 leading-tight tracking-tighter w-2/3">{obj.name}</h4>
                                        <span className="text-3xl font-black tabular-nums" style={{ color: color }}>{ach}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-2xl h-16 overflow-hidden relative border-[4px] border-white shadow-inner">
                                        <div className="h-full heat-bar-transition rounded-r-2xl" style={{ width: `${ach}%`, backgroundColor: color }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <footer className="w-full bg-slate-900 py-12 px-6 text-center text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">
                PERFORMANCE ANALYTICS DASHBOARD — Leroy Merlin Strategic Units
            </footer>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
