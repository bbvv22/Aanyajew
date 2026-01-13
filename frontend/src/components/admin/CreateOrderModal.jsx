import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Search, Check } from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const CreateOrderModal = ({ isOpen, onClose, onOrderCreated }) => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [fulfillmentStatus, setFulfillmentStatus] = useState('pending');
    const [channel, setChannel] = useState('pos');
    const [discount, setDiscount] = useState(0);
    const [couponCode, setCouponCode] = useState('');

    // New Fields
    const [paymentMethod, setPaymentMethod] = useState('');
    const [address, setAddress] = useState({
        line1: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
    });

    // Product Search State
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    // Smart Payment Status Logic
    useEffect(() => {
        if (paymentMethod === 'COD') {
            setPaymentStatus('pending');
        } else if (['Card', 'UPI', 'Bank Transfer', 'Cash'].includes(paymentMethod)) {
            setPaymentStatus('paid');
        }
    }, [paymentMethod]);

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

    const addItem = (product) => {
        const existing = lineItems.find(item => item.product_id === product.id);
        if (existing) {
            updateQuantity(product.id, existing.quantity + 1);
        } else {
            setLineItems([...lineItems, {
                product_id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock_quantity,
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

    const calculateTotal = () => {
        const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return Math.max(0, subtotal - Number(discount));
    };

    const getSubtotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSubmit = async () => {
        if (!customerName || !customerEmail || lineItems.length === 0) {
            showError("Please fill all required fields and add items");
            return;
        }

        try {
            const payload = {
                customer_name: customerName,
                customer_email: customerEmail,
                items: lineItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                })),
                payment_status: paymentStatus,
                fulfillment_status: fulfillmentStatus,
                channel: channel,
                discount_amount: Number(discount),
                coupon_code: couponCode,
                payment_method: paymentMethod,
                shipping_address: address.line1 ? {
                    firstName: customerName.split(' ')[0],
                    lastName: customerName.split(' ').slice(1).join(' ') || '',
                    address: address.line1,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    country: address.country
                } : null
            };

            await axios.post(`${backendUrl}/api/admin/orders/create`, payload, {
                headers: getAuthHeader()
            });

            success("Order created successfully!");
            onOrderCreated(); // Refresh parent list
            onClose();

            // Reset form
            setCustomerName('');
            setCustomerEmail('');
            setLineItems([]);
            setPaymentStatus('pending');
            setChannel('pos');
            setDiscount(0);
            setCouponCode('');
            setPaymentMethod('');
            setAddress({ line1: '', city: '', state: '', pincode: '', country: 'India' });
        } catch (error) {
            console.error("Create order error:", error);
            showError(error.response?.data?.detail || "Failed to create order");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer Details */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800">Customer Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    placeholder="Enter customer name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    placeholder="customer@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800">Order Items</h3>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                placeholder="Search products by name or SKU..."
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
                                                <p className="text-xs text-gray-500">SKU: {product.sku} | Stock: {product.stock_quantity}</p>
                                            </div>
                                            <span className="font-semibold text-amber-600">₹{product.price}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Line Items List */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            {lineItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No items added yet. Search above to add products.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-gray-600">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Product</th>
                                            <th className="px-4 py-2 text-center w-24">Qty</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {lineItems.map(item => (
                                            <tr key={item.product_id}>
                                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                            className="w-6 h-6 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                                                        >-</button>
                                                        <span className="w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                            className="w-6 h-6 flex items-center justify-center bg-white border rounded hover:bg-gray-50"
                                                            disabled={item.quantity >= item.stock}
                                                        >+</button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right">₹{item.price}</td>
                                                <td className="px-4 py-2 text-right font-medium">₹{item.price * item.quantity}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100 font-semibold">
                                        <tr>
                                            <td colSpan="3" className="px-4 py-2 text-right text-gray-500">Subtotal:</td>
                                            <td className="px-4 py-2 text-right">₹{getSubtotal()}</td>
                                            <td></td>
                                        </tr>
                                        {discount > 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-4 py-2 text-right text-green-600">Discount:</td>
                                                <td className="px-4 py-2 text-right text-green-600">-₹{discount}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td colSpan="3" className="px-4 py-2 text-right">Grand Total:</td>
                                            <td className="px-4 py-2 text-right text-lg text-amber-600">₹{calculateTotal()}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    </div>


                    {/* Order Details (Channel, Discount, Coupon) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setChannel('pos')}
                                    className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${channel === 'pos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Offline (POS)
                                </button>
                                <button
                                    onClick={() => setChannel('online')}
                                    className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${channel === 'online' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Online
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Address & Payment Method */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h3 className="font-semibold text-gray-800">Payment & Shipping</h3>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {['Cash', 'Card', 'UPI', 'Bank Transfer', 'COD'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-2 px-3 text-xs sm:text-sm rounded-lg border transition-all ${paymentMethod === method
                                                ? 'bg-amber-50 border-amber-500 text-amber-700'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Address</label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={address.line1}
                                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Address Line 1"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={address.city}
                                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="City"
                                    />
                                    <input
                                        type="text"
                                        value={address.state}
                                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="State"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={address.pincode}
                                        onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="Pincode"
                                    />
                                    <input
                                        type="text"
                                        value={address.country}
                                        onChange={(e) => setAddress({ ...address, country: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="Country"
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                            <select
                                value={paymentStatus}
                                onChange={(e) => setPaymentStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            >
                                <option value="pending">Unpaid (Pending)</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fulfillment Status</label>
                            <select
                                value={fulfillmentStatus}
                                onChange={(e) => setFulfillmentStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                            </select>
                        </div>
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
                        Create Order
                    </button>
                </div>
            </div >
        </div >
    );
};

export default CreateOrderModal;
