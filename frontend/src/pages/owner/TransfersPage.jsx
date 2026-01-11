import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRightLeft, Plus, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const TransfersPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/transfers`, {
                headers: getAuthHeader()
            });
            setTransfers(response.data);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            // Mock data for now
            setTransfers([
                {
                    id: 'TRF-001',
                    from_location: 'Main Store',
                    to_location: 'Warehouse',
                    items_count: 5,
                    status: 'pending',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'TRF-002',
                    from_location: 'Warehouse',
                    to_location: 'Main Store',
                    items_count: 3,
                    status: 'in_transit',
                    created_at: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'TRF-003',
                    from_location: 'Main Store',
                    to_location: 'Branch 2',
                    items_count: 8,
                    status: 'received',
                    created_at: new Date(Date.now() - 172800000).toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'in_transit': return <Truck className="h-4 w-4 text-blue-500" />;
            case 'received': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'in_transit': return 'In Transit';
            case 'received': return 'Received';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'in_transit': return 'bg-blue-100 text-blue-700';
            case 'received': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/admin/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
                        <p className="text-gray-500 mt-1">Move inventory between locations</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                    <Plus className="h-4 w-4" />
                    New Transfer
                </button>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transfer ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">From</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase"></th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">To</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transfers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                    No transfers found. Create a new transfer to move stock between locations.
                                </td>
                            </tr>
                        ) : (
                            transfers.map((transfer) => (
                                <tr key={transfer.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 font-mono text-sm font-medium text-blue-600">{transfer.id}</td>
                                    <td className="px-4 py-4 text-gray-900">{transfer.from_location}</td>
                                    <td className="px-4 py-4 text-center">
                                        <ArrowRightLeft className="h-4 w-4 text-gray-400 mx-auto" />
                                    </td>
                                    <td className="px-4 py-4 text-gray-900">{transfer.to_location}</td>
                                    <td className="px-4 py-4 text-center font-medium">{transfer.items_count}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(transfer.status)}
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                                                {getStatusLabel(transfer.status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500">
                                        {new Date(transfer.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransfersPage;
