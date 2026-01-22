import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CreditCard, Truck, Shield, Check, Clock, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const expiryTimestamp = location.state?.reservationExpiry;
    const [timeLeft, setTimeLeft] = useState(
        expiryTimestamp ? Math.max(0, expiryTimestamp - Date.now()) : null
    );

    useEffect(() => {
        if (expiryTimestamp) {
            const interval = setInterval(() => {
                const diff = expiryTimestamp - Date.now();
                if (diff <= 0) {
                    setTimeLeft(0);
                    clearInterval(interval);
                } else {
                    setTimeLeft(diff);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [expiryTimestamp]);

    const formatTime = (ms) => {
        if (ms === null || ms < 0) return "00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const { cartItems, getCartTotal, clearCart, isLoaded, coupon, sessionId } = useCart();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        postalCode: "",
        state: "Telangana",
        country: "India",
        phone: "",
    });

    useEffect(() => {
        // Generate Idempotency Key on mount
        setIdempotencyKey(crypto.randomUUID());

        if (isLoaded && cartItems.length === 0 && !orderPlaced) {
            navigate("/cart");
        }

        // Load user info if logged in
        const user = localStorage.getItem("user");
        if (user) {
            const userData = JSON.parse(user);
            setFormData((prev) => ({
                ...prev,
                email: userData.email || "",
                firstName: userData.name?.split(" ")[0] || "",
                lastName: userData.name?.split(" ").slice(1).join(" ") || "",
                phone: userData.phone || "",
                address: userData.address || "",
                city: userData.city || "",
                state: userData.state || "Telangana",
                postalCode: userData.pincode || "",
                country: userData.country || "India"
            }));
        }
    }, [isLoaded, cartItems.length, navigate, orderPlaced]);

    // Save cart for abandoned cart reminders
    const saveCartForReminder = async (email) => {
        if (!email || cartItems.length === 0) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
        const token = localStorage.getItem("token");

        try {
            await fetch(`${backendUrl}/api/cart/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` })
                },
                body: JSON.stringify({
                    email: email,
                    customer_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
                    phone: formData.phone || null,
                    items: cartItems.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image
                    })),
                    cart_total: getCartTotal() - (coupon?.discountAmount || 0),
                    session_id: sessionId
                })
            });
        } catch (err) {
            console.log("Cart save for reminder failed (non-critical):", err);
        }
    };

    // Debounce timer for email save
    const [emailSaveTimeout, setEmailSaveTimeout] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Save cart when email is entered (with debounce)
        if (name === "email" && value.includes("@")) {
            if (emailSaveTimeout) clearTimeout(emailSaveTimeout);
            setEmailSaveTimeout(setTimeout(() => {
                saveCartForReminder(value);
            }, 2000)); // Save 2 seconds after user stops typing
        }
    };

    const subtotal = getCartTotal();
    const discount = coupon ? coupon.discountAmount : 0;
    const shipping = (subtotal - discount) > 5000 ? 0 : 100;
    const total = (subtotal - discount) + shipping;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                showError("Please login to place an order");
                navigate("/login");
                return;
            }

            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";

            // Prepare order data
            const orderData = {
                items: cartItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity
                })),
                shippingAddress: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.postalCode,
                    country: formData.country,
                    phone: formData.phone
                },
                paymentMethod: "cod", // Cash on Delivery for now
                couponCode: coupon?.code,
                sessionId: sessionId,
                idempotencyKey: idempotencyKey
            };

            const response = await fetch(`${backendUrl}/api/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to place order");
            }

            // Mark cart as converted (no longer abandoned)
            try {
                await fetch(`${backendUrl}/api/cart/convert`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: formData.email })
                });
            } catch (convErr) {
                console.log("Cart conversion tracking failed (non-critical):", convErr);
            }

            // Order placed successfully
            clearCart();
            setOrderPlaced(true);
        } catch (error) {
            console.error("Error placing order:", error);
            showError(error.message || "Failed to place order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-serif text-gray-800 mb-4">Order Confirmed!</h1>
                        <p className="text-gray-600 mb-8">
                            Thank you for your purchase. We've sent a confirmation email to{" "}
                            <strong>{formData.email}</strong>
                        </p>
                        <p className="text-sm text-gray-500 mb-8">
                            Order #AJ{Date.now().toString().slice(-8)}
                        </p>
                        <Link to="/products">
                            <Button className="w-full py-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg">
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="text-2xl font-serif text-[#c4ad94]">
                            ANNYA
                        </Link>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span>Secure Checkout</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reservation Timer Hidden 
            {timeLeft !== null && (
                <div className={`border-b ${timeLeft > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
                        {timeLeft > 0 ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${timeLeft > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                            {timeLeft > 0 
                                ? `Items reserved for ${formatTime(timeLeft)}` 
                                : "Reservation expired. Please restart checkout."}
                        </span>
                    </div>
                </div>
            )}
            */}

            <div className="max-w-7xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit}>
                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Left Column - Forms */}
                        <div className="space-y-8">
                            {/* Contact Information */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6">Contact Information</h2>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Email address"
                                    className="mb-4"
                                    required
                                />
                                <Input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Phone number"
                                    required
                                />
                            </div>

                            {/* Shipping Address */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                    <Truck className="h-5 w-5" />
                                    Shipping Address
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="First name"
                                        required
                                    />
                                    <Input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Last name"
                                        required
                                    />
                                </div>
                                <Input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Address"
                                    className="mt-4"
                                    required
                                />
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <Input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="City"
                                        required
                                    />
                                    <Input
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="Postal code"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <select
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                                        required
                                    >
                                        <option value="Telangana">Telangana</option>
                                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                                        <option value="Maharashtra">Maharashtra</option>
                                        <option value="Karnataka">Karnataka</option>
                                        <option value="Tamil Nadu">Tamil Nadu</option>
                                        <option value="Delhi">Delhi</option>
                                        <option value="Gujarat">Gujarat</option>
                                        <option value="Kerala">Kerala</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <Input
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        placeholder="Country"
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Payment - Cash on Delivery */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Method
                                </h2>

                                {/* Pay Online - Coming Soon */}
                                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 mb-4 opcacity-60 relative">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white"></div>
                                            <div>
                                                <p className="font-medium text-gray-400">Pay Online</p>
                                                <p className="text-sm text-gray-400">Credit/Debit Card, UPI, Net Banking</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                            Coming Soon
                                        </span>
                                    </div>
                                </div>

                                {/* Cash on Delivery - Active */}
                                <div className="border-2 border-[#c4ad94] rounded-lg p-4 bg-[#fdfbf7]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-[#c4ad94] flex items-center justify-center">
                                            <div className="w-3 h-3 rounded-full bg-[#c4ad94]"></div>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">Cash on Delivery (COD)</p>
                                            <p className="text-sm text-gray-500">Pay when your order arrives</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Your order is secure and insured during transit
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Order Summary */}
                        <div>
                            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                                <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>

                                {/* Items */}
                                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="relative">
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-16 h-16 object-cover rounded"
                                                />
                                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                                    {item.name}
                                                </p>
                                                <p className="text-sm text-gray-500">{item.category}</p>
                                            </div>
                                            <p className="text-sm font-semibold">
                                                ₹{(item.price * item.quantity).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t pt-4 space-y-3">
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
                                    <div className="border-t pt-3 flex justify-between font-semibold text-lg text-gray-800">
                                        <span>Total</span>
                                        <span>₹{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-6 mt-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Processing..." : `Pay ₹${total.toLocaleString()}`}
                                </Button>

                                <Link
                                    to="/cart"
                                    className="block text-center text-[#c4ad94] hover:underline mt-4"
                                >
                                    ← Return to cart
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutPage;
