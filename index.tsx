import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_URL = "api.php";
const SPECIAL_NAME = 'KPI ESTRATÉGICOS VENDEDORES';
const SPECIAL_LINK = 'https://gonzalezjavier.com/AMP/';

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

const getMonthWithQuarter = (idx: number) => {
    const name = MONTHS[idx];
    if (idx === 2) return `${name} - 1 Trimestre`;
    if (idx === 5) return `${name} - 2 Trimestre`;
    if (idx === 8) return `${name} - 3 Trimestre`;
    if (idx === 11) return `${name} - 4 Trimestre`;
    return name;
};

const OBJECTIVE_RULES = {
    's1': { label: (v) => `Venta +${v}%`, target: 10, base: 0, unit: '%' },      
    's2': { label: (v) => `MAP +${v}%`, target: 1, base: 0, unit: '%' },       
    's3': { label: (v) => `Gama >${v}%`, target: 85, base: 80, unit: '%' },     
    'obj2': { label: (v) => `Satisfacción >${v}pts`, target: 70, base: 60, unit: 'pts' }, 
    'f1': { label: (v) => `Demarca Con. >${v}pts`, target: 80, base: 59, unit: 'pts' },    
    'f2': { label: (v) => `Demarca Des. >${v}pts`, target: 80, base: 59, unit: 'pts' },    
    'f3': { label: (v) => `Rev. Descuentos >${v}pts`, target: 80, base: 59, unit: 'pts' },    
    'f4': { label: (v) => `Rev. Cod 48 >${v}pts`, target: 80, base: 59, unit: 'pts' },    
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

const OBJECTIVES = [
    { id: 'obj1', name: 'PERFORMANCE', sub: [{id:'s1', name:'Venta'}, {id:'s2', name:'MAP'}, {id:'s3', name:'Gama'}] },
    { id: 'obj3', name: 'FULLGREEN', sub: [{id:'f1', name:'Demarca Con.'}, {id:'f2', name:'Demarca Des.'}, {id:'f3', name:'Rev. Descuentos'}, {id:'f4', name:'Rev. Cod 48'}] },
    { id: 'obj4', name: 'TALENTO', sub: [{id:'t1', name:'Formaciones'}, {id:'t2', name:'One & One'}, {id:'t3', name:'PDI'}, {id:'t4', name:'ENPS'}], quarterly: true },
    { id: 'obj2', name: 'SATISFACCIÓN CLIENTE' },
    { id: 'obj5', name: SPECIAL_NAME }
];

const getSafeRuleBase = (id, month) => {
    const rule = OBJECTIVE_RULES[id];
    if (!rule) return 0;
    return typeof rule.base === 'function' ? rule.base(month) : rule.base;
};

const getSafeRuleTarget = (id, month) => {
    const rule = OBJECTIVE_RULES[id];
    if (!rule) return 100;
    return typeof rule.target === 'function' ? rule.target(month) : rule.target;
};

const getSafeRuleUnit = (id) => {
    return OBJECTIVE_RULES[id]?.unit || '';
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

const getHeatColor = (val) => {
    if (val <= 0) return '#cbd5e1'; 
    if (val < 50) return '#ef4444'; // Rojo para menos del 50% de cumplimiento
    if (val < 85) return '#f3af4a'; // Ámbar/Amarillo
    return '#67c23a'; // Verde
};

const App = () => {
    const [activeMonth, setActiveMonth] = useState('accumulated');
    const [view, setView] = useState('comparison');
    const [editorRole, setEditorRole] = useState(null); 
    const [password, setPassword] = useState('');
    const [data, setData] = useState(null);
    const [comp, setComp] = useState(null);
    const [managerMenuOpen, setManagerMenuOpen] = useState(false);
    const [monthMenuOpen, setMonthMenuOpen] = useState(false);
    
    const [trendManagers, setTrendManagers] = useState(MANAGERS.map(m => m.id));
    const [trendKpis, setTrendKpis] = useState(OBJECTIVES.map(o => o.id));
    const [trendFilterMenuOpen, setTrendFilterMenuOpen] = useState(false);

    const managerMenuRef = useRef(null);
    const monthMenuRef = useRef(null);
    const trendMenuRef = useRef(null);

    const isAccumulated = activeMonth === 'accumulated';
    const isQuarter = activeMonth.startsWith('q');
    
    const getActiveDisplayLabel = () => {
        if (isAccumulated) return 'Año Acumulado';
        if (activeMonth === 'q1') return '1 Trimestre';
        if (activeMonth === 'q2') return '2 Trimestre';
        if (activeMonth === 'q3') return '3 Trimestre';
        if (activeMonth === 'q4') return '4 Trimestre';
        return getMonthWithQuarter(parseInt(activeMonth));
    };

    const mIdx = useMemo(() => {
        if (isAccumulated) return 11;
        if (activeMonth === 'q1') return 2;
        if (activeMonth === 'q2') return 5;
        if (activeMonth === 'q3') return 8;
        if (activeMonth === 'q4') return 11;
        return parseInt(activeMonth);
    }, [activeMonth, isAccumulated]);

    const initializeDefault = () => {
        const initData = {};
        const initComp = {};
        MANAGERS.forEach(m => {
            initData[m.id] = {};
            initComp[m.id] = {};
            OBJECTIVES.forEach(o => {
                initData[m.id][o.id] = {};
                MONTHS.forEach((_, i) => {
                    const key = String(i);
                    if (o.sub) {
                        initData[m.id][o.id][key] = {
                            e: true,
                            s: o.sub.reduce((acc, s) => ({
                                ...acc, 
                                [s.id]: { v: 0, e: true, t: null, b: null }
                            }), {})
                        };
                    } else {
                        initData[m.id][o.id][key] = { v: 0, e: true, t: null, b: null };
                    }
                    initComp[m.id][key] = false;
                });
            });
        });
        setData(initData);
        setComp(initComp);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(API_URL + "?t=" + Date.now());
                const json = await res.json();
                if (json && json.data) {
                    setData(json.data);
                    setComp(json.completions);
                } else {
                    initializeDefault();
                }
            } catch (e) {
                initializeDefault();
            }
        };
        load();

        const handleClickOutside = (event) => {
            if (managerMenuRef.current && !managerMenuRef.current.contains(event.target)) setManagerMenuOpen(false);
            if (monthMenuRef.current && !monthMenuRef.current.contains(event.target)) setMonthMenuOpen(false);
            if (trendMenuRef.current && !trendMenuRef.current.contains(event.target)) setTrendFilterMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveToDb = async (newData, newComp) => {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: newData, completions: newComp })
            });
        } catch (e) { console.error(e); }
    };

    const handleUpdate = (newData, newComp) => {
        if (isAccumulated || isQuarter) return;
        setData({...newData});
        setComp({...newComp});
        saveToDb(newData, newComp);
    };

    const getObjectiveAchievement = (mId, oId, monthIndex) => {
        const key = String(monthIndex);
        if (!data || !data[mId] || !data[mId][oId] || !data[mId][oId][key]) return 0;
        const objData = data[mId][oId][key];
        const objMeta = OBJECTIVES.find(o => o.id === oId);
        if (!objMeta || !objData.e) return 0;

        if (!objMeta.sub) {
            return calculateAch(oId, objData.v, monthIndex, objData.t, objData.b);
        } else {
            const enabledSubs = objMeta.sub.filter(s => objData.s?.[s.id]?.e);
            if (enabledSubs.length === 0) return 0;
            const sum = enabledSubs.reduce((acc, s) => acc + calculateAch(s.id, objData.s?.[s.id]?.v || 0, monthIndex, objData.s?.[s.id]?.t, objData.s?.[s.id]?.b), 0);
            return Math.round(sum / enabledSubs.length);
        }
    };

    const getSubObjectiveAchievement = (mId, oId, sId, monthIndex) => {
        const key = String(monthIndex);
        if (!data || !data[mId] || !data[mId][oId] || !data[mId][oId][key]) return 0;
        const subData = data[mId][oId][key].s?.[sId];
        if (!subData || !subData.e) return 0;
        return calculateAch(sId, subData.v || 0, monthIndex, subData.t, subData.b);
    };

    const calculateTimeframeAvg = (mId, oId, timeframe) => {
        if (!comp || !data || !comp[mId]) return 0;
        let monthsToAverage = [];
        if (timeframe === 'accumulated') {
            monthsToAverage = Object.keys(comp[mId] || {}).filter(mKey => comp[mId][mKey] === true);
        } else if (timeframe.startsWith('q')) {
            const q = parseInt(timeframe.charAt(1));
            const start = (q - 1) * 3;
            monthsToAverage = [start, start + 1, start + 2].map(String).filter(mKey => comp[mId][mKey] === true);
        }
        if (monthsToAverage.length === 0) return 0;
        const sum = monthsToAverage.reduce((acc, mKey) => acc + getObjectiveAchievement(mId, oId, parseInt(mKey)), 0);
        return Math.round(sum / monthsToAverage.length);
    };

    const calculateSubTimeframeAvg = (mId, oId, sId, timeframe) => {
        if (!comp || !data || !comp[mId]) return 0;
        let monthsToAverage = [];
        if (timeframe === 'accumulated') {
            monthsToAverage = Object.keys(comp[mId] || {}).filter(mKey => comp[mId][mKey] === true);
        } else if (timeframe.startsWith('q')) {
            const q = parseInt(timeframe.charAt(1));
            const start = (q - 1) * 3;
            monthsToAverage = [start, start + 1, start + 2].map(String).filter(mKey => comp[mId][mKey] === true);
        }
        if (monthsToAverage.length === 0) return 0;
        const sum = monthsToAverage.reduce((acc, mKey) => acc + getSubObjectiveAchievement(mId, oId, sId, parseInt(mKey)), 0);
        return Math.round(sum / monthsToAverage.length);
    };

    const calculateValueAvg = (mId, oId, timeframe) => {
        if (!comp || !data || !comp[mId]) return 0;
        let monthsToAverage = [];
        if (timeframe === 'accumulated') {
            monthsToAverage = Object.keys(comp[mId] || {}).filter(mKey => comp[mId][mKey] === true);
        } else if (timeframe.startsWith('q')) {
            const q = parseInt(timeframe.charAt(1));
            const start = (q - 1) * 3;
            monthsToAverage = [start, start + 1, start + 2].map(String).filter(mKey => comp[mId][mKey] === true);
        }
        if (monthsToAverage.length === 0) return 0;
        const sum = monthsToAverage.reduce((acc, mKey) => acc + (data[mId][oId][mKey]?.v || 0), 0);
        return (sum / monthsToAverage.length).toFixed(1);
    };

    const calculateSubValueAvg = (mId, oId, sId, timeframe) => {
        if (!comp || !data || !comp[mId]) return 0;
        let monthsToAverage = [];
        if (timeframe === 'accumulated') {
            monthsToAverage = Object.keys(comp[mId] || {}).filter(mKey => comp[mId][mKey] === true);
        } else if (timeframe.startsWith('q')) {
            const q = parseInt(timeframe.charAt(1));
            const start = (q - 1) * 3;
            monthsToAverage = [start, start + 1, start + 2].map(String).filter(mKey => comp[mId][mKey] === true);
        }
        if (monthsToAverage.length === 0) return 0;
        const sum = monthsToAverage.reduce((acc, mKey) => acc + (data[mId][oId][mKey]?.s?.[sId]?.v || 0), 0);
        return (sum / monthsToAverage.length).toFixed(1);
    };

    const calculateAnualAvg = (mId, oId) => calculateTimeframeAvg(mId, oId, 'accumulated');
    const calculateSubAnualAvg = (mId, oId, sId) => calculateSubTimeframeAvg(mId, oId, sId, 'accumulated');

    const globalAvg = (mId) => {
        if (!data || !comp || !comp[mId]) return 0;
        const scores = OBJECTIVES.map(o => calculateAnualAvg(mId, o.id));
        return Math.round(scores.reduce((a, b) => a + (Number(b) || 0), 0) / OBJECTIVES.length);
    };

    const getMonthlyFilteredAch = (mId, monthIndex, kpiIds) => {
        const key = String(monthIndex);
        if (!data || !data[mId]) return 0;
        const activeObjs = OBJECTIVES.filter(o => {
            const isSelected = kpiIds.includes(o.id);
            const isQuarterlyOk = !o.quarterly || [2, 5, 8, 11].includes(monthIndex);
            return isSelected && isQuarterlyOk && data[mId][o.id] && data[mId][o.id][key]?.e;
        });
        if (activeObjs.length === 0) return 0;
        const sum = activeObjs.reduce((acc, o) => acc + getObjectiveAchievement(mId, o.id, monthIndex), 0);
        return Math.round(sum / activeObjs.length);
    };

    const radarData = useMemo(() => {
        if (!data || !comp) return [];
        return OBJECTIVES.map(o => {
            const point: any = { subject: o.name };
            MANAGERS.forEach(m => {
                let val = 0;
                if (isAccumulated || isQuarter) {
                    val = calculateTimeframeAvg(m.id, o.id, activeMonth);
                } else {
                    const key = String(mIdx);
                    val = (comp[m.id] && comp[m.id][key] === true) ? getObjectiveAchievement(m.id, o.id, mIdx) : 0;
                }
                point[m.id] = Number(val || 0);
            });
            return point;
        });
    }, [data, activeMonth, comp, mIdx, isAccumulated, isQuarter]);

    const trendData = useMemo(() => {
        if (!data || !comp) return [];
        return MONTHS.map((mName, i) => {
            const key = String(i);
            const point: any = { name: mName.substring(0, 3) };
            MANAGERS.forEach(m => {
                if (trendManagers.includes(m.id)) {
                    const isClosed = comp[m.id] && comp[m.id][key] === true;
                    const val = isClosed ? getMonthlyFilteredAch(m.id, i, trendKpis) : null; 
                    point[m.id] = val;
                }
            });
            return point;
        });
    }, [data, comp, trendManagers, trendKpis]);

    const activeManager = view !== 'comparison' && view !== 'editor' ? MANAGERS.find(m => m.id === view) : null;

    if (!data) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-400"><i className="fas fa-spinner fa-spin mr-2"></i> CARGANDO...</div>;

    const renderProgressBar = (value, min, max, label, unit, ach) => {
        const percentage = ach;
        const color = getHeatColor(ach);
        return (
            <div className="flex flex-col gap-1 w-full animate-fade-in">
                <div className="flex justify-between items-end mb-1 px-1">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter opacity-70">{label}</span>
                    <span className="text-[10px] font-black" style={{ color: color }}>{percentage}%</span>
                </div>
                <div className="relative w-full h-8 bg-[#f1f5f9] rounded-lg overflow-hidden border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] ring-1 ring-white">
                    <div 
                        className="h-full heat-bar-transition rounded-r-lg" 
                        style={{ width: `${percentage}%`, backgroundColor: color, opacity: 0.85 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                            {value === '-' ? '-' : `${value}${unit}`}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between mt-1 px-1">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{min}</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{max}</span>
                </div>
            </div>
        );
    };

    const toggleTrendManager = (id) => {
        setTrendManagers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const toggleTrendKpi = (id) => {
        setTrendKpis(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
    };

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
                        <button onClick={() => setMonthMenuOpen(!monthMenuOpen)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 border min-w-[200px] justify-between transition-colors">
                            <span className="flex items-center gap-3"><i className="far fa-calendar-alt opacity-40"></i> {getActiveDisplayLabel()}</span>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                        </button>
                        {monthMenuOpen && (
                            <div className="dropdown-menu w-72">
                                <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
                                    <button 
                                        onClick={() => { setActiveMonth('accumulated'); setMonthMenuOpen(false); }} 
                                        className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl mb-3 shadow-sm border ${isAccumulated ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                                    >
                                        ✓ Año Acumulado
                                    </button>
                                    
                                    <div className="border-t border-slate-100 my-2"></div>
                                    
                                    {MONTHS.map((m, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => { setActiveMonth(idx.toString()); setMonthMenuOpen(false); }} 
                                            className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase rounded-xl mb-1 ${activeMonth === idx.toString() ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {getMonthWithQuarter(idx)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={managerMenuRef}>
                        <button onClick={() => setManagerMenuOpen(!managerMenuOpen)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 border min-w-[240px] justify-between transition-colors ${view === 'comparison' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                            <span className="flex items-center gap-3"><i className="fas fa-users opacity-40"></i> {activeManager ? activeManager.name : 'Vista Global'}</span>
                            <i className="fas fa-chevron-down text-[10px]"></i>
                        </button>
                        {managerMenuOpen && (
                            <div className="dropdown-menu w-80">
                                <div className="max-h-96 overflow-y-auto custom-scrollbar p-1">
                                    <button onClick={() => { setView('comparison'); setManagerMenuOpen(false); }} className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl mb-1 flex items-center gap-3 ${view === 'comparison' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Vista Global</button>
                                    <div className="border-t my-2"></div>
                                    {MANAGERS.map(m => (
                                        <button key={m.id} onClick={() => { setView(m.id); setManagerMenuOpen(false); }} className={`w-full text-left px-3 py-3 text-[10px] font-bold uppercase rounded-xl mb-1 flex items-center gap-4 ${view === m.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white" style={{backgroundColor: m.color}}>{m.avatar}</span>
                                            <span className="truncate">{m.name}</span>
                                        </button>
                                    ))}
                                    {editorRole && <button onClick={() => { setView('editor'); setManagerMenuOpen(false); }} className="w-full text-left px-4 py-4 text-[10px] font-black uppercase rounded-xl mt-2 text-amber-600 bg-amber-50">Editor</button>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center bg-slate-900 rounded-2xl px-3 border border-white/10 ml-2 shadow-sm">
                        {!editorRole ? (
                            <input type="password" value={password} onChange={e => {
                                const val = e.target.value; setPassword(val);
                                if(val === '047') { setEditorRole('standard'); setPassword(''); setView('editor'); }
                                if(val === '30104750') { setEditorRole('super'); setPassword(''); setView('editor'); }
                            }} placeholder="PIN" className="w-16 bg-transparent text-white text-center text-xs py-3 font-black focus:outline-none placeholder:text-white/20" />
                        ) : (
                            <button onClick={() => { setEditorRole(null); setView('comparison'); }} className="text-emerald-400 text-xs py-3 font-black uppercase px-2">{editorRole.toUpperCase()}</button>
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
                                    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
                                        <ResponsiveContainer width="99%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
                                                {MANAGERS.map(m => <Radar key={m.id} name={m.name} dataKey={m.id} stroke={m.color} fill={m.color} fillOpacity={0.05} strokeWidth={2} />)}
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900' }} />
                                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: '900' }} iconType="circle" />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 md:p-10 rounded-[3rem] border shadow-sm flex flex-col">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-800">Evolución</h3>
                                        
                                        <div className="relative" ref={trendMenuRef}>
                                            <button 
                                                onClick={() => setTrendFilterMenuOpen(!trendFilterMenuOpen)}
                                                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-3 shadow-lg hover:bg-slate-800 transition-all"
                                            >
                                                <i className="fas fa-filter text-indigo-400"></i>
                                                Filtrar Evolución
                                                <i className={`fas fa-chevron-${trendFilterMenuOpen ? 'up' : 'down'} text-[8px]`}></i>
                                            </button>
                                            
                                            {trendFilterMenuOpen && (
                                                <div className="dropdown-menu w-[340px] p-6 shadow-2xl border-slate-200">
                                                    <div className="space-y-6">
                                                        <div>
                                                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Managers</h5>
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                {MANAGERS.map(m => (
                                                                    <button 
                                                                        key={m.id} 
                                                                        onClick={() => toggleTrendManager(m.id)}
                                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${trendManagers.includes(m.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500 opacity-60'}`}
                                                                    >
                                                                        <span className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-black" style={{backgroundColor: m.color, color: 'white'}}>{m.avatar}</span>
                                                                        <span className="text-[8px] font-black uppercase truncate">{m.name.split(' ')[0]}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-4">
                                                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">KPIs</h5>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {OBJECTIVES.map(o => (
                                                                    <button 
                                                                        key={o.id} 
                                                                        onClick={() => toggleTrendKpi(o.id)}
                                                                        className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${trendKpis.includes(o.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                                                                    >
                                                                        {o.name.substring(0,6)}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: '400px', minHeight: '400px' }}>
                                        <ResponsiveContainer width="99%" height="100%">
                                            <LineChart data={trendData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} dx={-5} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '800' }} />
                                                {MANAGERS.map(m => trendManagers.includes(m.id) && (
                                                    <Line 
                                                        key={m.id} 
                                                        type="monotone" 
                                                        dataKey={m.id} 
                                                        stroke={m.color} 
                                                        strokeWidth={2.5} 
                                                        dot={{ r: 3 }} 
                                                        activeDot={{ r: 5 }}
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
                                <h4 className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-6 text-center">Ranking Global</h4>
                                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1">
                                    {MANAGERS.sort((a,b) => globalAvg(b.id) - globalAvg(a.id)).map((m, rank) => (
                                        <div key={m.id} onClick={() => setView(m.id)} className="group flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] font-black w-4 opacity-20">{rank + 1}</div>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black text-white" style={{backgroundColor: m.color}}>{m.avatar}</div>
                                                <p className="text-[10px] font-bold uppercase truncate w-24">{m.name}</p>
                                            </div>
                                            <p className="text-xl font-black tabular-nums" style={{ color: getHeatColor(globalAvg(m.id)) }}>{globalAvg(m.id)}%</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'editor' && editorRole && (
                    <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-20">
                        {MANAGERS.map(m => (
                            <div key={m.id} className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
                                <div className="flex justify-between items-center border-b pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">{m.avatar}</div>
                                        <h3 className="text-lg font-black uppercase text-slate-800">{m.name}</h3>
                                    </div>
                                    {!isAccumulated && (
                                        <button onClick={() => handleUpdate(data, {...comp, [m.id]: {...comp[m.id], [String(mIdx)]: !comp[m.id][String(mIdx)]}})} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase border-2 ${comp[m.id][String(mIdx)] ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-50 text-slate-400'}`}>
                                            {comp[m.id][String(mIdx)] ? '✓ Validado' : 'Validar'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    {OBJECTIVES.map(obj => {
                                        if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                                        const oKey = String(mIdx);
                                        const oData = data[m.id]?.[obj.id]?.[oKey] || { v: 0, e: true, t: null, b: null, s: {} };
                                        return (
                                            <div key={obj.id} className="p-6 rounded-[2rem] border bg-slate-50 border-slate-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-[11px] font-black uppercase text-slate-700">{obj.name}</h4>
                                                    {editorRole === 'super' && (
                                                        <input type="checkbox" checked={oData.e} onChange={e => {
                                                            const newData = {...data}; newData[m.id][obj.id][oKey].e = e.target.checked;
                                                            handleUpdate(newData, comp);
                                                        }} className="w-4 h-4 accent-indigo-600" />
                                                    )}
                                                </div>
                                                {!obj.sub ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">Resultado</span>
                                                            <input type="number" value={oData.v} onChange={e => {
                                                                const newData = {...data}; newData[m.id][obj.id][oKey].v = parseFloat(e.target.value) || 0;
                                                                handleUpdate(newData, comp);
                                                            }} className="flex-grow bg-white border border-slate-200 rounded-xl py-2 text-center font-black" />
                                                        </div>
                                                        {editorRole === 'super' && (
                                                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] font-black uppercase text-slate-400">Mínimo (0%)</span>
                                                                    <input type="number" placeholder="Básico" value={oData.b ?? ''} onChange={e => {
                                                                        const newData = {...data}; newData[m.id][obj.id][oKey].b = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                        handleUpdate(newData, comp);
                                                                    }} className="bg-white border border-slate-200 rounded-lg py-1 text-center text-xs font-bold" />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[8px] font-black uppercase text-slate-400">Objetivo (100%)</span>
                                                                    <input type="number" placeholder="Meta" value={oData.t ?? ''} onChange={e => {
                                                                        const newData = {...data}; newData[m.id][obj.id][oKey].t = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                        handleUpdate(newData, comp);
                                                                    }} className="bg-white border border-slate-200 rounded-lg py-1 text-center text-xs font-bold" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {obj.sub.map(s => {
                                                            const sData = oData.s?.[s.id] || { v: 0, e: true, t: null, b: null };
                                                            return (
                                                                <div key={s.id} className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">{s.name}</span>
                                                                        {editorRole === 'super' && (
                                                                            <input type="checkbox" checked={sData.e} onChange={e => {
                                                                                const newData = {...data}; newData[m.id][obj.id][oKey].s[s.id].e = e.target.checked;
                                                                                handleUpdate(newData, comp);
                                                                            }} className="w-3 h-3 accent-indigo-600" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black uppercase text-slate-400">Res:</span>
                                                                        <input type="number" value={sData.v} onChange={e => {
                                                                            const newData = {...data}; newData[m.id][obj.id][oKey].s[s.id].v = parseFloat(e.target.value) || 0;
                                                                            handleUpdate(newData, comp);
                                                                        }} className="flex-grow bg-slate-50 border border-slate-100 rounded py-1 text-center font-black text-xs" />
                                                                    </div>
                                                                    {editorRole === 'super' && (
                                                                        <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-50">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-[7px] font-black text-slate-300 uppercase">Mín</span>
                                                                                <input type="number" placeholder="Mín" value={sData.b ?? ''} onChange={e => {
                                                                                    const newData = {...data}; newData[m.id][obj.id][oKey].s[s.id].b = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                    handleUpdate(newData, comp);
                                                                                }} className="bg-slate-50 border border-slate-100 rounded text-[9px] text-center py-0.5" />
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-[7px] font-black text-slate-300 uppercase">Obj</span>
                                                                                <input type="number" placeholder="Obj" value={sData.t ?? ''} onChange={e => {
                                                                                    const newData = {...data}; newData[m.id][obj.id][oKey].s[s.id].t = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                                    handleUpdate(newData, comp);
                                                                                }} className="bg-slate-50 border border-slate-100 rounded text-[9px] text-center py-0.5" />
                                                                            </div>
                                                                        </div>
                                                                    )}
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
                        ))}
                    </div>
                )}

                {activeManager && (
                    <div className="w-full max-w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-20 animate-fade-in px-2 lg:px-6">
                        {OBJECTIVES.map(obj => {
                            if (obj.quarterly && ![2, 5, 8, 11].includes(mIdx)) return null;
                            const ach = (isAccumulated || isQuarter) 
                                ? calculateTimeframeAvg(activeManager.id, obj.id, activeMonth)
                                : getObjectiveAchievement(activeManager.id, obj.id, mIdx);
                                
                            const oData = data[activeManager.id]?.[obj.id]?.[String(mIdx)] || { v: 0, e: true, t: null, b: null, s: {} };
                            if (!oData.e) return null;

                            const isWide = (obj.id === 'obj2' || obj.id === 'obj5');
                            const colSpan = isWide ? 'md:col-span-12 lg:col-span-6 xl:col-span-6' : 'md:col-span-12 lg:col-span-6 xl:col-span-4';

                            const baseVal = oData.b ?? getSafeRuleBase(obj.id, mIdx);
                            const targetVal = oData.t ?? getSafeRuleTarget(obj.id, mIdx);

                            return (
                                <div key={obj.id} className={`${colSpan} glass-card p-10 rounded-[2.5rem] border-0 shadow-[0_20px_60px_rgba(0,0,0,0.02)] flex flex-col bg-white ring-1 ring-slate-100`}>
                                    <div className="flex justify-between items-start mb-12">
                                        <h4 className="text-xl font-black uppercase text-slate-900 tracking-tighter flex items-center gap-3">
                                            {obj.id === 'obj5' ? (
                                                <a href={SPECIAL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                    {obj.name} <i className="fas fa-external-link-alt text-xs opacity-20"></i>
                                                </a>
                                            ) : obj.name}
                                        </h4>
                                        <span className="text-3xl font-black tabular-nums" style={{ color: getHeatColor(ach) }}>{ach}%</span>
                                    </div>
                                    
                                    <div className={`grid ${isWide ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-y-12 gap-x-10`}>
                                        {!obj.sub ? (
                                            <div className="w-full">
                                                {renderProgressBar(
                                                    (isAccumulated || isQuarter) ? calculateValueAvg(activeManager.id, obj.id, activeMonth) : oData.v, 
                                                    baseVal, 
                                                    targetVal, 
                                                    (isAccumulated || isQuarter) ? `Prom. ${obj.name}` : getDynamicLabel(obj.id, targetVal), 
                                                    getSafeRuleUnit(obj.id), 
                                                    ach
                                                )}
                                            </div>
                                        ) : (
                                            obj.sub.map(s => {
                                                const sData = oData.s?.[s.id] || { v: 0, e: true, t: null, b: null };
                                                if (!sData.e) return null;
                                                const sAch = (isAccumulated || isQuarter) 
                                                    ? calculateSubTimeframeAvg(activeManager.id, obj.id, s.id, activeMonth)
                                                    : calculateAch(s.id, sData.v || 0, mIdx, sData.t, sData.b);
                                                const sTarget = sData.t ?? getSafeRuleTarget(s.id, mIdx);
                                                const sBase = sData.b ?? getSafeRuleBase(s.id, mIdx);
                                                return (
                                                    <div key={s.id} className="w-full">
                                                        {renderProgressBar(
                                                            (isAccumulated || isQuarter) ? calculateSubValueAvg(activeManager.id, obj.id, s.id, activeMonth) : (sData.v || 0), 
                                                            sBase, 
                                                            sTarget, 
                                                            (isAccumulated || isQuarter) ? `Prom. ${s.name}` : getDynamicLabel(s.id, sTarget), 
                                                            getSafeRuleUnit(s.id), 
                                                            sAch
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <footer className="w-full bg-slate-900 py-12 px-6 text-center text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">PERFORMANCE ANALYTICS DASHBOARD — Leroy Merlin</footer>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);