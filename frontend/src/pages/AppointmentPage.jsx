import React, { useState } from "react";
import axios from "axios";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../context/ToastContext";

const AppointmentPage = () => {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        date: "",
        time: "",
        service: "",
        message: ""
    });
    const [loading, setLoading] = useState(false);
    const { success, error: showErrorToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
            await axios.post(`${backendUrl}/api/appointments`, formData);
            setSubmitted(true);
            setFormData({ name: "", email: "", phone: "", date: "", time: "", service: "", message: "" });
        } catch (error) {
            console.error("Error booking appointment:", error);
            showErrorToast("Failed to book appointment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif text-gray-800 mb-4">Book an Appointment</h1>
                    <p className="text-gray-600">
                        Visit our Hyderabad showroom for a personalized consultation with our experts.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Info Card */}
                    <div className="bg-[#c4ad94] text-white p-8 rounded-2xl">
                        <h2 className="text-2xl font-serif mb-6">Why Book an Appointment?</h2>
                        <ul className="space-y-4 mb-8">
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">1</div>
                                <span>Dedicated time with a jewellery specialist</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">2</div>
                                <span>View our exclusive collection in person</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">3</div>
                                <span>Custom design consultation</span>
                            </li>
                        </ul>

                        <div className="border-t border-white/20 pt-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5" />
                                <span>Hyderabad, India</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5" />
                                <span>Mon - Sat: 9:30am - 6:00pm</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm">
                        {submitted ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <Calendar className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">Request Received!</h3>
                                <p className="text-gray-600">
                                    We will contact you shortly to confirm your appointment time.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                                    <Input
                                        value={formData.service}
                                        onChange={e => setFormData({ ...formData, service: e.target.value })}
                                        placeholder="E.g., Custom Engagement Ring, Repair, etc."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <Input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <Input
                                        required
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                                        <Input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        >
                                            <option value="">Select Time</option>
                                            <option>10:00 AM</option>
                                            <option>11:00 AM</option>
                                            <option>12:00 PM</option>
                                            <option>02:00 PM</option>
                                            <option>03:00 PM</option>
                                            <option>04:00 PM</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c4ad94] min-h-[100px]"
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="Tell us more about what you're looking for..."
                                    />
                                </div>
                                <Button type="submit" disabled={loading} className="w-full bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                    {loading ? "Sending Request..." : "Request Appointment"}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentPage;
