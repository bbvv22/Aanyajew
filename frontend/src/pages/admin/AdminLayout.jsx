import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Warehouse,
    Truck,
    Users,
    Megaphone,
    BarChart3,
    Settings,
    LogOut,
    ChevronRight,
    ChevronDown,
    X,
    Menu as MenuIcon,
    Search,
    Bell,
    MapPin,
    HelpCircle,
    Layers,
    Tag
} from 'lucide-react';
import { useOwner } from '../../context/OwnerContext';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isOwner, loading, logout } = useOwner();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('Main Store');
    const [dateRange, setDateRange] = useState('7d');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLocationMenu, setShowLocationMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [notifications, setNotifications] = useState([]);

    // Custom Date State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 300000); // Poll every 5 mins
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/notifications`, {
                headers: getAuthHeader()
            });
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!loading && !isOwner) {
            navigate('/owner/login');
        }
    }, [isOwner, loading, navigate]);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isOwner) {
        return null;
    }

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
        { path: '/admin/products', icon: Package, label: 'Products' },
        {
            path: '/admin/inventory', icon: Warehouse, label: 'Inventory',
            children: [
                { path: '/admin/inventory', label: 'Overview', exact: true },
                { path: '/admin/inventory/alerts', label: 'Stock Alerts' },
                { path: '/admin/inventory/transfers', label: 'Transfers' },
                { path: '/admin/inventory/ledger', label: 'Ledger' },
            ]
        },
        {
            path: '/admin/vendors', icon: Truck, label: 'Vendors & POs',
            children: [
                { path: '/admin/vendors', label: 'Vendors', exact: true },
                { path: '/admin/purchase-orders', label: 'Purchase Orders' },
            ]
        },
        { path: '/admin/customers', icon: Users, label: 'Customers' },
        { path: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
        { path: '/admin/coupons', icon: Tag, label: 'Coupons' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin/categories', icon: Layers, label: 'Categories' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (item) => item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
    const isChildActive = (child) => child.exact ? location.pathname === child.path : location.pathname.startsWith(child.path);
    const toggleMenu = (path) => setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
    const handleLogout = () => { logout(); navigate('/owner/login'); };

    const getPageTitle = () => {
        const parts = location.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || 'Dashboard';
        return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile Overlay */}
            {sidebarOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-transform duration-300
                ${isMobile ? 'w-72' : sidebarOpen ? 'w-64' : 'w-20'}
                ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            `}>
                {/* Logo */}
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                                <span className="font-serif text-gray-900 font-bold text-lg">A</span>
                            </div>
                            {(sidebarOpen || isMobile) && (
                                <div>
                                    <h1 className="text-lg font-serif text-amber-400">ANNYA</h1>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Owner Portal</p>
                                </div>
                            )}
                        </div>
                        {isMobile && (
                            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 overflow-y-auto h-[calc(100vh-180px)]">
                    <div className="space-y-1 px-3">
                        {navItems.map((item) => (
                            <div key={item.path}>
                                {item.children ? (
                                    <>
                                        <button
                                            onClick={() => toggleMenu(item.path)}
                                            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all ${isActive(item) ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                                {(sidebarOpen || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
                                            </div>
                                            {(sidebarOpen || isMobile) && (
                                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus[item.path] ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                        {(sidebarOpen || isMobile) && expandedMenus[item.path] && (
                                            <div className="mt-1 ml-4 pl-4 border-l border-gray-800 space-y-1">
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.path}
                                                        to={child.path}
                                                        className={`block px-3 py-2 text-sm rounded-lg ${isChildActive(child) ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:text-white hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${isActive(item)
                                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border-l-2 border-amber-400'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-2 border-transparent'
                                            }`}
                                    >
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        {(sidebarOpen || isMobile) && (
                                            <>
                                                <span className="text-sm font-medium">{item.label}</span>
                                                {item.badge && (
                                                    <span className="ml-auto bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-gray-800">
                    {(sidebarOpen || isMobile) && (
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm font-medium">O</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">Owner</p>
                                <p className="text-xs text-gray-500 truncate">owner@annya.com</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        {(sidebarOpen || isMobile) && <span className="text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`transition-all duration-300 ${isMobile ? 'ml-0' : sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Top Bar */}
                <header className="bg-white shadow-sm sticky top-0 z-20">
                    <div className="flex items-center justify-between px-4 lg:px-6 py-3">
                        {/* Left: Menu + Title */}
                        <div className="flex items-center gap-3">
                            {isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    <MenuIcon className="h-6 w-6" />
                                </button>
                            )}
                            {!isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    <MenuIcon className="h-5 w-5" />
                                </button>
                            )}
                            <h1 className="text-lg font-semibold text-gray-900 lg:hidden">{getPageTitle()}</h1>

                            {/* Desktop Breadcrumbs */}
                            <div className="hidden lg:flex items-center text-sm">
                                {location.pathname.split('/').filter(p => p && p !== 'admin').map((part, index, arr) => (
                                    <React.Fragment key={index}>
                                        {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
                                        <Link
                                            to={'/admin/' + arr.slice(0, index + 1).join('/')}
                                            className={`${index === arr.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-amber-600'}`}
                                        >
                                            {part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')}
                                        </Link>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 lg:gap-3">
                            {location.pathname === '/admin' && (
                                <>
                                    {/* Location Filter */}
                                    <div className="relative hidden lg:block">
                                        <button
                                            onClick={() => setShowLocationMenu(!showLocationMenu)}
                                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100"
                                        >
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700">{selectedLocation}</span>
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </button>
                                        {showLocationMenu && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
                                                <button
                                                    onClick={() => { setSelectedLocation('Main Store'); setShowLocationMenu(false); }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selectedLocation === 'Main Store' ? 'text-amber-600 font-medium' : 'text-gray-700'}`}
                                                >
                                                    Main Store
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedLocation('Online'); setShowLocationMenu(false); }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selectedLocation === 'Online' ? 'text-amber-600 font-medium' : 'text-gray-700'}`}
                                                >
                                                    Online
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Date Range */}
                                    <div className="hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-lg relative">
                                        {['today', '7d', '30d'].map((range, index) => (
                                            <button
                                                key={range}
                                                onClick={() => { setDateRange(range); setShowDatePicker(false); }}
                                                className={`px-2 lg:px-3 py-2 text-xs lg:text-sm transition-colors ${index === 0 ? 'rounded-l-lg' : ''} ${dateRange === range ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {range === 'today' ? 'Today' : range}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setDateRange('custom');
                                                setShowDatePicker(!showDatePicker);
                                                // Initialize temp dates with current context dates
                                                setTempStartDate(startDate);
                                                setTempEndDate(endDate);
                                            }}
                                            className={`px-2 lg:px-3 py-2 text-xs lg:text-sm transition-colors rounded-r-lg ${dateRange === 'custom' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Custom
                                        </button>

                                        {showDatePicker && (
                                            <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col gap-3 min-w-[240px]">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={tempStartDate}
                                                        onChange={(e) => setTempStartDate(e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={tempEndDate}
                                                        onChange={(e) => setTempEndDate(e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setStartDate(tempStartDate);
                                                        setEndDate(tempEndDate);
                                                        if (tempStartDate && tempEndDate) {
                                                            setDateRange('custom'); // Ensure custom mode is active
                                                        }
                                                        setShowDatePicker(false);
                                                    }}
                                                    disabled={!tempStartDate || !tempEndDate}
                                                    className="w-full py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Apply Filter
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notifications */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowNotifications(!showNotifications)}
                                            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                        >
                                            <Bell className="h-5 w-5" />
                                            {notifications.length > 0 && (
                                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                            )}
                                        </button>
                                        {showNotifications && (
                                            <div className="absolute right-0 mt-2 w-72 lg:w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                                                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{notifications.length} new</span>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                                                            No new notifications
                                                        </div>
                                                    ) : (
                                                        notifications.map((notif, index) => (
                                                            <div key={index} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                                                                    <span className="text-[10px] text-gray-400">{notif.time}</span>
                                                                </div>
                                                                <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-4 lg:px-8 py-8">
                    <Outlet context={{
                        sidebarOpen,
                        isMobile,
                        selectedLocation,
                        dateRange,
                        startDate,
                        endDate
                    }} />
                </main>
            </main>
        </div>
    );
};

export default AdminLayout;
