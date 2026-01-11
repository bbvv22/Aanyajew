import React from 'react';
import { Button } from './ui/button';

const StoreSection = () => {
  return (
    <section className="py-16 bg-[#f5f1ed]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="text-center md:text-left px-8">
            <p className="text-sm tracking-widest text-gray-500 mb-2 uppercase">DUBLIN JEWELLERS</p>
            <h2 className="text-4xl font-serif text-gray-800 mb-4">
              Visit Us In-Store
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Discover our stunning jewellery in our Grafton Street store. Whether you're picking out 
              an engagement ring, seeking the perfect jewellery gift, or just want something special 
              for yourself, our friendly team are happy to help.
            </p>
            <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8">
              VISIT US
            </Button>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1757361414781-dfa67c106aa6"
              alt="Store sketch"
              className="w-full h-[500px] object-cover rounded-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreSection;
