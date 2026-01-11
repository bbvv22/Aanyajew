import React, { useState } from "react";
import { Button } from "./ui/button";
import StarRating from "./StarRating";

const ReviewForm = ({ productId, onSubmit, onCancel }) => {
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            setError("Please select a rating");
            return;
        }

        if (!comment.trim()) {
            setError("Please write a review");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await onSubmit({ rating, title, comment });
            setRating(0);
            setTitle("");
            setComment("");
        } catch (err) {
            setError(err.message || "Failed to submit review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Write a Review</h3>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Rating *
                </label>
                <StarRating rating={rating} onRate={setRating} size="lg" />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94]"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review *
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like or dislike about this product?"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c4ad94] resize-none"
                />
            </div>

            <div className="flex gap-3">
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#c4ad94] hover:bg-[#b39d84] text-white"
                >
                    {loading ? "Submitting..." : "Submit Review"}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ReviewForm;
