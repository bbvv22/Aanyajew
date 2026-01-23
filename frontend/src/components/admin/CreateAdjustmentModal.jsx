import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Check, RefreshCw } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const CreateAdjustmentModal = ({ isOpen, onClose, onAdjustmentCreated }) => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [currentStock, setCurrentStock] = useState(0);
    const [newQuantity, setNewQuantity] = useState('');
    const [reason, setReason] = useState('Stock Correction');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const resetForm = () => {
        setSearchTerm('');
        setSelectedProduct(null);
        setNewQuantity('');
        setReason('Stock Correction');
        setNotes('');
        setCurrentStock(0);
    };

    useEffect(() => {
        if (searchTerm) {
            const results = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(results.slice(0, 5));
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, products]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/products`, {
                headers: getAuthHeader()
            });
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setCurrentStock(product.stockQuantity || 0);
        setNewQuantity(product.stockQuantity || 0);
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) {
            showError("Please select a product");
            return;
        }
        if (newQuantity === '' || newQuantity < 0) {
            showError("Please enter a valid quantity");
            return;
        }

        try {
            const payload = {
                product_id: selectedProduct.id,
                new_quantity: parseInt(newQuantity),
                reason: reason,
                notes: notes
            };

            await axios.post(`${backendUrl}/api/admin/inventory/adjust`, payload, {
                headers: getAuthHeader()
            });

            success("Inventory adjusted successfully!");
            onAdjustmentCreated();
            onClose();
        } catch (error) {
            console.error("Adjustment error:", error);
            showError(error.response?.data?.detail || "Failed to adjust inventory");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Adjust Inventory</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Product Search */}
                    {!selectedProduct ? (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Search Product</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    placeholder="Search by name or SKU..."
                                    autoFocus
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                        {searchResults.map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => selectProduct(product)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-800">{product.name}</p>
                                                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-500">Stock: {product.stockQuantity}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-200">
                            <div>
                                <p className="font-bold text-gray-900">{selectedProduct.name}</p>
                                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    {/* Adjustment Form */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 font-mono">
                                {selectedProduct ? currentStock : '-'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity</label>
                            <input
                                type="number"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                                placeholder="0"
                                disabled={!selectedProduct}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                            <option value="Stock Correction">Stock Correction</option>
                            <option value="Damaged">Damaged / Broken</option>
                            <option value="Lost">Lost / Stolen</option>
                            <option value="Return">Customer Return</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-20"
                            placeholder="Optional details..."
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
                        disabled={!selectedProduct}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-white
                            ${!selectedProduct ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Update Stock
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAdjustmentModal;
