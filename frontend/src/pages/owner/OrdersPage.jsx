import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    Search,
    Filter,
    Download,
    Eye,
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Package,
    FileText
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const OrdersPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [searchParams, setSearchParams] = useSearchParams();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const itemsPerPage = 15;

    const tabs = [
        { id: 'all', label: 'All Orders', count: 0 },
        { id: 'pending', label: 'Open', count: 0, icon: Clock },
        { id: 'unpaid', label: 'Unpaid', count: 0, icon: AlertCircle },
        { id: 'unfulfilled', label: 'Unfulfilled', count: 0, icon: Package },
        { id: 'fulfilled', label: 'Fulfilled', count: 0, icon: CheckCircle },
        { id: 'returned', label: 'Returned', count: 0, icon: XCircle },
        { id: 'cancelled', label: 'Cancelled', count: 0, icon: XCircle }
    ];

    useEffect(() => {
        fetchOrders();
    }, [activeTab]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
            const response = await axios.get(`${backendUrl}/api/admin/orders${params}`, {
                headers: getAuthHeader()
            });
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // No mock data - just show empty state on error
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder || !newStatus) return;

        try {
            await axios.put(
                `${backendUrl}/api/admin/orders/${selectedOrder.id}/status`,
                { status: newStatus },
                { headers: getAuthHeader() }
            );

            // Update local state
            setOrders(prev => prev.map(o =>
                o.id === selectedOrder.id ? { ...o, status: newStatus } : o
            ));

            setStatusModalOpen(false);
            setSelectedOrder(null);
            setNewStatus('');
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update order status');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-700',
            paid: 'bg-blue-100 text-blue-700',
            fulfilled: 'bg-emerald-100 text-emerald-700',
            shipped: 'bg-purple-100 text-purple-700',
            delivered: 'bg-green-100 text-green-700',
            returned: 'bg-red-100 text-red-700',
            cancelled: 'bg-gray-100 text-gray-700'
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredOrders = orders.filter(o =>
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const toggleSelectAll = () => {
        if (selectedOrders.length === paginatedOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(paginatedOrders.map(o => o.id));
        }
    };

    const toggleSelectOrder = (orderId) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
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
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-500 mt-1">{orders.length} total orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon && <tab.icon className="h-4 w-4" />}
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search orders, customers..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
            </div>

            {/* Bulk Actions */}
            {selectedOrders.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">
                        {selectedOrders.length} order(s) selected
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50">
                            Mark Fulfilled
                        </button>
                        <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50">
                            Print Labels
                        </button>
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-12 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.includes(order.id)}
                                        onChange={() => toggleSelectOrder(order.id)}
                                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <Link to={`/admin/orders/${order.id}`} className="font-medium text-gray-900 hover:text-amber-600">
                                        {order.order_number || `#${order.id.slice(0, 8)}`}
                                    </Link>
                                </td>
                                <td className="px-4 py-4">
                                    <div>
                                        <p className="text-sm text-gray-900">{order.customer?.name || 'Walk-in'}</p>
                                        <p className="text-xs text-gray-500">{order.customer?.email}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="text-sm text-gray-900">{order.items?.length || 0} items</p>
                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                        {order.items?.map(i => i.name).join(', ')}
                                    </p>
                                </td>
                                <td className="px-4 py-4 font-medium text-gray-900">
                                    {formatCurrency(order.total)}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`text-xs font-medium ${order.channel === 'online' ? 'text-blue-600' : 'text-purple-600'}`}>
                                        {order.channel === 'online' ? '🌐 Online' : '🏪 POS'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    {formatDate(order.createdAt)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link
                                            to={`/admin/orders/${order.id}`}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveDropdown(activeDropdown === order.id ? null : order.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            {activeDropdown === order.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setNewStatus(order.status);
                                                            setStatusModalOpen(true);
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Package className="h-4 w-4" />
                                                        Update Status
                                                    </button>
                                                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                        <FileText className="h-4 w-4" />
                                                        Print Invoice
                                                    </button>
                                                    <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                        <XCircle className="h-4 w-4" />
                                                        Cancel Order
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}

                {paginatedOrders.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No orders found</p>
                    </div>
                )}
            </div>

            {/* Status Update Modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Update Order Status</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className="space-y-2 mb-6">
                            <label className="block text-sm font-medium text-gray-700">New Status</label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="fulfilled">Fulfilled</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="returned">Returned</option>
                            </select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setStatusModalOpen(false);
                                    setSelectedOrder(null);
                                    setNewStatus('');
                                }}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateStatus}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                            >
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
