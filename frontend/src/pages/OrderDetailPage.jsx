import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Package, Truck, Check, Clock, ChevronLeft } from "lucide-react";

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        // Load order from localStorage
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
            const orders = JSON.parse(savedOrders);
            const foundOrder = orders.find(o => o.id === id);
            setOrder(foundOrder);
        }
        setLoading(false);
    }, [id, navigate]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IE", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusStep = (status) => {
        switch (status) {
            case "pending": return 0;
            case "processing": return 1;
            case "shipped": return 2;
            case "delivered": return 3;
            default: return 0;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-2xl font-serif text-gray-800 mb-4">Order not found</h2>
                <Link to="/orders" className="text-[#c4ad94] hover:underline">
                    ← Back to orders
                </Link>
            </div>
        );
    }

    const steps = [
        { label: "Order Placed", icon: Clock },
        { label: "Processing", icon: Package },
        { label: "Shipped", icon: Truck },
        { label: "Delivered", icon: Check },
    ];

    const currentStep = getStatusStep(order.status);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link
                        to="/orders"
                        className="inline-flex items-center text-gray-600 hover:text-[#c4ad94] mb-4"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to orders
                    </Link>
                    <h1 className="text-2xl font-serif text-gray-800">Order {order.id}</h1>
                    <p className="text-gray-500 mt-1">Placed on {formatDate(order.createdAt)}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Order Status */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Status</h2>
                    <div className="flex justify-between">
                        {steps.map((step, index) => (
                            <div key={step.label} className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${index <= currentStep
                                            ? "bg-[#c4ad94] text-white"
                                            : "bg-gray-200 text-gray-400"
                                        }`}
                                >
                                    <step.icon className="h-5 w-5" />
                                </div>
                                <span className={`text-sm mt-2 ${index <= currentStep ? "text-gray-800" : "text-gray-400"
                                    }`}>
                                    {step.label}
                                </span>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`h-0.5 w-full absolute top-5 left-1/2 ${index < currentStep ? "bg-[#c4ad94]" : "bg-gray-200"
                                            }`}
                                        style={{ width: "calc(100% - 40px)", marginLeft: "20px" }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
                    <div className="space-y-4">
                        {order.items?.map((item, index) => (
                            <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                                {item.image && (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-gray-800">
                                    ₹{(item.price * item.quantity).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="border-t mt-4 pt-4 flex justify-between">
                        <span className="font-semibold text-gray-800">Total</span>
                        <span className="text-xl font-semibold text-gray-800">
                            ₹{order.total?.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h2>
                        <p className="text-gray-600">
                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                            {order.shippingAddress.address}<br />
                            {order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />
                            {order.shippingAddress.country}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderDetailPage;
