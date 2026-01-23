import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Tag, Percent, DollarSign, Calendar, Edit2, Trash2, X, Search, Package } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const CouponsPage = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();

    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [deleteCouponId, setDeleteCouponId] = useState(null);
    const [productSearch, setProductSearch] = useState('');

    const [formData, setFormData] = useState({
        code: '',
        description: '',
        scope: 'general',
        applicableProducts: [],
        type: 'percent',
        value: '',
        minOrderValue: '',
        maxDiscount: '',
        usageLimit: '',
        perCustomerLimit: '1',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: '',
        isActive: true
    });

    useEffect(() => {
        fetchCoupons();
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCoupons = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/coupons`, { headers: getAuthHeader() });
            setCoupons(response.data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/products`);
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                code: formData.code.toUpperCase(),
                value: parseFloat(formData.value) || 0,
                minOrderValue: parseFloat(formData.minOrderValue) || 0,
                maxDiscount: parseFloat(formData.maxDiscount) || null,
                usageLimit: parseInt(formData.usageLimit) || null,
                perCustomerLimit: parseInt(formData.perCustomerLimit) || 1,
                applicableProducts: formData.scope === 'product' ? formData.applicableProducts : []
            };

            if (editingCoupon) {
                await axios.put(`${backendUrl}/api/admin/coupons/${editingCoupon.id}`, payload, { headers: getAuthHeader() });
                success('Coupon updated!');
            } else {
                await axios.post(`${backendUrl}/api/admin/coupons`, payload, { headers: getAuthHeader() });
                success('Coupon created!');
            }

            setShowModal(false);
            setEditingCoupon(null);
            resetForm();
            fetchCoupons();
        } catch (error) {
            showError('Failed to save coupon');
        }
    };

    const handleEdit = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code || '',
            description: coupon.description || '',
            scope: coupon.scope || 'general',
            applicableProducts: coupon.applicableProducts || [],
            type: coupon.type || 'percent',
            value: coupon.value?.toString() || '',
            minOrderValue: coupon.minOrderValue?.toString() || '',
            maxDiscount: coupon.maxDiscount?.toString() || '',
            usageLimit: coupon.usageLimit?.toString() || '',
            perCustomerLimit: coupon.perCustomerLimit?.toString() || '1',
            validFrom: coupon.validFrom?.split('T')[0] || '',
            validTo: coupon.validTo?.split('T')[0] || '',
            isActive: coupon.isActive !== false
        });
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        setDeleteCouponId(id);
    };

    const confirmDelete = async () => {
        if (!deleteCouponId) return;
        try {
            await axios.delete(`${backendUrl}/api/admin/coupons/${deleteCouponId}`, { headers: getAuthHeader() });
            success('Coupon deleted');
            fetchCoupons();
            setDeleteCouponId(null);
        } catch (error) {
            showError('Failed to delete coupon');
        }
    };

    const toggleProduct = (productId) => {
        setFormData(prev => ({
            ...prev,
            applicableProducts: prev.applicableProducts.includes(productId)
                ? prev.applicableProducts.filter(id => id !== productId)
                : [...prev.applicableProducts, productId]
        }));
    };

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            scope: 'general',
            applicableProducts: [],
            type: 'percent',
            value: '',
            minOrderValue: '',
            maxDiscount: '',
            usageLimit: '',
            perCustomerLimit: '1',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: '',
            isActive: true
        });
        setProductSearch('');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 10);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
                    <p className="text-gray-500 mt-1">{coupons.length} discount codes</p>
                </div>
                <button
                    onClick={() => { resetForm(); setEditingCoupon(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                    <Plus className="h-4 w-4" />
                    Create Coupon
                </button>
            </div>

            {/* Coupons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className={`bg-white rounded-xl shadow-sm border p-5 ${coupon.isActive ? 'border-gray-100' : 'border-red-200 bg-red-50/30'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${coupon.type === 'percent' ? 'bg-purple-100' : 'bg-green-100'}`}>
                                    {coupon.type === 'percent' ? <Percent className="h-4 w-4 text-purple-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${coupon.scope === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {coupon.scope === 'product' ? 'Product' : 'General'}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {coupon.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(coupon)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteClick(coupon.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="font-mono text-xl font-bold text-gray-900 mb-1">{coupon.code}</div>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-1">{coupon.description || 'No description'}</p>

                        <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-2xl font-bold text-amber-600">
                                {coupon.type === 'percent' ? `${coupon.value}%` : `₹${coupon.value}`}
                            </span>
                            <span className="text-sm text-gray-500">off</span>
                        </div>

                        {
                            coupon.scope === 'product' && coupon.applicableProducts?.length > 0 && (
                                <div className="text-xs text-blue-600 mb-2">
                                    Applies to {coupon.applicableProducts.length} product(s)
                                </div>
                            )
                        }

                        < div className="text-xs text-gray-500 space-y-1" >
                            {coupon.minOrderValue > 0 && <div>Min order: ₹{coupon.minOrderValue}</div>}
                            < div className="flex items-center gap-1" >
                                <Calendar className="h-3 w-3" />
                                {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                            </div>
                            <div>Usage: {coupon.usageCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</div>
                        </div>
                    </div >
                ))}
            </div >

            {
                coupons.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No coupons yet. Create your first discount!</p>
                    </div>
                )
            }

            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-lg font-semibold">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
                                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Scope Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, scope: 'general' })}
                                            className={`p-3 rounded-lg border-2 text-left transition ${formData.scope === 'general' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="font-medium">General</div>
                                            <div className="text-xs text-gray-500">Applies to all products</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, scope: 'product' })}
                                            className={`p-3 rounded-lg border-2 text-left transition ${formData.scope === 'product' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="font-medium">Product-Specific</div>
                                            <div className="text-xs text-gray-500">Select specific products</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase"
                                            placeholder="SUMMER20"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="20% off"
                                        />
                                    </div>
                                </div>

                                {/* Product Picker for Product-Specific */}
                                {formData.scope === 'product' && (
                                    <div className="border rounded-lg p-4 bg-blue-50">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Products ({formData.applicableProducts.length} selected)
                                        </label>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                placeholder="Search products..."
                                            />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-2">
                                            {filteredProducts.map(product => (
                                                <label key={product.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.applicableProducts.includes(product.id)}
                                                        onChange={() => toggleProduct(product.id)}
                                                        className="w-4 h-4 text-amber-500 rounded"
                                                    />
                                                    <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">{product.name}</div>
                                                        <div className="text-xs text-gray-500">{product.sku} • ₹{product.sellingPrice?.toLocaleString()}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="percent">Percentage</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Value {formData.type === 'percent' ? '(%)' : '(₹)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.value}
                                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.minOrderValue}
                                            onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.maxDiscount}
                                            onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                                        <input
                                            type="date"
                                            value={formData.validFrom}
                                            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
                                        <input
                                            type="date"
                                            value={formData.validTo}
                                            onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                                        <input
                                            type="number"
                                            value={formData.usageLimit}
                                            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Per Customer</label>
                                        <input
                                            type="number"
                                            value={formData.perCustomerLimit}
                                            onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 text-amber-500 rounded"
                                    />
                                    <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                                        {editingCoupon ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteCouponId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Coupon?</h2>
                            <p className="text-gray-500 mb-6">
                                Are you sure you want to delete this coupon? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteCouponId(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CouponsPage;
