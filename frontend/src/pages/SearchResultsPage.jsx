import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Search, ShoppingCart, Heart, Filter } from "lucide-react";
import { Button } from "../components/ui/button";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("relevance");
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { success } = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
                const response = await axios.get(
                    `${backendUrl}/api/products?search=${encodeURIComponent(query)}&limit=200`
                );
                setProducts(response.data);
            } catch (error) {
                console.error("Error searching products:", error);
            } finally {
                setLoading(false);
            }
        };

        if (query) {
            fetchProducts();
        } else {
            setProducts([]);
            setLoading(false);
        }
    }, [query]);

    const sortedProducts = [...products].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return a.price - b.price;
            case "price-high":
                return b.price - a.price;
            case "name":
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    const handleAddToCart = (product) => {
        addToCart(product, 1);
        success(`${product.name} added to cart!`);
    };

    const handleToggleWishlist = (product) => {
        toggleWishlist(product);
        if (isInWishlist(product.id)) {
            success(`${product.name} removed from wishlist`);
        } else {
            success(`${product.name} added to wishlist!`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Search className="h-6 w-6 text-[#c4ad94]" />
                        <h1 className="text-2xl font-serif text-gray-800">
                            Search Results for "{query}"
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        {products.length} {products.length === 1 ? "product" : "products"} found
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Sort Options */}
                <div className="flex items-center justify-between mb-6">
                    <div></div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-600">Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                        >
                            <option value="relevance">Relevance</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
                    </div>
                ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">No results found</h2>
                        <p className="text-gray-600 mb-8">
                            Try adjusting your search or browse our categories.
                        </p>
                        <Link to="/products">
                            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-lg">
                                Browse All Products
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {sortedProducts.map((product) => (
                            <div
                                key={product.id}
                                className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                <Link to={`/product/${product.id}`}>
                                    <div className="aspect-square overflow-hidden bg-gray-100 relative">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleToggleWishlist(product);
                                            }}
                                            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                                        >
                                            <Heart
                                                className={`h-5 w-5 ${isInWishlist(product.id)
                                                        ? "fill-red-500 text-red-500"
                                                        : "text-gray-400 hover:text-red-500"
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </Link>
                                <div className="p-4">
                                    <p className="text-xs text-[#c4ad94] uppercase tracking-wider mb-1">
                                        {product.category}
                                    </p>
                                    <Link to={`/product/${product.id}`}>
                                        <h3 className="font-medium text-gray-800 mb-2 group-hover:text-[#c4ad94] transition-colors line-clamp-2">
                                            {product.name}
                                        </h3>
                                    </Link>
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-semibold text-gray-900">
                                            ₹{product.price.toLocaleString()}
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleAddToCart(product);
                                            }}
                                            className="bg-[#c4ad94] hover:bg-[#b39d84] text-white"
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsPage;
