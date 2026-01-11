import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const NavigationAdmin = () => {
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();
    const [saving, setSaving] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(null);

    const [loading, setLoading] = useState(true);

    const defaultNavItems = [
        {
            name: 'ENGAGEMENT RINGS',
            columns: [
                { title: null, items: ['Solitaire Diamond Rings', 'Halo Diamond Rings', 'Three Stone Diamond Rings', 'Lab Grown Diamond Rings', 'All Engagement Rings'] },
                { title: 'DIAMOND CUT', items: ['Round', 'Oval', 'Emerald', 'Pear', 'Other'] }
            ]
        },
        {
            name: 'DIAMOND JEWELLERY',
            columns: [
                { title: 'JEWELLERY TYPE', items: ['Diamond Eternity Rings', 'Diamond Dress Rings', 'Diamond Pendants', 'Diamond Bracelets', 'Diamond Bangles', 'Diamond Earrings', 'Diamond Necklets', 'All Diamond Jewellery'] },
                { title: 'GEMSTONE TYPE', items: ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Pearl', 'All Gemstone Jewellery'] }
            ]
        },
        {
            name: 'WEDDING RINGS',
            columns: [
                { title: 'LADIES WEDDING RINGS', items: ['Diamond Rings', 'White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings'] },
                { title: 'GENTS WEDDING RINGS', items: ['White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings', 'All Wedding Rings'] }
            ]
        },
        {
            name: 'GOLD JEWELLERY',
            columns: [
                { title: null, items: ['Gold Pendants', 'Gold Bracelets', 'Gold Bangles', 'Gold Earrings', 'Gold Necklets'] },
                { title: null, items: ['Gold Rings', 'Gold Chains', 'All Gold Jewellery'] }
            ]
        },
        {
            name: 'SILVER JEWELLERY',
            columns: [
                { title: null, items: ['Silver Rings', 'Silver Pendants', 'Silver Bracelets'] },
                { title: null, items: ['Silver Earrings', 'Silver Necklets', 'All Silver Jewellery'] }
            ]
        }
    ];

    const [navItems, setNavItems] = useState(defaultNavItems);

    // Load navigation from backend on mount
    useEffect(() => {
        const fetchNavigation = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/admin/navigation`, {
                    headers: getAuthHeader()
                });
                if (response.data && response.data.length > 0) {
                    setNavItems(response.data);
                }
            } catch (error) {
                console.error('Error fetching navigation:', error);
                // Keep default items on error
            } finally {
                setLoading(false);
            }
        };
        fetchNavigation();
    }, [backendUrl, getAuthHeader]);

    const handleMenuNameChange = (index, value) => {
        const updated = [...navItems];
        updated[index].name = value;
        setNavItems(updated);
    };

    const handleColumnTitleChange = (menuIndex, colIndex, value) => {
        const updated = [...navItems];
        updated[menuIndex].columns[colIndex].title = value || null;
        setNavItems(updated);
    };

    const handleItemChange = (menuIndex, colIndex, itemIndex, value) => {
        const updated = [...navItems];
        updated[menuIndex].columns[colIndex].items[itemIndex] = value;
        setNavItems(updated);
    };

    const addItem = (menuIndex, colIndex) => {
        const updated = [...navItems];
        updated[menuIndex].columns[colIndex].items.push('New Item');
        setNavItems(updated);
    };

    const removeItem = (menuIndex, colIndex, itemIndex) => {
        const updated = [...navItems];
        updated[menuIndex].columns[colIndex].items.splice(itemIndex, 1);
        setNavItems(updated);
    };

    const addColumn = (menuIndex) => {
        const updated = [...navItems];
        updated[menuIndex].columns.push({ title: null, items: ['New Item'] });
        setNavItems(updated);
    };

    const removeColumn = (menuIndex, colIndex) => {
        const updated = [...navItems];
        updated[menuIndex].columns.splice(colIndex, 1);
        setNavItems(updated);
    };

    const addMenu = () => {
        setNavItems([
            ...navItems,
            {
                name: 'NEW MENU',
                columns: [{ title: null, items: ['Item 1', 'Item 2'] }]
            }
        ]);
    };

    const removeMenu = (index) => {
        setNavItems(navItems.filter((_, i) => i !== index));
    };

    const moveMenu = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === navItems.length - 1)) {
            return;
        }
        const updated = [...navItems];
        const temp = updated[index];
        updated[index] = updated[index + direction];
        updated[index + direction] = temp;
        setNavItems(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(
                `${backendUrl}/api/admin/navigation`,
                navItems,
                { headers: getAuthHeader() }
            );
            success('Navigation saved successfully!');
        } catch (error) {
            showError('Failed to save navigation');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Navigation</h1>
                    <p className="text-gray-500 mt-1">Customize the dropdown menu structure</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#c4ad94] hover:bg-[#b39d84] text-white gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
                {navItems.map((menu, menuIndex) => (
                    <div key={menuIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Menu Header */}
                        <div
                            className="flex items-center gap-4 p-4 bg-gray-50 cursor-pointer"
                            onClick={() => setExpandedMenu(expandedMenu === menuIndex ? null : menuIndex)}
                        >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                            <Input
                                value={menu.name}
                                onChange={(e) => handleMenuNameChange(menuIndex, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="max-w-xs font-semibold"
                            />
                            <div className="flex-1" />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); moveMenu(menuIndex, -1); }}
                                    disabled={menuIndex === 0}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); moveMenu(menuIndex, 1); }}
                                    disabled={menuIndex === navItems.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeMenu(menuIndex); }}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedMenu === menuIndex ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Columns */}
                        {expandedMenu === menuIndex && (
                            <div className="p-4 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {menu.columns.map((column, colIndex) => (
                                        <div key={colIndex} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Input
                                                    value={column.title || ''}
                                                    onChange={(e) => handleColumnTitleChange(menuIndex, colIndex, e.target.value)}
                                                    placeholder="Column Title (optional)"
                                                    className="text-sm font-medium"
                                                />
                                                <button
                                                    onClick={() => removeColumn(menuIndex, colIndex)}
                                                    className="p-1 text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {column.items.map((item, itemIndex) => (
                                                    <div key={itemIndex} className="flex items-center gap-2">
                                                        <Input
                                                            value={item}
                                                            onChange={(e) => handleItemChange(menuIndex, colIndex, itemIndex, e.target.value)}
                                                            className="text-sm"
                                                        />
                                                        <button
                                                            onClick={() => removeItem(menuIndex, colIndex, itemIndex)}
                                                            className="p-1 text-gray-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => addItem(menuIndex, colIndex)}
                                                className="mt-3 text-sm text-[#c4ad94] hover:underline flex items-center gap-1"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add Item
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Column */}
                                    <button
                                        onClick={() => addColumn(menuIndex)}
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-400 hover:border-[#c4ad94] hover:text-[#c4ad94] flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Add Column
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Menu */}
                <button
                    onClick={addMenu}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-[#c4ad94] hover:text-[#c4ad94] flex items-center justify-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Add Menu
                </button>
            </div>
        </div>
    );
};

export default NavigationAdmin;
