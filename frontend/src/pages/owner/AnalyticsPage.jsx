import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useOwner } from '../../context/OwnerContext';
import {
    BarChart3,
    TrendingUp,
    Package,
    Users,
    Truck,
    DollarSign,
    Download,
    Calendar,
    ChevronRight,
    FileText,
    ArrowLeft,
    Filter,
    RefreshCw
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';

const AnalyticsPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [dateRange, setDateRange] = useState('30d');
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // Data States
    const [dashboardStats, setDashboardStats] = useState(null);
    const [salesData, setSalesData] = useState([]);
    const [salesByChannel, setSalesByChannel] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const headers = getAuthHeader();
            const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
            const days = daysMap[dateRange] || 30;

            const results = await Promise.allSettled([
                axios.get(`${backendUrl}/api/admin/dashboard?period=${dateRange}`, { headers }),
                axios.get(`${backendUrl}/api/admin/analytics/sales?days=${days}`, { headers }),
                axios.get(`${backendUrl}/api/admin/analytics/sales-by-channel?days=${days}`, { headers }),
                axios.get(`${backendUrl}/api/admin/analytics/top-products?days=${days}&limit=10`, { headers }),
                axios.get(`${backendUrl}/api/admin/analytics/low-stock`, { headers })
            ]);

            setDashboardStats(results[0].status === 'fulfilled' ? results[0].value.data : null);
            setSalesData(results[1].status === 'fulfilled' ? results[1].value.data : []);
            setSalesByChannel(results[2].status === 'fulfilled' ? results[2].value.data : []);
            setTopProducts(results[3].status === 'fulfilled' ? results[3].value.data : []);
            setLowStockAlerts(results[4].status === 'fulfilled' ? results[4].value.data : []);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [backendUrl, dateRange, getAuthHeader]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);


    // Helper to get data for specific detailed reports
    const getReportData = (reportName) => {
        switch (reportName) {
            case 'Sales by Day':
                return salesData.map(d => ({
                    name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                    sales: d.sales,
                    profit: d.profit,
                    // orders: d.orders // Backend doesn't provide daily order count yet in this endpoint
                })).reverse();
            // Server code: `for i in range(days): date = now - timedelta(days=days - 1 - i)` -> This goes from oldest to newest. Good.

            case 'Sales by Channel':
                return salesByChannel.map(d => ({
                    name: d.label,
                    sales: d.sales,
                    orders: d.orders,
                    profit: d.profit
                }));

            case 'Sales by Product':
            case 'Profit by Product':
                return topProducts.map(d => ({
                    name: d.name,
                    sales: d.revenue,
                    profit: d.profit,
                    units: d.quantity
                }));

            case 'Low Stock Forecast':
            case 'Stock Levels':
                return lowStockAlerts.map(d => ({
                    name: d.product_name,
                    available: d.available,
                    min_stock: d.min_stock
                }));

            default:
                return [];
        }
    };

    const reportCategories = [
        {
            title: 'Sales Reports',
            icon: DollarSign,
            color: 'from-blue-500 to-blue-600',
            reports: [
                { name: 'Sales by Day', description: 'Daily sales breakdown', type: 'area' },
                { name: 'Sales by Product', description: 'Revenue per product', type: 'bar' },
                { name: 'Sales by Channel', description: 'Online vs POS comparison', type: 'bar' }
            ]
        },
        {
            title: 'Profit Reports',
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-600',
            reports: [
                { name: 'Profit by Product', description: 'Per-product margins', type: 'bar' }
            ]
        },
        {
            title: 'Inventory Reports',
            icon: Package,
            color: 'from-purple-500 to-purple-600',
            reports: [
                { name: 'Stock Levels', description: 'Current low stock items', type: 'bar' },
                { name: 'Low Stock Forecast', description: 'Predicted stockouts', type: 'area' }
            ]
        }
    ];

    const handleReportClick = (report, category) => {
        setSelectedReport({ ...report, category: category.title, color: category.color });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    if (loading && !dashboardStats) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    // Report Detail View
    if (selectedReport) {
        const reportData = getReportData(selectedReport.name);
        // Determine keys dynamically for table
        const tableKeys = reportData.length > 0 ? Object.keys(reportData[0]).filter(k => k !== 'name') : [];

        return (
            <div className="space-y-6">
                {/* Report Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedReport(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <p className="text-sm text-gray-500">{selectedReport.category}</p>
                            <h1 className="text-2xl font-bold text-gray-900">{selectedReport.name}</h1>
                        </div>
                    </div>
                </div>

                {/* Summary Cards derived from report data */}
                {reportData.length > 0 && selectedReport.type !== 'area' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <p className="text-sm text-gray-500 mb-1">Total Sales/Val</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(reportData.reduce((sum, d) => sum + (d.sales || d.revenue || d.available || 0), 0))}
                            </p>
                        </div>
                    </div>
                )}

                {/* Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{selectedReport.name}</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            {selectedReport.type === 'area' ? (
                                <AreaChart data={reportData}>
                                    <defs>
                                        <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `₹${(v / 1000)}K`} />
                                    <Tooltip formatter={(value) => [typeof value === 'number' && value > 1000 ? formatCurrency(value) : value]} />
                                    <Legend />
                                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMain)" strokeWidth={2} />
                                    {reportData[0]?.profit !== undefined && (
                                        <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={0.3} fill="#10b981" strokeWidth={2} />
                                    )}
                                    {reportData[0]?.available !== undefined && (
                                        <Area type="monotone" dataKey="available" name="Available Stock" stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" strokeWidth={2} />
                                    )}
                                </AreaChart>
                            ) : (
                                <BarChart data={reportData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `₹${(v / 1000)}K`} />
                                    <Tooltip formatter={(value) => [typeof value === 'number' && value > 1000 ? formatCurrency(value) : value]} />
                                    <Legend />
                                    <Bar dataKey="sales" name="Sales" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    {reportData[0]?.profit !== undefined && <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />}
                                    {reportData[0]?.available !== undefined && <Bar dataKey="available" name="Available" fill="#3b82f6" radius={[4, 4, 0, 0]} />}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Detailed Data</h2>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                                {tableKeys.map((key) => (
                                    <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                        {key.replace(/_/g, ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                                    {tableKeys.map((key) => (
                                        <td key={key} className="px-6 py-4 text-sm text-gray-500">
                                            {typeof row[key] === 'number' && (key.includes('sales') || key.includes('profit') || key.includes('revenue'))
                                                ? formatCurrency(row[key])
                                                : row[key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={tableKeys.length + 1} className="px-6 py-8 text-center text-gray-500">
                                        No data available for this report period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    // Main Dashboard View
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                    <p className="text-gray-500 mt-1">Real-time insights from your store</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAnalytics}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {['7d', '30d', '90d', '1y'].map((range) => (
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

            {/* Quick Stats (Real Data) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Gross Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardStats?.gross_sales || 0)}
                    </p>
                    <p className="text-sm text-gray-500">{dateRange}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Net Profit</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardStats?.net_profit || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Est. after costs</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Package className="h-5 w-5 text-purple-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.orders_count || 0}</p>
                    <p className="text-sm text-gray-500">{dashboardStats?.orders_pending || 0} pending</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Truck className="h-5 w-5 text-amber-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Inventory Value</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardStats?.inventory_value || 0)}
                    </p>
                    <p className="text-sm text-gray-500">At cost price</p>
                </div>
            </div>

            {/* Sales Trend Chart (Real Data) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend ({dateRange})</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#9ca3af' }}
                                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            />
                            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `₹${(v / 1000)}K`} />
                            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} formatter={(value) => [formatCurrency(value)]} />
                            <Legend />
                            <Area type="monotone" dataKey="sales" name="Sales" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Report Categories */}
            <div className="space-y-6">
                {reportCategories.map((category) => (
                    <div key={category.title} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color}`}>
                                <category.icon className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
                            {category.reports.map((report) => (
                                <button
                                    key={report.name}
                                    onClick={() => handleReportClick(report, category)}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{report.name}</p>
                                        <p className="text-sm text-gray-500">{report.description}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-amber-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalyticsPage;
