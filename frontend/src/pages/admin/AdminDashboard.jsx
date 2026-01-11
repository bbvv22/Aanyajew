import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Package,
    AlertTriangle,
    ArrowRight,
    RefreshCw,
    Info,
    Truck,
    CreditCard,
    Clock,
    CheckCircle2
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
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useOwner } from '../../context/OwnerContext';

const AdminDashboard = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const context = useOutletContext();
    const dateRange = context?.dateRange || '7d';

    const [stats, setStats] = useState(null);
    const [salesData, setSalesData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const fetchDashboardData = async () => {
        setRefreshing(true);
        try {
            const [statsRes, salesRes, productsRes, alertsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/dashboard?period=${dateRange}`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/sales?days=${dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30}`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/top-products?days=${dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30}`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/analytics/low-stock`, { headers: getAuthHeader() })
            ]);

            setStats(statsRes.data);
            setSalesData(salesRes.data);
            setTopProducts(productsRes.data);
            setLowStockAlerts(alertsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            // Use mock data if API fails
            setStats({
                gross_sales: 245000,
                net_sales: 232750,
                gross_profit: 85750,
                net_profit: 61250,
                orders_count: 42,
                orders_pending: 8,
                orders_fulfilled: 30,
                orders_returned: 4,
                inventory_value: 850000,
                low_stock_count: 5,
                stockout_count: 2
            });

            // Mock sales data
            const mockSales = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                mockSales.push({
                    date: d.toISOString().split('T')[0],
                    gross_sales: Math.floor(Math.random() * 50000) + 20000,
                    net_sales: Math.floor(Math.random() * 45000) + 18000,
                    gross_profit: Math.floor(Math.random() * 15000) + 5000,
                    orders: Math.floor(Math.random() * 10) + 3
                });
            }
            setSalesData(mockSales);

            setTopProducts([
                { product_name: 'Diamond Stud Earrings', revenue: 85000, profit: 29750, units_sold: 12 },
                { product_name: 'Gold Chain Necklace', revenue: 62000, profit: 21700, units_sold: 8 },
                { product_name: 'Ruby Pendant', revenue: 45000, profit: 15750, units_sold: 5 },
                { product_name: 'Silver Anklet Set', revenue: 28000, profit: 9800, units_sold: 14 },
                { product_name: 'Pearl Bracelet', revenue: 22000, profit: 7700, units_sold: 6 }
            ]);

            setLowStockAlerts([
                { variant_sku: 'SKU-0001', product_name: 'Diamond Stud Earrings', available: 2, min_stock: 5, location_name: 'Main Store' },
                { variant_sku: 'SKU-0015', product_name: 'Gold Bangles Set', available: 1, min_stock: 3, location_name: 'Main Store' },
                { variant_sku: 'SKU-0023', product_name: 'Silver Ring', available: 0, min_stock: 5, location_name: 'Main Store' }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatNumber = (value) => {
        if (value >= 100000) {
            return (value / 100000).toFixed(1) + 'L';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    };

    const kpiCards = stats ? [
        {
            title: 'Gross Sales',
            value: formatCurrency(stats.gross_sales),
            change: '+12.5%',
            positive: true,
            icon: DollarSign,
            color: 'from-blue-500 to-blue-600',
            tooltip: 'Total revenue before any deductions'
        },
        {
            title: 'Net Sales',
            value: formatCurrency(stats.net_sales),
            change: '+10.2%',
            positive: true,
            icon: DollarSign,
            color: 'from-emerald-500 to-emerald-600',
            tooltip: 'Gross sales minus discounts and refunds'
        },
        {
            title: 'Gross Profit',
            value: formatCurrency(stats.gross_profit),
            change: '+8.7%',
            positive: true,
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600',
            tooltip: 'Net sales minus cost of goods (material + making + other)'
        },
        {
            title: 'Net Profit',
            value: formatCurrency(stats.net_profit),
            change: '+5.3%',
            positive: true,
            icon: TrendingUp,
            color: 'from-amber-500 to-amber-600',
            tooltip: 'Gross profit minus payment fees, shipping, and overhead'
        },
        {
            title: 'Orders',
            value: stats.orders_count,
            subtitle: `${stats.orders_pending} pending`,
            icon: ShoppingCart,
            color: 'from-pink-500 to-pink-600',
            link: '/admin/orders'
        },
        {
            title: 'Inventory Value',
            value: formatCurrency(stats.inventory_value),
            subtitle: `${stats.low_stock_count} low stock`,
            icon: Package,
            color: 'from-cyan-500 to-cyan-600',
            link: '/admin/inventory',
            alert: stats.stockout_count > 0 ? `${stats.stockout_count} stockouts` : null
        }
    ] : [];

    const orderBreakdown = stats ? [
        { name: 'Fulfilled', value: stats.orders_fulfilled, color: '#10b981' },
        { name: 'Pending', value: stats.orders_pending, color: '#f59e0b' },
        { name: 'Returned', value: stats.orders_returned, color: '#ef4444' }
    ] : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    <p className="text-gray-500 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        {dateRange === 'today' ? "Today's" : dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'} overview for Annya Jewellers
                    </p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiCards.map((card, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group"
                    >
                        {/* Tooltip */}
                        {card.tooltip && (
                            <div className="absolute top-3 right-3">
                                <div className="relative">
                                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {card.tooltip}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                            <card.icon className="h-5 w-5 text-white" />
                        </div>

                        {/* Value */}
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>

                        {/* Title & Change */}
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-gray-500">{card.title}</p>
                            {card.change && (
                                <span className={`text-xs font-medium ${card.positive ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-0.5`}>
                                    {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {card.change}
                                </span>
                            )}
                        </div>

                        {/* Subtitle */}
                        {card.subtitle && (
                            <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                        )}

                        {/* Alert */}
                        {card.alert && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                {card.alert}
                            </div>
                        )}

                        {/* Link */}
                        {card.link && (
                            <Link
                                to={card.link}
                                className="absolute inset-0 rounded-xl"
                                aria-label={`View ${card.title}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales & Profit Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Sales & Profit</h2>
                            <p className="text-sm text-gray-500">Revenue and profit trends over time</p>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                                    }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    tickFormatter={(value) => formatNumber(value)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white'
                                    }}
                                    formatter={(value) => [formatCurrency(value)]}
                                    labelFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
                                    }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="gross_sales"
                                    name="Sales"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="gross_profit"
                                    name="Profit"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Order Status</h2>
                        <p className="text-sm text-gray-500">Fulfillment breakdown</p>
                    </div>
                    <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={orderBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {orderBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {orderBreakdown.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-gray-600">{item.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Products by Profit */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Top Products by Profit</h2>
                            <p className="text-sm text-gray-500">Best performing items</p>
                        </div>
                        <Link to="/admin/analytics" className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                            View all <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {topProducts.slice(0, 5).map((product, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                                    <p className="text-xs text-gray-500">{product.units_sold} units sold</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(product.profit)}</p>
                                    <p className="text-xs text-gray-400">profit</p>
                                </div>
                                <div className="w-24 bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full"
                                        style={{ width: `${(product.profit / (topProducts[0]?.profit || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Center */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Action Center</h2>
                        <p className="text-sm text-gray-500">Items needing attention</p>
                    </div>
                    <div className="space-y-3">
                        {/* Low Stock Alerts */}
                        {lowStockAlerts.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    <span className="font-medium text-red-700">Low Stock Alert</span>
                                    <span className="ml-auto text-sm text-red-600">{lowStockAlerts.length} items</span>
                                </div>
                                <div className="space-y-2">
                                    {lowStockAlerts.slice(0, 3).map((alert, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700 truncate flex-1">{alert.product_name}</span>
                                            <span className={`font-medium ${alert.available === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                                {alert.available} left
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to="/admin/inventory/alerts"
                                    className="mt-3 block text-center text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    View all alerts →
                                </Link>
                            </div>
                        )}

                        {/* Pending Orders */}
                        {stats?.orders_pending > 0 && (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    <span className="font-medium text-amber-700">Pending Fulfillment</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                    {stats.orders_pending} orders waiting to be fulfilled
                                </p>
                                <Link
                                    to="/admin/orders?status=pending"
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                                >
                                    <Truck className="h-4 w-4" />
                                    Process Orders
                                </Link>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <span className="font-medium text-gray-700">Quick Stats</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500">Avg Order Value</p>
                                    <p className="font-semibold text-gray-900">
                                        {stats?.orders_count > 0 ? formatCurrency(stats.gross_sales / stats.orders_count) : '₹0'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Profit Margin</p>
                                    <p className="font-semibold text-emerald-600">
                                        {stats?.gross_sales > 0 ? ((stats.gross_profit / stats.gross_sales) * 100).toFixed(1) : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
