import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Store,
    Receipt,
    Bell,
    Users,
    Shield,
    ChevronRight,
    Save,
    Upload
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const SettingsPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();

    const [activeTab, setActiveTab] = useState('store');
    const [loading, setLoading] = useState(true);
    const [storeSettings, setStoreSettings] = useState({
        name: 'Annya Jewellers',
        email: 'Aanyajewellerysilver@gmail.com',
        phone: '+91 98765 43210',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        tax_gstin: '',
        tax_rate: 3
    });

    const tabs = [
        { id: 'store', label: 'Store Profile', icon: Store },
        { id: 'tax', label: 'Tax & Invoicing', icon: Receipt },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'staff', label: 'Staff & Roles', icon: Users },
        { id: 'security', label: 'Security', icon: Shield }
    ];

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/settings`, {
                headers: getAuthHeader()
            });
            if (response.data) {
                setStoreSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            showError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        try {
            await axios.put(`${backendUrl}/api/admin/settings`, storeSettings, {
                headers: getAuthHeader()
            });
            success('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            showError('Failed to save settings');
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1">Manage your store configuration</p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeTab === tab.id
                                    ? 'bg-amber-50 text-amber-700 border-l-2 border-amber-500'
                                    : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'store' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Store Profile</h2>

                            {/* Logo Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                        <span className="text-2xl font-serif text-amber-700">{storeSettings.name.charAt(0)}</span>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Upload
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                                    <input
                                        type="text"
                                        value={storeSettings.name}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={storeSettings.email}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <input
                                        type="text"
                                        value={storeSettings.phone}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                    <select
                                        value={storeSettings.currency}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        <option value="INR">INR - Indian Rupee</option>
                                        <option value="USD">USD - US Dollar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                    <select
                                        value={storeSettings.timezone}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, timezone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                                >
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tax' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Tax & Invoicing</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                                    <input
                                        type="text"
                                        value={storeSettings.tax_gstin || ''}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, tax_gstin: e.target.value })}
                                        placeholder="Enter GSTIN"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={storeSettings.tax_rate}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, tax_rate: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                                    >
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notifications</h2>
                            <div className="space-y-4">
                                {['New orders', 'Low stock alerts', 'Payment received', 'Daily summary'].map((item) => (
                                    <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100">
                                        <span className="text-gray-700">{item}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Staff & Roles</h2>
                                <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                                    Add Staff
                                </button>
                            </div>
                            <div className="text-center py-12 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Staff management coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Security</h2>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        Enable
                                    </button>
                                </div>
                                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                    <div>
                                        <p className="font-medium text-gray-900">Change Password</p>
                                        <p className="text-sm text-gray-500">Update your password</p>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        Change
                                    </button>
                                </div>
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <p className="font-medium text-gray-900">Activity Logs</p>
                                        <p className="text-sm text-gray-500">View all system activity</p>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        View Logs
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
