import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const DiamondShapesPage = () => {
    const shapes = [
        { name: "Round", desc: "The most popular shape, optimized for maximum brilliance." },
        { name: "Princess", desc: "Square shape with sharp corners and brilliant sparkle." },
        { name: "Emerald", desc: "Rectangular step-cut with sophisticated, understated elegance." },
        { name: "Oval", desc: "Elongated round shape that creates an illusion of greater size." },
        { name: "Pear", desc: "Unique teardrop shape combining round and marquise cuts." },
        { name: "Cushion", desc: "Square cut with rounded corners, known for fire and brilliance." },
    ];

    return (
        <div className="pt-20">
            <div className="bg-[#f8f5f1] py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-6">
                        Diamond Shapes Guide
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Explore the unique characteristics of different diamond shapes to find the one that perfectly matches your style.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="mb-16">
                    <img
                        src="/diamond_shapes_guide.png"
                        alt="Diamond Shapes Guide"
                        className="w-full rounded-lg shadow-lg max-h-[500px] object-cover"
                    />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    {shapes.map((shape) => (
                        <div key={shape.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h3 className="text-xl font-serif text-gray-800 mb-2">{shape.name}</h3>
                            <p className="text-gray-600">{shape.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <Link to="/products">
                        <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-4 text-lg">
                            Browse Collection
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DiamondShapesPage;
