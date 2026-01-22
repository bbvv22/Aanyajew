import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, CheckCircle, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const ReturnsAdmin = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error: showError } = useToast();
    const [processingId, setProcessingId] = useState(null);

    const fetchReturns = async () => {
        try {
            const token = localStorage.getItem("ownerToken");
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:8006"}/api/admin/returns`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            setReturns(data);
        } catch (error) {
            console.error("Error fetching returns:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns();
    }, []);

    const handleAction = async (returnId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this return?`)) return;

        setProcessingId(returnId);
        const token = localStorage.getItem("ownerToken");

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || "http://localhost:8006"}/api/admin/returns/${returnId}/action`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ action }) // 'approve' or 'reject'
            });

            if (!response.ok) throw new Error("Failed to process return");

            success(`Return request ${action}ed successfully`);
            fetchReturns();
        } catch (err) {
            showError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading returns...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-serif text-gray-800">Returns & Refunds</h1>
                    <p className="text-gray-500 mt-1">Manage customer return requests</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Details</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Customer</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Reason</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                            <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {returns.length === 0 ? (
                            <tr>
                                <td colspan="5" className="px-6 py-12 text-center text-gray-500">
                                    <RotateCcw className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                    No return requests found
                                </td>
                            </tr>
                        ) : (
                            returns.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-800">Order #{req.orderId.substring(0, 8)}</p>
                                        <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {req.customerId.substring(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="block text-sm font-medium text-gray-800 capitalize">
                                            {req.reason.replace(/_/g, " ")}
                                        </span>
                                        {req.description && (
                                            <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={req.description}>
                                                "{req.description}"
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(req.status)}`}>
                                            {req.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                    disabled={processingId === req.id}
                                                    className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm border border-green-200 transition-colors"
                                                    title="Approve Return"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'reject')}
                                                    disabled={processingId === req.id}
                                                    className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm border border-red-200 transition-colors"
                                                    title="Reject Return"
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className="text-sm text-gray-400 italic">Processed</span>
                                        )}
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

export default ReturnsAdmin;
