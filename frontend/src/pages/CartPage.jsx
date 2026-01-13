import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, X, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { useCart } from "../context/CartContext";

const CartPage = () => {
    const { cartItems, updateQuantity, removeFromCart, getCartTotal, isLoaded, coupon, applyCoupon, removeCoupon, sessionId } = useCart();
    const [couponCode, setCouponCode] = useState("");
    const [couponError, setCouponError] = useState("");
    const [verifying, setVerifying] = useState(false);

    // Checkout states
    const navigate = useNavigate();
    const [checkoutError, setCheckoutError] = useState("");
    const [reserving, setReserving] = useState(false);

    const handleCheckout = async () => {
        setReserving(true);
        setCheckoutError("");
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
            // Reserve all items sequentially to handle errors per item
            for (const item of cartItems) {
                const res = await fetch(`${backendUrl}/api/cart/reserve`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ product_id: item.id, session_id: sessionId })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || `Failed to reserve ${item.name}`);
                }
            }
            // All reserved
            navigate("/checkout", {
                state: {
                    reservationExpiry: Date.now() + 5 * 60 * 1000 // 5 minutes from now
                }
            });
        } catch (error) {
            setCheckoutError(error.message);
        } finally {
            setReserving(false);
        }
    };

    const subtotal = getCartTotal();
    const discount = coupon ? coupon.discountAmount : 0;
    const shipping = (subtotal - discount) > 5000 ? 0 : 100;
    const total = (subtotal - discount) + shipping;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setVerifying(true);
        setCouponError("");

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
            const response = await fetch(`${backendUrl}/api/coupons/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: couponCode, orderTotal: subtotal })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Invalid coupon code");
            }

            applyCoupon(data);
            setCouponCode("");
        } catch (error) {
            setCouponError(error.message);
        } finally {
            setVerifying(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-serif text-gray-800">Shopping Cart</h1>
                    <p className="text-gray-600 mt-2">
                        {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in your cart
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {cartItems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
                        <p className="text-gray-600 mb-8">
                            Looks like you haven't added any items to your cart yet.
                        </p>
                        <Link to="/products">
                            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-lg">
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-lg shadow-sm p-6 flex gap-6"
                                >
                                    <Link to={`/product/${item.id}`} className="shrink-0">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-24 h-24 object-cover rounded-lg"
                                        />
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Link
                                                    to={`/product/${item.id}`}
                                                    className="font-medium text-gray-800 hover:text-[#c4ad94] transition-colors"
                                                >
                                                    {item.name}
                                                </Link>
                                                <p className="text-sm text-gray-500 mt-1">{item.category}</p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex items-center border border-gray-200 rounded-lg">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-2 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="px-4 py-2 min-w-[40px] text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-2 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-lg font-semibold text-gray-900">
                                                ₹{(item.price * item.quantity).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>

                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>

                                {coupon && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount ({coupon.code})</span>
                                        <span>-₹{coupon.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
                                </div>
                                {shipping === 0 && (
                                    <p className="text-xs text-green-600">
                                        Free shipping applied
                                    </p>
                                )}
                                <div className="border-t pt-4 flex justify-between font-semibold text-lg text-gray-800">
                                    <span>Total</span>
                                    <span>₹{total.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Coupon Input */}
                            <div className="mb-6">
                                {coupon ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-green-800">{coupon.code}</p>
                                                <p className="text-xs text-green-600">{coupon.description}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={removeCoupon}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                placeholder="Coupon code"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                                            />
                                            <Button
                                                onClick={handleApplyCoupon}
                                                disabled={verifying || !couponCode}
                                                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2"
                                            >
                                                {verifying ? "..." : "Apply"}
                                            </Button>
                                        </div>
                                        {couponError && (
                                            <p className="text-xs text-red-500">{couponError}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {checkoutError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                                    <AlertCircle className="h-5 w-5" />
                                    <p className="text-sm font-medium">{checkoutError}</p>
                                </div>
                            )}

                            <Button
                                onClick={handleCheckout}
                                disabled={reserving || cartItems.length === 0}
                                className="w-full py-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg disabled:opacity-50"
                            >
                                {reserving ? "Reserving Items..." : "Proceed to Checkout"}
                                {!reserving && <ArrowRight className="ml-2 h-5 w-5" />}
                            </Button>

                            <Link
                                to="/products"
                                className="block text-center text-[#c4ad94] hover:underline mt-4"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
