import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

const staticCategories = [
  { id: 1, name: "Engagement Rings", link: "/products?category=Engagement%20Rings" },
  { id: 2, name: "Wedding Jewellery", link: "/products?category=Wedding%20Rings" },
  { id: 3, name: "Diamond Jewellery", link: "/products?category=Diamond%20Jewellery" }
];

const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryImages = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
        // Fetch a few products to use their images
        const response = await axios.get(`${backendUrl}/api/products`);
        const products = response.data;

        // Map static categories to random product images
        const updatedCategories = staticCategories.map(cat => ({
          ...cat,
          // Pick a random image from the products list, or fallback if empty
          image: products.length > 0
            ? products[Math.floor(Math.random() * products.length)].image
            : "https://images.unsplash.com/photo-1762505464779-17f78cbfa8b4"
        }));

        setCategories(updatedCategories);
      } catch (error) {
        console.error("Error fetching category images:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryImages();
  }, []);

  if (loading) {
    return <div className="py-16 text-center">Loading categories...</div>;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-serif text-center text-gray-800 mb-12">
          Discover Annya Jewellers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group relative overflow-hidden bg-[#f5f1ed] rounded-sm transition-transform hover:scale-105 duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-8 text-center">
                <h3 className="text-2xl font-serif text-gray-800 mb-4">{category.name}</h3>
                <Link to={category.link}>
                  <Button
                    className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-6"
                  >
                    BROWSE
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
