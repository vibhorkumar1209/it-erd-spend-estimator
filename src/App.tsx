import { useState, useMemo, useCallback, useEffect } from 'react';
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

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
    AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', BRL: 'R$',
    SGD: 'S$', HKD: 'HK$', KRW: '₩', MXN: 'MX$', SEK: 'kr',
    NOK: 'kr', DKK: 'kr', ZAR: 'R', AED: 'د.إ', SAR: '﷼',
};

function formatCurrency(valueMillion: number, currencyCode: string = 'USD'): string {
    const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' ';
    const abs = Math.abs(valueMillion);
    if (abs === 0) return `${sym}0`;
    if (abs < 1) {
        const k = valueMillion * 1000;
        return `${sym}${k.toFixed(1)}K`;
    }
    return `${sym}${valueMillion.toFixed(2)}M`;
}

function App() {
    const [companyName, setCompanyName] = useState<string>('General Motors');
    const [companyDomain, setCompanyDomain] = useState<string>('gm.com');
    const [revenue, setRevenue] = useState<string>('187440');
    const [industry, setIndustry] = useState<string>('Automotive');
    const [country, setCountry] = useState<string>('USA');
    const [activeTab, setActiveTab] = useState<'calculator' | 'admin'>('calculator');
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const [currency, setCurrency] = useState<string>('USD');
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ 'USD': 1 });
    const [exchangeDate, setExchangeDate] = useState<string>('');
    const [isRatesLoading, setIsRatesLoading] = useState<boolean>(true);
    const [isFetchingRevenue, setIsFetchingRevenue] = useState(false);

    useEffect(() => {
        setIsRatesLoading(true);
        fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then(res => res.json())
            .then(data => {
                setExchangeRates(data.rates);
                setExchangeDate(data.date);
                setIsRatesLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch exchange rates:", err);
                setIsRatesLoading(false);
            });
    }, []);

    const currentRate = exchangeRates[currency] || 1;

    const industries = useMemo(() => getIndustries(), []);
    const countries = useMemo(() => getCountries(), []);

    const results = useMemo(() => {
        const localRev = parseFloat(revenue) || 0;
        const revInUSD = localRev / currentRate;
        return calculateSpend(companyName, revInUSD, industry, country);
    }, [companyName, revenue, industry, country, currentRate]);

    const lastFetched = React.useRef({ companyName: '', companyDomain: '' });

    const fetchRevenue = async () => {
        if (!companyName) return;
        // Prevent redundant calls if nothing changed
        if (lastFetched.current.companyName === companyName && lastFetched.current.companyDomain === companyDomain) return;
        
        setIsFetchingRevenue(true);
        try {
            let usdRevenue = 0;
            
            const res = await fetch(`/api/revenue?companyName=${encodeURIComponent(companyName)}&companyDomain=${encodeURIComponent(companyDomain)}`);
            if (res.ok) {
                const data = await res.json();
                usdRevenue = data.revenue;
                // The fallback has been removed to prevent leaking the API Key into the frontend bundle.
                // Ensure the GEMINI_API_KEY is configured in your Vercel Dashboard Environment Variables.
                throw new Error('Backend /api/revenue endpoint failed or is not available.');
            }
            
            const localRev = usdRevenue * currentRate;
            setRevenue(localRev.toFixed(0));
            lastFetched.current = { companyName, companyDomain };
            
        } catch (error) {
            console.error('Failed to fetch revenue:', error);
            // Optionally could alert or just silently fail on automatic fetch
            // alert('Could not fetch revenue using Gemini API. Please enter manually or check API keys.');
        } finally {
            setIsFetchingRevenue(false);
        }
    };

    // Helper: convert a USD spend value back to the selected local currency for display
    const toLocal = (usdValue: number) => usdValue * currentRate;
    const fmt = (usdValue: number) => formatCurrency(toLocal(usdValue), currency);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const downloadCSV = () => {
        const lines: any[][] = [
            ['RefractOne Spend Estimator - Analysis Report'],
            ['Company Name', results.companyName],
            ['Industry', results.industry],
            ['Coverage Country', results.country],
            ['Currency', currency],
            ['Exchange Rate (1 USD)', currentRate.toFixed(4) + ' ' + currency],
            ['Revenue (Baseline)', fmt(results.revenue)],
            [],
            ['MULTI-YEAR SPEND MATRIX'],
            [`Year`, 'IT Spend (%)', `IT Spend (${currency})`, 'ERD Spend (%)', `ERD Spend (${currency})`],
            ...results.trends.map(t => [t.year, t.itPercent.toFixed(2) + '%', fmt(t.itSpend), t.erdPercent.toFixed(2) + '%', fmt(t.erdSpend)]),
            [],
            ['GROWTH METRICS (CAGR)'],
            ['Metric', 'IT Spend', 'ERD Spend'],
            ['Historical (2022-2025)', results.itCAGR_Historical.toFixed(2) + '%', results.erdCAGR_Historical.toFixed(2) + '%'],
            ['Forecast (2025-2030)', results.itCAGR_Forecast.toFixed(2) + '%', results.erdCAGR_Forecast.toFixed(2) + '%'],
            [],
            [`IT SPEND HIERARCHICAL BREAKDOWN (${currency})`],
            ['Level 1 Category', 'Level 2 Category', 'Level 3 Subcategory', 'IT Allocation %', `Spend Value (${currency})`],
        ];

        results.itBreakdown.forEach(l1 => {
            l1.children?.forEach(l2 => {
                l2.children?.forEach(l3 => {
                    lines.push([l1.name, l2.name, l3.name, (l3.percentage / 100).toFixed(2), fmt(l3.value)]);
                });
            });
        });

        lines.push([], [`ERD SPEND COMPOSITION (${currency})`]);
        lines.push(['Engineering Discipline', 'ERD Allocation %', `Spend Value (${currency})`]);
        results.erdBreakdown.forEach(item => {
            lines.push([item.name, (item.percentage / 100).toFixed(2), fmt(item.value)]);
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

    // Process data for combination charts — convert all spend values to local currency
    const itChartData = results.trends.map(t => ({
        year: t.year,
        spend: toLocal(t.itSpend),
        growth: t.itYoY
    }));

    const erdChartData = results.trends.map(t => ({
        year: t.year,
        spend: toLocal(t.erdSpend),
        growth: t.erdYoY
    }));

    const etChartData = results.emergingTech.map(et => ({
        name: et.name,
        value: Math.abs(toLocal(et.value)),
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
                    <td className="px-4 py-3 text-right font-mono text-blue-400 text-xs border-b border-white/5 font-bold">{fmt(item.value)}</td>
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
                                    onBlur={fetchRevenue}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Company Domain
                                </label>
                                <input
                                    type="text" value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)}
                                    onBlur={fetchRevenue}
                                    placeholder="e.g. gm.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" /> Currency
                                </label>
                                <select
                                    value={currency} onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                >
                                    {Object.keys(exchangeRates).length > 1 ? Object.keys(exchangeRates).map(c => <option key={c} value={c} className="bg-[#020617]">{c}</option>) : <option value="USD" className="bg-[#020617]">USD</option>}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-3 h-3" /> Latest Revenue (in {currency}, M)
                                    </div>
                                    <button 
                                        onClick={fetchRevenue} 
                                        disabled={isFetchingRevenue}
                                        className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/40 transition-colors disabled:opacity-50 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> {isFetchingRevenue ? 'Searching...' : 'Search Gemini'}
                                    </button>
                                </label>
                                <input
                                    type="text" value={revenue} onChange={(e) => setRevenue(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                    placeholder="Click Search Gemini or enter value"
                                />
                                {currency !== 'USD' && !isRatesLoading && (
                                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                                        Conversion: 1 USD = {currentRate.toFixed(4)} {currency} (Date: {exchangeDate})<br/>
                                        <span className="text-blue-400">Calculated as ${((parseFloat(revenue) || 0) / currentRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}M USD</span>
                                    </p>
                                )}
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
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">{fmt(results.trends.find(t => t.year === 2026)!.itSpend)}</span>
                                    <span className="text-[10px] font-black text-blue-500/60 uppercase">{currency}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-emerald-600/10 border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total ERD Spend (2026)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">{fmt(results.trends.find(t => t.year === 2026)!.erdSpend)}</span>
                                    <span className="text-[10px] font-black text-emerald-500/60 uppercase">{currency}</span>
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
                                                <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v), currency)} />
                                                <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                    formatter={(value: any, name: string) => {
                                                        const num = Number(value);
                                                        return name === "Growth Rate" ? [`${num.toFixed(2)}%`, name] : [formatCurrency(num, currency), name];
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
                                                <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v), currency)} />
                                                <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900' }}
                                                    formatter={(value: any, name: string) => {
                                                        const num = Number(value);
                                                        return name === "Growth Rate" ? [`${num.toFixed(2)}%`, name] : [formatCurrency(num, currency), name];
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
                                        Total: {formatCurrency(etTotalSpend, currency)}
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
                                                formatter={(value: number) => [formatCurrency(value, currency), "Spend Value"]}
                                            />
                                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                                                {etChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                <LabelList dataKey="value" position="right" fill="#94a3b8" fontSize={10} fontWeight="900" formatter={(val: number) => formatCurrency(val, currency)} />
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
                                            Total: {fmt(results.trends.find(t => t.year === 2026)!.itSpend)}
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
                                            Total: {fmt(results.trends.find(t => t.year === 2026)!.erdSpend)}
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
                                                             {fmt(item.value)}
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
