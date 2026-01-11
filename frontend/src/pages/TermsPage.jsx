import React from "react";
import { FileText } from "lucide-react";

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-4">Terms & Conditions</h1>
                    <p className="text-white/90">Last updated: January 2026</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="prose prose-gray max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">1. Introduction</h2>
                        <p className="text-gray-600 mb-4">
                            Welcome to Annya Jewellers. These terms and conditions outline the rules and regulations for the use of our website and services. By accessing this website, you accept these terms and conditions in full.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">2. Use of Website</h2>
                        <p className="text-gray-600 mb-4">
                            By using this website, you warrant that:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li>You are at least 18 years old or have parental consent</li>
                            <li>You will provide accurate and complete information</li>
                            <li>You will not use the site for unlawful purposes</li>
                            <li>You will not attempt to gain unauthorized access</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">3. Products & Pricing</h2>
                        <p className="text-gray-600 mb-4">
                            All prices are displayed in Indian Rupees (₹) and include GST where applicable. We reserve the right to modify prices without prior notice. Product images are for illustration purposes and may vary slightly from the actual product.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">4. Orders & Payment</h2>
                        <p className="text-gray-600 mb-4">
                            By placing an order, you are making an offer to purchase. We reserve the right to refuse any order. Payment is required at the time of order placement. We accept major credit cards, PayPal, and other payment methods as displayed at checkout.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">5. Shipping & Delivery</h2>
                        <p className="text-gray-600 mb-4">
                            Delivery times are estimates and not guaranteed. Risk of loss passes to you upon delivery. We are not responsible for delays caused by customs or courier services for international orders.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">6. Returns & Refunds</h2>
                        <p className="text-gray-600 mb-4">
                            We offer a 30-day return policy for unused items in original condition. Custom or personalized items are non-returnable. Refunds will be processed within 7-10 business days of receiving the returned item.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">7. Intellectual Property</h2>
                        <p className="text-gray-600 mb-4">
                            All content on this website, including images, text, logos, and designs, is the property of Annya Jewellers and protected by copyright laws. Unauthorized use is prohibited.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">8. Limitation of Liability</h2>
                        <p className="text-gray-600 mb-4">
                            Annya Jewellers shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website or products, to the maximum extent permitted by law.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">9. Contact Information</h2>
                        <p className="text-gray-600 mb-4">
                            For questions regarding these terms, please contact us at:
                        </p>
                        <p className="text-gray-600">
                            Annya Jewellers<br />
                            Hyderabad, India<br />
                            Email: Info@aanyajewellery.com<br />
                            Phone: +91 40 1234 5678
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
