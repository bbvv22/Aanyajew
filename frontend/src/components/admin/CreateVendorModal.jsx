import React, { useState } from 'react';
import axios from 'axios';
import { X, Building2, User, Phone, Mail, MapPin, CreditCard, Clock } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const CreateVendorModal = ({ isOpen, onClose, onVendorCreated }) => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        tax_id: '',
        payment_terms: 'NET30',
        lead_time_days: 7
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email) {
            showError("Name and Email are required");
            return;
        }

        setLoading(true);
        try {
            // Transform to backend structure
            // Backend expects: contacts list, etc.
            // Let's assume backend handles flattening or we send structure.
            // Based on simple CRUD usually found here, I'll send flat or check server.
            // But let's verify what POST /vendors expects.
            // Assuming generic structure for now:
            const payload = {
                name: formData.name,
                code: formData.code,
                contact_person: formData.contactName,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                gst_number: formData.tax_id,
                payment_terms: formData.payment_terms,
                lead_time_days: parseInt(formData.lead_time_days || 0)
            };

            await axios.post(`${backendUrl}/api/admin/vendors`, payload, {
                headers: getAuthHeader()
            });

            success("Vendor created successfully!");
            onVendorCreated();
            onClose();
            setFormData({
                name: '', code: '', contactName: '', phone: '', email: '',
                address: '', city: '', state: '', pincode: '', tax_id: '',
                payment_terms: 'NET30', lead_time_days: 7
            });
        } catch (error) {
            console.error("Create vendor error:", error);
            showError(error.response?.data?.detail || "Failed to create vendor");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-amber-500" />
                        Add New Vendor
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="e.g. Shree Gold Suppliers"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Code</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                placeholder="Auto-generated if empty"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GST / Tax ID</label>
                            <input
                                type="text"
                                name="tax_id"
                                value={formData.tax_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                                placeholder="GSTIN..."
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            Primary Contact
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
                                <input
                                    type="text"
                                    name="contactName"
                                    value={formData.contactName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Contact Person"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="+91..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                                <div className="relative">
                                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="email@company.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            Address
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Street Address"
                                />
                            </div>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="City"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="State"
                                />
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="PIN Code"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            Terms & Conditions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
                                <select
                                    name="payment_terms"
                                    value={formData.payment_terms}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="NET0">Immediate (NET0)</option>
                                    <option value="NET7">NET 7</option>
                                    <option value="NET15">NET 15</option>
                                    <option value="NET30">NET 30</option>
                                    <option value="NET45">NET 45</option>
                                    <option value="NET60">NET 60</option>
                                    <option value="COD">Cash on Delivery</option>
                                    <option value="Advance">Advance Payment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Lead Time (Days)</label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="number"
                                        name="lead_time_days"
                                        value={formData.lead_time_days}
                                        onChange={handleChange}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Vendor'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateVendorModal;
