import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Package, Truck, Check, Clock, ChevronLeft, RotateCcw, X, AlertCircle, FileText } from "lucide-react";
import { useToast } from "../context/ToastContext";

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    // Return Request State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState("defective");
    const [returnDescription, setReturnDescription] = useState("");
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const fetchOrder = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:8006"}/api/orders/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch order");

            const data = await response.json();
            setOrder(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, navigate]);

    const handleDownloadInvoice = async () => {
        setDownloadingInvoice(true);
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:8006"}/api/orders/${id}/invoice`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to download invoice");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Invoice-${order.orderNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            showError("Could not download invoice");
            console.error(err);
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReturn(true);
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:8006"}/api/orders/${id}/return`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason: returnReason,
                    description: returnDescription
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Failed to submit return request");
            }

            success("Return request submitted successfully");
            setShowReturnModal(false);
            fetchOrder(); // Refresh data
        } catch (err) {
            showError(err.message);
        } finally {
            setSubmittingReturn(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
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
            case "returned": return 3; // Show as delivered but with return status
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
        <div className="min-h-screen bg-gray-50 relative">
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
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-serif text-gray-800">Order {order.id}</h1>
                            <p className="text-gray-500 mt-1">Placed on {formatDate(order.createdAt)}</p>
                        </div>

                        {/* Return Request Status Badge */}
                        {order.returnRequest && (
                            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200 ml-auto mr-2">
                                <RotateCcw className="h-4 w-4" />
                                <span className="font-medium">Return {order.returnRequest.status}</span>
                            </div>
                        )}

                        <div className="flex gap-2 ml-auto">
                            {/* Invoice Button */}
                            <button
                                onClick={handleDownloadInvoice}
                                disabled={downloadingInvoice}
                                className="flex items-center gap-2 text-gray-600 hover:text-[#c4ad94] border border-gray-300 hover:border-[#c4ad94] px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <FileText className="h-4 w-4" />
                                {downloadingInvoice ? "Downloading..." : "Invoice"}
                            </button>

                            {/* Return Button */}
                            {!order.returnRequest && order.status === 'delivered' && (
                                <button
                                    onClick={() => setShowReturnModal(true)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Return items
                                </button>
                            )}
                        </div>
                    </div>
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

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setShowReturnModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                                <RotateCcw className="h-5 w-5 text-red-600" />
                            </div>
                            <h2 className="text-xl font-serif text-gray-800">Request Return</h2>
                        </div>

                        <form onSubmit={handleReturnSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>
                                <select
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c4ad94] focus:border-[#c4ad94] outline-none"
                                >
                                    <option value="defective">Defective or Damaged</option>
                                    <option value="wrong_item">Wrong Item Received</option>
                                    <option value="not_as_described">Not as Described</option>
                                    <option value="changed_mind">Changed Mind</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                                <textarea
                                    value={returnDescription}
                                    onChange={(e) => setReturnDescription(e.target.value)}
                                    placeholder="Please provide more details..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c4ad94] focus:border-[#c4ad94] outline-none"
                                />
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg flex gap-2">
                                <AlertCircle className="h-5 w-5 text-gray-500 shrink-0" />
                                <p className="text-xs text-gray-500">
                                    Returns are usually processed within 3-5 business days. Our team will review your request.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submittingReturn}
                                className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {submittingReturn ? "Submitting..." : "Submit Request"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default OrderDetailPage;
