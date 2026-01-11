import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TrendingUp,
    Users,
    Eye,
    MousePointerClick,
    Share2,
    Globe,
    Smartphone,
    Monitor,
    ArrowUpRight,
    ArrowDownRight,
    ExternalLink,
    Calendar,
    Tablet
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useOwner } from '../../context/OwnerContext';

const MarketingPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [dateRange, setDateRange] = useState('30d');
    const [loading, setLoading] = useState(true);

    const [trafficData, setTrafficData] = useState([]);
    const [trafficSources, setTrafficSources] = useState([]);
    const [deviceData, setDeviceData] = useState([]);
    const [topPages, setTopPages] = useState([]);
    const [kpis, setKpis] = useState([
        { label: 'Total Visitors', value: '0', change: '0%', positive: true, icon: Users },
        { label: 'Page Views', value: '0', change: '0%', positive: true, icon: Eye },
        { label: 'Avg. Session', value: '-', change: '0%', positive: true, icon: TrendingUp },
        { label: 'Bounce Rate', value: '0%', change: '0%', positive: true, icon: MousePointerClick }
    ]);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const days = dateRange === '7d' ? 7 : (dateRange === '30d' ? 30 : 90);

            const [trafficRes, pagesRes, devicesRes, sourcesRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/analytics/traffic?days=${days}`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/pages?limit=5`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/devices`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/sources`, { headers: getAuthHeader() })
            ]);

            setTrafficData(trafficRes.data);
            setTopPages(pagesRes.data);

            // Format sources for pie chart
            const sources = sourcesRes.data.map((s, i) => ({
                name: s.source,
                value: s.percent * 100,
                color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][i % 5]
            }));
            setTrafficSources(sources);

            // Format devices
            const devices = devicesRes.data.map(d => ({
                device: d.device,
                sessions: d.sessions,
                icon: d.device === 'Mobile' ? Smartphone : (d.device === 'Tablet' ? Tablet : Monitor)
            }));
            setDeviceData(devices);

            // Calculate KPIs
            const totalVisitors = trafficRes.data.reduce((acc, curr) => acc + curr.visitors, 0);
            const totalPageviews = trafficRes.data.reduce((acc, curr) => acc + curr.pageviews, 0);

            setKpis([
                { label: 'Total Visitors', value: totalVisitors.toLocaleString(), change: '+100%', positive: true, icon: Users },
                { label: 'Page Views', value: totalPageviews.toLocaleString(), change: '+100%', positive: true, icon: Eye },
                { label: 'Avg. Session', value: '1m 20s', change: '+0%', positive: true, icon: TrendingUp },
                { label: 'Bounce Rate', value: '42%', change: '-2%', positive: true, icon: MousePointerClick }
            ]);

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Marketing & Traffic</h1>
                    <p className="text-gray-500 mt-1">Website analytics and visitor insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {['7d', '30d', '90d'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-2 text-sm transition-colors ${dateRange === range
                                    ? 'bg-amber-500 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <kpi.icon className="h-5 w-5 text-gray-500" />
                            </div>
                            <span className={`flex items-center gap-1 text-sm font-medium ${kpi.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {kpi.positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                {kpi.change}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        <p className="text-sm text-gray-500">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* Traffic Over Time */}
                <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Overview</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficData}>
                                <defs>
                                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Traffic Sources */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
                    <div className="h-40 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={trafficSources}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {trafficSources.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {trafficSources.map((source, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                                    <span className="text-gray-600">{source.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">{Number(source.value).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Top Pages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
                    <div className="space-y-3">
                        {topPages.map((page, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-400 w-6">{index + 1}</span>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Globe className="h-4 w-4 text-gray-400" />
                                        <span className="truncate max-w-[200px]">{page.page}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-gray-900 font-medium">{page.views.toLocaleString()} views</span>
                                    <span className="text-gray-500">{page.bounce}% bounce</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Devices</h2>
                    <div className="space-y-4">
                        {deviceData.map((device, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <device.icon className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700">{device.device}</span>
                                    </div>
                                    <span className="text-sm text-gray-900">{device.sessions.toLocaleString()} sessions</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                                        style={{ width: `${(device.sessions / (deviceData.reduce((a, b) => a + b.sessions, 0) || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100">
                                <Share2 className="h-4 w-4" />
                                Share Report
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100">
                                <ExternalLink className="h-4 w-4" />
                                Google Analytics
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketingPage;
