import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1763256614634-7feb3ff79ff3',
      subtitle: 'FIND YOUR FOREVER',
      title: 'Diamond Engagement Rings',
      description: 'Beautifully designed, certified diamond rings for the perfect proposal.',
      buttonText: 'DISCOVER',
      buttonLink: '/collections/engagement-rings'
    },
    {
      image: 'https://images.unsplash.com/photo-1628973116165-8b91e31b5984',
      subtitle: 'Celebrating Forever',
      title: 'Eternity Rings',
      description: 'The ultimate symbol of endless love and commitment',
      buttonText: 'BROWSE',
      buttonLink: '/collections/eternity-rings'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="w-full h-full bg-black/20 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-2xl">
                <p className="text-sm tracking-widest mb-2 uppercase">{slide.subtitle}</p>
                <h2 className="text-3xl md:text-6xl font-serif mb-4">{slide.title}</h2>
                <p className="text-lg mb-8">{slide.description}</p>
                <Button
                  className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8 py-6 text-sm tracking-wider"
                >
                  {slide.buttonText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all"
      >
        <ChevronLeft className="h-6 w-6 text-gray-700" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all"
      >
        <ChevronRight className="h-6 w-6 text-gray-700" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
