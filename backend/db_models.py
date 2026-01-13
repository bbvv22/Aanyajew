"""
SQLAlchemy ORM models for PostgreSQL database tables
This is separate from models.py which contains Pydantic models for API validation
"""
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text,
    ForeignKey, DateTime, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import Base
import uuid

# Products table
class ProductDB(Base):
    __tablename__ = "products"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(50), unique=True, nullable=False)
    barcode = Column(String(13), unique=True, nullable=False)
    hsn_code = Column(String(10), default="7113")
    
    # Basic info
    name = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100))
    tags = Column(JSONB, default=[])
    status = Column(String(20), default="active")
    
    # Images
    image = Column(String(1000))
    images = Column(JSONB, default=[])
    
    # Jewelry specifications
    metal = Column(String(100))
    purity = Column(String(20))
    gross_weight = Column(Numeric(10, 3))
    net_weight = Column(Numeric(10, 3))
    stone_weight = Column(Numeric(10, 3))
    stone_type = Column(String(100))
    stone_quality = Column(String(50))
    certification = Column(String(100))
    
    # Pricing & costs
    selling_price = Column(Numeric(12, 2), nullable=False)
    price = Column(Numeric(12, 2))
    currency = Column(String(3), default="INR")
    cost_gold = Column(Numeric(12, 2))
    cost_stone = Column(Numeric(12, 2))
    cost_making = Column(Numeric(12, 2))
    cost_other = Column(Numeric(12, 2))
    total_cost = Column(Numeric(12, 2))
    profit_margin = Column(Numeric(12, 2))
    margin_percent = Column(Numeric(5, 2))
    
    # Making charge rules
    making_charge_type = Column(String(20))
    making_charge_value = Column(Numeric(12, 2))
    
    # Inventory
    stock_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=2)
    in_stock = Column(Boolean)
    track_inventory = Column(Boolean, default=True)
    is_unique_item = Column(Boolean, default=False)
    
    # Reservation System
    reserved_until = Column(DateTime(timezone=True))
    reserved_by = Column(String(200)) # session_id or user_id
    
    # Vendor
    vendor_id = Column(String(50))
    vendor_name = Column(String(200))
    
    # Tax
    tax_rate = Column(Numeric(5, 2), default=3.0)
    is_taxable = Column(Boolean, default=True)
    
    # Discounts
    has_discount = Column(Boolean, default=False)
    discount_type = Column(String(20))
    discount_value = Column(Numeric(12, 2))
    discounted_price = Column(Numeric(12, 2))
    allow_coupons = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('stock_quantity >= 0', name='products_stock_check'),
        Index('idx_products_category', 'category'),
        Index('idx_products_sku', 'sku'),
        Index('idx_products_barcode', 'barcode'),
        Index('idx_products_vendor', 'vendor_id'),
        Index('idx_products_stock', 'stock_quantity'),
    )


# Users table
class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200))
    phone = Column(String(20))
    role = Column(String(20), default="customer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Address fields
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    country = Column(String(100), default="India")
    
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_role', 'role'),
    )


# Orders table
class OrderDB(Base):
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(50), unique=True, nullable=False)
    idempotency_key = Column(String(100), unique=True)
    channel = Column(String(20))
    location_id = Column(String(50))
    staff_id = Column(String(50))
    staff_name = Column(String(200))
    
    customer_id = Column(String(50))
    customer_name = Column(String(200))
    customer_email = Column(String(255))
    customer_phone = Column(String(20))
    
    status = Column(String(50))
    payment_status = Column(String(50))
    fulfillment_status = Column(String(50))
    
    items = Column(JSONB, nullable=False)
    
    subtotal = Column(Numeric(12, 2))
    discount_total = Column(Numeric(12, 2), default=0)
    tax_total = Column(Numeric(12, 2))
    shipping_total = Column(Numeric(12, 2), default=0)
    grand_total = Column(Numeric(12, 2))
    
    coupon_code = Column(String(50))
    coupon_discount = Column(Numeric(12, 2), default=0)
    
    total_cost = Column(Numeric(12, 2))
    gross_profit = Column(Numeric(12, 2))
    net_profit = Column(Numeric(12, 2))
    
    payment_method = Column(String(50))
    
    shipping_address = Column(JSONB)
    billing_address = Column(JSONB)
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_orders_number', 'order_number'),
        Index('idx_orders_idempotency', 'idempotency_key'),
        Index('idx_orders_customer', 'customer_id'),
        Index('idx_orders_channel', 'channel'),
        Index('idx_orders_status', 'status'),
        Index('idx_orders_created', 'created_at'),
    )


# Vendors table
class VendorDB(Base):
    __tablename__ = "vendors"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True)
    lead_time_days = Column(Integer)
    payment_terms = Column(String(50))
    currency = Column(String(3), default="INR")
    contact_person = Column(String(200))
    email = Column(String(255))
    phone = Column(String(20))
    address = Column(Text)
    gst_number = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Coupons table
class CouponDB(Base):
    __tablename__ = "coupons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    scope = Column(String(50))
    applicable_products = Column(JSONB, default=[])
    type = Column(String(20))
    value = Column(Numeric(12, 2))
    min_order_value = Column(Numeric(12, 2))
    max_discount = Column(Numeric(12, 2))
    usage_limit = Column(Integer)
    usage_count = Column(Integer, default=0)
    per_customer_limit = Column(Integer, default=1)
    valid_from = Column(DateTime(timezone=True))
    valid_to = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_coupons_code', 'code'),
    )


# Traffic Logs table
class TrafficLogDB(Base):
    __tablename__ = "traffic_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    path = Column(String(500))
    user_agent = Column(Text)
    ip_address = Column(String(45))
    referrer = Column(Text)
    device_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_traffic_created', 'created_at'),
    )


# Locations table
class LocationDB(Base):
    __tablename__ = "locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    type = Column(String(50)) # store, warehouse
    address = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Transfers table
class TransferDB(Base):
    __tablename__ = "transfers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transfer_number = Column(String(50), unique=True, nullable=False)
    from_location_id = Column(String(100)) # Store UUID as string for flexibility or FK
    to_location_id = Column(String(100))
    status = Column(String(50)) # pending, in_transit, received, cancelled
    items = Column(JSONB, nullable=False) # List of {product_id, quantity, name, sku}
    items_count = Column(Integer, default=0)
    notes = Column(Text)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_transfers_number', 'transfer_number'),
        Index('idx_transfers_status', 'status'),
    )


# Inventory Ledger table
class InventoryLedgerDB(Base):
    __tablename__ = "inventory_ledger"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(String(50), nullable=False)
    sku = Column(String(50))
    product_name = Column(String(255))
    location_id = Column(String(100)) # Optional, for multi-location
    
    event_type = Column(String(50)) # sale, receive, adjust, return, transfer_in, transfer_out
    quantity_change = Column(Integer, nullable=False) # e.g., -5 or +10
    running_balance = Column(Integer) # Stock AFTER this event
    
    reference_id = Column(String(100)) # e.g., ORD-001, TRF-001
    reference_type = Column(String(50)) # order, transfer, po, manual
    notes = Column(Text)
    
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_ledger_product', 'product_id'),
        Index('idx_ledger_created', 'created_at'),
        Index('idx_ledger_sku', 'sku'),
        Index('idx_ledger_event', 'event_type'),
    )


# Purchase Orders table
class PurchaseOrderDB(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(String(50)) # Link to VendorDB.id
    vendor_name = Column(String(200))
    status = Column(String(50)) # draft, ordered, partial, received, closed, cancelled
    total_amount = Column(Numeric(12, 2), default=0)
    items_count = Column(Integer, default=0)
    received_count = Column(Integer, default=0)
    
    items = Column(JSONB, default=[]) # List of line items
    notes = Column(Text)
    
    expected_date = Column(DateTime(timezone=True))
    received_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_po_number', 'po_number'),
        Index('idx_po_status', 'status'),
        Index('idx_po_vendor', 'vendor_id'),
    )
