import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ShoppingBag, User, Menu, X, ChevronDown, Facebook, Instagram, LogOut, Heart, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Header = ({ isHome = true }) => {
  const navigate = useNavigate();
  const { getCartCount } = useCart();
  const { getWishlistCount } = useWishlist();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    // Check for logged in user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  // Products organized by category for featured images
  const [productsByCategory, setProductsByCategory] = useState({});

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
        const response = await axios.get(`${backendUrl} /api/products`);
        const products = response.data;

        // Organize products by category keywords
        const categoryMap = {};
        const categoryKeywords = {
          'ENGAGEMENT RINGS': ['engagement', 'solitaire', 'halo'],
          'DIAMOND JEWELLERY': ['diamond'],
          'WEDDING RINGS': ['wedding', 'band'],
          'GOLD JEWELLERY': ['gold'],
          'SILVER JEWELLERY': ['silver']
        };

        Object.keys(categoryKeywords).forEach(category => {
          categoryMap[category] = products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const cat = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            return categoryKeywords[category].some(keyword =>
              name.includes(keyword) || cat.includes(keyword) || description.includes(keyword)
            );
          });
        });

        setProductsByCategory(categoryMap);
        setFeaturedProducts(products.slice(0, 12)); // Keep fallback
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  const getFeaturedImage = (categoryName, index) => {
    const fallbackImage = "https://res.cloudinary.com/dpwsnody1/image/upload/v1767732251/20251209_173505.jpg";

    // Try to get product from same category
    const categoryProducts = productsByCategory[categoryName] || [];
    if (categoryProducts.length > 0 && categoryProducts[index]) {
      return categoryProducts[index]?.image || fallbackImage;
    }

    // Fallback to general products
    if (featuredProducts.length > 0) {
      return featuredProducts[index % featuredProducts.length]?.image || fallbackImage;
    }
    return fallbackImage;
  };


  const [navItems, setNavItems] = useState([
    {
      name: 'ENGAGEMENT RINGS',
      columns: [
        {
          title: null,
          items: [
            'Solitaire Diamond Rings',
            'Halo Diamond Rings',
            'Three Stone Diamond Rings',
            'Lab Grown Diamond Rings',
            'All Engagement Rings'
          ]
        },
        {
          title: 'DIAMOND CUT',
          items: ['Round', 'Oval', 'Emerald', 'Pear', 'Other']
        }
      ],
      featured: [
        { title: 'Yellow Gold Engagement Rings', link: '#' },
        { title: 'Three Stone Engagement Rings', link: '#' }
      ]
    },
    {
      name: 'DIAMOND JEWELLERY',
      columns: [
        {
          title: 'JEWELLERY TYPE',
          items: [
            'Diamond Eternity Rings',
            'Diamond Dress Rings',
            'Diamond Pendants',
            'Diamond Bracelets',
            'Diamond Bangles',
            'Diamond Earrings',
            'Diamond Necklets',
            'All Diamond Jewellery'
          ]
        },
        {
          title: 'GEMSTONE TYPE',
          items: ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Pearl', 'All Gemstone Jewellery']
        }
      ],
      featured: [
        { title: 'Diamond Pendants', link: '#' },
        { title: 'Diamond Eternity Rings', link: '#' }
      ]
    },
    {
      name: 'WEDDING RINGS',
      columns: [
        {
          title: 'LADIES WEDDING RINGS',
          items: ['Diamond Rings', 'White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings']
        },
        {
          title: 'GENTS WEDDING RINGS',
          items: ['White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings', 'All Wedding Rings']
        }
      ],
      featured: [
        { title: 'Diamond Wedding Rings', link: '#' },
        { title: 'Plain Wedding Bands', link: '#' }
      ]
    },
    {
      name: 'GOLD JEWELLERY',
      columns: [
        {
          title: null,
          items: ['Gold Pendants', 'Gold Bracelets', 'Gold Bangles', 'Gold Earrings', 'Gold Necklets']
        },
        {
          title: null,
          items: ['Gold Rings', 'Gold Chains', 'All Gold Jewellery']
        }
      ],
      featured: [
        { title: 'Gold Pendants', link: '#' },
        { title: 'Gold Earrings', link: '#' }
      ]
    },
    {
      name: 'SILVER JEWELLERY',
      columns: [
        {
          title: null,
          items: ['Silver Rings', 'Silver Pendants', 'Silver Bracelets']
        },
        {
          title: null,
          items: ['Silver Earrings', 'Silver Necklets', 'All Silver Jewellery']
        }
      ],
      featured: [
        { title: 'Silver Pendants', link: '#' },
        { title: 'Silver Earrings', link: '#' }
      ]
    }
  ]);

  // Fetch navigation from backend
  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
        const response = await axios.get(`${backendUrl}/api/navigation`);
        if (response.data && response.data.length > 0) {
          // Ensure each item has featured array for display
          const itemsWithFeatured = response.data.map(item => ({
            ...item,
            featured: item.featured || [
              { title: item.columns?.[0]?.items?.[0] || 'Browse All' },
              { title: item.columns?.[0]?.items?.[1] || 'View Collection' }
            ]
          }));
          setNavItems(itemsWithFeatured);
        }
      } catch (error) {
        console.error('Error fetching navigation:', error);
        // Keep default navItems on error
      }
    };
    fetchNavigation();
  }, []);


  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar - Only show on Home Page */}
      {isHome && (
        <div className="bg-[#c4ad94] text-white text-sm py-2">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="hidden sm:flex gap-6">
              <Link to="/about" className="hover:underline">About Us</Link>
              <Link to="/contact" className="hover:underline">Contact Us</Link>
            </div>
            <div className="flex gap-4 sm:gap-6 items-center text-xs sm:text-sm w-full sm:w-auto justify-between sm:justify-end">
              <span className="hidden md:inline"><strong>Tel:</strong> +91 9100496169</span>
              <span className="hidden lg:inline"><strong>Email:</strong> Aanyajewellerysilver@gmail.com</span>
              <div className="flex gap-3 sm:ml-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main header */}
      <div className={`w-full max-w-[1440px] mx-auto px-4 lg:px-8 ${isHome ? 'py-8' : 'py-4'}`}>
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          {/* Search */}
          <div className="hidden md:flex items-center flex-1 max-w-xs">
            <form onSubmit={handleSearch} className="relative w-full flex">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-none bg-[#fdfbf7] border-[#e5e5e5] focus:ring-0 focus:border-[#c4ad94]"
              />
              <Button
                type="submit"
                className="rounded-none bg-[#b09e88] hover:bg-[#9c8b77] text-white px-4"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden flex-1">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-6 w-6 text-gray-800" />
            </Button>
          </div>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-[300px] h-full bg-white shadow-xl overflow-y-auto transform transition-transform">
                <div className="p-4 flex justify-between items-center border-b">
                  <h2 className="text-lg font-serif">Menu</h2>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4 space-y-6">
                  {/* Mobile Search */}
                  <form onSubmit={(e) => {
                    handleSearch(e);
                    setMobileMenuOpen(false);
                  }} className="flex">
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-r-none"
                    />
                    <Button type="submit" className="rounded-l-none bg-[#c4ad94]">
                      <Search className="h-4 w-4 text-white" />
                    </Button>
                  </form>

                  {/* Mobile Navigation */}
                  <div className="space-y-4">
                    {navItems.map((item, index) => (
                      <div key={index}>
                        <div className="font-medium text-gray-800 mb-2">{item.name}</div>
                        <div className="pl-4 space-y-2 border-l-2 border-gray-100">
                          <Link
                            to={`/products?search=${encodeURIComponent(item.name)}`}
                            className="block text-sm text-gray-600 py-1"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            View All {item.name}
                          </Link>
                          {/* Flattening columns for mobile for simplicity */}
                          {item.columns.flatMap(col => col.items).slice(0, 5).map((subItem, idx) => (
                            <Link
                              key={idx}
                              to={`/products?search=${encodeURIComponent(subItem)}`}
                              className="block text-sm text-gray-500 py-1"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {subItem}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <Link to="/book-appointment" className="block w-full" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-[#fdfbf7] text-[#5c5c5c] border border-[#e5e5e5]">
                        Book Appointment
                      </Button>
                    </Link>
                    {!user ? (
                      <Link to="/login" className="block w-full" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full bg-[#c4ad94] text-white">
                          Log In / Register
                        </Button>
                      </Link>
                    ) : (
                      <div className="space-y-3">
                        <Link to="/profile" className="block w-full" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full justify-start">
                            <User className="h-4 w-4 mr-2" />
                            My Profile
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            setUser(null);
                            setMobileMenuOpen(false);
                            navigate('/');
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Log Out
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Logo */}
          <div className="flex-1 flex justify-center">
            <Link to="/" className="text-center group">
              <h1 className="text-2xl md:text-4xl font-serif text-transparent tracking-[0.15em] transition-colors"
                style={{
                  WebkitTextStroke: '1px #b09e88',
                  fontFamily: 'Playfair Display, serif'
                }}>
                ANNYA
              </h1>
              <div className="flex items-center justify-center gap-2 text-xs text-[#8e8e8e] mt-2 tracking-widest uppercase">
                <span className="w-12 h-px bg-[#d4c4b0]"></span>
                <span className="font-medium">JEWELLERS</span>
                <span className="w-12 h-px bg-[#d4c4b0]"></span>
              </div>

            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <Link to="/book-appointment" className="hidden md:block">
              <Button
                className="flex border-none text-[#5c5c5c] bg-[#fdfbf7] hover:bg-[#f5f0eb] font-normal px-8 py-2 rounded-none tracking-wide text-xs uppercase"
              >
                Book an Appointment
              </Button>
            </Link>
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#c4ad94] transition-colors whitespace-nowrap">
                  <User className="h-5 w-5 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Hi, {user.name?.split(' ')[0]}</span>
                </Link>
                <div className="hidden md:block h-4 w-px bg-gray-300 mx-1"></div>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    navigate('/');
                  }}
                  className="hidden md:flex items-center gap-1 text-gray-700 hover:text-[#c4ad94]"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1 text-gray-700 hover:text-[#c4ad94]">
                <User className="h-5 w-5 md:hidden" />
                <div className="hidden md:flex items-center gap-1">
                  <User className="h-5 w-5" />
                  <span className="text-sm">Log in</span>
                </div>
              </Link>
            )}
            <Link to="/wishlist" className="relative hidden md:block">
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-700 hover:text-[#c4ad94]"
              >
                <Heart className="h-5 w-5" />
              </Button>
              {getWishlistCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative">
              <Button
                size="icon"
                className="bg-[#c4ad94] hover:bg-[#b39d84] text-white"
              >
                <ShoppingBag className="h-5 w-5" />
              </Button>
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </Link>

          </div>
        </div>
      </div>

      {/* Navigation - Only show on Home Page */}
      {isHome && (
        <nav className="border-t border-gray-200 relative">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="hidden md:flex justify-center gap-8 py-4">
              {navItems.map((item, index) => (
                <li
                  key={index}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(index)}
                >
                  <button
                    className={`flex items - center gap - 1 text - sm font - medium transition - colors pb - 4 - mb - 4 ${activeDropdown === index ? 'text-[#c4ad94]' : 'text-gray-700 hover:text-[#c4ad94]'
                      } `}
                  >
                    {item.name}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Full-width dropdown - positioned outside the nav container */}
          {activeDropdown !== null && (
            <div
              className="absolute left-0 right-0 top-full bg-white shadow-xl border-t border-gray-200 z-50"
              onMouseEnter={() => setActiveDropdown(activeDropdown)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="max-w-7xl mx-auto px-8 py-10">
                <div className="flex justify-between gap-16 items-start">
                  {/* Menu columns - takes up left portion */}
                  <div className="flex">
                    {navItems[activeDropdown].columns.map((column, colIndex) => (
                      <div key={colIndex} className="min-w-[180px] px-8 first:pl-0 border-r border-gray-200 last:border-r-0">
                        {column.title && (
                          <h3 className="text-sm font-bold text-gray-900 mb-5 tracking-wider uppercase">
                            {column.title}
                          </h3>
                        )}
                        <ul className="space-y-4">
                          {column.items.map((menuItem, itemIndex) => (
                            <li key={itemIndex}>
                              <Link
                                to={`/ products ? search = ${encodeURIComponent(menuItem)} `}
                                onClick={() => setActiveDropdown(null)}
                                className="text-base text-gray-600 hover:text-[#c4ad94] transition-colors block"
                              >
                                {menuItem}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Featured product images - right side, WIDER LANDSCAPE CARDS */}
                  <div className="flex gap-10">
                    {(() => {
                      // Use features from the nav item directly (populated by backend)
                      const featuredItems = navItems[activeDropdown]?.featured || [];
                      // Ensure we have exactly 2 slots
                      const displayItems = [0, 1].map(index => featuredItems[index] || null);

                      return displayItems.map((item, featIndex) => {
                        // CASE 1: Empty Card (No item)
                        if (!item) {
                          return (
                            <div key={featIndex} className="w-[260px]">
                              <div className="aspect-square bg-gray-50 border border-gray-100 mb-3 flex items-center justify-center">
                                <span className="text-gray-300 text-xs uppercase tracking-widest">Empty Slot</span>
                              </div>
                              <div className="h-4 w-24 bg-gray-100 rounded"></div>
                            </div>
                          );
                        }

                        // CASE 2: Featured Item Card (from Backend)
                        return (
                          <div key={featIndex} className="w-[260px]">
                            <Link
                              to={item.link || '#'}
                              onClick={() => setActiveDropdown(null)}
                              className="group cursor-pointer block"
                            >
                              <div className="aspect-square overflow-hidden mb-3 bg-gray-50 relative">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.title || item.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                      e.target.parentElement.innerText = 'NO IMAGE';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <h4 className="text-sm text-gray-800 mb-2 font-normal truncate">
                                {item.title || item.name}
                              </h4>
                              <span className="text-xs text-[#0891b2] underline hover:text-[#0e7490] uppercase tracking-wider">
                                VIEW PRODUCT
                              </span>
                            </Link>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}


        </nav>
      )}
    </header>
  );
};

export default Header;
