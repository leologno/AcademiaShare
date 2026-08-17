import React, { useState } from 'react';
import { Star } from 'lucide-react';

const Rating = ({ initialRating = 0, onRate, readonly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleRatingClick = (rate) => {
    if (!readonly && onRate) {
      onRate(rate);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = hoverRating ? star <= hoverRating : star <= initialRating;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => handleRatingClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={`transition duration-150 focus:outline-none ${
              readonly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'
            }`}
          >
            <Star
              className={`w-5 h-5 ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default Rating;
