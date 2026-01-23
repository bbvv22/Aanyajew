import React, { useState, useEffect } from "react";
import { ShoppingCart, Mail, Clock, User, Phone, RefreshCw, Send, CheckCircle, XCircle, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";

const AbandonedCartsPage = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("active");
    const [stats, setStats] = useState({ total: 0, reminded: 0, converted: 0 });

    // Reminder timing settings
    const [reminderTiming, setReminderTiming] = useState(15); // Default 15 mins
    const [savingSettings, setSavingSettings] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";

    const fetchCarts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("ownerToken");
            const response = await fetch(
                `${backendUrl}/api/admin/abandoned-carts?status=${statusFilter}&timing=${reminderTiming}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setCarts(data);

                // Calculate stats
                const reminded = data.filter(c => c.reminderCount > 0).length;
                setStats({
                    total: data.length,
                    reminded,
                    converted: 0 // Would need separate query
                });
            }
        } catch (error) {
            console.error("Error fetching abandoned carts:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem("ownerToken");
                const response = await fetch(
                    `${backendUrl}/api/admin/settings/abandoned-cart`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.ok) {
                    const data = await response.json();
                    setReminderTiming(data.reminderMinutes || 15);
                }
            } catch (error) {
                console.log("Using default reminder timing");
            }
        };
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchCarts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, reminderTiming]);

    const saveReminderSettings = async (minutes) => {
        setSavingSettings(true);
        try {
            const token = localStorage.getItem("ownerToken");
            const response = await fetch(
                `${backendUrl}/api/admin/settings/abandoned-cart`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ reminderMinutes: minutes })
                }
            );
            if (response.ok) {
                setReminderTiming(minutes);
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setSavingSettings(false);
        }
    };

    const sendBulkReminders = async () => {
        setSending(true);
        try {
            const token = localStorage.getItem("ownerToken");
            const response = await fetch(
                `${backendUrl}/api/admin/abandoned-carts/send-reminders?timing=${reminderTiming}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (response.ok) {
                const result = await response.json();
                alert(`✅ Sent ${result.sent} reminder emails!`);
                fetchCarts();
            }
        } catch (error) {
            console.error("Error sending reminders:", error);
            alert("Failed to send reminders");
        } finally {
            setSending(false);
        }
    };

    const sendSingleReminder = async (cartId) => {
        setSendingId(cartId);
        try {
            const token = localStorage.getItem("ownerToken");
            const response = await fetch(
                `${backendUrl}/api/admin/abandoned-carts/${cartId}/send-reminder`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (response.ok) {
                alert("✅ Reminder sent!");
                fetchCarts();
            }
        } catch (error) {
            console.error("Error sending reminder:", error);
            alert("Failed to send reminder");
        } finally {
            setSendingId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getTimeSinceAbandoned = (dateStr) => {
        if (!dateStr) return "";
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `${Math.floor(hours / 24)} days ago`;
        if (hours > 0) return `${hours}h ${minutes}m ago`;
        return `${minutes}m ago`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6 text-[#c4ad94]" />
                        Abandoned Carts
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Reminders sent to carts older than {reminderTiming} mins
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={fetchCarts}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        onClick={sendBulkReminders}
                        disabled={sending || carts.length === 0}
                        className="bg-[#c4ad94] hover:bg-[#b39d84] text-white flex items-center gap-2"
                    >
                        {sending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="h-4 w-4" />
                        )}
                        Send All Reminders
                    </Button>
                </div>
            </div>

            {/* Reminder Timing Settings */}
            <div className="bg-white rounded-xl p-4 shadow border border-gray-100 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-500" />
                        <div>
                            <div className="font-medium text-gray-800">Reminder Timing</div>
                            <div className="text-sm text-gray-500">
                                Send reminder after cart is abandoned for:
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {[5, 10, 15].map((mins) => (
                            <button
                                key={mins}
                                onClick={() => saveReminderSettings(mins)}
                                disabled={savingSettings}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${reminderTiming === mins
                                    ? "bg-[#c4ad94] text-white shadow"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {savingSettings && reminderTiming === mins ? (
                                    <RefreshCw className="h-4 w-4 animate-spin inline" />
                                ) : (
                                    `${mins} min`
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="text-sm text-gray-500">Active Carts</div>
                    <div className="text-2xl font-bold text-[#c4ad94]">{stats.total}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="text-sm text-gray-500">Reminded</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.reminded}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="text-sm text-gray-500">Potential Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                        ₹{carts.reduce((sum, c) => sum + (c.cartTotal || 0), 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
                {["active", "converted", "all"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${statusFilter === status
                            ? "bg-[#c4ad94] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : carts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No abandoned carts found</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Carts will appear here after being abandoned for {reminderTiming}+ minutes
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Customer</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Items</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Abandoned</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reminders</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {carts.map((cart) => (
                                <tr key={cart.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {cart.customerName || "Guest"}
                                                </div>
                                                <div className="text-sm text-gray-500">{cart.email}</div>
                                                {cart.phone && (
                                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {cart.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex -space-x-2">
                                            {(cart.items || []).slice(0, 3).map((item, i) => (
                                                <img
                                                    key={i}
                                                    src={item.image || "/placeholder.jpg"}
                                                    alt={item.name}
                                                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                                                    title={item.name}
                                                />
                                            ))}
                                            {(cart.items || []).length > 3 && (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                                    +{cart.items.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-medium text-gray-800">
                                            ₹{(cart.cartTotal || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1 text-sm text-orange-600">
                                            <Clock className="h-4 w-4" />
                                            {getTimeSinceAbandoned(cart.updatedAt)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            {[...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2 h-2 rounded-full ${i < (cart.reminderCount || 0)
                                                        ? "bg-green-500"
                                                        : "bg-gray-200"
                                                        }`}
                                                />
                                            ))}
                                            <span className="text-sm text-gray-500 ml-1">
                                                {cart.reminderCount || 0}/3
                                            </span>
                                        </div>
                                        {cart.lastReminderAt && (
                                            <div className="text-xs text-gray-400">
                                                Last: {formatDate(cart.lastReminderAt)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {cart.status === "converted" ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                <CheckCircle className="h-3 w-3" />
                                                Converted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                                                <XCircle className="h-3 w-3" />
                                                Abandoned
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        {cart.status !== "converted" && cart.reminderCount < 3 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => sendSingleReminder(cart.id)}
                                                disabled={sendingId === cart.id}
                                                className="text-[#c4ad94] border-[#c4ad94] hover:bg-[#c4ad94] hover:text-white"
                                            >
                                                {sendingId === cart.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AbandonedCartsPage;
