import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Heart, Filter, X } from "lucide-react";
import { Button } from "../components/ui/button";

const CategoryPage = () => {
    const { category } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [priceRange, setPriceRange] = useState([0, 1000000]);
    const [showFilters, setShowFilters] = useState(false);

    const decodedCategory = decodeURIComponent(category);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
                const response = await axios.get(
                    `${backendUrl}/api/products?category=${encodeURIComponent(decodedCategory)}&limit=500`
                );
                setProducts(response.data);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [decodedCategory]);

    const filteredProducts = products.filter(
        (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-serif mb-4">{decodedCategory}</h1>
                    <p className="text-white/90">
                        Explore our beautiful collection of {decodedCategory.toLowerCase()}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-8">
                    <Link to="/" className="hover:text-[#c4ad94]">Home</Link>
                    <span>/</span>
                    <Link to="/products" className="hover:text-[#c4ad94]">Products</Link>
                    <span>/</span>
                    <span className="text-gray-400">{decodedCategory}</span>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar Filters */}
                    <aside className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-64 shrink-0`}>
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-800">Filters</h3>
                                <button onClick={() => setShowFilters(false)} className="md:hidden">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Price Filter */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Price Range</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="price"
                                            checked={priceRange[0] === 0 && priceRange[1] === 1000000}
                                            onChange={() => {
                                                setPriceRange([0, 1000000]);
                                                setShowFilters(false);
                                            }}
                                            className="text-[#c4ad94]"
                                        />
                                        <span className="text-sm text-gray-600">All Prices</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="price"
                                            checked={priceRange[0] === 0 && priceRange[1] === 500}
                                            onChange={() => {
                                                setPriceRange([0, 500]);
                                                setShowFilters(false);
                                            }}
                                            className="text-[#c4ad94]"
                                        />
                                        <span className="text-sm text-gray-600">Under ₹500</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="price"
                                            checked={priceRange[0] === 500 && priceRange[1] === 1000}
                                            onChange={() => {
                                                setPriceRange([500, 1000]);
                                                setShowFilters(false);
                                            }}
                                            className="text-[#c4ad94]"
                                        />
                                        <span className="text-sm text-gray-600">₹500 - ₹1,000</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="price"
                                            checked={priceRange[0] === 1000 && priceRange[1] === 5000}
                                            onChange={() => {
                                                setPriceRange([1000, 5000]);
                                                setShowFilters(false);
                                            }}
                                            className="text-[#c4ad94]"
                                        />
                                        <span className="text-sm text-gray-600">₹1,000 - ₹5,000</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="price"
                                            checked={priceRange[0] === 5000 && priceRange[1] === 10000}
                                            onChange={() => {
                                                setPriceRange([5000, 10000]);
                                                setShowFilters(false);
                                            }}
                                            className="text-[#c4ad94]"
                                        />
                                        <span className="text-sm text-gray-600">Over ₹5,000</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-600">
                                Showing <span className="font-semibold">{filteredProducts.length}</span> products
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className="md:hidden"
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                            </Button>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-gray-500">No products found in this category.</p>
                                <Link to="/products" className="text-[#c4ad94] hover:underline mt-4 inline-block">
                                    View all products
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        to={`/product/${product.id}`}
                                        className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                                    >
                                        <div className="aspect-square overflow-hidden bg-gray-100 relative">
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                }}
                                                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                                            >
                                                <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-medium text-gray-800 mb-2 group-hover:text-[#c4ad94] transition-colors line-clamp-2">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <p className="text-lg font-semibold text-gray-900">
                                                    ₹{product.price.toLocaleString()}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                    className="bg-[#c4ad94] hover:bg-[#b39d84] text-white"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryPage;
