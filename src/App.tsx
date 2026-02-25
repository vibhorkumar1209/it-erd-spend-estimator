import { useState, useMemo } from 'react';
import { calculateSpend, getIndustries, getCountries } from './services/calculationEngine';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
    Calculator, Globe, DollarSign,
    TrendingUp, ArrowRight, ShieldCheck, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [revenue, setRevenue] = useState<string>('803.1');
    const [industry, setIndustry] = useState<string>('Supply Chain / Logistics');
    const [country, setCountry] = useState<string>('Oman');
    const [activeTab, setActiveTab] = useState<'calculator' | 'admin'>('calculator');

    const industries = useMemo(() => getIndustries(), []);
    const countries = useMemo(() => getCountries(), []);

    const results = useMemo(() => {
        const rev = parseFloat(revenue) || 0;
        return calculateSpend(rev, industry, country);
    }, [revenue, industry, country]);

    const chartData = [
        { name: 'IT Spend', value: results.it.totalSpend, color: '#60a5fa' },
        { name: 'ERD Spend', value: results.erd.totalSpend, color: '#34d399' },
    ];

    return (
        <div className="min-h-screen bg-[#080b14] text-zinc-100 selection:bg-blue-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px]" />
            </div>

            <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Calculator className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">
                            Spend<span className="text-blue-400">Sphere</span>
                        </h1>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        <button
                            onClick={() => setActiveTab('calculator')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'calculator' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Estimator
                        </button>
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Admin Lookups
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
                <AnimatePresence mode="wait">
                    {activeTab === 'calculator' ? (
                        <motion.div
                            key="calculator"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid lg:grid-cols-12 gap-8"
                        >
                            {/* Input Panel */}
                            <div className="lg:col-span-4 space-y-6">
                                <section className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-blue-400" />
                                        Company Profile
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Revenue (US$ Millions)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="number"
                                                    value={revenue}
                                                    onChange={(e) => setRevenue(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all outline-none"
                                                    placeholder="e.g. 500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Industry Segment</label>
                                            <select
                                                value={industry}
                                                onChange={(e) => setIndustry(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-blue-500/40 outline-none"
                                            >
                                                {industries.map(ind => <option key={ind} value={ind} className="bg-zinc-900">{ind}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">HQ Location</label>
                                            <select
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-blue-500/40 outline-none"
                                            >
                                                {countries.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-emerald-600/20 border border-white/10">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-white/10">
                                            <Info className="w-5 h-5 text-blue-300" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-blue-100">AI Estimation Model</h3>
                                            <p className="text-sm text-blue-100/60 mt-1 leading-relaxed">
                                                Calculated using region-specific adjustments ({results.it.regionAdj.toFixed(1)}%) and revenue tier weighting ({results.it.revenueAdj.toFixed(1)}%).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Panel */}
                            <div className="lg:col-span-8 space-y-8">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-blue-500/30 transition-all">
                                        <p className="text-sm text-zinc-400 font-medium">Annual IT Spend Potential</p>
                                        <div className="mt-4 flex items-baseline gap-2">
                                            <span className="text-4xl font-bold text-white">${results.it.totalSpend.toFixed(2)}M</span>
                                            <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-full">{results.it.finalPercent.toFixed(2)}% of Rev</span>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-500/30 transition-all">
                                        <p className="text-sm text-zinc-400 font-medium">Annual ERD Spend Potential</p>
                                        <div className="mt-4 flex items-baseline gap-2">
                                            <span className="text-4xl font-bold text-white">${results.erd.totalSpend.toFixed(2)}M</span>
                                            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">{results.erd.finalPercent.toFixed(2)}% of Rev</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm h-[400px]">
                                    <h3 className="text-lg font-semibold mb-8 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                        Spend Distribution
                                    </h3>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                            <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}M`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '14px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="admin"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-4xl mx-auto p-12 rounded-3xl bg-white/5 border border-white/10 text-center space-y-6"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold">Admin Portal Restricted</h2>
                            <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
                                The lookup tables used for these estimations are managed by the admin. Please sign in to modify base percentages or regional adjustments.
                            </p>
                            <div className="pt-4">
                                <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 mx-auto">
                                    Sign in as Administrator
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default App;
