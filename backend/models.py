"""
Owner Portal Data Models
Comprehensive Pydantic models for the jewelry store owner portal
"""

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============================================
# ENUMS
# ============================================

class ProductStatus(str, Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"

class ProductType(str, Enum):
    PHYSICAL = "physical"
    DIGITAL = "digital"
    SUBSCRIPTION = "subscription"

class LocationType(str, Enum):
    STORE = "store"
    WAREHOUSE = "warehouse"

class InventoryEventType(str, Enum):
    RECEIVE = "receive"
    SALE = "sale"
    RESERVE = "reserve"
    RELEASE = "release"
    RETURN = "return"
    ADJUST = "adjust"
    TRANSFER_OUT = "transfer_out"
    TRANSFER_IN = "transfer_in"
    OPENING = "opening"

class OrderPaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"
    FAILED = "failed"

class OrderFulfillmentStatus(str, Enum):
    UNFULFILLED = "unfulfilled"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"

class OrderChannel(str, Enum):
    ONLINE = "online"
    POS = "pos"

class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    ORDERED = "ordered"
    PARTIAL = "partial"
    RECEIVED = "received"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class MakingRuleType(str, Enum):
    FIXED = "fixed"
    PER_GRAM = "per_gram"
    PERCENT = "percent"

class TransferStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    CANCELLED = "cancelled"


# ============================================
# CATALOG MODELS
# ============================================

class VariantBase(BaseModel):
    """Base variant model for create/update"""
    sku: str
    barcode: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)  # color, size, material, stone
    price: float
    original_price: Optional[float] = None
    currency: str = "INR"
    
    # Cost breakdown for profit calculation
    cost_material: float = 0
    cost_making: float = 0
    cost_other: float = 0
    making_rule_type: Optional[MakingRuleType] = None
    making_rule_value: Optional[float] = None
    
    # Weight fields for jewelry
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    stone_weight: Optional[float] = None
    wastage_percent: Optional[float] = None
    
    # Flags
    is_unique_item: bool = False
    serial_no: Optional[str] = None
    is_taxable: bool = True
    tax_code: Optional[str] = None
    hsn_code: Optional[str] = None
    
    images: List[str] = Field(default_factory=list)

class VariantCreate(VariantBase):
    product_id: str

class Variant(VariantBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductBase(BaseModel):
    """Extended product model with owner portal fields"""
    name: str
    description: str
    status: ProductStatus = ProductStatus.ACTIVE
    product_type: ProductType = ProductType.PHYSICAL
    category: str
    vendor_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metafields: Dict[str, Any] = Field(default_factory=dict)
    
    # Primary image (kept for backward compatibility)
    image: str
    images: List[str] = Field(default_factory=list)
    
    # Basic pricing (default variant)
    price: float
    currency: str = "INR"
    inStock: bool = True

class ProductCreate(ProductBase):
    pass

class ProductExtended(ProductBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    archived_at: Optional[datetime] = None


# ============================================
# LOCATION MODELS
# ============================================

class LocationBase(BaseModel):
    name: str
    type: LocationType = LocationType.STORE
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "India"
    phone: Optional[str] = None
    is_active: bool = True

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================
# INVENTORY MODELS
# ============================================

class InventoryLedgerEntry(BaseModel):
    """Append-only inventory event log entry"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    variant_id: str
    location_id: str
    
    event_type: InventoryEventType
    qty_delta: int  # Positive or negative
    unit_cost: Optional[float] = None  # Required for receive events
    
    # Reference to source (order, PO, transfer, etc.)
    ref_type: Optional[str] = None  # order, purchase_order, transfer, adjustment
    ref_id: Optional[str] = None
    
    source: str = "admin"  # online_store, pos, admin_import, system
    note: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class InventorySnapshot(BaseModel):
    """Computed inventory levels for fast reads"""
    model_config = ConfigDict(extra="ignore")
    
    variant_id: str
    location_id: str
    on_hand: int = 0
    reserved: int = 0
    available: int = 0  # on_hand - reserved
    incoming: int = 0  # from pending POs/transfers
    as_of: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryAdjustment(BaseModel):
    """Request model for inventory adjustment"""
    variant_id: str
    location_id: str
    qty_delta: int
    reason: str
    note: Optional[str] = None

class TransferBase(BaseModel):
    from_location_id: str
    to_location_id: str
    items: List[Dict[str, Any]]  # [{variant_id, qty}]
    note: Optional[str] = None

class TransferCreate(TransferBase):
    pass

class Transfer(TransferBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: TransferStatus = TransferStatus.PENDING
    shipped_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


# ============================================
# VENDOR MODELS
# ============================================

class VendorContact(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

class VendorBase(BaseModel):
    name: str
    code: Optional[str] = None  # Short code like VND-001
    contacts: List[VendorContact] = Field(default_factory=list)
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "India"
    
    payment_terms: Optional[str] = None  # NET30, COD, etc.
    lead_time_days: int = 7
    currency: str = "INR"
    
    notes: Optional[str] = None
    is_active: bool = True

class VendorCreate(VendorBase):
    pass

class Vendor(VendorBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================
# PURCHASE ORDER MODELS
# ============================================

class PurchaseOrderLineBase(BaseModel):
    variant_id: str
    variant_sku: str
    variant_name: str
    qty_ordered: int
    qty_received: int = 0
    unit_cost_material: float = 0
    unit_cost_making: float = 0

class PurchaseOrderLine(PurchaseOrderLineBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class PurchaseOrderBase(BaseModel):
    vendor_id: str
    vendor_name: str
    destination_location_id: str
    
    expected_arrival: Optional[datetime] = None
    currency: str = "INR"
    
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    lines: List[PurchaseOrderLineBase]

class PurchaseOrder(PurchaseOrderBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str = ""  # Will be generated
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    lines: List[PurchaseOrderLine] = Field(default_factory=list)
    
    subtotal: float = 0
    tax_total: float = 0
    grand_total: float = 0
    
    ordered_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


# ============================================
# CUSTOMER MODELS
# ============================================

class CustomerAddress(BaseModel):
    type: str = "shipping"  # shipping, billing
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False

class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    addresses: List[CustomerAddress] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    
    accepts_marketing: bool = False
    is_walk_in: bool = False  # For POS walk-in customers

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Computed metrics
    total_orders: int = 0
    total_spent: float = 0
    last_order_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================
# ENHANCED ORDER MODELS
# ============================================

class OrderLineExtended(BaseModel):
    """Order line with profit tracking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    variant_id: str
    variant_sku: str
    product_name: str
    
    qty: int
    unit_price: float
    unit_discount: float = 0
    unit_tax: float = 0
    
    # Cost captured at time of sale for profit calculation
    unit_cogs_material: float = 0
    unit_cogs_making: float = 0
    unit_cogs_other: float = 0
    
    # Computed
    line_total: float = 0
    line_profit: float = 0
    
    image: Optional[str] = None

class OrderExtended(BaseModel):
    """Enhanced order model with profit tracking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = ""  # Will be generated
    
    channel: OrderChannel = OrderChannel.ONLINE
    location_id: Optional[str] = None  # For POS orders
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    
    status_payment: OrderPaymentStatus = OrderPaymentStatus.PENDING
    status_fulfillment: OrderFulfillmentStatus = OrderFulfillmentStatus.UNFULFILLED
    
    items: List[OrderLineExtended] = Field(default_factory=list)
    
    # Totals
    subtotal: float = 0
    discount_total: float = 0
    tax_total: float = 0
    shipping_total: float = 0
    grand_total: float = 0
    currency: str = "INR"
    
    # Fees
    fees_payment: float = 0  # Payment gateway fees
    fees_platform: float = 0  # Platform fees if any
    
    # Profit metrics
    cogs_total: float = 0
    gross_profit: float = 0
    net_profit: float = 0
    
    refunded_total: float = 0
    
    shipping_address: Dict[str, Any] = Field(default_factory=dict)
    billing_address: Dict[str, Any] = Field(default_factory=dict)
    
    notes_internal: Optional[str] = None
    notes_customer: Optional[str] = None
    
    # Staff info for POS
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


# ============================================
# ANALYTICS / DASHBOARD MODELS
# ============================================

class DashboardStats(BaseModel):
    """Dashboard KPI response model"""
    # Sales
    gross_sales: float = 0
    net_sales: float = 0
    gross_profit: float = 0
    net_profit: float = 0
    
    # Orders
    orders_count: int = 0
    orders_pending: int = 0
    orders_fulfilled: int = 0
    orders_returned: int = 0
    
    # Inventory
    inventory_value: float = 0
    low_stock_count: int = 0
    stockout_count: int = 0
    
    # Comparison
    gross_sales_prev: Optional[float] = None
    net_profit_prev: Optional[float] = None
    orders_count_prev: Optional[int] = None
    
    period: str = "today"  # today, 7d, 30d

class SalesDataPoint(BaseModel):
    date: str
    gross_sales: float
    net_sales: float
    gross_profit: float
    orders: int

class ProductPerformance(BaseModel):
    product_id: str
    product_name: str
    units_sold: int
    revenue: float
    profit: float
    image: Optional[str] = None

class LowStockAlert(BaseModel):
    variant_id: str
    variant_sku: str
    product_name: str
    location_id: str
    location_name: str
    available: int
    min_stock: int
    image: Optional[str] = None


# ============================================
# ACTIVITY LOG
# ============================================

class ActivityLog(BaseModel):
    """Immutable audit log entry"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    entity_type: str  # product, order, inventory, vendor, etc.
    entity_id: str
    
    action: str  # created, updated, deleted, status_changed, etc.
    changes: Dict[str, Any] = Field(default_factory=dict)  # {field: {old, new}}
    
    actor_type: str = "user"  # user, system
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================
# SETTINGS
# ============================================

class StoreSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    # Store Profile
    name: str = "Annya Jewellers"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    
    # Tax & Invoicing
    tax_gstin: Optional[str] = None
    tax_rate: float = 3.0
    
    # Security/System
    two_factor_enabled: bool = False
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

