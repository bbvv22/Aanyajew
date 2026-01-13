import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Search,
    Filter,
    Download,
    Plus,
    Warehouse,
    AlertTriangle,
    TrendingDown,
    Package,
    ArrowRightLeft,
    ChevronRight,
    MoreVertical
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const InventoryPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [locations, setLocations] = useState([]);

    // KPIs
    const [kpis, setKpis] = useState({
        totalOnHand: 0,
        totalAvailable: 0,
        totalReserved: 0,
        inventoryValue: 0,
        lowStockCount: 0,
        stockoutCount: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch products with inventory data
            const [productsRes, locationsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/products`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/locations`, { headers: getAuthHeader() }).catch(() => ({ data: [{ id: 'loc-main', name: 'Main Store' }] }))
            ]);

            const productsData = productsRes.data;
            setProducts(productsData);
            setLocations(locationsRes.data);

            // Calculate KPIs from real product data
            const totalOnHand = productsData.reduce((sum, p) => sum + (p.onHand || 0), 0);
            const totalReserved = productsData.reduce((sum, p) => sum + (p.reserved || 0), 0);
            const inventoryValue = productsData.reduce((sum, p) => sum + ((p.totalCost || 0) * (p.stockQuantity || 0)), 0);
            const lowStockCount = productsData.filter(p =>
                (p.stockQuantity || 0) <= (p.lowStockThreshold || 2) && (p.stockQuantity || 0) > 0
            ).length;
            const stockoutCount = productsData.filter(p => (p.stockQuantity || 0) <= 0).length;

            setKpis({
                totalOnHand,
                totalAvailable: productsData.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
                totalReserved,
                inventoryValue,
                lowStockCount,
                stockoutCount
            });
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setLocations([{ id: 'loc-main', name: 'Main Store' }]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const getStockStatus = (product) => {
        const stock = product.stockQuantity || 0;
        const threshold = product.lowStockThreshold || 2;
        if (stock <= 0) return 'out';
        if (stock <= threshold) return 'low';
        return 'ok';
    };

    const quickActions = [
        { label: 'Stock Alerts', icon: AlertTriangle, path: '/admin/inventory/alerts', color: 'text-red-500', bg: 'bg-red-50', count: kpis.lowStockCount + kpis.stockoutCount },
        { label: 'Transfers', icon: ArrowRightLeft, path: '/admin/inventory/transfers', color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Ledger', icon: Package, path: '/admin/inventory/ledger', color: 'text-purple-500', bg: 'bg-purple-50' }
    ];

    // Filter products by search
    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-gray-500 mt-1">Manage stock levels across locations</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                    <Link
                        to="/admin/inventory/transfers/new"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                    >
                        <Plus className="h-4 w-4" />
                        New Transfer
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    {
                        label: 'On Hand',
                        value: kpis.totalOnHand,
                        icon: Warehouse,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50',
                        tooltip: 'Total Physical Stock (Available + Reserved)'
                    },
                    {
                        label: 'Available',
                        value: kpis.totalAvailable,
                        icon: Package,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50',
                        tooltip: 'Free to Sell (On Hand - Reserved)'
                    },
                    {
                        label: 'Reserved',
                        value: kpis.totalReserved,
                        icon: ArrowRightLeft,
                        color: 'text-orange-500',
                        bg: 'bg-orange-50',
                        tooltip: 'Sold but Not Shipped (Pending Orders)'
                    },
                    {
                        label: 'Value at Cost',
                        value: formatCurrency(kpis.inventoryValue),
                        icon: null,
                        color: 'text-gray-900',
                        bg: 'bg-transparent',
                        tooltip: 'Total Investment (Cost * On Hand)'
                    },
                    {
                        label: 'Low Stock',
                        value: kpis.lowStockCount,
                        icon: AlertTriangle,
                        color: 'text-amber-500',
                        bg: 'bg-transparent',
                        textColor: 'text-amber-600',
                        tooltip: 'Items below low stock threshold'
                    },
                    {
                        label: 'Stockouts',
                        value: kpis.stockoutCount,
                        icon: TrendingDown,
                        color: 'text-red-500',
                        bg: 'bg-transparent',
                        textColor: 'text-red-600',
                        tooltip: 'Items with 0 stock'
                    }
                ].map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative group">
                        <div className="flex items-center justify-between mb-2">
                            {stat.icon && (
                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                            )}
                            {/* Custom Tooltip */}
                            <div className="relative group/tooltip">
                                <div className="text-gray-300 hover:text-gray-500 cursor-help">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                                </div>
                                <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 pointer-events-none">
                                    <div className="absolute -top-1 right-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                                    {stat.tooltip}
                                </div>
                            </div>
                        </div>
                        <p className={`text-2xl font-bold ${stat.textColor || 'text-gray-900'}`}>{stat.value}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                    <Link
                        key={action.label}
                        to={action.path}
                        className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${action.bg}`}>
                                <action.icon className={`h-5 w-5 ${action.color}`} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{action.label}</p>
                                {action.count > 0 && (
                                    <p className="text-sm text-gray-500">{action.count} items need attention</p>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>
                ))}
            </div>

            {/* Location Filter & Search */}
            <div className="flex items-center gap-4">
                <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                    <option value="all">All Locations</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products, SKUs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">On Hand</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Reserved</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Available</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Cost</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.slice(0, 20).map((product) => {
                            const status = getStockStatus(product);
                            const available = product.stockQuantity || 0;
                            const reserved = product.reserved || 0;
                            const onHand = product.onHand || (available + reserved);

                            return (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                                            />
                                            <span className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500 font-mono">{product.sku || 'N/A'}</td>
                                    <td className="px-4 py-4 text-center font-medium">{onHand}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{reserved}</td>
                                    <td className="px-4 py-4 text-center font-medium">{available}</td>
                                    <td className="px-4 py-4 text-center text-gray-600">{formatCurrency(product.totalCost || 0)}</td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status === 'ok' ? 'bg-emerald-100 text-emerald-700' :
                                            status === 'low' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {status === 'ok' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredProducts.length > 20 && (
                    <div className="px-4 py-3 bg-gray-50 border-t text-center text-sm text-gray-500">
                        Showing 20 of {filteredProducts.length} products
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryPage;
