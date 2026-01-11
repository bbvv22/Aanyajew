import React, { useState, useRef } from 'react';

const ImageZoom = ({ src, alt, className = "", children }) => {
    const [zoom, setZoom] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!imageRef.current) return;

        const { left, top, width, height } = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;

        setPosition({ x, y });
    };

    const handleMouseEnter = () => setZoom(true);
    const handleMouseLeave = () => {
        setZoom(false);
        setPosition({ x: 50, y: 50 }); // Reset to center
    };

    return (
        <div
            className={`overflow-hidden relative cursor-zoom-in ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            ref={imageRef}
        >
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover transition-transform duration-200 ease-out"
                style={{
                    transformOrigin: `${position.x}% ${position.y}%`,
                    transform: zoom ? 'scale(2)' : 'scale(1)'
                }}
            />
            {children}
        </div>
    );
};

export default ImageZoom;
