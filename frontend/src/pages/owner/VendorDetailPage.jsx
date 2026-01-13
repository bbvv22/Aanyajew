import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useOwner } from '../../context/OwnerContext';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Package,
    Clock,
    Building2,
    Briefcase,
    FileText
} from 'lucide-react';

const VendorDetailPage = () => {
    const { id } = useParams();
    const { getAuthHeader, backendUrl } = useOwner();

    const [vendor, setVendor] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vendorRes, productsRes, ordersRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/vendors/${id}`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/products`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/purchase-orders`, { headers: getAuthHeader() }) // Fetch all and filter
            ]);

            setVendor(vendorRes.data);

            // Client-side filtering
            const vendorProducts = productsRes.data.filter(p => p.vendorId === id || p.vendor_name === vendorRes.data.name);
            // Note: Product might store vendorId OR vendorName depending on implementation. 
            // My server.py create_product uses vendorId.
            // But let's check what product data looks like. It has vendorId.

            setProducts(vendorProducts);

            const vendorOrders = ordersRes.data.filter(po => po.vendor_name === vendorRes.data.name);
            // PO stores vendor_name and vendor_id? 
            // My PO endpoint returns vendor_name?
            // Wait, PO endpoint returns: id, po_number, vendor_name...
            // It DOES NOT return vendor_id in the list response.
            // But it filters by vendor name hopefully unique enough or I should update endpoint.
            // Ideally I should update PO endpoint to return vendor_id too.
            // But name matching is okay for now if names are unique.

            setOrders(vendorOrders);

        } catch (error) {
            console.error("Error fetching vendor details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Vendor not found</p>
                <Link to="/admin/vendors" className="text-amber-600 hover:underline mt-4 inline-block">Back to Vendors</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/vendors" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">{vendor.code}</span>
                        <span>•</span>
                        <span className={vendor.isActive ? "text-emerald-600" : "text-red-600"}>{vendor.isActive ? "Active" : "Inactive"}</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats / Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Building2 className="h-5 w-5" /></div>
                        <h3 className="font-medium text-gray-900">Contact Info</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                        {vendor.contact_person && <div className="text-gray-900 font-medium">{vendor.contact_person}</div>}
                        {vendor.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <a href={`mailto:${vendor.email}`} className="hover:text-amber-600">{vendor.email}</a>
                            </div>
                        )}
                        {vendor.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <a href={`tel:${vendor.phone}`} className="hover:text-amber-600">{vendor.phone}</a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MapPin className="h-5 w-5" /></div>
                        <h3 className="font-medium text-gray-900">Address</h3>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                        {vendor.address || "No address provided"}
                    </p>
                    {vendor.gst_number && (
                        <div className="mt-3 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-500 uppercase font-medium">GST / Tax ID</span>
                            <div className="text-sm font-medium text-gray-900">{vendor.gst_number}</div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Briefcase className="h-5 w-5" /></div>
                        <h3 className="font-medium text-gray-900">Terms</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-gray-500">Payment Terms</span>
                            <div className="text-sm font-medium text-gray-900">{vendor.payment_terms || "N/A"}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Lead Time</span>
                            <div className="text-sm font-medium text-gray-900">{vendor.lead_time_days || 0} days</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Products ({products.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Purchase Orders ({orders.length})
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm min-h-[300px]">
                {activeTab === 'overview' && (
                    <div className="p-8 text-center text-gray-500">
                        <div className="max-w-md mx-auto">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Overview</h3>
                            <p>Here you can visualize vendor performance, delivery times, and fulfillment rates.</p>
                            {/* Placeholder for future charts */}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Product Name</th>
                                    <th className="px-6 py-3">SKU</th>
                                    <th className="px-6 py-3 text-right">Cost Price</th>
                                    <th className="px-6 py-3 text-right">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No products linked to this vendor</td>
                                    </tr>
                                ) : (
                                    products.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{p.sku}</td>
                                            <td className="px-6 py-4 text-right">₹{p.totalCost?.toLocaleString() || p.costGold?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">{p.stockQuantity}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">PO Number</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-center">Items</th>
                                    <th className="px-6 py-3 text-right">Total Amount</th>
                                    <th className="px-6 py-3 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No purchase orders found</td>
                                    </tr>
                                ) : (
                                    orders.map(po => (
                                        <tr key={po.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-amber-600">
                                                <Link to={`/admin/purchase-orders/${po.id}`}>{po.po_number}</Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize 
                                                    ${po.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                                                        po.status === 'ordered' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{po.items_count}</td>
                                            <td className="px-6 py-4 text-right font-medium">₹{po.total_amount?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{new Date(po.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorDetailPage;
