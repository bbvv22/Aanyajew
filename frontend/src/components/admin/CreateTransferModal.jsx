import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Check, Trash2, ArrowRight } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const CreateTransferModal = ({ isOpen, onClose, onTransferCreated }) => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();

    // Form State
    const [fromLocationId, setFromLocationId] = useState('');
    const [toLocationId, setToLocationId] = useState('');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState([]);

    // Data State
    const [locations, setLocations] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchLocations();
            fetchProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Filter products
    useEffect(() => {
        if (searchTerm) {
            const results = products.filter(p =>
                (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(results.slice(0, 5));
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, products]);

    const fetchLocations = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/locations`, {
                headers: getAuthHeader()
            });
            setLocations(response.data);
            // Default From to 'Main Store' if it exists, or first one
            if (response.data.length > 0 && !fromLocationId) {
                const main = response.data.find(l => l.name === 'Main Store');
                setFromLocationId(main ? main.id : response.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch locations", error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/products/summary`, {
                headers: getAuthHeader()
            });
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const addItem = (product) => {
        const existing = lineItems.find(item => item.product_id === product.id);
        if (existing) {
            updateQuantity(product.id, existing.quantity + 1);
        } else {
            setLineItems([...lineItems, {
                product_id: product.id,
                name: product.name,
                sku: product.sku,
                stock: product.stockQuantity,
                quantity: 1
            }]);
        }
        setSearchTerm('');
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty < 1) return;
        setLineItems(lineItems.map(item =>
            item.product_id === productId ? { ...item, quantity: newQty } : item
        ));
    };

    const removeItem = (productId) => {
        setLineItems(lineItems.filter(item => item.product_id !== productId));
    };

    const handleSubmit = async () => {
        if (!fromLocationId || !toLocationId) {
            showError("Please select both source and destination locations");
            return;
        }
        if (fromLocationId === toLocationId) {
            showError("Source and destination must be different");
            return;
        }
        if (lineItems.length === 0) {
            showError("Please add at least one item to transfer");
            return;
        }

        try {
            const payload = {
                fromLocationId,
                toLocationId,
                notes,
                items: lineItems.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    sku: item.sku,
                    quantity: item.quantity
                }))
            };

            await axios.post(`${backendUrl}/api/admin/transfers`, payload, {
                headers: getAuthHeader()
            });

            success("Transfer created successfully!");
            onTransferCreated();
            onClose();

            // Reset form
            setLineItems([]);
            setNotes('');
        } catch (error) {
            console.error("Create transfer error:", error);
            showError(error.response?.data?.detail || "Failed to create transfer");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">New Internal Transfer</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Locations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Location</label>
                            <select
                                value={fromLocationId}
                                onChange={(e) => setFromLocationId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            >
                                <option value="">Select Origin</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                ))}
                            </select>
                        </div>

                        <div className="hidden md:flex justify-center pt-6">
                            <ArrowRight className="text-gray-400" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Location</label>
                            <select
                                value={toLocationId}
                                onChange={(e) => setToLocationId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            >
                                <option value="">Select Destination</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800">Items to Transfer</h3>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                placeholder="Search products directly..."
                            />

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                    {searchResults.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addItem(product)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-800">{product.name}</p>
                                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500">Current Stock: {product.stockQuantity}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Items List */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            {lineItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No items added. Search above to add items.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-gray-600">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Product</th>
                                            <th className="px-4 py-2 text-center w-32">Quantity</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {lineItems.map(item => (
                                            <tr key={item.product_id}>
                                                <td className="px-4 py-2 font-medium">
                                                    <div>{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.sku}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                                                        >-</button>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                                                            className="w-16 text-center border rounded py-1"
                                                        />
                                                        <button
                                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                                                        >+</button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-20"
                            placeholder="Optional notes about this transfer..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Check className="h-4 w-4" />
                        Create Transfer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTransferModal;
