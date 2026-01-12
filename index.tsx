import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Usamos una ruta relativa robusta para Hostinger y subdirectorios
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
    return Math.max(0, Math.min(100, Math.round(achievement)));
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
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("El servidor no devolvió JSON. Revisa la ruta de api.php.");
                }

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
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: newData, completions: newComp })
            });
            if (!res.ok) throw new Error("Fallo al guardar cambios");
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
        // Filtramos solo los meses que el manager tiene validados (cerrados)
        const validated = MONTHS.map((_, i) => i).filter(idx => comp[mId][idx] === true);
        if (validated.length === 0) return 0;
        
        const sum = validated.reduce((acc, i) => {
            const val = getObjectiveAchievement(mId, oId, i);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        
        return Math.round(sum / validated.length);
    };

    const globalAvg = (mId) => {
        if (!data || !comp || !comp[mId]) return 0;
        const activeScores = OBJECTIVES.map(o => calculateAnualAvg(mId, o.id));
        if (activeScores.length === 0) return 0;
        const sum = activeScores.reduce((a, b) => a + b, 0);
        return Math.round(sum / OBJECTIVES.length);
    };

    const getMonthlyAch = (mId, monthIndex) => {
        if (!data || !data[mId]) return 0;
        const activeObjs = OBJECTIVES.filter(o => {
            const isQuarterlyOk = !o.quarterly || [2, 5, 8, 11].includes(monthIndex);
            return isQuarterlyOk && data[mId][o.id] && data[mId][o.id][monthIndex]?.e;
        });
        if (activeObjs.length === 0) return 0;
        const sum = activeObjs.reduce((acc, o) => acc + getObjectiveAchievement(mId, o.id, monthIndex), 0);
        return Math.round(sum / activeObjs.length);
    };

    const renderNameWithLink = (name, className) => {
        if (name === SPECIAL_NAME) {
            return (
                <a href={SPECIAL_LINK} target="_blank" rel="noopener noreferrer" className={`${className} strategic-link`}>
                    {name} <i className="fas fa-external-link-alt ml-1 text-[8px] opacity-50"></i>
                </a>
            );
        }
        return <span className={className}>{name}</span>;
    };

    const getQuarterSuffix = (idx) => {
        if (idx === 2) return " - 1º Trimestre";
        if (idx === 5) return " - 2º Trimestre";
        if (idx === 8) return " - 3º Trimestre";
        if (idx === 11) return " - 4º Trimestre";
        return "";
    };

    const activeManager = view !== 'comparison' && view !== 'editor' ? MANAGERS.find(m => m.id === view) : null;

    const radarData = useMemo(() => {
        if (!data || !comp) return [];
        return OBJECTIVES.map(o => {
            const point: any = { subject: o.name };
            MANAGERS.forEach(m => {
                let val = 0;
                if (isAccumulated) {
                    // En acumulado siempre calculamos el promedio de lo cerrado, sin importar mIdx
                    val = calculateAnualAvg(m.id, o.id);
                } else {
                    // Solo mostramos si el mes seleccionado está cerrado
                    const isClosed = comp[m.id] && comp[m.id][mIdx] === true;
                    val = isClosed ? getObjectiveAchievement(m.id, o.id, mIdx) : 0;
                }
                point[m.id] = isNaN(val) ? 0 : val;
            });
            return point;
        });
    }, [data, activeMonth, comp, isAccumulated, mIdx]);

    const trendData = useMemo(() => {
        if (!data || !comp) return [];
        return MONTHS.map((mName, i) => {
            const monthPoint: any = { name: mName.substring(0, 3) };
            MANAGERS.forEach(m => {
                // Solo mostrar meses validados en la tendencia para evitar caídas a cero erróneas
                const isClosed = comp[m.id] && comp[m.id][i] === true;
                const val = isClosed ? getMonthlyAch(m.id, i) : null; 
                monthPoint[m.id] = val;
            });
            return monthPoint;
        });
    }, [data, comp]);

    if (!data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-indigo-400">
            <i className="fas fa-spinner fa-spin mb-4 text-3xl"></i>
            <p className="uppercase tracking-widest text-xs">Sincronizando Dashboard...</p>
            {apiError && <p className="mt-4 text-red-500 text-[10px] font-bold max-w-xs text-center">{apiError}</p>}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {apiError && (
                <div className="bg-red-600 text-white text-[10px] font-black uppercase py-2 px-4 text-center sticky top-0 z-[2000] flex items-center justify-center gap-4 shadow-xl">
                    <i className="fas fa-exclamation-circle text-lg"></i>
                    API Error: {apiError}
                    <button onClick={() => window.location.reload()} className="bg-white text-red-600 px-4 py-1 rounded-full text-[10px] font-black hover:bg-slate-100 transition-colors">REINTENTAR</button>
                </div>
            )}
            
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
                        <button 
                            onClick={() => setMonthMenuOpen(!monthMenuOpen)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 transition-all border border-slate-200 min-w-[200px] justify-between"
                        >
                            <span className="flex items-center gap-3">
                                <i className="far fa-calendar-alt opacity-40"></i>
                                {isAccumulated ? 'Acumulado' : (MONTHS[mIdx] + getQuarterSuffix(mIdx))}
                            </span>
                            <i className={`fas fa-chevron-down text-[10px] transition-transform ${monthMenuOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {monthMenuOpen && (
                            <div className="dropdown-menu w-72">
                                <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
                                    {MONTHS.map((m, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => { setActiveMonth(idx.toString()); setMonthMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase rounded-xl transition-all mb-1 ${activeMonth === idx.toString() ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {m}<span className="opacity-50 lowercase ml-1">{getQuarterSuffix(idx)}</span>
                                        </button>
                                    ))}
                                    <div className="border-t my-2"></div>
                                    <button 
                                        onClick={() => { setActiveMonth('accumulated'); setMonthMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${activeMonth === 'accumulated' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                    >
                                        ✓ Año Acumulado
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={managerMenuRef}>
                        <button 
                            onClick={() => setManagerMenuOpen(!managerMenuOpen)}
                            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 transition-all border min-w-[240px] justify-between ${view === 'comparison' ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm' : 'bg-indigo-600 text-white border-indigo-500 shadow-md'}`}
                        >
                            <span className="flex items-center gap-3">
                                <i className="fas fa-users opacity-40"></i>
                                {activeManager ? activeManager.name : 'Vista Global'}
                            </span>
                            <i className={`fas fa-chevron-down text-[10px] transition-transform ${managerMenuOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {managerMenuOpen && (
                            <div className="dropdown-menu w-80">
                                <div className="max-h-96 overflow-y-auto custom-scrollbar p-1">
                                    <button 
                                        onClick={() => { setView('comparison'); setManagerMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl mb-1 flex items-center gap-3 ${view === 'comparison' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <i className="fas fa-globe-americas"></i> Comparativa Global
                                    </button>
                                    <div className="border-t my-2"></div>
                                    {MANAGERS.map(m => (
                                        <button 
                                            key={m.id} 
                                            onClick={() => { setView(m.id); setManagerMenuOpen(false); }}
                                            className={`w-full text-left px-3 py-3 text-[10px] font-bold uppercase rounded-xl transition-all mb-1 flex items-center gap-4 ${view === m.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-700 flex-shrink-0">{m.avatar}</span>
                                            <span className="truncate">{m.name}</span>
                                        </button>
                                    ))}
                                    {editorRole && (
                                        <>
                                            <div className="border-t my-2"></div>
                                            <button 
                                                onClick={() => { setView('editor'); setManagerMenuOpen(false); }}
                                                className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl ${view === 'editor' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-amber-50'}`}
                                            >
                                                <i className="fas fa-edit mr-2"></i> Editor de Datos {editorRole === 'super' ? '(SUPER)' : ''}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center bg-slate-900 rounded-2xl px-3 border border-white/10 shadow-lg ml-2">
                        {!editorRole ? (
                            <>
                                <i className="fas fa-fingerprint text-white/30 text-xs mr-2"></i>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setPassword(val);
                                        if(val === '047') { setEditorRole('standard'); setPassword(''); setView('editor'); }
                                        if(val === '30104750') { setEditorRole('super'); setPassword(''); setView('editor'); }
                                    }} 
                                    placeholder="PIN" 
                                    className="w-16 bg-transparent text-white text-center text-xs py-3 font-black focus:outline-none placeholder:text-white/20" 
                                />
                            </>
                        ) : (
                            <button onClick={() => { setEditorRole(null); setView('comparison'); }} className="text-emerald-400 text-xs py-3 font-black uppercase tracking-widest px-2">
                                {editorRole.toUpperCase()} UNLOCKED
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
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-800">Rendimiento Estratégico</h3>
                                        <span className="hidden sm:inline-block text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-full border tracking-widest">HABILIDADES GLOBALES</span>
                                    </div>
                                    <div className="radar-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                                                {MANAGERS.map(m => (
                                                    <Radar 
                                                        key={m.id}
                                                        name={m.name} 
                                                        dataKey={m.id} 
                                                        stroke={m.color} 
                                                        fill={m.color} 
                                                        fillOpacity={0.05} 
                                                        strokeWidth={2} 
                                                    />
                                                ))}
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900' }} />
                                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: '900' }} iconType="circle" />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 md:p-10 rounded-[3rem] border shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-800">Evolución</h3>
                                        <span className="hidden sm:inline-block text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-full border tracking-widest">TENDENCIA ANUAL</span>
                                    </div>
                                    <div className="trend-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dx={-5} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '800' }} />
                                                {MANAGERS.map(m => (
                                                    <Line 
                                                        key={m.id} 
                                                        type="monotone" 
                                                        dataKey={m.id} 
                                                        stroke={m.color} 
                                                        strokeWidth={2.5} 
                                                        dot={false} 
                                                        activeDot={{ r: 5, strokeWidth: 0 }} 
                                                        name={m.name}
                                                        connectNulls={true}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col">
                                <div className="text-center mb-8">
                                    <h4 className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2">Ranking Global</h4>
                                    <p className="text-xs font-bold text-indigo-400 uppercase">EFICIENCIA POR MANAGER (VALidados)</p>
                                </div>
                                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
                                    {MANAGERS.sort((a,b) => globalAvg(b.id) - globalAvg(a.id)).map((m, rank) => {
                                        const score = globalAvg(m.id);
                                        return (
                                            <div key={m.id} onClick={() => setView(m.id)} className="group flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-[10px] font-black opacity-20 w-4">{rank + 1}</div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[9px] font-black" style={{ borderLeft: `3px solid ${m.color}` }}>{m.avatar}</div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-tight truncate w-24">{m.name}</p>
                                                        <div className="h-1 bg-white/10 w-20 rounded-full mt-1.5 overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: m.color }}></div>
                                                        </div>
                                                    </div>
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

                <div className="w-full max-w-7xl mx-auto">
                    {view === 'editor' && editorRole ? (
                        <div className="animate-fade-in space-y-10 pb-20">
                            {isAccumulated && (
                                <div className="bg-amber-100 border-2 border-amber-200 p-8 rounded-[3rem] text-center shadow-md max-w-4xl mx-auto flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center text-amber-600">
                                        <i className="fas fa-lock text-xl"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase text-amber-900 tracking-widest">Editor en Modo Lectura</h4>
                                        <p className="text-[11px] font-bold text-amber-800/70 mt-2 uppercase max-w-md">
                                            El acumulado no se puede editar ya que es el cálculo automático de los meses cerrados. 
                                            Para editar, seleccione un mes específico.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-center gap-6">
                                <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Configurar Managers</h2>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button 
                                        onClick={() => setEditorFilter('all')}
                                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${editorFilter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                    >
                                        Todos
                                    </button>
                                    {MANAGERS.map(m => (
                                        <button 
                                            key={m.id}
                                            onClick={() => setEditorFilter(m.id)}
                                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all flex items-center gap-2 ${editorFilter === m.id ? 'bg-indigo-600 text-white shadow-lg border-indigo-500' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                                        >
                                            <span className="opacity-30">{m.avatar}</span> {m.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {MANAGERS.filter(m => editorFilter === 'all' || editorFilter === m.id).map(m => (
                                    <div key={m.id} className={`bg-white p-8 rounded-[3rem] border shadow-sm space-y-6 transition-opacity ${isAccumulated ? 'opacity-75' : ''}`}>
                                        <div className="flex justify-between items-center border-b pb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">{m.avatar}</div>
                                                <div>
                                                    <h3 className="text-lg font-black uppercase text-slate-800 tracking-tighter">{m.name}</h3>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                        {isAccumulated ? 'TOTAL ANUAL (LECTURA)' : (editorRole === 'super' ? 'SUPER CONFIG' : 'VALORES MES')}
                                                    </p>
                                                </div>
                                            </div>
                                            {!isAccumulated && (
                                                <button 
                                                    onClick={() => handleUpdate(data, {...comp, [m.id]: {...comp[m.id], [mIdx]: !comp[m.id][mIdx]}})} 
                                                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${comp[m.id][mIdx] ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' : 'bg-slate-50 text-slate-400'}`}
                                                >
                                                    {comp[m.id][mIdx] ? '✓ Validado' : 'Validar'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-6">
                                            {OBJECTIVES.map(obj => {
                                                if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                                                const oData = data[m.id][obj.id][mIdx];
                                                const achVal = isAccumulated ? calculateAnualAvg(m.id, obj.id) : getObjectiveAchievement(m.id, obj.id, mIdx);
                                                
                                                return (
                                                    <div key={obj.id} className={`p-6 rounded-[2rem] border transition-all ${oData.e ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-dashed border-slate-200 opacity-60'}`}>
                                                        <div className="flex justify-between items-center mb-6">
                                                            <div className="flex items-center gap-4">
                                                                {editorRole === 'super' && !isAccumulated && (
                                                                    <div className="relative inline-block w-8 mr-2 align-middle select-none transition duration-200 ease-in">
                                                                        <input type="checkbox" checked={oData.e} onChange={e => {
                                                                            const newData = {...data};
                                                                            newData[m.id][obj.id][mIdx].e = e.target.checked;
                                                                            handleUpdate(newData, comp);
                                                                        }} className="switch-input absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer z-10" style={{top: '1px'}} />
                                                                        <label className="switch-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                                                    </div>
                                                                )}
                                                                <h4 className="text-[11px] font-black uppercase text-slate-700">
                                                                    {obj.sub ? obj.name : getDynamicLabel(obj.id, oData.t || (typeof OBJECTIVE_RULES[obj.id].target === 'function' ? OBJECTIVE_RULES[obj.id].target(mIdx) : OBJECTIVE_RULES[obj.id].target))}
                                                                </h4>
                                                            </div>
                                                            {oData.e && (
                                                                <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white border shadow-sm" style={{ color: getHeatColor(achVal) }}>
                                                                    {achVal}%
                                                                </span>
                                                            )}
                                                        </div>

                                                        {oData.e && (
                                                            <div className="space-y-4">
                                                                {!obj.sub ? (
                                                                    <div className={`grid grid-cols-1 ${(editorRole === 'super' && !isAccumulated) ? 'sm:grid-cols-3' : ''} gap-3`}>
                                                                        <div>
                                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">Valor Real</label>
                                                                            <input 
                                                                                disabled={isAccumulated} 
                                                                                type="number" 
                                                                                step="any" 
                                                                                value={isAccumulated ? '' : oData.v} 
                                                                                placeholder={isAccumulated ? 'Calculado' : '0.0'}
                                                                                onChange={e => {
                                                                                    const newData = {...data};
                                                                                    newData[m.id][obj.id][mIdx].v = parseFloat(e.target.value) || 0;
                                                                                    handleUpdate(newData, comp);
                                                                                }} 
                                                                                className={`w-full bg-white border-2 border-slate-200 rounded-xl py-3 text-center text-2xl font-black focus:border-indigo-500 outline-none shadow-sm ${isAccumulated ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''}`} 
                                                                            />
                                                                        </div>
                                                                        {editorRole === 'super' && !isAccumulated && (
                                                                            <>
                                                                            <div>
                                                                                <label className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1 text-center">Mínimo</label>
                                                                                <input type="number" step="any" value={oData.b === null ? '' : oData.b} placeholder="Auto" onChange={e => {
                                                                                    const newData = {...data};
                                                                                    newData[m.id][obj.id][mIdx].b = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                    handleUpdate(newData, comp);
                                                                                }} className="w-full bg-white border-2 border-emerald-100 rounded-xl py-3 text-center text-xl font-black text-emerald-600 focus:border-emerald-500 outline-none" />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1 text-center">Objetivo</label>
                                                                                <input type="number" step="any" value={oData.t === null ? '' : oData.t} placeholder="Auto" onChange={e => {
                                                                                    const newData = {...data};
                                                                                    newData[m.id][obj.id][mIdx].t = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                    handleUpdate(newData, comp);
                                                                                }} className="w-full bg-white border-2 border-indigo-100 rounded-xl py-3 text-center text-xl font-black text-indigo-600 focus:border-indigo-500 outline-none" />
                                                                            </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {obj.sub.map(s => {
                                                                            const sData = oData.s[s.id];
                                                                            const subAch = isAccumulated ? calculateAnualAvg(m.id, s.id) : calculateAch(s.id, sData.v, mIdx, sData.t, sData.b);
                                                                            return (
                                                                                <div key={s.id} className={`bg-white p-4 rounded-2xl border transition-all ${sData.e ? 'border-slate-100 shadow-sm' : 'border-dashed border-slate-200 opacity-40'}`}>
                                                                                    <div className="flex justify-between items-center mb-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {editorRole === 'super' && !isAccumulated && (
                                                                                                <input type="checkbox" checked={sData.e} onChange={e => {
                                                                                                    const newData = {...data};
                                                                                                    newData[m.id][obj.id][mIdx].s[s.id].e = e.target.checked;
                                                                                                    handleUpdate(newData, comp);
                                                                                                }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                                                                                            )}
                                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                                                                                        </div>
                                                                                        {sData.e && (
                                                                                            <span className="text-[9px] font-black" style={{ color: getHeatColor(subAch) }}>
                                                                                                {subAch + '%'}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {sData.e && (
                                                                                        <div className={`grid grid-cols-1 ${(editorRole === 'super' && !isAccumulated) ? 'sm:grid-cols-3' : ''} gap-2`}>
                                                                                            <input 
                                                                                                disabled={isAccumulated} 
                                                                                                type="number" 
                                                                                                step="any" 
                                                                                                value={isAccumulated ? '' : sData.v} 
                                                                                                placeholder={isAccumulated ? 'Calculado' : '0.0'}
                                                                                                onChange={e => {
                                                                                                    const newData = {...data};
                                                                                                    newData[m.id][obj.id][mIdx].s[s.id].v = parseFloat(e.target.value) || 0;
                                                                                                    handleUpdate(newData, comp);
                                                                                                }} 
                                                                                                className={`bg-slate-50 rounded-lg py-2 text-center text-lg font-black outline-none border border-slate-200 ${isAccumulated ? 'opacity-40 bg-slate-100' : ''}`} 
                                                                                            />
                                                                                            {editorRole === 'super' && !isAccumulated && (
                                                                                                <>
                                                                                                <input type="number" step="any" value={sData.b === null ? '' : sData.b} placeholder="Min" onChange={e => {
                                                                                                    const newData = {...data};
                                                                                                    newData[m.id][obj.id][mIdx].s[s.id].b = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                                    handleUpdate(newData, comp);
                                                                                                }} className="bg-emerald-50 text-emerald-700 rounded-lg py-2 text-center text-lg font-black outline-none border border-emerald-100" />
                                                                                                <input type="number" step="any" value={sData.t === null ? '' : sData.t} placeholder="Obj" onChange={e => {
                                                                                                    const newData = {...data};
                                                                                                    newData[m.id][obj.id][mIdx].s[s.id].t = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                                    handleUpdate(newData, comp);
                                                                                                }} className="bg-indigo-50 text-indigo-700 rounded-lg py-2 text-center text-lg font-black outline-none border border-indigo-100" />
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeManager ? (
                        <div className="animate-fade-in space-y-12 pb-24 max-w-7xl mx-auto">
                            <div className="flex items-center gap-8 px-4">
                                <div className="h-[2px] bg-slate-200 flex-grow"></div>
                                <h3 className="text-xl font-black uppercase text-slate-400 tracking-[0.3em] whitespace-nowrap">KPI DETALLADOS: {activeManager.name}</h3>
                                <div className="h-[2px] bg-slate-200 flex-grow"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {OBJECTIVES.map(obj => {
                                    if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                                    const oData = data[view][obj.id][mIdx];
                                    if (!oData || !oData.e) return null;

                                    const ach = isAccumulated ? calculateAnualAvg(view, obj.id) : getObjectiveAchievement(view, obj.id, mIdx);
                                    const rule = OBJECTIVE_RULES[obj.id];
                                    const defaultTarget = rule ? (typeof rule.target === 'function' ? rule.target(mIdx) : rule.target) : 100;
                                    const currentTarget = (oData.t !== null && oData.t !== undefined) ? oData.t : defaultTarget;
                                    const defaultBase = rule ? (typeof rule.base === 'function' ? rule.base(mIdx) : rule.base) : 0;
                                    const currentBase = (oData.b !== null && oData.b !== undefined) ? oData.b : defaultBase;
                                    const unit = rule ? rule.unit : '%';
                                    const color = getHeatColor(ach);
                                    
                                    return (
                                        <div key={obj.id} className="glass-card p-10 rounded-[3.5rem] shadow-sm flex flex-col hover:shadow-2xl transition-all border-slate-100">
                                            <div className="flex justify-between items-start mb-8">
                                                {renderNameWithLink(obj.sub ? obj.name : getDynamicLabel(obj.id, currentTarget), "text-xl font-black uppercase text-slate-800 leading-tight tracking-tighter w-2/3")}
                                                <span className="text-3xl font-black tabular-nums" style={{ color: color }}>{ach}%</span>
                                            </div>

                                            {!obj.sub ? (
                                                <div className="mb-6">
                                                    <div className="w-full bg-slate-100 rounded-2xl h-16 overflow-hidden shadow-inner relative border-[4px] border-white">
                                                        <div className="h-full heat-bar-transition rounded-r-2xl flex items-center justify-center shadow-lg" style={{ width: `${ach}%`, backgroundColor: color }}>
                                                            {!isAccumulated && ach > 15 && <span className="text-2xl font-black text-white bar-label-shadow">{oData.v}{unit}</span>}
                                                            {isAccumulated && ach > 15 && <span className="text-2xl font-black text-white bar-label-shadow">{ach}%</span>}
                                                        </div>
                                                        {!isAccumulated && ach <= 15 && <span className="absolute left-6 top-0 h-full flex items-center text-2xl font-black text-slate-400">{oData.v}{unit}</span>}
                                                        {isAccumulated && ach <= 15 && <span className="absolute left-6 top-0 h-full flex items-center text-2xl font-black text-slate-400">{ach}%</span>}
                                                    </div>
                                                    <div className="flex justify-between mt-4 px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-80">
                                                        <span>{isAccumulated ? 'Anual' : `Min: ${currentBase}${unit}`}</span>
                                                        <span>{!isAccumulated && `Obj: ${currentTarget}${unit}`}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-5">
                                                    {obj.sub.map(s => {
                                                        const sData = oData.s[s.id];
                                                        if (!sData.e) return null;
                                                        const sAch = isAccumulated ? calculateAnualAvg(view, s.id) : calculateAch(s.id, sData.v, mIdx, sData.t, sData.b);
                                                        const sRule = OBJECTIVE_RULES[s.id];
                                                        const sDefTarget = sRule ? (typeof sRule.target === 'function' ? sRule.target(mIdx) : sRule.target) : 100;
                                                        const sCurTarget = (sData.t !== null && sData.t !== undefined) ? sData.t : sDefTarget;
                                                        const sUnit = sRule ? sRule.unit : '%';
                                                        const sColor = typeof sAch === 'number' ? getHeatColor(sAch) : '#cbd5e1';
                                                        return (
                                                            <div key={s.id} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100/50 hover:bg-white transition-all group/sub">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-tight w-2/3">
                                                                        {getDynamicLabel(s.id, sCurTarget)}
                                                                    </span>
                                                                    <span className="text-sm font-black tabular-nums" style={{ color: sColor }}>{sAch}{typeof sAch === 'number' ? '%' : ''}</span>
                                                                </div>
                                                                <div className="w-full bg-white rounded-xl h-10 overflow-hidden shadow-sm relative border border-slate-200">
                                                                    <div className="h-full heat-bar-transition rounded-r-xl flex items-center justify-center" style={{ width: `${sAch}%`, backgroundColor: sColor }}>
                                                                        {Number(sAch) > 20 && !isAccumulated && <span className="text-xs font-black text-white bar-label-shadow">{sData.v}{sUnit}</span>}
                                                                        {Number(sAch) > 20 && isAccumulated && <span className="text-xs font-black text-white bar-label-shadow">{sAch}%</span>}
                                                                    </div>
                                                                    {Number(sAch) <= 20 && !isAccumulated && <span className="absolute left-4 top-0 h-full flex items-center text-xs font-black text-slate-400">{sData.v}{sUnit}</span>}
                                                                    {Number(sAch) <= 20 && isAccumulated && <span className="absolute left-4 top-0 h-full flex items-center text-xs font-black text-slate-400">{sAch}%</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>

            <footer className="w-full bg-slate-900 py-12 px-6 text-center text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                    PERFORMANCE ANALYTICS DASHBOARD © {new Date().getFullYear()} — Leroy Merlin Strategic Units
                </p>
            </footer>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);