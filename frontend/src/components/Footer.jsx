import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Facebook, Instagram, MapPin, Phone, Mail } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    console.log('Subscribing email:', email);
    setEmail('');
    alert('Thank you for subscribing!');
  };

  return (
    <footer className="bg-[#c4ad94] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="text-5xl font-serif mb-4">AJ</div>
            <p className="text-sm mb-6 text-white/90">
              Operating from our store in Hyderabad, we offer our customers some of
              the finest diamonds and jewellery in India today.
            </p>
            <Button className="bg-white text-[#c4ad94] hover:bg-gray-100">
              Book an Appointment
            </Button>
          </div>

          {/* Category */}
          <div>
            <h3 className="font-semibold mb-4">Category</h3>
            <ul className="space-y-2 text-sm text-white/90">
              <li><a href="#" className="hover:text-white transition-colors">Diamond Jewellery</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Engagement Rings</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gemstone Jewellery</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gold Jewellery</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Silver Jewellery</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Bridal Wear</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-white/90">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/guides" className="hover:text-white transition-colors">Guides</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Contact us</h3>
            <div className="space-y-3 text-sm text-white/90 mb-6">
              <p>9:30am - 6:00pm Mon - Sat<br />Closed Sundays</p>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>+91 9100496169</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>Aanyajewellerysilver@gmail.com</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-1" />
                <span>Hyderabad, India</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">The Annya Newsletter</h3>
              <p className="text-xs text-white/90 mb-3">
                The latest updates from our showrooms and more from the world of Annya Jewellers.
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  required
                />
                <Button type="submit" className="bg-white text-[#c4ad94] hover:bg-gray-100">
                  SUBSCRIBE
                </Button>
              </form>
              <div className="flex gap-3 mt-4">
                <a href="https://facebook.com" className="hover:opacity-80 transition-opacity">
                  <Facebook size={20} />
                </a>
                <a href="https://instagram.com" className="hover:opacity-80 transition-opacity">
                  <Instagram size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/20 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/80">
              Copyright © 2026, Annya Jewellers. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-white/80">
              <a href="#" className="hover:text-white transition-colors">Privacy & Cookies</a>
              <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Delivery & Returns</a>
            </div>
            <div className="flex gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-6 bg-white px-2 rounded" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 bg-white px-2 rounded" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" className="h-6 bg-white px-2 rounded" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
