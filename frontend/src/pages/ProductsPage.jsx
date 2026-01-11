import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Heart, Search, Filter, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

const ProductsPage = () => {
    const [searchParams] = useSearchParams();
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { success } = useToast();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    const categories = [
        "all",
        "Engagement Rings",
        "Diamond Jewellery",
        "Wedding Rings",
        "Gold Jewellery",
        "Silver Jewellery",
    ];

    // Update search term when URL changes
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearchTerm(urlSearch);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
                const response = await axios.get(`${backendUrl}/api/products`);
                setProducts(response.data);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter((product) => {
        // Split search term into words and check if ANY word matches
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        const productName = product.name.toLowerCase();
        const productCategory = (product.category || "").toLowerCase();

        // Match if any search word is found in name or category
        const matchesSearch = searchWords.length === 0 ||
            searchWords.some(word => productName.includes(word) || productCategory.includes(word));

        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
                    <h1 className="text-4xl font-serif mb-4">Our Collection</h1>
                    <p className="text-white/90 max-w-2xl mx-auto">
                        Discover our exquisite range of fine jewellery, handcrafted with precision and love.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search and Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="md:hidden"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <aside className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-64 shrink-0`}>
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-800">Filters</h3>
                                <button onClick={() => setShowFilters(false)} className="md:hidden">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="mb-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Category</h4>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <label key={category} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="category"
                                                checked={selectedCategory === category}
                                                onChange={() => setSelectedCategory(category)}
                                                className="text-[#c4ad94] focus:ring-[#c4ad94]"
                                            />
                                            <span className="text-sm text-gray-600 capitalize">{category}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSelectedCategory("all");
                                    setSearchTerm("");
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-gray-600">
                                Showing <span className="font-semibold">{filteredProducts.length}</span> products
                            </p>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-gray-500">No products found matching your criteria.</p>
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
                                                    toggleWishlist(product);
                                                    if (isInWishlist(product.id)) {
                                                        success(`${product.name} removed from wishlist`);
                                                    } else {
                                                        success(`${product.name} added to wishlist!`);
                                                    }
                                                }}
                                                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                                            >
                                                <Heart className={`h-5 w-5 ${isInWishlist(product.id)
                                                    ? "fill-red-500 text-red-500"
                                                    : "text-gray-400 hover:text-red-500"
                                                    }`} />
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-xs text-[#c4ad94] uppercase tracking-wider mb-1">
                                                {product.category}
                                            </p>
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
                                                        addToCart(product, 1);
                                                        success(`${product.name} added to cart!`);
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

export default ProductsPage;
