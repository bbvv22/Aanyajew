import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Filter,
    Download,
    Upload,
    MoreVertical,
    Tag,
    Archive,
    Copy,
    CheckCircle,
    Package,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { useOwner } from '../../context/OwnerContext';
import { useToast } from '../../context/ToastContext';

const ProductsAdmin = () => {
    const navigate = useNavigate();
    const { success, error: showToastError } = useToast();
    const { getAuthHeader, backendUrl } = useOwner();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        description: '',
        actionLabel: 'Continue',
        variant: 'default',
        onConfirm: () => { }
    });
    const [activeTab, setActiveTab] = useState('all');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const itemsPerPage = 15;

    const tabs = [
        { id: 'all', label: 'All Products' },
        { id: 'active', label: 'Active', filter: p => p.status === 'active' },
        { id: 'inactive', label: 'Inactive', filter: p => p.status === 'inactive' },
        { id: 'out_of_stock', label: 'Out of Stock', filter: p => p.stockQuantity === 0 }
    ];

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/products`, {
                headers: getAuthHeader()
            });
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async (productId) => {
        try {
            await axios.delete(`${backendUrl}/api/admin/products/${productId}`, {
                headers: getAuthHeader()
            });
            setProducts(products.filter(p => p.id !== productId));
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const handleDeleteClick = (product) => {
        setConfirmDialog({
            open: true,
            title: 'Delete Product',
            description: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
            actionLabel: 'Delete',
            variant: 'destructive',
            onConfirm: () => confirmDelete(product.id)
        });
    };

    const handleBulkAction = async (action) => {
        if (action === 'delete') {
            setConfirmDialog({
                open: true,
                title: 'Delete Multiple Products',
                description: `Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`,
                actionLabel: 'Delete All',
                variant: 'destructive',
                onConfirm: async () => {
                    try {
                        await axios.post(
                            `${backendUrl}/api/admin/products/bulk-delete`,
                            { productIds: selectedProducts },
                            { headers: getAuthHeader() }
                        );
                        fetchProducts();
                        setSelectedProducts([]);
                        setShowBulkActions(false);
                        success('Products deleted successfully');
                    } catch (error) {
                        console.error('Bulk delete failed:', error);
                        showToastError('Failed to delete products');
                    }
                }
            });
        } else if (action === 'activate') {
            // Update status to active for all selected
            try {
                // In a real app this should be a bulk update endpoint
                await Promise.all(selectedProducts.map(id =>
                    axios.put(
                        `${backendUrl}/api/admin/products/${id}`,
                        { status: 'active' },
                        { headers: getAuthHeader() }
                    )
                ));
                fetchProducts();
                setSelectedProducts([]);
                setShowBulkActions(false);
                success('Products activated successfully');
            } catch (error) {
                console.error('Activate failed:', error);
                showToastError('Failed to activate products');
            }
        } else if (action === 'deactivate') {
            // Update status to inactive for all selected
            try {
                await Promise.all(selectedProducts.map(id =>
                    axios.put(
                        `${backendUrl}/api/admin/products/${id}`,
                        { status: 'inactive' },
                        { headers: getAuthHeader() }
                    )
                ));
                fetchProducts();
                setSelectedProducts([]);
                setShowBulkActions(false);
                success('Products deactivated successfully');
            } catch (error) {
                console.error('Deactivate failed:', error);
                showToastError('Failed to deactivate products');
            }
        }
    };

    // Filter by tab
    const tabFilter = tabs.find(t => t.id === activeTab)?.filter || (() => true);

    // Then filter by search
    const filteredProducts = products
        .filter(tabFilter)
        .filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Count products per tab
    const tabCounts = {
        all: products.length,
        active: products.filter(p => p.status === 'active').length,
        inactive: products.filter(p => p.status === 'inactive').length,
        out_of_stock: products.filter(p => p.stockQuantity === 0).length
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === paginatedProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(paginatedProducts.map(p => p.id));
        }
    };

    const toggleSelectProduct = (productId) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const formatCurrency = (value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '₹0';

        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(numValue);
    };

    // Import handler
    const fileInputRef = useRef(null);
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${backendUrl}/api/admin/products/import`, formData, {
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { inserted, updated, failed, errors } = response.data;
            let message = `Import Result:\n✅ Inserted: ${inserted}\n🔄 Updated: ${updated}`;

            if (failed > 0) {
                message += `\n❌ Failed: ${failed}\n\nErrors:\n${errors.slice(0, 10).join('\n')}`;
                if (errors.length > 10) message += `\n...and ${errors.length - 10} more errors.`;
            }

            success(message);
            fetchProducts();
        } catch (error) {
            console.error('Import failed:', error);
            showToastError(error.response?.data?.detail || 'Failed to import products');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleExportCsv = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/admin/products/export`, {
                headers: getAuthHeader(),
                responseType: 'blob'
            });

            // Create a temporary URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from response header if available, otherwise use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename=(.+)/);
                if (fileNameMatch) filename = fileNameMatch[1];
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

            success(`Products exported successfully`);
        } catch (error) {
            console.error('Export failed:', error);
            showToastError('Failed to export products');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 mt-1">{products.length} total products</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Upload className="h-4 w-4" />
                        Import
                    </button>
                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                    <Button
                        onClick={() => navigate('/admin/products/new')}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSelectedProducts([]); }}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {tabCounts[tab.id] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by name, SKU, or category..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedProducts.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">
                        {selectedProducts.length} product(s) selected
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={() => handleBulkAction('activate')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50"
                        >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Activate
                        </button>
                        <button
                            onClick={() => handleBulkAction('deactivate')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50"
                        >
                            <Archive className="h-4 w-4 text-gray-500" />
                            Deactivate
                        </button>
                        <button
                            onClick={() => handleBulkAction('tag')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50"
                        >
                            <Tag className="h-4 w-4 text-blue-500" />
                            Add Tags
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-sm text-red-600 hover:bg-red-100"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-12 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Inventory</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedProducts.map((product) => (
                            <tr key={product.id} className={`hover:bg-gray-50 ${selectedProducts.includes(product.id) ? 'bg-amber-50/50' : ''}`}>
                                <td className="px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={() => toggleSelectProduct(product.id)}
                                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/48'; }}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{product.id.slice(0, 12)}...</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                        {product.category}
                                    </span>
                                </td>
                                <td className="px-4 py-4 font-medium text-gray-900">
                                    {formatCurrency(product.price)}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`text-sm font-medium ${product.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {product.inStock ? '●' : '○'} {product.inventory || (product.inStock ? 'In Stock' : '0')}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <button
                                        onClick={async () => {
                                            const newStatus = product.status === 'active' ? 'inactive' : 'active';
                                            try {
                                                await axios.put(
                                                    `${backendUrl}/api/admin/products/${product.id}`,
                                                    { status: newStatus },
                                                    { headers: getAuthHeader() }
                                                );
                                                // Optimistic update
                                                setProducts(prev => prev.map(p =>
                                                    p.id === product.id ? { ...p, status: newStatus } : p
                                                ));
                                                success(`Product marked as ${newStatus}`);
                                            } catch (error) {
                                                console.error('Status update failed:', error);
                                                showToastError('Failed to update status');
                                            }
                                        }}
                                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${product.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {product.status === 'active' ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link
                                            to={`/product/${product.id}`}
                                            target="_blank"
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="View on store"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(product)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Empty State */}
                {paginatedProducts.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No products found</p>
                        {activeTab !== 'all' && (
                            <button
                                onClick={() => setActiveTab('all')}
                                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                            >
                                View all products
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
                if (!open) setConfirmDialog(prev => ({ ...prev, open: false }));
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDialog.onConfirm}
                            className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {confirmDialog.actionLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ProductsAdmin;
