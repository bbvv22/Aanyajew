import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

const WishlistPage = () => {
    const { wishlistItems, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { success } = useToast();

    const handleAddToCart = (product) => {
        addToCart(product, 1);
        success(`${product.name} added to cart!`);
    };

    const handleRemove = (product) => {
        removeFromWishlist(product.id);
        success(`${product.name} removed from wishlist`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#c4ad94] to-[#b39d84] text-white py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <Heart className="h-12 w-12 mx-auto mb-4" />
                    <h1 className="text-4xl font-serif mb-2">My Wishlist</h1>
                    <p className="text-white/90">
                        {wishlistItems.length} {wishlistItems.length === 1 ? "item" : "items"} saved
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {wishlistItems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                        <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your wishlist is empty</h2>
                        <p className="text-gray-600 mb-8">
                            Save your favorite items to buy them later!
                        </p>
                        <Link to="/products">
                            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-lg">
                                Browse Products
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {wishlistItems.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg shadow-sm overflow-hidden group"
                            >
                                <Link to={`/product/${product.id}`}>
                                    <div className="aspect-square overflow-hidden bg-gray-100 relative">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                </Link>
                                <div className="p-4">
                                    <p className="text-xs text-[#c4ad94] uppercase tracking-wider mb-1">
                                        {product.category}
                                    </p>
                                    <Link to={`/product/${product.id}`}>
                                        <h3 className="font-medium text-gray-800 mb-2 hover:text-[#c4ad94] transition-colors line-clamp-2">
                                            {product.name}
                                        </h3>
                                    </Link>
                                    <p className="text-lg font-semibold text-gray-900 mb-4">
                                        ₹{product.price?.toLocaleString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleAddToCart(product)}
                                            className="flex-1 bg-[#c4ad94] hover:bg-[#b39d84] text-white"
                                        >
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Add to Cart
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleRemove(product)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {wishlistItems.length > 0 && (
                    <div className="mt-8 text-center">
                        <Link to="/products" className="text-[#c4ad94] hover:underline">
                            Continue Shopping
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
