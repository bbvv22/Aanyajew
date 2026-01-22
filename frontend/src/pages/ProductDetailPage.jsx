import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Heart, ChevronLeft, Minus, Plus, Check, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import StarRating from "../components/StarRating";
import ReviewForm from "../components/ReviewForm";
import ReviewList from "../components/ReviewList";
import ImageZoom from "../components/ImageZoom";

const ProductDetailPage = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { success, error: showError } = useToast();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState({ averageRating: 0, totalReviews: 0 });
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [activeTab, setActiveTab] = useState("description");
    const [selectedImage, setSelectedImage] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // 1. Fetch the specific product details
                const response = await axios.get(`${backendUrl}/api/products/${id}`);
                const foundProduct = response.data;
                setProduct(foundProduct);

                // 2. Fetch related products based on category
                if (foundProduct && foundProduct.category) {
                    const relatedRes = await axios.get(`${backendUrl}/api/products?category=${foundProduct.category}&limit=5`);
                    // Filter out the current product from related list
                    const related = relatedRes.data
                        .filter((p) => p.id !== id)
                        .slice(0, 4);
                    setRelatedProducts(related);
                }
            } catch (error) {
                console.error("Error fetching product:", error);
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };

        const fetchReviews = async () => {
            try {
                const [reviewsRes, ratingRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/products/${id}/reviews`),
                    axios.get(`${backendUrl}/api/products/${id}/rating`)
                ]);
                setReviews(reviewsRes.data);
                setRating(ratingRes.data);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            }
        };

        fetchProduct();
        fetchReviews();
    }, [id, backendUrl]);

    const handleAddToCart = () => {
        if (product) {
            addToCart(product, quantity);
            setAddedToCart(true);
            success(`${product.name} added to cart!`);
            setTimeout(() => setAddedToCart(false), 2000);
        }
    };

    const handleToggleWishlist = () => {
        if (product) {
            toggleWishlist(product);
            if (isInWishlist(product.id)) {
                success(`${product.name} removed from wishlist`);
            } else {
                success(`${product.name} added to wishlist!`);
            }
        }
    };

    const handleSubmitReview = async (reviewData) => {
        const token = localStorage.getItem("token");
        if (!token) {
            showError("Please log in to write a review");
            return;
        }

        try {
            const response = await axios.post(
                `${backendUrl}/api/products/${id}/reviews`,
                reviewData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReviews([response.data, ...reviews]);
            setShowReviewForm(false);
            success("Review submitted successfully!");

            // Refresh rating
            const ratingRes = await axios.get(`${backendUrl}/api/products/${id}/rating`);
            setRating(ratingRes.data);
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Failed to submit review");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-2xl font-serif text-gray-800 mb-4">Product not found</h2>
                <Link to="/products" className="text-[#c4ad94] hover:underline">
                    ← Back to products
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Breadcrumb */}
            <div className="bg-gray-50 py-4">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <Link to="/" className="hover:text-[#c4ad94]">Home</Link>
                        <span>/</span>
                        <Link to="/products" className="hover:text-[#c4ad94]">Products</Link>
                        <span>/</span>
                        <span className="text-gray-400 break-all">{product.name}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <Link
                    to="/products"
                    className="inline-flex items-center text-gray-600 hover:text-[#c4ad94] mb-8"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to products
                </Link>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Product Images Gallery */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        {/* Main Image */}
                        <ImageZoom
                            src={selectedImage || product.image}
                            alt={product.name}
                            className="aspect-square bg-gray-100 rounded-lg"
                        >
                            <button
                                onClick={handleToggleWishlist}
                                className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-md hover:bg-gray-50 z-10"
                            >
                                <Heart
                                    className={`h-6 w-6 ${isInWishlist(product.id)
                                        ? "fill-red-500 text-red-500"
                                        : "text-gray-400 hover:text-red-500"
                                        }`}
                                />
                            </button>
                        </ImageZoom>

                        {/* Thumbnail Gallery */}
                        {product.images && product.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto py-2">
                                {product.images.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImage(img)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${(selectedImage || product.image) === img
                                            ? 'border-[#c4ad94] shadow-md'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`${product.name} - ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col">
                        <p className="text-sm text-[#c4ad94] uppercase tracking-wider mb-2">
                            {product.category}
                        </p>
                        <h1 className="text-3xl font-serif text-gray-800 mb-4">{product.name}</h1>

                        {/* Rating */}
                        <div className="flex items-center gap-3 mb-4">
                            <StarRating rating={Math.round(rating.averageRating)} readonly size="sm" />
                            <span className="text-sm text-gray-600">
                                {rating.averageRating > 0 ? `${rating.averageRating} (${rating.totalReviews} reviews)` : "No reviews yet"}
                            </span>
                        </div>

                        <p className="text-3xl font-semibold text-gray-900 mb-6">
                            ₹{product.price.toLocaleString()}
                        </p>

                        <p className="text-gray-600 mb-8 leading-relaxed">
                            {product.description}
                        </p>

                        {/* Stock Status */}
                        <div className="flex items-center gap-2 mb-6">
                            {product.inStock ? (
                                <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-green-600 text-sm">In Stock</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-red-600 text-sm">Out of Stock</span>
                                </>
                            )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-sm text-gray-600">Quantity:</span>
                            <div className="flex items-center border border-gray-200 rounded-lg">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="p-2 hover:bg-gray-100 transition-colors"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="px-4 py-2 min-w-[50px] text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="p-2 hover:bg-gray-100 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mb-8">
                            <Button
                                onClick={handleAddToCart}
                                disabled={!product.inStock}
                                className={`flex-1 py-6 text-lg ${addedToCart
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-[#c4ad94] hover:bg-[#b39d84]"
                                    } text-white transition-colors`}
                            >
                                {addedToCart ? (
                                    <>
                                        <Check className="h-5 w-5 mr-2" />
                                        Added to Cart
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="h-5 w-5 mr-2" />
                                        Add to Cart
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleToggleWishlist}
                                className={`px-6 py-6 border-gray-200 ${isInWishlist(product.id) ? "bg-red-50 text-red-500" : "hover:bg-gray-50"
                                    }`}
                            >
                                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-red-500" : ""}`} />
                            </Button>
                        </div>

                        {/* Additional Info */}
                        <div className="border-t border-gray-200 pt-6 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">SKU</span>
                                <span className="text-gray-800">{product.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Category</span>
                                <Link
                                    to={`/products?category=${encodeURIComponent(product.category)}`}
                                    className="text-[#c4ad94] hover:underline"
                                >
                                    {product.category}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-16 border-t border-gray-200 pt-8">
                    <div className="flex gap-8 border-b border-gray-200 mb-8">
                        <button
                            onClick={() => setActiveTab("description")}
                            className={`pb-4 text-lg font-medium transition-colors ${activeTab === "description"
                                ? "text-[#c4ad94] border-b-2 border-[#c4ad94]"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Description
                        </button>
                        <button
                            onClick={() => setActiveTab("reviews")}
                            className={`pb-4 text-lg font-medium transition-colors ${activeTab === "reviews"
                                ? "text-[#c4ad94] border-b-2 border-[#c4ad94]"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Reviews ({rating.totalReviews})
                        </button>
                    </div>

                    {activeTab === "description" && (
                        <div className="prose prose-gray max-w-none">
                            <p className="text-gray-600 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    {activeTab === "reviews" && (
                        <div className="max-w-2xl mx-auto">
                            {/* Reviews Header - Centered like reference */}
                            <h2 className="text-3xl font-serif text-gray-800 text-center mb-8">Reviews</h2>

                            {/* Star Rating Summary - Centered */}
                            <div className="flex items-center justify-center gap-2 mb-10">
                                <StarRating rating={Math.round(rating.averageRating)} readonly size="md" />
                                <span className="text-gray-600">
                                    {rating.averageRating > 0 ? rating.averageRating : "0"}/5 ({rating.totalReviews} {rating.totalReviews === 1 ? "review" : "reviews"})
                                </span>
                            </div>

                            {/* Reviews List */}
                            <ReviewList reviews={reviews} />

                            {/* Write a Review Section */}
                            <div className="mt-12 pt-8 border-t border-gray-200">
                                <h3 className="text-xl font-semibold text-gray-800 mb-6">Write a Review</h3>
                                {showReviewForm ? (
                                    <ReviewForm
                                        productId={id}
                                        onSubmit={handleSubmitReview}
                                        onCancel={() => setShowReviewForm(false)}
                                    />
                                ) : (
                                    <Button
                                        onClick={() => setShowReviewForm(true)}
                                        className="bg-[#c4ad94] hover:bg-[#b39d84] text-white"
                                    >
                                        Write a Review
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-2xl font-serif text-gray-800 mb-8">Related Products</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {relatedProducts.map((relatedProduct) => (
                                <Link
                                    key={relatedProduct.id}
                                    to={`/product/${relatedProduct.id}`}
                                    className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <div className="aspect-square overflow-hidden bg-gray-100">
                                        <img
                                            src={relatedProduct.image}
                                            alt={relatedProduct.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 group-hover:text-[#c4ad94] transition-colors">
                                            {relatedProduct.name}
                                        </h3>
                                        <p className="text-lg font-semibold text-gray-900 mt-2">
                                            ₹{relatedProduct.price.toLocaleString()}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetailPage;
