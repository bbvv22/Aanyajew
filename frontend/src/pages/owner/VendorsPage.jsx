import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Search,
    Plus,
    Phone,
    Mail,
    MapPin,
    Edit,
    Trash2,
    MoreVertical,
    Building2,
    ChevronRight
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import CreateVendorModal from '../../components/admin/CreateVendorModal';

const VendorsPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/admin/vendors`, {
                headers: getAuthHeader()
            });
            setVendors(response.data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setVendors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredVendors = vendors.filter(v =>
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city?.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
                    <p className="text-gray-500 mt-1">{vendors.length} suppliers</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/purchase-orders"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Purchase Orders
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                    >
                        <Plus className="h-4 w-4" />
                        Add Vendor
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                </div>
            </div>

            {/* Vendors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map((vendor) => (
                    <div
                        key={vendor.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                                    <p className="text-sm text-gray-500">{vendor.code}</p>
                                </div>
                            </div>
                            <div className="relative">
                                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {vendor.contacts?.[0] && (
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    {vendor.contacts[0].phone}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    {vendor.contacts[0].email}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {vendor.city}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Terms:</span>
                                    <span className="ml-1 font-medium text-gray-900">{vendor.payment_terms}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Lead:</span>
                                    <span className="ml-1 font-medium text-gray-900">{vendor.lead_time_days}d</span>
                                </div>
                            </div>
                            <Link
                                to={`/admin/vendors/${vendor.id}`}
                                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                            >
                                View
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {filteredVendors.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No vendors found</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 text-amber-600 hover:text-amber-700 font-medium text-sm"
                    >
                        Add your first vendor
                    </button>
                </div>
            )}

            <CreateVendorModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onVendorCreated={fetchVendors}
            />
        </div>
    );
};

export default VendorsPage;
