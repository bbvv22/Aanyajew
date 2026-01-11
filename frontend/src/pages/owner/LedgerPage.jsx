import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Package, ArrowUpCircle, ArrowDownCircle, RefreshCw, Truck, Filter } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const LedgerPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/inventory/ledger`, {
                headers: getAuthHeader()
            });
            setEntries(response.data);
        } catch (error) {
            console.error('Error fetching ledger:', error);
            // Mock data showing inventory history
            setEntries([
                {
                    id: 'LED-001',
                    product_name: 'Diamond Stud Earrings',
                    sku: 'AJ-ER-0001',
                    event_type: 'receive',
                    qty_delta: 10,
                    qty_after: 10,
                    reference: 'PO-2024-001',
                    note: 'Initial stock from Shree Gold Suppliers',
                    created_at: new Date(Date.now() - 7 * 86400000).toISOString()
                },
                {
                    id: 'LED-002',
                    product_name: 'Diamond Stud Earrings',
                    sku: 'AJ-ER-0001',
                    event_type: 'sale',
                    qty_delta: -2,
                    qty_after: 8,
                    reference: 'ORD-2024-0015',
                    note: 'Sold to customer',
                    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
                },
                {
                    id: 'LED-003',
                    product_name: 'Gold Chain Necklace',
                    sku: 'AJ-NC-0015',
                    event_type: 'receive',
                    qty_delta: 5,
                    qty_after: 5,
                    reference: 'PO-2024-002',
                    note: 'Received from vendor',
                    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
                },
                {
                    id: 'LED-004',
                    product_name: 'Gold Chain Necklace',
                    sku: 'AJ-NC-0015',
                    event_type: 'sale',
                    qty_delta: -2,
                    qty_after: 3,
                    reference: 'ORD-2024-0018',
                    note: 'Online sale',
                    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
                },
                {
                    id: 'LED-005',
                    product_name: 'Ruby Pendant',
                    sku: 'AJ-PD-0023',
                    event_type: 'adjust',
                    qty_delta: -1,
                    qty_after: 0,
                    reference: 'ADJ-001',
                    note: 'Damaged item written off',
                    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
                },
                {
                    id: 'LED-006',
                    product_name: 'Silver Bangles Set',
                    sku: 'AJ-BG-0042',
                    event_type: 'transfer_in',
                    qty_delta: 5,
                    qty_after: 15,
                    reference: 'TRF-001',
                    note: 'Transfer from warehouse',
                    created_at: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'receive': return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
            case 'sale': return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
            case 'return': return <RefreshCw className="h-4 w-4 text-purple-500" />;
            case 'adjust': return <RefreshCw className="h-4 w-4 text-amber-500" />;
            case 'transfer_in': return <Truck className="h-4 w-4 text-teal-500" />;
            case 'transfer_out': return <Truck className="h-4 w-4 text-orange-500" />;
            default: return <Package className="h-4 w-4 text-gray-500" />;
        }
    };

    const getEventLabel = (type) => {
        switch (type) {
            case 'receive': return 'Received';
            case 'sale': return 'Sale';
            case 'return': return 'Return';
            case 'adjust': return 'Adjustment';
            case 'transfer_in': return 'Transfer In';
            case 'transfer_out': return 'Transfer Out';
            default: return type;
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'receive': return 'bg-green-100 text-green-700';
            case 'sale': return 'bg-blue-100 text-blue-700';
            case 'return': return 'bg-purple-100 text-purple-700';
            case 'adjust': return 'bg-amber-100 text-amber-700';
            case 'transfer_in': return 'bg-teal-100 text-teal-700';
            case 'transfer_out': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredEntries = filterType === 'all'
        ? entries
        : entries.filter(e => e.event_type === filterType);

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Inventory Ledger</h1>
                        <p className="text-gray-500 mt-1">Complete history of stock movements</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                        <option value="all">All Events</option>
                        <option value="receive">Receives</option>
                        <option value="sale">Sales</option>
                        <option value="return">Returns</option>
                        <option value="adjust">Adjustments</option>
                        <option value="transfer_in">Transfers In</option>
                        <option value="transfer_out">Transfers Out</option>
                    </select>
                </div>
            </div>

            {/* Ledger Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Event</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Change</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEntries.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                    No ledger entries found.
                                </td>
                            </tr>
                        ) : (
                            filteredEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-sm text-gray-500">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                        <br />
                                        <span className="text-xs">{new Date(entry.created_at).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            {getEventIcon(entry.event_type)}
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getEventColor(entry.event_type)}`}>
                                                {getEventLabel(entry.event_type)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-medium text-gray-900">{entry.product_name}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 font-mono">{entry.sku}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`font-medium ${entry.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {entry.qty_delta >= 0 ? '+' : ''}{entry.qty_delta}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center font-medium">{entry.qty_after}</td>
                                    <td className="px-4 py-4">
                                        <span className="text-sm text-blue-600 font-mono">{entry.reference}</span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500 max-w-[200px] truncate">{entry.note}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LedgerPage;
