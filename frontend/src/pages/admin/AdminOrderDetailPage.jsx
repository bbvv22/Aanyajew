import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Package,
    Truck,
    Check,
    Clock,
    ChevronLeft,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    AlertCircle
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const AdminOrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getAuthHeader, backendUrl } = useOwner();
    const { error: showError } = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/orders/${id}`, {
                headers: getAuthHeader()
            });
            setOrder(response.data);
        } catch (error) {
            console.error("Failed to fetch order details", error);
            showError("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusStep = (status) => {
        switch (status?.toLowerCase()) {
            case "pending": return 0;
            case "processing": return 1;
            case "shipped": return 2;
            case "delivered": return 3;
            default: return 0;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
                <Link to="/admin/orders" className="text-amber-600 hover:text-amber-700 font-medium">
                    ← Back to Orders
                </Link>
            </div>
        );
    }

    const steps = [
        { label: "Pending", icon: Clock },
        { label: "Processing", icon: Package },
        { label: "Shipped", icon: Truck },
        { label: "Delivered", icon: Check },
    ];

    const currentStep = getStatusStep(order.status);

    const handleShipOrder = async () => {
        if (!window.confirm("Are you sure you want to create a shipment? This will generate a label in Shiprocket.")) return;

        try {
            setLoading(true); // Re-use loading or add specific state
            await axios.post(`${backendUrl}/api/admin/orders/${id}/ship`, {}, {
                headers: getAuthHeader()
            });
            success("Shipment created successfully!");
            fetchOrderDetails();
        } catch (error) {
            console.error("Shipping failed", error);
            showError("Failed to create shipment. Check Shiprocket credentials.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin/orders"
                            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-amber-600 hover:border-amber-200 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                {order.orderNumber || order.id}
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                    order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                    {order.status?.toUpperCase()}
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Placed on {formatDate(order.createdAt)} via {order.channel === 'online' ? 'Online Store' : 'POS'}
                            </p>
                        </div>
                    </div>

                    {/* Ship Action */}
                    {order.status === 'processing' && (
                        <button
                            onClick={handleShipOrder}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Truck className="h-4 w-4" />
                            Ship Order
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Order Items & Status */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Tracker */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-6">Order Status</h2>
                            <div className="relative flex justify-between">
                                {steps.map((step, index) => (
                                    <div key={step.label} className="flex flex-col items-center flex-1 relative z-10">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${index <= currentStep
                                                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                                : "bg-gray-100 text-gray-400"
                                                }`}
                                        >
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                        <span className={`text-xs font-medium mt-2 ${index <= currentStep ? "text-gray-900" : "text-gray-400"
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                                {/* Progress Bar Background */}
                                <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0" />
                                {/* Active Progress Bar */}
                                <div
                                    className="absolute top-5 left-0 h-0.5 bg-amber-500 transition-all duration-500 -z-0"
                                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">Items ({order.items?.length || 0})</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {order.items?.map((item, index) => (
                                    <div key={index} className="p-6 flex items-center gap-4">
                                        <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                    <Package className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">SKU: {item.sku || 'N/A'}</p>
                                            <div className="mt-2 flex items-center gap-4 text-sm">
                                                <span className="text-gray-600">Qty: <span className="font-medium text-gray-900">{item.quantity}</span></span>
                                                <span className="text-gray-600">Price: <span className="font-medium text-gray-900">₹{item.price?.toLocaleString()}</span></span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-gray-50 p-6 border-t border-gray-100 space-y-3">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="font-medium">₹{order.subtotal?.toLocaleString()}</span>
                                </div>
                                {order.discountTotal > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                        <span className="font-medium">-₹{order.discountTotal?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Shipping</span>
                                    <span className="font-medium">
                                        {order.shippingTotal > 0 ? `₹${order.shippingTotal?.toLocaleString()}` : 'Free'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>₹{order.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Customer & Info */}
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Customer</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-2 bg-amber-50 rounded-lg text-amber-600">
                                        <Package className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                                        <p className="text-xs text-gray-500">Customer Name</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-2 bg-amber-50 rounded-lg text-amber-600">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 break-all">{order.customerEmail}</p>
                                        <p className="text-xs text-gray-500">Email Address</p>
                                    </div>
                                </div>
                                {order.customerPhone && (
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-amber-50 rounded-lg text-amber-600">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{order.customerPhone}</p>
                                            <p className="text-xs text-gray-500">Phone Number</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Information</h2>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-2 bg-amber-50 rounded-lg text-amber-600">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                {order.shippingAddress ? (
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        <p className="font-medium text-gray-900">
                                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                                        </p>
                                        <p>{order.shippingAddress.address}</p>
                                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                                        <p>{order.shippingAddress.country}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No shipping address provided (POS/Pickup)</p>
                                )}
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Payment</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Status</span>
                                    <span className={`font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'
                                        }`}>
                                        {order.paymentStatus?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Method</span>
                                    <span className="font-medium text-gray-900">{order.paymentMethod || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrderDetailPage;
