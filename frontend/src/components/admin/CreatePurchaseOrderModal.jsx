import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Calendar } from 'lucide-react';
import axios from 'axios';
import { useOwner } from '../../context/OwnerContext';

const CreatePurchaseOrderModal = ({ isOpen, onClose, onPOCreated }) => {
    const { getAuthHeader, backendUrl } = useOwner();

    // Form State
    const [vendorId, setVendorId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchVendors();
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (showProductSearch) {
            fetchProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showProductSearch]);

    const resetForm = () => {
        setVendorId('');
        setExpectedDate('');
        setNotes('');
        setItems([]);
        setSearchTerm('');
    };

    const fetchVendors = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/vendors`, {
                headers: getAuthHeader()
            });
            setVendors(response.data);
        } catch (error) {
            console.error("Error fetching vendors:", error);
        }
    };

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/admin/products/summary`, {
                headers: getAuthHeader()
            });
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setProductsLoading(false);
        }
    };

    const handleAddProduct = (product) => {
        const existingItem = items.find(i => i.productId === product.id);
        if (existingItem) {
            alert("Product already added to PO");
            return;
        }

        const newItem = {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            quantity: 1,
            unitCost: product.totalCost || 0
        };

        setItems([...items, newItem]);
        setShowProductSearch(false);
        setSearchTerm('');
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    };

    const handleSubmit = async () => {
        if (!vendorId) {
            alert("Please select a vendor");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one item");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                vendorId,
                items: items.map(i => ({
                    productId: i.productId,
                    sku: i.sku,
                    name: i.name,
                    quantity: parseInt(i.quantity),
                    unitCost: parseFloat(i.unitCost)
                })),
                notes,
                expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null
            };

            await axios.post(`${backendUrl}/api/admin/purchase-orders`, payload, {
                headers: getAuthHeader()
            });

            onPOCreated();
            onClose();
        } catch (error) {
            console.error("Error creating PO:", error);
            alert("Failed to create Purchase Order");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create Purchase Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Row: Vendor & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                            <select
                                value={vendorId}
                                onChange={(e) => setVendorId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Date</label>
                            <input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                            <button
                                onClick={() => setShowProductSearch(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-sm font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                Add Product
                            </button>
                        </div>

                        {/* Items Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Product</th>
                                        <th className="px-4 py-3 text-left">SKU</th>
                                        <th className="px-4 py-3 text-right">Quantity</th>
                                        <th className="px-4 py-3 text-right">Unit Cost (₹)</th>
                                        <th className="px-4 py-3 text-right">Total (₹)</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                                                No items added. Click "Add Product" to start.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{item.sku}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:ring-2 focus:ring-amber-500/20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                                                        className="w-24 px-2 py-1 border border-gray-200 rounded text-right focus:ring-2 focus:ring-amber-500/20"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                    ₹{(item.quantity * item.unitCost).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {items.length > 0 && (
                                    <tfoot className="bg-gray-50 font-semibold text-gray-900">
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-right">Total Amount:</td>
                                            <td className="px-4 py-3 text-right">₹{calculateTotal().toLocaleString()}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="Add any notes..."
                        ></textarea>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Purchase Order'}
                    </button>
                </div>
            </div>

            {/* Product Search Modal Overlay */}
            {showProductSearch && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Select Product</h3>
                            <button onClick={() => setShowProductSearch(false)}><X className="h-5 w-5 text-gray-500" /></button>
                        </div>
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {productsLoading ? (
                                <div className="text-center py-8 text-gray-500">Loading products...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No products found</div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleAddProduct(product)}
                                            className="w-full text-left p-3 hover:bg-amber-50 rounded-lg flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{product.name}</div>
                                                <div className="text-sm text-gray-500">{product.sku}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">₹{product.totalCost?.toLocaleString()}</div>
                                                <div className="text-xs text-gray-500">Cost Price</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreatePurchaseOrderModal;
