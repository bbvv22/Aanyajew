import React from "react";
import { BookOpen, Diamond, Ruler } from "lucide-react";

const GuidesPage = () => {
    return (
        <div className="min-h-screen bg-white py-20">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-serif text-gray-800 mb-4">Jewellery Guides</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Expert advice on choosing, caring for, and understanding your fine jewellery.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Ring Size Guide */}
                    <article className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
                        <div className="aspect-video bg-gray-100 overflow-hidden">
                            <img
                                src="/ring_guide.png"
                                alt="Ring Size Guide"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-8">
                            <h2 className="text-xl font-serif text-gray-800 mb-3">Ring Size Guide</h2>
                            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                                Not sure about your ring size? Use our comprehensive guide to measure your size accurately at home.
                            </p>
                            <a href="#" className="text-[#c4ad94] font-medium hover:underline">Read Guide →</a>
                        </div>
                    </article>


                    {/* Care Guide */}
                    <article className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
                        <div className="aspect-video bg-gray-100 overflow-hidden">
                            <img
                                src="/care_guide.png"
                                alt="Jewellery Care Guide"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-8">
                            <h2 className="text-xl font-serif text-gray-800 mb-3">Jewellery Care</h2>
                            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                                Tips and tricks to keep your precious jewellery looking as brilliant as the day you bought it.
                            </p>
                            <a href="#" className="text-[#c4ad94] font-medium hover:underline">Read Guide →</a>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
};

export default GuidesPage;
