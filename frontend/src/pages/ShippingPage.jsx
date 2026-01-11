import React from "react";
import { Truck, Package, Clock, Globe, RefreshCw, AlertCircle } from "lucide-react";

const ShippingPage = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <Truck className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-4">Shipping & Returns</h1>
                    <p className="text-white/90">Everything you need to know about delivery and returns</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Shipping Options */}
                <section className="mb-12">
                    <h2 className="text-2xl font-serif text-gray-800 mb-6 flex items-center gap-3">
                        <Package className="h-6 w-6 text-[#c4ad94]" />
                        Shipping Options
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-2">Standard Shipping</h3>
                            <p className="text-[#c4ad94] font-semibold mb-2">FREE on orders over ₹5,000</p>
                            <p className="text-sm text-gray-600 mb-2">₹100 for orders under ₹5,000</p>
                            <p className="text-sm text-gray-500">Delivery: 5-7 business days</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-2">Express Shipping</h3>
                            <p className="text-gray-600 mb-2">₹250</p>
                            <p className="text-sm text-gray-500">Delivery: 2-3 business days</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-2">Same Day Delivery</h3>
                            <p className="text-gray-600 mb-2">₹500 (Hyderabad only)</p>
                            <p className="text-sm text-gray-500">Order before 12pm for same day</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-800 mb-2">Store Pickup</h3>
                            <p className="text-[#c4ad94] font-semibold mb-2">FREE</p>
                            <p className="text-sm text-gray-500">Pick up from our Hyderabad store</p>
                        </div>
                    </div>
                </section>

                {/* Delivery Zones */}
                <section className="mb-12">
                    <h2 className="text-2xl font-serif text-gray-800 mb-6 flex items-center gap-3">
                        <Globe className="h-6 w-6 text-[#c4ad94]" />
                        Delivery Zones
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 font-semibold text-gray-800">Zone</th>
                                    <th className="text-left py-3 font-semibold text-gray-800">Estimated Time</th>
                                    <th className="text-left py-3 font-semibold text-gray-800">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                <tr className="border-b border-gray-100">
                                    <td className="py-3">Hyderabad</td>
                                    <td className="py-3">1-2 days</td>
                                    <td className="py-3">₹50</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3">Telangana & Andhra Pradesh</td>
                                    <td className="py-3">2-4 days</td>
                                    <td className="py-3">₹100</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3">South India (TN, KA, KL)</td>
                                    <td className="py-3">4-6 days</td>
                                    <td className="py-3">₹150</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3">Rest of India</td>
                                    <td className="py-3">5-7 days</td>
                                    <td className="py-3">₹200</td>
                                </tr>
                                <tr>
                                    <td className="py-3">Metro Cities (Delhi, Mumbai, Bangalore)</td>
                                    <td className="py-3">3-5 days</td>
                                    <td className="py-3">₹150</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                        * Free shipping on orders above ₹5,000 across India
                    </p>
                </section>

                {/* Returns Policy */}
                <section className="mb-12">
                    <h2 className="text-2xl font-serif text-gray-800 mb-6 flex items-center gap-3">
                        <RefreshCw className="h-6 w-6 text-[#c4ad94]" />
                        Returns Policy
                    </h2>
                    <div className="space-y-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <h3 className="font-semibold text-green-800 mb-2">30-Day Returns</h3>
                            <p className="text-green-700">
                                Not completely satisfied? Return unworn items within 30 days for a full refund.
                            </p>
                        </div>

                        <h3 className="font-semibold text-gray-800">How to Return</h3>
                        <ol className="list-decimal pl-6 text-gray-600 space-y-2">
                            <li>Log into your account and go to 'Order History'</li>
                            <li>Select the order and click 'Request Return'</li>
                            <li>Print the prepaid return label</li>
                            <li>Pack items securely in original packaging</li>
                            <li>Drop off at any courier collection point</li>
                        </ol>

                        <h3 className="font-semibold text-gray-800 mt-6">Return Conditions</h3>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Items must be unworn and in original condition</li>
                            <li>All tags must still be attached</li>
                            <li>Items must be in original packaging</li>
                            <li>Personalized or custom items cannot be returned</li>
                            <li>Sale items are final sale and non-returnable</li>
                        </ul>
                    </div>
                </section>

                {/* Important Notice */}
                <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-800 mb-2">Important Notice</h3>
                            <p className="text-yellow-700 text-sm">
                                All our jewellery is shipped with full insurance. Signature is required upon delivery. Please ensure someone is available to receive the package.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ShippingPage;
