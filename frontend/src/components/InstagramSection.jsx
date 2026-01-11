import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Instagram } from 'lucide-react';

const InstagramSection = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchInstagramImages = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
        const response = await axios.get(`${backendUrl}/api/products`);
        const products = response.data;

        // Pick 5 random images
        const randomImages = products
          .sort(() => 0.5 - Math.random())
          .slice(0, 5)
          .map(p => ({ id: p.id, image: p.image }));

        setImages(randomImages);
      } catch (error) {
        console.error("Error fetching instagram images:", error);
      }
    };

    fetchInstagramImages();
  }, []);

  return (
    <section className="py-16 bg-[#f5f1ed]">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-serif text-gray-800 text-center mb-8">
          Follow Us
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {images.map((post) => (
            <div
              key={post.id}
              className="aspect-square relative group cursor-pointer overflow-hidden rounded-sm"
            >
              <img
                src={post.image}
                alt="Instagram post"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <Instagram className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={32} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramSection;
