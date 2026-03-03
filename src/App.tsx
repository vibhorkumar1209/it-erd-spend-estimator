import { useState, useMemo, useCallback } from 'react';
import { calculateSpend, getIndustries, getCountries, BreakdownItem } from './services/calculationEngine';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, LabelList
} from 'recharts';
import {
    Calculator, DollarSign,
    TrendingUp, ShieldCheck,
    ChevronDown, ChevronRight, Building2, Sparkles, Layers,
    Activity, Download, Globe, Briefcase, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

function App() {
    const [companyName, setCompanyName] = useState<string>('General Motors');
    const [revenue, setRevenue] = useState<string>('187440');
    const [industry, setIndustry] = useState<string>('Automotive');
    const [country, setCountry] = useState<string>('USA');
    const [activeTab, setActiveTab] = useState<'calculator' | 'admin'>('calculator');
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const industries = useMemo(() => getIndustries(), []);
    const countries = useMemo(() => getCountries(), []);

    const results = useMemo(() => {
        const rev = parseFloat(revenue) || 0;
        return calculateSpend(companyName, rev, industry, country);
    }, [companyName, revenue, industry, country]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const downloadCSV = () => {
        const lines: any[][] = [
            ['RefractOne Spend Estimator - Analysis Report'],
            ['Company Name', results.companyName],
            ['Industry', results.industry],
            ['Coverage Country', results.country],
            ['Revenue (Baseline)', results.revenue],
            [],
            ['MULTI-YEAR SPEND MATRIX'],
            ['Year', 'IT Spend (%)', 'IT Spend ($M)', 'ERD Spend (%)', 'ERD Spend ($M)'],
            ...results.trends.map(t => [t.year, t.itPercent.toFixed(2) + '%', t.itSpend.toFixed(2), t.erdPercent.toFixed(2) + '%', t.erdSpend.toFixed(2)]),
            [],
            ['GROWTH METRICS (CAGR)'],
            ['Metric', 'IT Spend', 'ERD Spend'],
            ['Historical (2022-2024)', results.itCAGR_Historical.toFixed(2) + '%', results.erdCAGR_Historical.toFixed(2) + '%'],
            ['Forecast (2024-2030)', results.itCAGR_Forecast.toFixed(2) + '%', results.erdCAGR_Forecast.toFixed(2) + '%'],
            [],
            ['IT SPEND HIERARCHICAL BREAKDOWN (Level 1-3 Only)'],
            ['Level 1 Category', 'Level 2 Category', 'Level 3 Subcategory', 'IT Allocation %', 'Spend Value ($M)'],
        ];

        results.itBreakdown.forEach(l1 => {
            l1.children?.forEach(l2 => {
                l2.children?.forEach(l3 => {
                    lines.push([l1.name, l2.name, l3.name, (l3.percentage / 100).toFixed(2), l3.value.toFixed(2)]);
                });
            });
        });

        lines.push([], ['ERD SPEND COMPOSITION']);
        lines.push(['Engineering Discipline', 'ERD Allocation %', 'Spend Value ($M)']);
        results.erdBreakdown.forEach(item => {
            lines.push([item.name, (item.percentage / 100).toFixed(2), item.value.toFixed(2)]);
        });

        const csvContent = lines.map(l => l.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${results.companyName.replace(/\s+/g, '_')}_RefractOne_Market_Assessment.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Process data for combination charts
    const itChartData = results.trends.map(t => ({
        year: t.year,
        spend: t.itSpend,
        growth: t.itYoY
    }));

    const erdChartData = results.trends.map(t => ({
        year: t.year,
        spend: t.erdSpend,
        growth: t.erdYoY
    }));

    const etChartData = results.emergingTech.map(et => ({
        name: et.name,
        value: Math.abs(et.value),
        color: et.value >= 0 ? '#3b82f6' : '#f87171'
    }));

    const etTotalSpend = etChartData.reduce((sum, item) => sum + item.value, 0);

    const renderBreakdownRow = (item: BreakdownItem, level: number) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedIds.includes(item.id);
        const paddingLeft = level * 16 + 16;

        return (
            <React.Fragment key={item.id}>
                <tr
                    className={`group hover:bg-white/[0.04] transition-colors cursor-pointer ${level === 0 ? 'bg-white/[0.01]' : ''}`}
                    onClick={() => hasChildren && toggleExpand(item.id)}
                >
                    <td className="px-4 py-3 border-b border-white/5" style={{ paddingLeft }}>
                        <div className="flex items-center gap-2">
                            <div className="w-3">
                                {hasChildren && (
                                    isExpanded ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />
                                )}
                            </div>
                            <span className={`${level === 0 ? 'font-black text-white' : level === 1 ? 'font-bold text-zinc-300' : 'font-medium text-zinc-400'} text-xs uppercase tracking-tight`}>
                                {item.name}
                            </span>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-[10px] font-mono border-b border-white/5">{item.percentage.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400 text-xs border-b border-white/5 font-bold">${item.value.toFixed(2)}M</td>
                </tr>
                {isExpanded && hasChildren && item.children!.map(child => renderBreakdownRow(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-zinc-100 selection:bg-blue-500/30 font-sans antialiased">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[150px] rounded-full" />
            </div>

            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* LHS INPUT PANEL */}
            <aside className={`
                fixed lg:sticky top-0 h-screen overflow-y-auto z-50 flex flex-col pt-6
                w-80 flex-shrink-0 border-r border-white/10 bg-[#020617]/95 backdrop-blur-2xl
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
                <div className="px-6 mb-8 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/10 flex-shrink-0">
                        <Calculator className="text-white w-4 h-4" />
                    </div>
                    <h1 className="text-sm font-black text-white tracking-tighter leading-tight">
                        RefractOne IT and ER&D Spend Predictor
                    </h1>
                    <button
                        onClick={closeSidebar}
                        className="ml-auto lg:hidden p-1 text-zinc-500 hover:text-white"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 space-y-8 flex-grow">
                    <div>
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">Input Matrix</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Company Name
                                </label>
                                <input
                                    type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" /> 2024 Revenue ($M)
                                </label>
                                <input
                                    type="text" value={revenue} onChange={(e) => setRevenue(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase className="w-3 h-3" /> Industry Vertical
                                </label>
                                <select
                                    value={industry} onChange={(e) => setIndustry(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                >
                                    {industries.map(ind => <option key={ind} value={ind} className="bg-[#020617]">{ind}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Region / Country
                                </label>
                                <select
                                    value={country} onChange={(e) => setCountry(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                >
                                    {countries.map(c => <option key={c} value={c} className="bg-[#020617]">{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Model Controls</h3>
                        <div className="space-y-2">
                            <button onClick={() => setActiveTab('calculator')} className={`w-full px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between ${activeTab === 'calculator' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5' : 'text-zinc-500 hover:text-white border border-transparent'}`}>
                                <span>Intelligent Assessment</span>
                                <TrendingUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => setActiveTab('admin')} className={`w-full px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between ${activeTab === 'admin' ? 'bg-white/5 text-white border border-white/10' : 'text-zinc-500 hover:text-white border border-transparent'}`}>
                                <span>Admin Benchmarks</span>
                                <ShieldCheck className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <button
                        onClick={downloadCSV}
                        className="w-full px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                    >
                        <Download className="w-4 h-4" /> Download Export
                    </button>
                </div>
            </aside>

            {/* RHS MAIN CONTENT */}
            <main className="flex-grow relative z-10 p-4 sm:p-6 lg:p-10 overflow-y-auto w-full min-w-0">
                {/* MOBILE TOP BAR */}
                <div className="flex items-center gap-4 mb-6 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-black text-white tracking-tighter">RefractOne Spend Predictor</span>
                </div>

                {/* EXECUTIVE ROW: COMPANY & TICKERS */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 lg:mb-12 gap-6 lg:gap-10">
                    <div className="flex-shrink-0">
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20 mb-3 inline-block">Analysis Profile</span>
                        <div className="bg-gradient-to-r from-blue-600/20 to-transparent pl-4 border-l-4 border-blue-600 py-1">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                {companyName}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                        <div className="flex-1 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-blue-600/10 border border-blue-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total IT Spend (2026)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">${results.trends.find(t => t.year === 2026)!.itSpend.toFixed(2)}M</span>
                                    <span className="text-[10px] font-black text-blue-500/60 uppercase">USD</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-emerald-600/10 border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total ERD Spend (2026)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">${results.trends.find(t => t.year === 2026)!.erdSpend.toFixed(2)}M</span>
                                    <span className="text-[10px] font-black text-emerald-500/60 uppercase">USD</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'calculator' ? (
                        <motion.div key="calc" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">

                            {/* SIDE-BY-SIDE COMBINATION CHARTS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                                {/* IT SPEND & CAGR */}
                                <div className="p-5 sm:p-8 rounded-3xl lg:rounded-[48px] bg-white/[0.02] border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                                                <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                                IT Spend: 2022-2030
                                            </h3>
                                            <div className="flex gap-4 mt-2">
                                                <span className="text-[10px] font-bold text-zinc-500">Hist: <span className="text-blue-400">{results.itCAGR_Historical.toFixed(2)}%</span></span>
                                                <span className="text-[10px] font-bold text-zinc-500">Fore: <span className="text-blue-400">{results.itCAGR_Forecast.toFixed(2)}%</span></span>
                                            </div>
                                        </div>
                                        <Layers className="w-8 h-8 text-blue-600/20" />
                                    </div>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={itChartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}M`} />
                                                <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                    formatter={(value: any, name: string) => {
                                                        const num = Number(value);
                                                        return name === "Growth Rate" ? [`${num.toFixed(2)}%`, name] : [`$${num.toFixed(2)}M`, name];
                                                    }}
                                                />
                                                <Bar yAxisId="left" dataKey="spend" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} name="Spend Value" />
                                                <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#60a5fa' }} name="Growth Rate" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* ERD SPEND & CAGR */}
                                <div className="p-5 sm:p-8 rounded-3xl lg:rounded-[48px] bg-white/[0.02] border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-3">
                                                <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                                ER&D Spend: 2022-2030
                                            </h3>
                                            <div className="flex gap-4 mt-2">
                                                <span className="text-[10px] font-bold text-zinc-500">Hist: <span className="text-emerald-400">{results.erdCAGR_Historical.toFixed(2)}%</span></span>
                                                <span className="text-[10px] font-bold text-zinc-500">Fore: <span className="text-emerald-400">{results.erdCAGR_Forecast.toFixed(2)}%</span></span>
                                            </div>
                                        </div>
                                        <Activity className="w-8 h-8 text-emerald-600/20" />
                                    </div>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={erdChartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}M`} />
                                                <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                    formatter={(value: any, name: string) => {
                                                        const num = Number(value);
                                                        return name === "Growth Rate" ? [`${num.toFixed(2)}%`, name] : [`$${num.toFixed(2)}M`, name];
                                                    }}
                                                />
                                                <Bar yAxisId="left" dataKey="spend" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} name="Spend Value" />
                                                <Line yAxisId="right" type="monotone" dataKey="growth" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399' }} name="Growth Rate" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* EMERGING TECH ROW */}
                            <div className="p-5 sm:p-8 lg:p-10 rounded-3xl lg:rounded-[48px] bg-white/[0.03] border border-white/5 shadow-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
                                        <div>
                                            <h3 className="text-base sm:text-xl font-black text-white tracking-tight">Emerging Tech Spend</h3>
                                            <p className="text-zinc-500 text-[11px] sm:text-xs mt-1 hidden sm:block">Relative opportunity distribution for next-gen intelligent automation and compute</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 self-start sm:self-auto">
                                        Total: ${etTotalSpend.toFixed(2)}M
                                    </div>
                                </div>
                                <div className="h-[260px] sm:h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart layout="vertical" data={etChartData} margin={{ left: 20, right: 60 }} barCategoryGap="25%">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={130} fontWeight="900" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                formatter={(value: number) => [`$${value.toFixed(2)}M`, "Spend Value"]}
                                            />
                                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                                                {etChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                <LabelList dataKey="value" position="right" fill="#94a3b8" fontSize={10} fontWeight="900" formatter={(val: number) => `$${val.toFixed(2)}M`} />
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* BREAKDOWN TABLES: SIDE-BY-SIDE */}
                            <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start pb-20">
                                <section className="p-5 sm:p-8 rounded-3xl lg:rounded-[48px] bg-white/[0.01] border border-white/5 shadow-2xl overflow-hidden hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-black text-white flex items-center gap-3">
                                            <Layers className="w-6 h-6 text-blue-500" />
                                            IT Spend by Category
                                        </h3>
                                        <div className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                            Total: ${results.trends.find(t => t.year === 2026)!.itSpend.toFixed(2)}M
                                        </div>
                                    </div>

                                    <div className="rounded-2xl sm:rounded-3xl border border-white/10 overflow-x-auto bg-[#020617]/40 backdrop-blur-xl">
                                        <table className="w-full min-w-[340px] text-left">
                                            <thead className="bg-white/5 uppercase text-[9px] font-black tracking-[0.2em] text-zinc-500">
                                                <tr>
                                                    <th className="px-6 py-5 border-b border-white/5 w-[60%]">Category</th>
                                                    <th className="px-6 py-5 border-b border-white/5 w-[15%]">Weight</th>
                                                    <th className="px-6 py-5 border-b border-white/5 w-[25%] text-right pr-8">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                {results.itBreakdown.map(l1 => renderBreakdownRow(l1, 0))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="p-5 sm:p-8 rounded-3xl lg:rounded-[48px] bg-white/[0.01] border border-white/5 shadow-2xl overflow-hidden hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-black text-white flex items-center gap-3">
                                            <Activity className="w-6 h-6 text-emerald-500" />
                                            ERD Spend by Category
                                        </h3>
                                        <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            Total: ${results.trends.find(t => t.year === 2026)!.erdSpend.toFixed(2)}M
                                        </div>
                                    </div>

                                    <div className="rounded-2xl sm:rounded-3xl border border-white/10 overflow-x-auto bg-[#020617]/40 backdrop-blur-xl">
                                        <table className="w-full min-w-[320px] text-left">
                                            <thead className="bg-white/5 uppercase text-[9px] font-black tracking-[0.2em] text-zinc-500">
                                                <tr>
                                                    <th className="px-6 py-5 border-b border-white/5 w-[65%]">Category</th>
                                                    <th className="px-6 py-5 border-b border-white/5 w-[15%]">Weight</th>
                                                    <th className="px-6 py-4 border-b border-white/5 w-[20%] text-right pr-8">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.erdBreakdown.map(item => (
                                                    <tr key={item.id} className="hover:bg-emerald-500/5 transition-colors border-b border-white/5">
                                                        <td className="px-6 py-4">
                                                            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-tight">{item.name}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-[10px] font-mono text-zinc-500">
                                                            {item.percentage.toFixed(2)}%
                                                        </td>
                                                        <td className="px-6 py-4 text-right pr-8 text-xs font-black text-emerald-400 font-mono">
                                                            ${item.value.toFixed(2)}M
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="adm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-40 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-amber-500/10">
                                <ShieldCheck className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white mb-6 tracking-tighter">Model Authority Restriction</h2>
                            <p className="text-zinc-500 leading-relaxed font-medium italic">Global benchmark overrides and algorithmic sensitivity adjustments require Class-A authorization and multi-factor hardware authentication.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main >
        </div >
    );
}

export default App;
