import React from 'react';
import { Diamond, Award, Users, Store } from 'lucide-react';

const TrustBadges = () => {
  const badges = [
    {
      icon: Diamond,
      title: 'Sustainably Sourced Gemstones',
      description: 'We source our gemstones from conflict free environments'
    },
    {
      icon: Award,
      title: 'Jewellery Experts',
      description: 'For more than 100 years we have been providing stunning jewellery'
    },
    {
      icon: Users,
      title: 'Personal Service',
      description: 'We pride ourselves on the outstanding service we provide both online and in-store'
    },
    {
      icon: Store,
      title: 'Hyderabad Store',
      description: 'Find our beautiful jewellery store in Hyderabad, India'
    }
  ];

  return (
    <section className="py-12 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {badges.map((badge, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-4">
                <badge.icon className="h-10 w-10 text-[#c4ad94]" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-2">{badge.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
