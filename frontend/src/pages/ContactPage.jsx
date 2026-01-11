import React, { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setLoading(false);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-3xl md:text-5xl font-serif mb-6">Contact Us</h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        We'd love to hear from you. Get in touch with our team.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Contact Information */}
                    <div>
                        <h2 className="text-3xl font-serif text-gray-800 mb-8">Get In Touch</h2>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-[#c4ad94]/10 rounded-full flex items-center justify-center shrink-0">
                                    <MapPin className="h-5 w-5 text-[#c4ad94]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Visit Us</h3>
                                    <p className="text-gray-600">

                                        Hyderabad, India
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-[#c4ad94]/10 rounded-full flex items-center justify-center shrink-0">
                                    <Phone className="h-5 w-5 text-[#c4ad94]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Call Us</h3>
                                    <p className="text-gray-600">+91 9100496169</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-[#c4ad94]/10 rounded-full flex items-center justify-center shrink-0">
                                    <Mail className="h-5 w-5 text-[#c4ad94]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Email Us</h3>
                                    <p className="text-gray-600">Aanyajewellerysilver@gmail.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-[#c4ad94]/10 rounded-full flex items-center justify-center shrink-0">
                                    <Clock className="h-5 w-5 text-[#c4ad94]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Opening Hours</h3>
                                    <p className="text-gray-600">
                                        Monday - Saturday: 9:30am - 6:00pm<br />
                                        Sunday: 12:00pm - 5:00pm
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Map Placeholder */}
                        <div className="mt-8 bg-gray-100 rounded-2xl h-64 flex items-center justify-center">
                            <p className="text-gray-500">Map Location</p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div>
                        <div className="bg-gray-50 rounded-2xl p-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Send Us a Message</h2>

                            {submitted ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Send className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Message Sent!</h3>
                                    <p className="text-gray-600">
                                        Thank you for contacting us. We'll get back to you within 24 hours.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Your Name
                                            </label>
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address
                                            </label>
                                            <Input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="you@example.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number
                                            </label>
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Subject
                                            </label>
                                            <Input
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                placeholder="How can we help?"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Message
                                        </label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            rows={5}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94] resize-none"
                                            placeholder="Tell us more about your inquiry..."
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg"
                                    >
                                        {loading ? "Sending..." : "Send Message"}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
