import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Search,
    Plus,
    Filter,
    Eye,
    Truck,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    FileText
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import CreatePurchaseOrderModal from '../../components/admin/CreatePurchaseOrderModal';

const PurchaseOrdersPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const tabs = [
        { id: 'all', label: 'All POs' },
        { id: 'draft', label: 'Draft', icon: FileText },
        { id: 'ordered', label: 'Ordered', icon: Clock },
        { id: 'partial', label: 'Partial', icon: Package },
        { id: 'received', label: 'Received', icon: CheckCircle },
        { id: 'closed', label: 'Closed', icon: XCircle }
    ];

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
            const response = await axios.get(`${backendUrl}/api/admin/purchase-orders${params}`, {
                headers: getAuthHeader()
            });
            setPurchaseOrders(response.data);
        } catch (error) {
            console.error('Error fetching POs:', error);
            console.error('Error fetching POs:', error);
            setPurchaseOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchaseOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const getStatusBadge = (status) => {
        const styles = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
            ordered: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ordered' },
            partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial' },
            received: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Received' },
            closed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Closed' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' }
        };
        const style = styles[status] || styles.draft;
        return (
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
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
            year: 'numeric'
        });
    };

    const filteredPOs = purchaseOrders.filter(po =>
        po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
    const paginatedPOs = filteredPOs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
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
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500 mt-1">{purchaseOrders.length} purchase orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/vendors"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        View Vendors
                    </Link>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                    >
                        <Plus className="h-4 w-4" />
                        New PO
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
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search PO number or vendor..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
            </div>

            {/* PO Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PO Number</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Items</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedPOs.map((po) => (
                            <tr key={po.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <Link to={`/admin/purchase-orders/${po.id}`} className="font-medium text-gray-900 hover:text-amber-600">
                                        {po.po_number}
                                    </Link>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700">
                                    {po.vendor_name}
                                </td>
                                <td className="px-4 py-4">
                                    {getStatusBadge(po.status)}
                                </td>
                                <td className="px-4 py-4 text-center text-sm">
                                    {po.received_count !== undefined ? (
                                        <span className={po.received_count === po.items_count ? 'text-emerald-600' : 'text-amber-600'}>
                                            {po.received_count}/{po.items_count}
                                        </span>
                                    ) : (
                                        <span className="text-gray-600">{po.items_count}</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900">
                                    {formatCurrency(po.total_amount)}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    {formatDate(po.created_at)}
                                    {po.expected_date && po.status === 'ordered' && (
                                        <div className="text-xs text-blue-500">
                                            Due: {formatDate(po.expected_date)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link
                                            to={`/admin/purchase-orders/${po.id}`}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        {(po.status === 'ordered' || po.status === 'partial') && (
                                            <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Receive">
                                                <Truck className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
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
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPOs.length)} of {filteredPOs.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
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

                {paginatedPOs.length === 0 && (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No purchase orders found</p>
                    </div>
                )}
            </div>

            <CreatePurchaseOrderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onPOCreated={fetchPurchaseOrders}
            />
        </div>
    );
};

export default PurchaseOrdersPage;
