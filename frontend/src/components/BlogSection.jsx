import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

const staticBlogPosts = [
  {
    id: 1,
    title: "What are Diamond 4C's?",
    excerpt: "Diamonds are evaluated based on four essential characteristics known as the 4Cs: Cut, Colour, Clarity, and Carat weight...",
    link: "/guides/diamond-4cs",
    image: "/diamond_4cs_guide.png"
  },
  {
    id: 2,
    title: "Diamond Shapes Guide",
    excerpt: "When choosing an engagement ring, one crucial factor is the diamond or gemstone shape, which significantly affects the overall appearance...",
    link: "/guides/diamond-shapes",
    image: "/diamond_shapes_guide.png"
  },
  {
    id: 3,
    title: "Ring Settings & Styles",
    excerpt: "Ring settings and styles play a crucial role in defining the overall appearance and character of a ring...",
    link: "/guides/ring-settings",
    image: "/ring_settings_guide.png"
  }
];

const BlogSection = () => {
  // No state or effects needed for static content

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm tracking-widest text-gray-500 mb-2 uppercase">
            DIVE DEEPER INTO THE WORLD OF JEWELLERY
          </p>
          <h2 className="text-4xl font-serif text-gray-800">
            The Annya Fine Jewellery Guides
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {staticBlogPosts.map((post) => (
            <div key={post.id} className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden rounded-sm mb-4">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="text-xl font-serif text-gray-800 mb-2 group-hover:text-[#c4ad94] transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
              <a href={post.link} className="text-sm text-[#c4ad94] hover:underline">
                Read more
              </a>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button className="bg-[#c4ad94] hover:bg-[#b39d84] text-white px-8">
            VIEW ALL POSTS
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
