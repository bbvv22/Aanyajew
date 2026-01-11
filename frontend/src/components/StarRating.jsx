import React from "react";
import { Star } from "lucide-react";

const StarRating = ({ rating, onRate, readonly = false, size = "md" }) => {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => !readonly && onRate && onRate(star)}
                    disabled={readonly}
                    className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
                >
                    <Star
                        className={`${sizeClasses[size]} ${star <= rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                            }`}
                    />
                </button>
            ))}
        </div>
    );
};

export default StarRating;
