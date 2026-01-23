import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, Star, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const ReviewsAdmin = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const [formData, setFormData] = useState({
        productId: '',
        userName: '',
        title: '',
        comment: '',
        rating: 5,
        image: ''
    });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [reviewsRes, productsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/admin/reviews`, { headers: getAuthHeader() }),
                axios.get(`${backendUrl}/api/admin/products`, { headers: getAuthHeader() })
            ]);
            setReviews(reviewsRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const response = await axios.post(
                `${backendUrl}/api/admin/upload`,
                formDataUpload,
                {
                    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                }
            );
            setFormData({ ...formData, image: response.data.url });
            success('Image uploaded!');
        } catch (error) {
            showError('Upload failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingReview) {
                const response = await axios.put(
                    `${backendUrl}/api/admin/reviews/${editingReview.id}`,
                    formData,
                    { headers: getAuthHeader() }
                );
                setReviews(reviews.map(r => r.id === editingReview.id ? response.data : r));
                success('Review updated!');
            } else {
                const response = await axios.post(
                    `${backendUrl}/api/admin/reviews`,
                    formData,
                    { headers: getAuthHeader() }
                );
                setReviews([response.data, ...reviews]);
                success('Review created!');
            }
            closeModal();
        } catch (error) {
            showError('Failed to save review');
        }
    };

    const handleDelete = async (reviewId) => {
        try {
            await axios.delete(`${backendUrl}/api/admin/reviews/${reviewId}`, {
                headers: getAuthHeader()
            });
            setReviews(reviews.filter(r => r.id !== reviewId));
            setDeleteModal(null);
            success('Review deleted!');
        } catch (error) {
            showError('Failed to delete review');
        }
    };

    const openEditModal = (review) => {
        setEditingReview(review);
        setFormData({
            productId: review.productId,
            userName: review.userName,
            title: review.title || '',
            comment: review.comment,
            rating: review.rating,
            image: review.image || ''
        });
        setShowModal(true);
    };

    const openNewModal = () => {
        setEditingReview(null);
        setFormData({
            productId: products[0]?.id || '',
            userName: '',
            title: '',
            comment: '',
            rating: 5,
            image: ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingReview(null);
    };

    const getProductName = (productId) => {
        const product = products.find(p => p.id === productId);
        return product?.name || 'Unknown Product';
    };

    const filteredReviews = reviews.filter(r =>
        r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4ad94]"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
                    <p className="text-gray-500 mt-1">{reviews.length} total reviews</p>
                </div>
                <Button
                    onClick={openNewModal}
                    className="bg-[#c4ad94] hover:bg-[#b39d84] text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Review
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Reviews Grid */}
            <div className="grid gap-4">
                {filteredReviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex gap-4">
                            {review.image && (
                                <img
                                    src={review.image}
                                    alt=""
                                    className="w-20 h-20 rounded-lg object-cover"
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <h3 className="font-semibold text-gray-800">{review.userName}</h3>
                                        {review.title && <p className="text-sm text-gray-500">{review.title}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(review)}
                                            className="p-2 text-gray-400 hover:text-[#c4ad94] hover:bg-[#c4ad94]/10 rounded-lg"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteModal(review)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 mt-2 italic">"{review.comment}"</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    Product: {getProductName(review.productId).slice(0, 40)}...
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {editingReview ? 'Edit Review' : 'Add New Review'}
                            </h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                                <select
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    required
                                >
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name.slice(0, 50)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reviewer Name</label>
                                <Input
                                    value={formData.userName}
                                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                                    placeholder="e.g., PRIYA"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Software Engineer, Mumbai"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: num })}
                                            className="p-2"
                                        >
                                            <Star
                                                className={`h-6 w-6 ${num <= formData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                <textarea
                                    value={formData.comment}
                                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                    placeholder="Enter review comment"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Image (optional)</label>
                                <div className="flex gap-4 items-center">
                                    {formData.image ? (
                                        <div className="relative w-20 h-20">
                                            <img src={formData.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#c4ad94]">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <Upload className="h-6 w-6 text-gray-400" />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-[#c4ad94] hover:bg-[#b39d84] text-white">
                                    {editingReview ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Review</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this review by {deleteModal.userName}?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDelete(deleteModal.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsAdmin;
