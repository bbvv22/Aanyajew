import React from 'react';
import { Button } from './ui/button';

const GiftSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <img
              src="https://images.unsplash.com/photo-1761479250428-f84d4522a9c8"
              alt="Elegant jewelry"
              className="w-full h-[500px] object-cover rounded-sm"
            />
          </div>
          <div className="order-1 md:order-2 text-center md:text-left px-8">
            <p className="text-sm tracking-widest text-gray-500 mb-2 uppercase">GIFTS OF ELEGANCE</p>
            <h2 className="text-4xl font-serif text-gray-800 mb-4">
              Find the Perfect Gift
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Whether you're seeking a timeless piece of gemstone jewellery or a decadent diamond ring,
              our collection offers the perfect gift to celebrate life's special moments.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Find inspiration and make every occasion memorable with the unparalleled craftsmanship
              and enduring beauty of Annya's curated selection of fine jewellery.
            </p>
            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8">
              DISCOVER
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiftSection;
