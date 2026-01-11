import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const FAQPage = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            category: "Orders & Shipping",
            questions: [
                {
                    q: "How long does shipping take?",
                    a: "Standard shipping within India takes 5-7 business days. Local Hyderabad deliveries take 1-2 days. Express shipping options are available at checkout."
                },
                {
                    q: "Do you offer free shipping?",
                    a: "Yes! We offer free standard shipping on all orders over ₹5,000 across India. Local pickup from our Hyderabad store is always free."
                },
                {
                    q: "Can I track my order?",
                    a: "Absolutely! Once your order ships, you'll receive an email with tracking information. You can also track your order in your account under 'Order History'."
                },
                {
                    q: "What if my order arrives damaged?",
                    a: "Please contact us within 48 hours of receiving your order if any items are damaged. We'll arrange a replacement or refund immediately."
                }
            ]
        },
        {
            category: "Returns & Exchanges",
            questions: [
                {
                    q: "What is your return policy?",
                    a: "We offer a 30-day return policy for unworn items in original condition with tags attached. Custom or personalized items cannot be returned."
                },
                {
                    q: "How do I initiate a return?",
                    a: "Log into your account, go to 'Order History', select the order, and click 'Request Return'. You'll receive a prepaid shipping label within 24 hours."
                },
                {
                    q: "When will I receive my refund?",
                    a: "Refunds are processed within 5-7 business days after we receive and inspect the returned item. The refund will be credited to your original payment method."
                }
            ]
        },
        {
            category: "Products & Care",
            questions: [
                {
                    q: "Are your diamonds certified?",
                    a: "Yes, all our diamonds over 0.30 carats come with certification from GIA, IGI, or HRD laboratories. Certification documents are included with your purchase."
                },
                {
                    q: "How should I care for my jewellery?",
                    a: "Store pieces separately to prevent scratching. Clean with a soft cloth and mild soap solution. Remove jewellery before swimming, showering, or applying lotions. We offer professional cleaning services in-store."
                },
                {
                    q: "Do you offer resizing?",
                    a: "Yes, we offer complimentary resizing within 30 days of purchase for most ring styles. Some designs may have sizing limitations—contact us for details."
                }
            ]
        },
        {
            category: "Payment & Security",
            questions: [
                {
                    q: "What payment methods do you accept?",
                    a: "We accept Visa, MasterCard, American Express, PayPal, and Apple Pay. All transactions are secured with SSL encryption."
                },
                {
                    q: "Is my payment information secure?",
                    a: "Absolutely. We use industry-standard SSL encryption and never store your full card details. All payments are processed through PCI-compliant payment gateways."
                },
                {
                    q: "Do you offer payment plans?",
                    a: "Yes, we partner with Klarna to offer flexible payment options. Split your purchase into 3 interest-free installments at checkout."
                }
            ]
        }
    ];

    const toggleQuestion = (categoryIndex, questionIndex) => {
        const key = `${categoryIndex}-${questionIndex}`;
        setOpenIndex(openIndex === key ? null : key);
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-4">Frequently Asked Questions</h1>
                    <p className="text-white/90 max-w-2xl mx-auto">
                        Find answers to common questions about our products, shipping, and services.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                {faqs.map((category, categoryIndex) => (
                    <div key={category.category} className="mb-10">
                        <h2 className="text-2xl font-serif text-gray-800 mb-6">{category.category}</h2>
                        <div className="space-y-4">
                            {category.questions.map((item, questionIndex) => {
                                const isOpen = openIndex === `${categoryIndex}-${questionIndex}`;
                                return (
                                    <div
                                        key={questionIndex}
                                        className="border border-gray-200 rounded-lg overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                                            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="font-medium text-gray-800">{item.q}</span>
                                            {isOpen ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-6 pb-4 text-gray-600 border-t border-gray-100">
                                                <p className="pt-4">{item.a}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="mt-12 text-center bg-gray-50 rounded-lg p-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Still have questions?</h3>
                    <p className="text-gray-600 mb-6">
                        Our customer service team is here to help.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a
                            href="mailto:Info@aanyajewellery.com"
                            className="text-[#c4ad94] hover:underline"
                        >
                            Email Us
                        </a>
                        <span className="text-gray-300">|</span>
                        <a href="tel:+35316775350" className="text-[#c4ad94] hover:underline">
                            Call +353 1 677 5350
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
