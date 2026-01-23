import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Search,
    Plus,
    Mail,
    Phone,
    ShoppingBag,
    DollarSign,
    User,
    MoreVertical,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import CreateCustomerModal from '../../components/admin/CreateCustomerModal';

const CustomersPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/admin/customers`, {
                headers: getAuthHeader()
            });
            // Map backend keys to frontend expectations
            const mappedCustomers = response.data.map(c => ({
                ...c,
                total_orders: c.orders || 0,
                total_spent: c.totalSpent || 0
            }));
            setCustomers(mappedCustomers);
        } catch (error) {
            console.error('Error fetching customers:', error);
            // Mock data
            setCustomers([
                { id: 'c-001', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765 43210', total_orders: 5, total_spent: 125000 },
                { id: 'c-002', name: 'Rahul Gupta', email: 'rahul@example.com', phone: '+91 87654 32109', total_orders: 3, total_spent: 85000 },
                { id: 'c-003', name: 'Anita Reddy', email: 'anita@example.com', phone: '+91 76543 21098', total_orders: 8, total_spent: 215000 },
                { id: 'c-004', name: 'Vikram Mehta', email: 'vikram@example.com', phone: '+91 65432 10987', total_orders: 2, total_spent: 42000 },
                { id: 'c-005', name: 'Sunita Patel', email: 'sunita@example.com', phone: '+91 54321 09876', total_orders: 12, total_spent: 385000 }
            ]);
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

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedCustomers = filteredCustomers.slice(
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
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500 mt-1">{customers.length} customers</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                    <Plus className="h-4 w-4" />
                    Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Orders</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Spent</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                            <span className="text-white font-medium text-sm">
                                                {customer.name?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{customer.name}</p>
                                            <p className="text-sm text-gray-500">{customer.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        {customer.phone}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <ShoppingBag className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">{customer.total_orders}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-emerald-600">
                                    {formatCurrency(customer.total_spent)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === customer.id ? null : customer.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                        {activeDropdown === customer.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    View Details
                                                </button>
                                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <ShoppingBag className="h-4 w-4" />
                                                    View Orders
                                                </button>
                                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    Send Email
                                                </button>
                                            </div>
                                        )}
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
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
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

                {paginatedCustomers.length === 0 && (
                    <div className="text-center py-12">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No customers found</p>
                    </div>
                )}
            </div>

            <CreateCustomerModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCustomerCreated={fetchCustomers}
            />
        </div>
    );
};

export default CustomersPage;
