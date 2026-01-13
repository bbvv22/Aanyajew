import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ArrowLeft, Package, TrendingUp } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const StockAlertsPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            // Fetch products with low stock
            const response = await axios.get(`${backendUrl}/api/admin/products`, { headers: getAuthHeader() });
            const products = response.data;

            // Filter to low stock and out of stock
            const lowStockItems = products.filter(p => {
                const stock = p.stockQuantity || 0;
                const threshold = p.lowStockThreshold || 2;
                return stock <= threshold;
            }).sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0));

            setAlerts(lowStockItems);
        } catch (error) {
            console.error('Error fetching alerts:', error);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
                    <p className="text-gray-500 mt-1">{alerts.length} items need attention</p>
                </div>
            </div>

            {/* Alert Cards */}
            <div className="space-y-4">
                {alerts.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">All products have healthy stock levels!</p>
                    </div>
                ) : (
                    alerts.map((product) => {
                        const stock = product.stockQuantity || 0;
                        const threshold = product.lowStockThreshold || 2;
                        const isOutOfStock = stock <= 0;

                        return (
                            <div
                                key={product.id}
                                className={`bg-white rounded-xl p-4 border-l-4 ${isOutOfStock ? 'border-red-500' : 'border-amber-500'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-16 h-16 rounded-lg object-cover"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/64'; }}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            {isOutOfStock ? (
                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                            ) : (
                                                <TrendingUp className="h-4 w-4 text-amber-500 rotate-180" />
                                            )}
                                            <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-amber-600'
                                                }`}>
                                                {isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                                            </span>
                                        </div>
                                        <h3 className="font-medium text-gray-900 mt-1">{product.name}</h3>
                                        <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">{stock}</p>
                                        <p className="text-sm text-gray-500">of min. {threshold}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Reorder Qty</p>
                                        <p className="text-lg font-medium text-blue-600">{Math.max(10 - stock, threshold * 3)}</p>
                                    </div>
                                    <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                                        Create PO
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default StockAlertsPage;
