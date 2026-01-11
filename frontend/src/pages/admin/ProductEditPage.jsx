import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, X, ArrowLeft, Save, Package, DollarSign, Gem, Scale, Tag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const ProductEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getAuthHeader, backendUrl } = useOwner();
    const { success, error: showError } = useToast();
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    const [formData, setFormData] = useState({
        // Identification
        sku: '',
        barcode: '',
        hsnCode: '7113',

        // Basic Info
        name: '',
        description: '',
        category: 'Gold Jewellery',
        subcategory: '',
        tags: [],
        status: 'active',

        // Images
        image: '',
        images: [],

        // Jewelry Specific
        metal: '18K Yellow Gold',
        purity: '18K',
        grossWeight: '',
        netWeight: '',
        stoneWeight: '',
        stoneType: '',
        stoneQuality: '',
        certification: '',

        // Pricing & Costs
        sellingPrice: '',
        costGold: '',
        costStone: '',
        costMaking: '',
        costOther: '',
        makingChargeType: 'per_gram',
        makingChargeValue: '',

        // Product Discount (NEW)
        hasDiscount: false,
        discountType: 'percent',
        discountValue: '',
        allowCoupons: true,

        // Inventory
        stockQuantity: '',
        lowStockThreshold: '2',
        isUniqueItem: false,

        // Vendor
        vendorId: '',
        vendorName: '',

        // Tax
        taxRate: '3',
        isTaxable: true,
        inStock: true
    });

    const categories = ['Engagement Rings', 'Diamond Jewellery', 'Wedding Rings', 'Gold Jewellery', 'Silver Jewellery'];
    const metals = ['18K Yellow Gold', '18K White Gold', '22K Yellow Gold', 'Platinum', 'Sterling Silver'];
    const stoneTypes = ['Lab Grown Diamond', 'Natural Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Pearl', 'None'];
    const purities = ['18K', '22K', '24K', 'PT950', '925'];

    useEffect(() => {
        if (!isNew) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/products/${id}`);
            const p = response.data;
            setFormData({
                sku: p.sku || '',
                barcode: p.barcode || '',
                hsnCode: p.hsnCode || '7113',
                name: p.name || '',
                description: p.description || '',
                category: p.category || 'Gold Jewellery',
                subcategory: p.subcategory || '',
                tags: p.tags || [],
                status: p.status || 'active',
                image: p.image || '',
                images: p.images || [p.image].filter(Boolean),
                metal: p.metal || '18K Yellow Gold',
                purity: p.purity || '18K',
                grossWeight: p.grossWeight?.toString() || '',
                netWeight: p.netWeight?.toString() || '',
                stoneWeight: p.stoneWeight?.toString() || '',
                stoneType: p.stoneType || '',
                stoneQuality: p.stoneQuality || '',
                certification: p.certification || '',
                sellingPrice: p.sellingPrice?.toString() || p.price?.toString() || '',
                costGold: p.costGold?.toString() || '',
                costStone: p.costStone?.toString() || '',
                costMaking: p.costMaking?.toString() || '',
                costOther: p.costOther?.toString() || '',
                makingChargeType: p.makingChargeType || 'per_gram',
                makingChargeValue: p.makingChargeValue?.toString() || '',
                hasDiscount: p.hasDiscount || false,
                discountType: p.discountType || 'percent',
                discountValue: p.discountValue?.toString() || '',
                allowCoupons: p.allowCoupons !== false,
                stockQuantity: p.stockQuantity?.toString() || '',
                lowStockThreshold: p.lowStockThreshold?.toString() || '2',
                isUniqueItem: p.isUniqueItem || false,
                vendorId: p.vendorId || '',
                vendorName: p.vendorName || '',
                taxRate: p.taxRate?.toString() || '3',
                isTaxable: p.isTaxable !== false,
                inStock: p.inStock !== false
            });
        } catch (error) {
            console.error('Error fetching product:', error);
            showError('Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const response = await axios.post(`${backendUrl}/api/admin/upload`, formDataUpload, {
                headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
            });
            const uploadedUrl = response.data.url;
            setFormData(prev => ({
                ...prev,
                image: prev.image || uploadedUrl,
                images: [...prev.images, uploadedUrl]
            }));
            success('Image uploaded!');
        } catch (error) {
            showError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => {
            const newImages = prev.images.filter((_, i) => i !== index);
            return { ...prev, images: newImages, image: newImages[0] || '' };
        });
    };

    const calculateTotals = () => {
        const costGold = parseFloat(formData.costGold) || 0;
        const costStone = parseFloat(formData.costStone) || 0;
        const costMaking = parseFloat(formData.costMaking) || 0;
        const costOther = parseFloat(formData.costOther) || 0;
        const totalCost = costGold + costStone + costMaking + costOther;
        const sellingPrice = parseFloat(formData.sellingPrice) || 0;
        const profit = sellingPrice - totalCost;
        const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        return { totalCost, profit, marginPercent };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.sellingPrice || !formData.image) {
            showError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        const { totalCost, profit, marginPercent } = calculateTotals();

        try {
            // Calculate discounted price
            const sellingPrice = parseFloat(formData.sellingPrice) || 0;
            let discountedPrice = sellingPrice;
            if (formData.hasDiscount && formData.discountValue) {
                const discountVal = parseFloat(formData.discountValue) || 0;
                if (formData.discountType === 'percent') {
                    discountedPrice = sellingPrice * (1 - discountVal / 100);
                } else {
                    discountedPrice = sellingPrice - discountVal;
                }
            }

            const payload = {
                ...formData,
                price: sellingPrice,
                sellingPrice: sellingPrice,
                costGold: parseFloat(formData.costGold) || 0,
                costStone: parseFloat(formData.costStone) || 0,
                costMaking: parseFloat(formData.costMaking) || 0,
                costOther: parseFloat(formData.costOther) || 0,
                totalCost,
                profitMargin: profit,
                marginPercent: Math.round(marginPercent * 10) / 10,
                grossWeight: parseFloat(formData.grossWeight) || 0,
                netWeight: parseFloat(formData.netWeight) || 0,
                stoneWeight: parseFloat(formData.stoneWeight) || 0,
                stockQuantity: parseInt(formData.stockQuantity) || 0,
                lowStockThreshold: parseInt(formData.lowStockThreshold) || 2,
                taxRate: parseFloat(formData.taxRate) || 3,
                makingChargeValue: parseFloat(formData.makingChargeValue) || 0,
                inStock: parseInt(formData.stockQuantity) > 0,
                // Discount fields
                hasDiscount: formData.hasDiscount,
                discountType: formData.discountType,
                discountValue: parseFloat(formData.discountValue) || 0,
                discountedPrice: Math.round(discountedPrice),
                allowCoupons: formData.allowCoupons
            };

            if (isNew) {
                await axios.post(`${backendUrl}/api/admin/products`, payload, { headers: getAuthHeader() });
                success('Product created!');
            } else {
                await axios.put(`${backendUrl}/api/admin/products/${id}`, payload, { headers: getAuthHeader() });
                success('Product updated!');
            }
            navigate('/admin/products');
        } catch (error) {
            showError('Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const { totalCost, profit, marginPercent } = calculateTotals();

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Package },
        { id: 'jewelry', label: 'Jewelry Details', icon: Gem },
        { id: 'pricing', label: 'Pricing & Costs', icon: DollarSign },
        { id: 'inventory', label: 'Inventory', icon: Scale }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'Add New Product' : 'Edit Product'}</h1>
                    <p className="text-gray-500 mt-1">{isNew ? 'Create a new product listing' : `Editing: ${formData.name}`}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">

                        {/* Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                                <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                                        <Input
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="ANY-ENG-0001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                                        <Input
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            placeholder="8901234567890"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="1.00ct Diamond Solitaire Ring"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        >
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                                        <Input
                                            value={formData.subcategory}
                                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                            placeholder="e.g. Necklaces, Bangles"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                                        <Input
                                            value={formData.hsnCode}
                                            onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Images */}
                                <div className="pt-4 border-t">
                                    <h3 className="font-medium mb-3">Product Images</h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        {formData.images.map((img, index) => (
                                            <div key={index} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${img === formData.image ? 'border-amber-500' : 'border-gray-200'}`}>
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-500 flex flex-col items-center justify-center cursor-pointer">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                                            {uploading ? <div className="animate-spin h-6 w-6 border-2 border-amber-500 rounded-full border-t-transparent" /> : <Upload className="h-6 w-6 text-gray-400" />}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Jewelry Details Tab */}
                        {activeTab === 'jewelry' && (
                            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                                <h2 className="text-lg font-semibold mb-4">Jewelry Specifications</h2>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Metal Type</label>
                                        <select
                                            value={formData.metal}
                                            onChange={(e) => setFormData({ ...formData, metal: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        >
                                            {metals.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
                                        <select
                                            value={formData.purity}
                                            onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        >
                                            {purities.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Weight (g)</label>
                                        <Input type="number" step="0.01" value={formData.grossWeight} onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Net Weight (g)</label>
                                        <Input type="number" step="0.01" value={formData.netWeight} onChange={(e) => setFormData({ ...formData, netWeight: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stone Weight (ct)</label>
                                        <Input type="number" step="0.01" value={formData.stoneWeight} onChange={(e) => setFormData({ ...formData, stoneWeight: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stone Type</label>
                                        <select
                                            value={formData.stoneType}
                                            onChange={(e) => setFormData({ ...formData, stoneType: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">Select...</option>
                                            {stoneTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stone Quality</label>
                                        <Input value={formData.stoneQuality} onChange={(e) => setFormData({ ...formData, stoneQuality: e.target.value })} placeholder="VS1/G" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Certification Number</label>
                                    <Input value={formData.certification} onChange={(e) => setFormData({ ...formData, certification: e.target.value })} placeholder="IGI-12345678" />
                                </div>
                            </div>
                        )}

                        {/* Pricing Tab */}
                        {activeTab === 'pricing' && (
                            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                                <h2 className="text-lg font-semibold mb-4">Pricing & Costs</h2>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) *</label>
                                    <Input type="number" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} placeholder="85000" required />
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-3">Cost Breakdown</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Gold/Metal Cost (₹)</label>
                                            <Input type="number" value={formData.costGold} onChange={(e) => setFormData({ ...formData, costGold: e.target.value })} placeholder="24000" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Stone Cost (₹)</label>
                                            <Input type="number" value={formData.costStone} onChange={(e) => setFormData({ ...formData, costStone: e.target.value })} placeholder="35000" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Making Charges (₹)</label>
                                            <Input type="number" value={formData.costMaking} onChange={(e) => setFormData({ ...formData, costMaking: e.target.value })} placeholder="8000" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Other Costs (₹)</label>
                                            <Input type="number" value={formData.costOther} onChange={(e) => setFormData({ ...formData, costOther: e.target.value })} placeholder="2000" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600">Net Price (Total Cost)</span>
                                        <span className="font-medium">₹{totalCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600">Profit</span>
                                        <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{profit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Margin</span>
                                        <span className={`font-bold ${marginPercent >= 20 ? 'text-green-600' : marginPercent >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{marginPercent.toFixed(1)}%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                        <Input type="number" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })} />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <input type="checkbox" id="taxable" checked={formData.isTaxable} onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })} className="w-4 h-4 text-amber-500 rounded" />
                                        <label htmlFor="taxable" className="ml-2 text-sm text-gray-700">Taxable</label>
                                    </div>
                                </div>

                                {/* Product Discount Section */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium">Product Discount</h3>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.hasDiscount}
                                                onChange={(e) => setFormData({ ...formData, hasDiscount: e.target.checked })}
                                                className="w-4 h-4 text-amber-500 rounded"
                                            />
                                            <span className="text-sm text-gray-700">Enable Discount</span>
                                        </label>
                                    </div>

                                    {formData.hasDiscount && (
                                        <div className="space-y-4 bg-amber-50 p-4 rounded-lg">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                                                    <select
                                                        value={formData.discountType}
                                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        <option value="percent">Percentage (%)</option>
                                                        <option value="fixed">Fixed Amount (₹)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Discount Value {formData.discountType === 'percent' ? '(%)' : '(₹)'}
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        value={formData.discountValue}
                                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                                        placeholder={formData.discountType === 'percent' ? '10' : '1000'}
                                                    />
                                                </div>
                                            </div>

                                            {formData.sellingPrice && formData.discountValue && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-gray-600">Discounted Price:</span>
                                                    <span className="font-bold text-green-600">
                                                        ₹{(formData.discountType === 'percent'
                                                            ? parseFloat(formData.sellingPrice) * (1 - parseFloat(formData.discountValue) / 100)
                                                            : parseFloat(formData.sellingPrice) - parseFloat(formData.discountValue)
                                                        ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </span>
                                                    <span className="text-gray-400 line-through">₹{parseFloat(formData.sellingPrice).toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="allowCoupons"
                                                    checked={formData.allowCoupons}
                                                    onChange={(e) => setFormData({ ...formData, allowCoupons: e.target.checked })}
                                                    className="w-4 h-4 text-amber-500 rounded"
                                                />
                                                <label htmlFor="allowCoupons" className="text-sm text-gray-700">
                                                    Allow coupons on top of this discount
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Inventory Tab */}
                        {activeTab === 'inventory' && (
                            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                                <h2 className="text-lg font-semibold mb-4">Inventory & Stock</h2>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                                        <Input type="number" value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} placeholder="10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert At</label>
                                        <Input type="number" value={formData.lowStockThreshold} onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} placeholder="2" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={formData.isUniqueItem} onChange={(e) => setFormData({ ...formData, isUniqueItem: e.target.checked })} className="w-4 h-4 text-amber-500 rounded" />
                                        <span className="text-sm text-gray-700">Unique Item (one-of-a-kind)</span>
                                    </label>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-3">Vendor Information</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                                        <Input value={formData.vendorName} onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} placeholder="Shree Gold Suppliers" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Preview */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold mb-4">Preview</h2>
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="w-full aspect-square object-cover rounded-lg mb-4" />
                            ) : (
                                <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-gray-400">No image</span>
                                </div>
                            )}
                            <h3 className="font-medium text-gray-800 line-clamp-2">{formData.name || 'Product Name'}</h3>
                            <p className="text-xs text-gray-500 mt-1">SKU: {formData.sku || 'N/A'}</p>
                            <p className="text-lg font-bold text-amber-600 mt-2">₹{formData.sellingPrice ? parseFloat(formData.sellingPrice).toLocaleString() : '0'}</p>
                            {profit > 0 && <p className="text-sm text-green-600">Profit: ₹{profit.toLocaleString()} ({marginPercent.toFixed(1)}%)</p>}
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <Button type="submit" disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 mb-3">
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : (isNew ? 'Create Product' : 'Save Changes')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/admin/products')} className="w-full">Cancel</Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductEditPage;
