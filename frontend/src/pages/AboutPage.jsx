import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Award, Heart } from "lucide-react";
import { Button } from "../components/ui/button";

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-5xl font-serif mb-6">About Annya Jewellers</h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Crafting timeless elegance
                    </p>
                </div>
            </div>

            {/* Story Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-serif text-gray-800 mb-6">Our Story</h2>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Nestled within the heart of Hyderabad, Annya Jewellers
                                has been supplying fine jewellery. What started as a small family
                                workshop has grown into one of India's most trusted names in luxury jewellery.
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                We take pride in curating a collection that showcases some of the most splendid
                                diamonds and jewellery that India has to offer. Each piece is carefully selected
                                to meet our exacting standards of quality and craftsmanship.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Our commitment to excellence has been passed down through four generations,
                                and we continue to uphold the values of quality, integrity, and exceptional
                                customer service that have defined us for over a century.
                            </p>
                        </div>
                        <div className="aspect-square rounded-2xl overflow-hidden shadow-lg">
                            <img
                                src="/jew.png"
                                alt="Annya Jewellers Store"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-serif text-gray-800 text-center mb-16">Our Values</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                            <div className="w-16 h-16 bg-[#c4ad94]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Award className="h-8 w-8 text-[#c4ad94]" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Quality</h3>
                            <p className="text-gray-600">
                                Every piece of jewellery meets our rigorous standards for quality and
                                craftsmanship. We source only the finest materials.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                            <div className="w-16 h-16 bg-[#c4ad94]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Heart className="h-8 w-8 text-[#c4ad94]" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Passion</h3>
                            <p className="text-gray-600">
                                We are passionate about helping customers find the perfect piece to
                                celebrate life's most precious moments.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                            <div className="w-16 h-16 bg-[#c4ad94]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="h-8 w-8 text-[#c4ad94]" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Heritage</h3>
                            <p className="text-gray-600">
                                With over 100 years of experience, our expertise is unmatched. We
                                carry forward time-honored traditions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visit Us Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-serif text-gray-800 mb-6">Visit Our Store</h2>
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-8">
                        <MapPin className="h-5 w-5 text-[#c4ad94]" />
                        <span>Hyderabad, India</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-8">
                        <Clock className="h-5 w-5 text-[#c4ad94]" />
                        <span>Mon - Sat: 9:30am - 6:00pm | Sun: 12:00pm - 5:00pm</span>
                    </div>
                    <Link to="/contact">
                        <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-lg">
                            Contact Us
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;
