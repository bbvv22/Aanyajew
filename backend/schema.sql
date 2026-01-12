# Complete PostgreSQL Schema - Annya Jewellers E-commerce

## Products Table - COMPLETE Schema

```sql
CREATE TABLE products (
    -- PRIMARY IDENTIFICATION
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(13) UNIQUE NOT NULL,
    hsn_code VARCHAR(10) DEFAULT '7113',
    
    -- BASIC INFO
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    
    -- IMAGES
    image VARCHAR(1000), -- Primary image URL
    images JSONB DEFAULT '[]', -- Array of all image URLs
    
    -- JEWELRY SPECIFICATIONS
    metal VARCHAR(100), --'18K Yellow Gold', 'Sterling Silver', etc.
    purity VARCHAR(20), -- '18K', '925', 'PT950'
    gross_weight DECIMAL(10,3), -- Total weight in grams
    net_weight DECIMAL(10,3), -- Metal weight
    stone_weight DECIMAL(10,3), -- Stone weight in carats
    stone_type VARCHAR(100), -- 'Lab Grown Diamond', 'Sapphire'
    stone_quality VARCHAR(50), -- 'VS1/E', 'AAA'
    certification VARCHAR(100), -- 'IGI-21596931'
    
    -- PRICING & COSTS (Owner Portal)
    selling_price DECIMAL(12,2) NOT NULL,
    price DECIMAL(12,2), -- Backward compatibility
    currency VARCHAR(3) DEFAULT 'INR',
    cost_gold DECIMAL(12,2),
    cost_stone DECIMAL(12,2),
    cost_making DECIMAL(12,2),
    cost_other DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    profit_margin DECIMAL(12,2),
    margin_percent DECIMAL(5,2),
    
    -- MAKING CHARGE RULES
    making_charge_type VARCHAR(20), -- 'per_gram' or 'fixed'
    making_charge_value DECIMAL(12,2),
    
    -- INVENTORY (Owner Portal)
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 2,
    in_stock BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,
    track_inventory BOOLEAN DEFAULT true,
    is_unique_item BOOLEAN DEFAULT false,
    
    -- VENDOR
    vendor_id VARCHAR(50),
    vendor_name VARCHAR(200),
    
    -- TAX
    tax_rate DECIMAL(5,2) DEFAULT 3.0,
    is_taxable BOOLEAN DEFAULT true,
    
    -- DISCOUNTS
    has_discount BOOLEAN DEFAULT false,
    discount_type VARCHAR(20), -- 'percent' or 'fixed'
    discount_value DECIMAL(12,2),
    discounted_price DECIMAL(12,2),
    allow_coupons BOOLEAN DEFAULT true,
    
    -- TIMESTAMPS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- INDEXES
    CONSTRAINT products_stock_check CHECK (stock_quantity >= 0)
);

-- Indexes for performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_stock ON products(stock_quantity);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
```

---

## All Other Tables

### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin', 'owner'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Addresses
```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(200),
    phone VARCHAR(20),
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
```

### Orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    channel VARCHAR(20), -- 'online' or 'pos'
    location_id VARCHAR(50),
    staff_id VARCHAR(50),
    staff_name VARCHAR(200),
    
    customer_id VARCHAR(50),
    customer_name VARCHAR(200),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    
    status VARCHAR(50),
    payment_status VARCHAR(50),
    fulfillment_status VARCHAR(50),
    
    items JSONB NOT NULL, -- Array of order items
    
    subtotal DECIMAL(12,2),
    discount_total DECIMAL(12,2) DEFAULT 0,
    tax_total DECIMAL(12,2),
    shipping_total DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2),
    
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(12,2) DEFAULT 0,
    
    total_cost DECIMAL(12,2), -- Cost of goods sold
    gross_profit DECIMAL(12,2),
    net_profit DECIMAL(12,2),
    
    payment_method VARCHAR(50),
    
    shipping_address JSONB,
    billing_address JSONB,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_channel ON orders(channel);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

### Reviews
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
```

### Vendors
```sql
CREATE TABLE vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    lead_time_days INTEGER,
    payment_terms VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'INR',
    contact_person VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Coupons
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    scope VARCHAR(50), -- 'general', 'specific'
    applicable_products JSONB DEFAULT '[]',
    type VARCHAR(20), -- 'percent' or 'fixed'
    value DECIMAL(12,2),
    min_order_value DECIMAL(12,2),
    max_discount DECIMAL(12,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_customer_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
```

### Purchase Orders
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id VARCHAR(50) REFERENCES vendors(id),
    items JSONB NOT NULL,
    total_amount DECIMAL(12,2),
    status VARCHAR(50),
    expected_delivery DATE,
    actual_delivery DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Stock Transfers
```sql
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    product_id UUID REFERENCES products(id),
    quantity INTEGER,
    status VARCHAR(50),
    transferred_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Traffic Logs
```sql
CREATE TABLE traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    referrer TEXT,
    device_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_traffic_created ON traffic_logs(created_at DESC);
```

### Appointments
```sql
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    appointment_date TIMESTAMP WITH TIME ZONE,
    service_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Locations (Owner Portal)
```sql
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Activity Logs (Owner Portal - Audit Trail)
```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50), -- 'create', 'update', 'delete'
    entity_type VARCHAR(50), -- 'product', 'order', 'user'
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
```

### Settings (Owner Portal)
```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    category VARCHAR(50), -- 'general', 'payment', 'shipping', 'tax'
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Navigation Items
```sql
CREATE TABLE navigation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(200),
    url VARCHAR(500),
    parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
    order_index INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nav_parent ON navigation_items(parent_id);
CREATE INDEX idx_nav_order ON navigation_items(order_index);
```

---

## Summary

**15 Tables Total:**
1. products ✅ (with ALL cost tracking fields)
2. users
3. addresses
4. orders
5. reviews
6. vendors
7. coupons
8. purchase_orders
9. stock_transfers
10. traffic_logs
11. appointments
12. locations
13. activity_logs
14. settings
15. navigation_items

All fields from MongoDB seed script are captured!
