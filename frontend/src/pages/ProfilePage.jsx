import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Package, Heart, LogOut, Mail, Phone, MapPin, Star, RefreshCw, X, Clock, CheckCircle, Truck, AlertCircle, Plus, Edit2, Trash2, Home, Briefcase } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../context/ToastContext";
import axios from "axios";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

const ProfilePage = () => {
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");
    const [orders, setOrders] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    // Modal states
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingAddress, setEditingAddress] = useState(null);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
    const [refundReason, setRefundReason] = useState("");
    const [addressForm, setAddressForm] = useState({
        label: "Home",
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        state: "Telangana",
        postalCode: "",
        phone: "",
        isDefault: false
    });
    const [submitting, setSubmitting] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";

    const states = [
        "Telangana", "Andhra Pradesh", "Maharashtra", "Karnataka",
        "Tamil Nadu", "Delhi", "Gujarat", "Kerala", "Other"
    ];

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!savedUser || !token) {
            navigate("/login");
            return;
        }

        try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setFormData({
                name: userData.name || "",
                email: userData.email || "",
                phone: userData.phone || "",
            });
        } catch (e) {
            navigate("/login");
        }
        setLoading(false);
    }, [navigate]);

    useEffect(() => {
        if (activeTab === "orders") {
            fetchOrders();
        } else if (activeTab === "addresses") {
            fetchAddresses();
        }
    }, [activeTab]);

    const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${backendUrl}/api/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(response.data);
        } catch (err) {
            console.error("Error fetching orders:", err);
            setOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };

    const fetchAddresses = async () => {
        setAddressesLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${backendUrl}/api/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAddresses(response.data);
        } catch (err) {
            console.error("Error fetching addresses:", err);
            setAddresses([]);
        } finally {
            setAddressesLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.put(`${backendUrl}/api/auth/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedUser = response.data;
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            setEditing(false);
            success("Profile updated successfully!");
        } catch (err) {
            console.error("Update profile error:", err);
            showError(err.response?.data?.detail || "Failed to update profile");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        window.location.reload();
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${backendUrl}/api/orders/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            success("Order cancelled successfully");
            fetchOrders();
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to cancel order");
        }
    };

    const handleRequestRefund = async () => {
        if (!refundReason.trim()) {
            showError("Please provide a reason for refund");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${backendUrl}/api/orders/${selectedOrder.id}/refund`,
                { reason: refundReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            success("Refund request submitted successfully");
            setShowRefundModal(false);
            setRefundReason("");
            fetchOrders();
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to submit refund request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewData.comment.trim()) {
            showError("Please write a review");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${backendUrl}/api/products/${selectedProduct.productId}/reviews`,
                { rating: reviewData.rating, comment: reviewData.comment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            success("Review submitted successfully!");
            setShowReviewModal(false);
            setReviewData({ rating: 5, comment: "" });
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAddress = async () => {
        if (!addressForm.firstName || !addressForm.lastName || !addressForm.address || !addressForm.city || !addressForm.postalCode || !addressForm.phone) {
            showError("Please fill in all fields");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            if (editingAddress) {
                await axios.put(`${backendUrl}/api/addresses/${editingAddress.id}`, addressForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                success("Address updated successfully");
            } else {
                await axios.post(`${backendUrl}/api/addresses`, addressForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                success("Address added successfully");
            }
            setShowAddressModal(false);
            resetAddressForm();
            fetchAddresses();
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to save address");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm("Are you sure you want to delete this address?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${backendUrl}/api/addresses/${addressId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            success("Address deleted successfully");
            fetchAddresses();
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to delete address");
        }
    };

    const handleSetDefaultAddress = async (addressId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${backendUrl}/api/addresses/${addressId}/default`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            success("Default address updated");
            fetchAddresses();
        } catch (err) {
            showError(err.response?.data?.detail || "Failed to set default address");
        }
    };

    const resetAddressForm = () => {
        setAddressForm({
            label: "Home",
            firstName: "",
            lastName: "",
            address: "",
            city: "",
            state: "Telangana",
            postalCode: "",
            phone: "",
            isDefault: false
        });
        setEditingAddress(null);
    };

    const openEditAddress = (addr) => {
        setEditingAddress(addr);
        setAddressForm({
            label: addr.label,
            firstName: addr.firstName,
            lastName: addr.lastName,
            address: addr.address,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            phone: addr.phone,
            isDefault: addr.isDefault
        });
        setShowAddressModal(true);
    };

    const getStatusBadge = (status, refundStatus) => {
        if (refundStatus === "requested") {
            return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Refund Requested</span>;
        }
        if (refundStatus === "approved") {
            return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Refund Approved</span>;
        }
        switch (status) {
            case "pending": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>;
            case "processing": return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Processing</span>;
            case "shipped": return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1"><Truck className="h-3 w-3" /> Shipped</span>;
            case "delivered": return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Delivered</span>;
            case "cancelled": return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><X className="h-3 w-3" /> Cancelled</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            year: "numeric", month: "short", day: "numeric"
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="h-10 w-10" />
                    </div>
                    <h1 className="text-3xl font-serif mb-2">{user?.name}</h1>
                    <p className="text-white/90">{user?.email}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Tab Navigation */}
                <div className="flex gap-2 md:gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`pb-4 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "profile" ? "text-[#c4ad94] border-b-2 border-[#c4ad94]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <User className="h-4 w-4 inline mr-2" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab("orders")}
                        className={`pb-4 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "orders" ? "text-[#c4ad94] border-b-2 border-[#c4ad94]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Package className="h-4 w-4 inline mr-2" />
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab("addresses")}
                        className={`pb-4 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "addresses" ? "text-[#c4ad94] border-b-2 border-[#c4ad94]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <MapPin className="h-4 w-4 inline mr-2" />
                        Addresses
                    </button>
                    <button
                        onClick={() => setActiveTab("wishlist")}
                        className={`w-full text-left px-2 pb-4 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "wishlist" ? "text-[#c4ad94] border-b-2 border-[#c4ad94]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Heart className="h-4 w-4 inline-block mr-2" />
                        Wishlist
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                                    <p className="text-sm text-gray-500">Manage your personal details</p>
                                </div>
                                {!editing ? (
                                    <Button onClick={() => setEditing(true)} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm">
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Details
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setEditing(false)} className="bg-white text-gray-600 border-gray-200">
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSave} className="bg-[#c4ad94] hover:bg-[#b39d84] text-white shadow-sm">
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 md:p-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Full Name */}
                                    <div className="group">
                                        <label className="flex items-center text-sm font-medium text-gray-500 mb-2">
                                            <User className="h-4 w-4 mr-2 text-[#c4ad94]" />
                                            Full Name
                                        </label>
                                        {editing ? (
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="max-w-md bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                            />
                                        ) : (
                                            <div className="text-gray-900 font-medium text-lg border-b border-transparent pb-1">
                                                {user?.name || "Not set"}
                                            </div>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="group">
                                        <label className="flex items-center text-sm font-medium text-gray-500 mb-2">
                                            <Mail className="h-4 w-4 mr-2 text-[#c4ad94]" />
                                            Email Address
                                        </label>
                                        <div className="flex items-center text-gray-900 font-medium text-lg border-b border-transparent pb-1">
                                            {user?.email}
                                            <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full font-normal border border-green-100">
                                                Verified
                                            </span>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="group">
                                        <label className="flex items-center text-sm font-medium text-gray-500 mb-2">
                                            <Phone className="h-4 w-4 mr-2 text-[#c4ad94]" />
                                            Phone Number
                                        </label>
                                        {editing ? (
                                            <Input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="Enter phone number"
                                                className="max-w-md bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                            />
                                        ) : (
                                            <div className="text-gray-900 font-medium text-lg border-b border-transparent pb-1">
                                                {user?.phone || <span className="text-gray-400 font-normal italic">Not set</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Account ID / Status - Extra field for layout balance */}
                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-500 mb-2">
                                            <Star className="h-4 w-4 mr-2 text-[#c4ad94]" />
                                            Account Status
                                        </label>
                                        <div className="text-gray-900 font-medium text-lg flex items-center gap-2">
                                            Customer
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Account Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-4">Account Actions</h3>
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="w-full sm:w-auto text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                )}

                {/* Addresses Tab */}
                {activeTab === "addresses" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Saved Addresses</h2>
                            <Button onClick={() => { resetAddressForm(); setShowAddressModal(true); }} className="bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                <Plus className="h-4 w-4 mr-2" />Add Address
                            </Button>
                        </div>

                        {addressesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c4ad94]"></div>
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">No saved addresses</h3>
                                <p className="text-gray-500 mb-6">Add an address for faster checkout</p>
                                <Button onClick={() => { resetAddressForm(); setShowAddressModal(true); }} className="bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                    <Plus className="h-4 w-4 mr-2" />Add Your First Address
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {addresses.map((addr) => (
                                    <div key={addr.id} className={`bg-white rounded-lg shadow-sm p-5 relative ${addr.isDefault ? "ring-2 ring-[#c4ad94]" : ""}`}>
                                        {addr.isDefault && (
                                            <span className="absolute top-3 right-3 px-2 py-1 bg-[#c4ad94] text-white text-xs rounded-full">Default</span>
                                        )}
                                        <div className="flex items-center gap-2 mb-3">
                                            {addr.label === "Home" ? <Home className="h-4 w-4 text-[#c4ad94]" /> : <Briefcase className="h-4 w-4 text-[#c4ad94]" />}
                                            <span className="font-medium text-gray-800">{addr.label}</span>
                                        </div>
                                        <p className="text-gray-800">{addr.firstName} {addr.lastName}</p>
                                        <p className="text-gray-600 text-sm">{addr.address}</p>
                                        <p className="text-gray-600 text-sm">{addr.city}, {addr.state} - {addr.postalCode}</p>
                                        <p className="text-gray-600 text-sm">📞 {addr.phone}</p>

                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                            <button onClick={() => openEditAddress(addr)} className="text-sm text-[#c4ad94] hover:underline flex items-center gap-1">
                                                <Edit2 className="h-3 w-3" /> Edit
                                            </button>
                                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                                                <Trash2 className="h-3 w-3" /> Delete
                                            </button>
                                            {!addr.isDefault && (
                                                <button onClick={() => handleSetDefaultAddress(addr.id)} className="text-sm text-gray-500 hover:underline ml-auto">
                                                    Set as Default
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === "orders" && (
                    <div className="space-y-4">
                        {ordersLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c4ad94]"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h3>
                                <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
                                <Link to="/products">
                                    <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white">Browse Products</Button>
                                </Link>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Order #{order.id.slice(-8).toUpperCase()}</p>
                                            <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                                        </div>
                                        {getStatusBadge(order.status, order.refund_status)}
                                    </div>
                                    <div className="space-y-3 mb-4">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{item.name}</p>
                                                    <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price?.toLocaleString()}</p>
                                                </div>
                                                {order.status === "delivered" && !order.refund_status && (
                                                    <Button variant="outline" size="sm" onClick={() => { setSelectedProduct(item); setShowReviewModal(true); }}>
                                                        <Star className="h-4 w-4 mr-1" />Review
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                        <p className="font-semibold text-gray-800">Total: ₹{order.total?.toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            {order.status === "pending" && (
                                                <Button variant="outline" size="sm" className="text-red-500 border-red-200" onClick={() => handleCancelOrder(order.id)}>Cancel Order</Button>
                                            )}
                                            {(order.status === "delivered" || order.status === "shipped") && !order.refund_status && (
                                                <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setShowRefundModal(true); }}>
                                                    <RefreshCw className="h-4 w-4 mr-1" />Request Refund
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Wishlist Tab Content */}
            {activeTab === "wishlist" && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">My Wishlist ({wishlistItems.length})</h2>

                    {wishlistItems.length === 0 ? (
                        <div className="text-center py-12">
                            <Heart className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-500 mb-4">Your wishlist is empty</p>
                            <Link to="/products">
                                <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white">Browse Products</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishlistItems.map((product) => (
                                <div key={product.id} className="group border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <button
                                            onClick={() => { removeFromWishlist(product.id); success(`${product.name} removed`); }}
                                            className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-red-500 hover:bg-white transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-[#c4ad94] font-medium mb-1">{product.category}</p>
                                        <h3 className="font-medium text-gray-800 mb-1 truncate">{product.name}</h3>
                                        <p className="font-semibold text-gray-900 mb-3">₹{product.price?.toLocaleString()}</p>
                                        <Button
                                            onClick={() => { addToCart(product, 1); success(`${product.name} added to cart`); }}
                                            className="w-full bg-[#c4ad94] hover:bg-[#b39d84] text-white h-9 text-sm"
                                        >
                                            Add to Cart
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Address Modal */}
            {
                showAddressModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">{editingAddress ? "Edit Address" : "Add New Address"}</h3>
                                <button onClick={() => { setShowAddressModal(false); resetAddressForm(); }}><X className="h-5 w-5 text-gray-400" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Type</label>
                                    <div className="flex gap-2">
                                        {["Home", "Work", "Other"].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setAddressForm({ ...addressForm, label: type })}
                                                className={`px-4 py-2 rounded-lg border ${addressForm.label === type ? "bg-[#c4ad94] text-white border-[#c4ad94]" : "border-gray-200"}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <Input value={addressForm.firstName} onChange={(e) => setAddressForm({ ...addressForm, firstName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <Input value={addressForm.lastName} onChange={(e) => setAddressForm({ ...addressForm, lastName: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                                    <Input value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <Input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                        <Input value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <select
                                        value={addressForm.state}
                                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                                    >
                                        {states.map((state) => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <Input value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} placeholder="+91 " />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={addressForm.isDefault}
                                        onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                                        className="rounded text-[#c4ad94]"
                                    />
                                    <label className="text-sm text-gray-600">Set as default address</label>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button onClick={handleSaveAddress} disabled={submitting} className="flex-1 bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                    {submitting ? "Saving..." : (editingAddress ? "Update Address" : "Save Address")}
                                </Button>
                                <Button variant="outline" onClick={() => { setShowAddressModal(false); resetAddressForm(); }}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Review Modal */}
            {
                showReviewModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Write a Review</h3>
                                <button onClick={() => setShowReviewModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{selectedProduct?.name}</p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setReviewData({ ...reviewData, rating: star })} className="focus:outline-none">
                                            <Star className={`h-8 w-8 ${star <= reviewData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                                <textarea
                                    value={reviewData.comment}
                                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                                    placeholder="Share your experience..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSubmitReview} disabled={submitting} className="flex-1 bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                    {submitting ? "Submitting..." : "Submit Review"}
                                </Button>
                                <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Refund Modal */}
            {
                showRefundModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Request Refund</h3>
                                <button onClick={() => setShowRefundModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <div className="flex gap-2">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                                    <p className="text-sm text-yellow-700">Refund requests are reviewed within 2-3 business days.</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Order #{selectedOrder?.id.slice(-8).toUpperCase()} • ₹{selectedOrder?.total?.toLocaleString()}</p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Refund</label>
                                <textarea
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                                    placeholder="Please describe why you're requesting a refund..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleRequestRefund} disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                                    {submitting ? "Submitting..." : "Submit Refund Request"}
                                </Button>
                                <Button variant="outline" onClick={() => setShowRefundModal(false)}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ProfilePage;
