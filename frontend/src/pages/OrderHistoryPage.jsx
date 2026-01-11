import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";

const OrderHistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
                const response = await fetch(`${backendUrl}/api/orders`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setOrders(data);
                } else {
                    console.error("Failed to fetch orders");
                    setOrders([]);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [navigate]);

    const getStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "processing":
                return "bg-blue-100 text-blue-800";
            case "shipped":
                return "bg-purple-100 text-purple-800";
            case "delivered":
                return "bg-green-100 text-green-800";
            case "cancelled":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IE", {
            year: "numeric",
            month: "long",
            day: "numeric",
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
                    <Package className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-2">Order History</h1>
                    <p className="text-white/90">Track and manage your orders</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">No orders yet</h2>
                        <p className="text-gray-600 mb-8">
                            When you place an order, it will appear here.
                        </p>
                        <Link to="/products">
                            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-lg">
                                Start Shopping
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                to={`/orders/${order.id}`}
                                className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold text-gray-800">{order.id}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-semibold text-gray-800">
                                            ₹{order.total?.toLocaleString()}
                                        </span>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link to="/profile" className="text-[#c4ad94] hover:underline">
                        ← Back to Profile
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryPage;
