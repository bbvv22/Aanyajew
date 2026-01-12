import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const DiamondGuidePage = () => {
    return (
        <div className="pt-20">
            <div className="bg-[#f8f5f1] py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-6">
                        The Diamond 4Cs
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Understanding the universal standard for assessing diamond quality: Cut, Color, Clarity, and Carat weight.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
                    <div>
                        <img
                            src="/diamond_4cs_guide.png"
                            alt="Diamond 4Cs Guide"
                            className="w-full rounded-lg shadow-lg"
                        />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-2xl font-serif text-gray-800 mb-2">1. Cut</h3>
                            <p className="text-gray-600">
                                The cut of a diamond determines its brilliance. It is the most important of the 4Cs because it has the greatest influence on a diamond's sparkle.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-serif text-gray-800 mb-2">2. Color</h3>
                            <p className="text-gray-600">
                                Diamond color is actually the lack of color. A chemically pure and structurally perfect diamond has no hue, like a drop of pure water.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-serif text-gray-800 mb-2">3. Clarity</h3>
                            <p className="text-gray-600">
                                Clarity refers to the absence of inclusions and blemishes. Evaluating diamond clarity involves determining the number, size, relief, nature, and position of these characteristics.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-serif text-gray-800 mb-2">4. Carat Weight</h3>
                            <p className="text-gray-600">
                                Carat weight measures how much a diamond weighs. A metric "carat" is defined as 200 milligrams.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Link to="/products">
                        <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-4 text-lg">
                            Shop Diamonds
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DiamondGuidePage;
