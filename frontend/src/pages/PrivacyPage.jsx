import React from "react";
import { Shield } from "lucide-react";

const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-4">Privacy Policy</h1>
                    <p className="text-white/90">Last updated: January 2026</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="prose prose-gray max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Overview</h2>
                        <p className="text-gray-600 mb-4">
                            At Annya Jewellers, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information when you visit our website or make a purchase.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Information We Collect</h2>
                        <p className="text-gray-600 mb-4">We collect the following types of information:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address</li>
                            <li><strong>Payment Information:</strong> Credit card details (processed securely through our payment provider)</li>
                            <li><strong>Account Information:</strong> Username, password, order history</li>
                            <li><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent on site</li>
                            <li><strong>Cookies:</strong> Small files stored on your device to enhance your experience</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">How We Use Your Information</h2>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li>Process and fulfill your orders</li>
                            <li>Send order confirmations and shipping updates</li>
                            <li>Respond to customer service requests</li>
                            <li>Send marketing communications (with your consent)</li>
                            <li>Improve our website and services</li>
                            <li>Prevent fraud and enhance security</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Data Security</h2>
                        <p className="text-gray-600 mb-4">
                            We implement industry-standard security measures to protect your data:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li>SSL encryption for all data transmission</li>
                            <li>PCI-compliant payment processing</li>
                            <li>Regular security audits and updates</li>
                            <li>Limited employee access to personal data</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Cookies</h2>
                        <p className="text-gray-600 mb-4">
                            We use cookies to enhance your browsing experience. You can control cookie settings in your browser. Types of cookies we use:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li><strong>Essential:</strong> Required for site functionality</li>
                            <li><strong>Analytics:</strong> Help us understand how visitors use our site</li>
                            <li><strong>Marketing:</strong> Used to deliver relevant advertisements</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Your Rights (GDPR)</h2>
                        <p className="text-gray-600 mb-4">Under GDPR, you have the right to:</p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Request data portability</li>
                            <li>Withdraw consent at any time</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-4">Contact Us</h2>
                        <p className="text-gray-600 mb-4">
                            For privacy-related inquiries or to exercise your rights:
                        </p>
                        <p className="text-gray-600">
                            Data Protection Officer<br />
                            Annya Jewellers<br />
                            Hyderabad - 500036<br />
                            Email: privacy@annyajewellers.com<br />
                            Phone: +91 9100496169
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
