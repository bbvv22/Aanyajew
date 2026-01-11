import React from "react";
import StarRating from "./StarRating";

const ReviewList = ({ reviews }) => {
    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 italic">
                No reviews yet. Be the first to review this product!
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {reviews.map((review) => (
                <div key={review.id} className="text-center py-6 border-b border-gray-100 last:border-0">
                    {/* Review Quote */}
                    <p className="text-lg italic text-gray-700 mb-6">
                        "{review.comment}"
                    </p>

                    {/* Reviewer Name */}
                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm">
                        {review.userName}
                    </h4>

                    {/* Reviewer Info (if available) */}
                    {review.title && (
                        <p className="text-sm text-gray-500 mt-1">
                            {review.title}
                        </p>
                    )}

                    {review.verified && (
                        <span className="inline-block mt-2 text-xs text-green-600">
                            ✓ Verified Purchase
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ReviewList;
