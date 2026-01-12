import React from 'react';
import { Button } from './ui/button';

const AboutSection = () => {
  return (
    <section className="py-16 bg-[#f5f1ed]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="mb-8">
          <div className="inline-block text-8xl font-serif text-[#c4ad94] mb-4">AJ</div>
        </div>
        <h2 className="text-3xl font-serif text-gray-800 mb-4">
          Family-Run Fine Jewellers
        </h2>
        <p className="text-gray-600 mb-4 leading-relaxed">
          Creating timeless elegance and supplying fine jewellery.
        </p>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We take pride in curating a collection that showcases some of the most splendid diamonds, gold, and silver jewellery.
        </p>

      </div>
    </section>
  );
};

export default AboutSection;
