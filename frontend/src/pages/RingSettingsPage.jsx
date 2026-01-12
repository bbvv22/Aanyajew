import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const RingSettingsPage = () => {
    const settings = [
        { name: "Solitaire", desc: "A classic setting featuring a single diamond, putting all focus on the center stone." },
        { name: "Halo", desc: "A center diamond surrounded by smaller stones, enhancing sparkle and perceived size." },
        { name: "Pave", desc: "The band is paved with small diamonds, adding continuous light and brilliance." },
        { name: "Bezel", desc: "A metal rim surrounds the diamond, offering security and a modern, sleek look." },
    ];

    return (
        <div className="pt-20">
            <div className="bg-[#f8f5f1] py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-6">
                        Ring Settings & Styles
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        The setting defines the character of a ring. Discover the popular styles that showcase your diamond best.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                    <div className="order-2 md:order-1 space-y-8">
                        {settings.map((setting) => (
                            <div key={setting.name} className="border-b border-gray-100 pb-6 last:border-0">
                                <h3 className="text-2xl font-serif text-gray-800 mb-2">{setting.name} Setting</h3>
                                <p className="text-gray-600">{setting.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="order-1 md:order-2">
                        <img
                            src="/ring_settings_guide.png"
                            alt="Ring Settings Guide"
                            className="w-full rounded-lg shadow-lg"
                        />
                    </div>
                </div>

                <div className="text-center">
                    <Link to="/products">
                        <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-4 text-lg">
                            Find Your Ring
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RingSettingsPage;
