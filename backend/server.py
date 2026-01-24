"""
Annya Jewellers E-commerce Backend - Clean PostgreSQL Version
Built from scratch with modern FastAPI and SQLAlchemy
"""
from fastapi import FastAPI, Depends, HTTPException, status, Body, Query, APIRouter, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy.future import select
from sqlalchemy import text, func, update, delete, or_, and_, cast, String
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Union, Dict, Any
import os
import uuid as uuid_lib  # Alias to avoid conflict with Field
from pydantic import BaseModel, Field, EmailStr
import json
import logging
import asyncio
import shutil # For file operations
import hashlib # Add hashlib import
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import BackgroundTasks
from dotenv import load_dotenv

# Explicitly load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Import models
from database import get_db, create_tables
from db_models import UserDB, OrderDB, ProductDB, VendorDB, CouponDB, LocationDB, TransferDB, InventoryLedgerDB, PurchaseOrderDB, ReviewDB, ReturnRequestDB, AbandonedCartDB, ProductReservationDB, AdminSettingsDB

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env vars
from dotenv import load_dotenv
load_dotenv()

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")
    
# Ensure clean asyncpg url
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours
JWT_SECRET = SECRET_KEY  # Alias for compatibility
JWT_EXPIRY_HOURS = 24

app = FastAPI()

# Initialize Database on Startup
import cloudinary
import cloudinary.uploader

# Background Scheduler for Automatic Abandoned Cart Emails
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Global settings are now stored in DB (AdminSettingsDB)

scheduler = AsyncIOScheduler()

async def send_automatic_abandoned_cart_emails():
    """
    Background task that runs every 5 minutes.
    Sends reminder emails to carts abandoned based on configured timing.
    """
    from database import async_session_maker
    from datetime import timedelta
    
    async with async_session_maker() as db:
        try:
            # 1. Fetch configurable timing from DB
            settings_res = await db.execute(
                select(AdminSettingsDB).where(AdminSettingsDB.key == "abandoned_cart_minutes")
            )
            setting_row = settings_res.scalar_one_or_none()
            minutes = int(setting_row.value) if setting_row else 5  # Default 5 (User Preference)
            
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
            
            result = await db.execute(
                select(AbandonedCartDB)
                .where(
                    AbandonedCartDB.status == 'active',
                    AbandonedCartDB.updated_at < cutoff,
                    AbandonedCartDB.reminder_count < 3
                )
                .limit(20)  # Process 20 at a time
            )
            carts = result.scalars().all()
            logger.info(f"Abandoned cart scheduler: {len(carts)} eligible carts found (cutoff {minutes} mins)")
            
            for cart in carts:
                try:
                    # Build email content
                    items_html = ""
                    for item in (cart.items or [])[:5]:  # Max 5 items
                        items_html += f"""
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <img src="{item.get('image', '')}" width="50" height="50" style="border-radius: 4px;" />
                            </td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                {item.get('name', 'Product')}
                            </td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                                ₹{item.get('price', 0):,.0f}
                            </td>
                        </tr>
                        """
                    
                    email_body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
                        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                            <h1 style="color: #c4ad94; text-align: center; margin-bottom: 20px;">✨ You left something beautiful behind!</h1>
                            
                            <p style="color: #333;">Hi {cart.customer_name or 'there'},</p>
                            
                            <p style="color: #666;">We noticed you left some gorgeous pieces in your cart. They're waiting for you!</p>
                            
                            <table style="width: 100%; margin: 20px 0; background: #f9f9f9; border-radius: 8px;">
                                {items_html}
                            </table>
                            
                            <p style="text-align: center; font-size: 20px; color: #333;">
                                <strong>Cart Total: ₹{float(cart.cart_total):,.0f}</strong>
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://annyajewellers.com/cart" 
                                   style="background: linear-gradient(135deg, #c4ad94, #a89070); color: white; 
                                          padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                                          font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(196,173,148,0.4);">
                                    Complete Your Purchase →
                                </a>
                            </div>
                            
                            <p style="color: #888; font-size: 13px; text-align: center;">
                                Questions? Reply to this email or call +91 9100496169
                            </p>
                        </div>
                        
                        <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
                            Annya Jewellers | Hyderabad, India<br/>
                            <a href="https://annyajewellers.com" style="color: #c4ad94;">www.annyajewellers.com</a>
                        </p>
                    </div>
                    """
                    
                    # Send email
                    sent = await send_email_via_vercel(
                        to_email=cart.email,
                        subject="✨ Your cart is waiting for you - Annya Jewellers",
                        body=email_body
                    )
                    if not sent:
                        logger.error(f"Failed to send abandoned cart reminder to {cart.email}")
                        continue
                    
                    # Update reminder tracking
                    cart.reminder_count += 1
                    cart.last_reminder_at = datetime.now(timezone.utc)
                    logger.info(f"Sent abandoned cart reminder to {cart.email}")
                    
                except Exception as e:
                    logger.error(f"Failed to send reminder to {cart.email}: {e}")
            
            await db.commit()
            
        except Exception as e:
            import traceback
            logger.error(f"Abandoned cart background task error: {e}")
            logger.error(traceback.format_exc())

# Initialize Database on Startup
@app.on_event("startup")
async def startup_event():
    await create_tables()
    
    # Start background scheduler for abandoned cart emails
    scheduler.add_job(
        send_automatic_abandoned_cart_emails,
        IntervalTrigger(minutes=5),
        id="abandoned_cart_emails",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Started background scheduler for abandoned cart emails (every 5 minutes)")

# Cloudinary Configuration
cloudinary.config( 
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'), 
  api_key = os.getenv('CLOUDINARY_API_KEY'), 
  api_secret = os.getenv('CLOUDINARY_API_SECRET') 
)

# CORS Setup

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Setup
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
api_router = APIRouter(prefix="/api")

# --- Authentication Helpers ---
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL')

# Owner credentials
OWNER_USERNAME = os.environ.get('OWNER_USERNAME', 'owner.owner')
OWNER_PASSWORD = os.environ.get('OWNER_PASSWORD', 'admin123')

# ============================================
# UTILITY FUNCTIONS
# ====================================================================================

def hash_password(password: str) -> str:
    """hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

def create_token(user_id: str) -> str:
    """Create JWT-like token"""
    import jwt
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_token(token: str) -> Optional[str]:
    """Decode token and return user_id"""
    try:
        import jwt
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('user_id')
    except:
        return None

async def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """
    Deprecated: Direct SMTP is blocked on Render.
    Use send_otp_via_vercel instead.
    """
    pass

async def send_email_via_vercel(to_email: str, subject: str = None, body: str = None, otp: str = None, brand: str = "Annya Jewellers") -> bool:
    """
    Send email via SMTP (Zoho).
    Returns True on success, False on failure.
    """
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_user = os.environ.get("SMTP_USER") # Some envs use this
    smtp_sender = smtp_email or smtp_user
    
    smtp_password = os.environ.get("SMTP_PASSWORD")
    # Correct key is SMTP_HOST (Zoho), fallback to SMTP_SERVER or default
    smtp_server = os.environ.get("SMTP_HOST") or os.environ.get("SMTP_SERVER") or "smtp.gmail.com"
    smtp_port = int(os.environ.get("SMTP_PORT", 465))
    
    if smtp_sender and smtp_password:
        try:
            msg = MIMEMultipart()
            # Use SMTP_FROM_EMAIL if available for display name
            from_header = os.environ.get("SMTP_FROM_EMAIL") or f"{brand} <{smtp_sender}>"
            msg['From'] = from_header
            msg['To'] = to_email
            msg['Subject'] = subject or f"{brand} Notification"
            
            if otp:
                body = f"<p>Your OTP is: <strong>{otp}</strong></p>" + (body or "")
            
            msg.attach(MIMEText(body or "", 'html'))
            
            # Run SMTP in threadpool
            def send_sync():
                # Use SMTP_SSL for 465, standard SMTP for others
                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                        server.login(smtp_sender, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(smtp_sender, smtp_password)
                        server.send_message(msg)

            await asyncio.to_thread(send_sync)
            logger.info(f"Email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMTP email: {e}")
            # Don't re-raise in background tasks usually, but for now we log it
            # If this is critical (like OTP), the caller might need to know, but this function handles fallbacks.
            return False

    logger.error("No email configuration found. Checked SMTP_USER/SMTP_PASSWORD.")
    return False

# ============================================
# AUTHENTICATION
# ============================================

security = HTTPBearer(auto_error=False)

# ============================================
# AUTHENTICATION
# ============================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> UserDB:
    """Get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(select(UserDB).where(UserDB.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_owner(current_user: UserDB = Depends(get_current_user)) -> UserDB:
    """Verify user is owner/admin"""
    if current_user.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============================================
# PYDANTIC MODELS
# ============================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OwnerLogin(BaseModel):
    """Owner login - accepts username as string (not email format)"""
    email: str  # Actually username, but frontend sends as 'email' field
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# ============================================
# ROOT & HEALTH ENDPOINTS
# ============================================

@api_router.get("/")
async def root():
    return {"message": "Annya Jewellers API - PostgreSQL Powered", "version": "2.0"}

@api_router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        # Test database connection
        await db.execute(select(func.count()).select_from(ProductDB))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# ============================================
# PRODUCT ENDPOINTS  
# ============================================

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get all products with optional filtering"""
    query = select(ProductDB).where(ProductDB.status == 'active')
    
    if category:
        query = query.where(ProductDB.category == category)
    
    if subcategory:
        query = query.where(ProductDB.subcategory == subcategory)
    
    if search:
        search_filter = or_(
            ProductDB.name.ilike(f"%{search}%"),
            ProductDB.description.ilike(f"%{search}%"),
            ProductDB.category.ilike(f"%{search}%"),
            ProductDB.sku.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    products = result.scalars().all()
    
    return [{
        "id": str(p.id),
        "sku": p.sku,
        "barcode": p.barcode,
        "name": p.name,
        "description": p.description,
        "category": p.category,
        "subcategory": p.subcategory,
        "price": float(p.selling_price),
        "sellingPrice": float(p.selling_price),
        "currency": p.currency,
        "image": p.image,
        "images": p.images or [],
        "tags": p.tags or [],
        "inStock": p.stock_quantity > 0,
        "stockQuantity": p.stock_quantity,
        "metal": p.metal,
        "stoneType": p.stone_type,
        "certification": p.certification,
        "createdAt": p.created_at.isoformat() if p.created_at else None
    } for p in products]

@api_router.get("/products/summary")
async def get_products_summary(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get lightweight product list for faster UI renders"""
    query = select(
        ProductDB.id,
        ProductDB.name,
        ProductDB.category,
        ProductDB.subcategory,
        ProductDB.selling_price,
        ProductDB.image,
        ProductDB.stock_quantity
    ).where(ProductDB.status == 'active')

    if category:
        query = query.where(ProductDB.category == category)

    if subcategory:
        query = query.where(ProductDB.subcategory == subcategory)

    if search:
        search_filter = or_(
            ProductDB.name.ilike(f"%{search}%"),
            ProductDB.description.ilike(f"%{search}%"),
            ProductDB.category.ilike(f"%{search}%"),
            ProductDB.sku.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "category": row.category,
            "subcategory": row.subcategory,
            "price": float(row.selling_price),
            "image": row.image,
            "inStock": (row.stock_quantity or 0) > 0
        }
        for row in rows
    ]

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """Get single product by ID"""
    result = await db.execute(
        select(ProductDB).where(ProductDB.id == product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "id": str(product.id),
        "sku": product.sku,
        "barcode": product.barcode,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "subcategory": product.subcategory,
        "price": float(product.selling_price),
        "sellingPrice": float(product.selling_price),
        "totalCost": float(product.total_cost) if product.total_cost else None,
        "profitMargin": float(product.profit_margin) if product.profit_margin else None,
        "currency": product.currency,
        "image": product.image,
        "images": product.images or [],
        "tags": product.tags or [],
        "inStock": product.stock_quantity > 0,
        "stockQuantity": product.stock_quantity,
        "metal": product.metal,
        "purity": product.purity,
        "grossWeight": float(product.gross_weight) if product.gross_weight else None,
        "netWeight": float(product.net_weight) if product.net_weight else None,
        "stoneType": product.stone_type,
        "stoneWeight": float(product.stone_weight) if product.stone_weight else None,
        "certification": product.certification,
        "vendorName": product.vendor_name,
        "createdAt": product.created_at.isoformat() if product.created_at else None
    }

@api_router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all unique categories"""
    result = await db.execute(
        select(ProductDB.category).distinct()
    )
    categories = [row[0] for row in result.all() if row[0]]
    return categories

@api_router.get("/categories/tree")
async def get_categories_tree(db: AsyncSession = Depends(get_db)):
    """Get category and subcategory hierarchy based on existing products"""
    # Fetch all distinct pairs of (category, subcategory)
    result = await db.execute(
        select(ProductDB.category, ProductDB.subcategory)
        .where(ProductDB.status == 'active')
        .distinct()
    )
    rows = result.all()
    
    # Organize into tree
    tree = {}
    for cat, sub in rows:
        if not cat: continue
        cat = cat.strip()
        sub = sub.strip() if sub else None
        
        if cat not in tree:
            tree[cat] = set()
        
        if sub:
            tree[cat].add(sub)
            
    # Format as list
    return [
        {
            "name": cat,
            "subcategories": sorted(list(subs))
        }
        for cat, subs in tree.items()
    ]


# ============================================
# REVIEW ENDPOINTS
# ============================================

class ReviewCreate(BaseModel):
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None

@api_router.get("/products/{product_id}/reviews")
async def get_product_reviews(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all approved reviews for a product"""
    result = await db.execute(
        select(ReviewDB)
        .where(ReviewDB.product_id == product_id, ReviewDB.is_approved == True)
        .order_by(ReviewDB.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "userName": r.user_name,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "isVerifiedPurchase": r.is_verified_purchase,
            "createdAt": r.created_at.isoformat() if r.created_at else None
        }
        for r in reviews
    ]

@api_router.get("/products/{product_id}/rating")
async def get_product_rating(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get average rating and total reviews for a product"""
    from sqlalchemy import func as sqlfunc
    result = await db.execute(
        select(
            sqlfunc.avg(ReviewDB.rating).label('avg_rating'),
            sqlfunc.count(ReviewDB.id).label('total')
        )
        .where(ReviewDB.product_id == product_id, ReviewDB.is_approved == True)
    )
    row = result.first()
    avg_rating = float(row.avg_rating) if row.avg_rating else 0
    return {
        "averageRating": round(avg_rating, 1),
        "totalReviews": row.total or 0
    }

@api_router.post("/products/{product_id}/reviews")
async def create_review(
    product_id: str,
    review_data: ReviewCreate,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a review for a product (requires authentication)"""
    if not 1 <= review_data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user has purchased this product
    order_result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.customer_id == current_user.id,
            OrderDB.status.in_(['delivered', 'completed'])
        )
    )
    orders = order_result.scalars().all()
    is_verified = any(
        any(str(item.get('productId')) == product_id for item in (o.items or []))
        for o in orders
    )
    
    # Check if user already reviewed this product
    existing = await db.execute(
        select(ReviewDB)
        .where(ReviewDB.product_id == product_id, ReviewDB.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    review = ReviewDB(
        product_id=product_id,
        user_id=current_user.id,
        user_name=current_user.name,
        rating=review_data.rating,
        title=review_data.title,
        comment=review_data.comment,
        is_verified_purchase=is_verified,
        is_approved=True  # Auto-approve by default
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    
    return {
        "id": str(review.id),
        "userName": review.user_name,
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "isVerifiedPurchase": review.is_verified_purchase,
        "createdAt": review.created_at.isoformat() if review.created_at else None
    }

@api_router.get("/admin/reviews")
async def get_all_reviews(
    status: Optional[str] = None,  # all, pending, approved
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Get all reviews for admin moderation"""
    query = select(ReviewDB).order_by(ReviewDB.created_at.desc())
    if status == "pending":
        query = query.where(ReviewDB.is_approved == False)
    elif status == "approved":
        query = query.where(ReviewDB.is_approved == True)
    
    result = await db.execute(query)
    reviews = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "productId": str(r.product_id),
            "userName": r.user_name,
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "isApproved": r.is_approved,
            "createdAt": r.created_at.isoformat() if r.created_at else None
        }
        for r in reviews
    ]

@api_router.post("/admin/reviews/{review_id}/approve")
async def approve_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Approve a review"""
    result = await db.execute(select(ReviewDB).where(ReviewDB.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    review.is_approved = True
    await db.commit()
    return {"success": True, "message": "Review approved"}

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Delete a review"""
    result = await db.execute(select(ReviewDB).where(ReviewDB.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    await db.delete(review)
    await db.commit()
    return {"success": True, "message": "Review deleted"}


# ============================================
# AUTH ENDPOINTS
# ============================================

# In-memory OTP storage (in production, use Redis or database)
otp_storage = {}

class OTPRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    
class OTPVerify(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    otp: str

@api_router.post("/auth/send-otp")
async def send_otp(data: OTPRequest, background_tasks: BackgroundTasks):
    """Send OTP to email or phone (non-blocking)"""
    import random
    
    # Support both email and phone
    identifier = data.email or data.phone
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store OTP with timestamp (expires in 5 minutes)
    otp_storage[identifier] = {
        "otp": otp,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=5),
        "data": data.dict() # Store full registration data
    }
    
    # Send OTP via email if email provided
    if data.email:
        try:
            # Use BackgroundTasks to send email immediately without blocking response
            background_tasks.add_task(
                send_email_via_vercel,
                to_email=data.email,
                otp=otp
            )
        except Exception as e:
            logger.error(f"Failed to schedule OTP email: {e}")
            # Still return success - OTP is stored, user can check terminal
    
    logger.info(f"OTP for {identifier}: {otp}")
    print(f"DEBUG: OTP for {identifier}: {otp}")
    
    return {"success": True, "message": "OTP sent successfully"}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verify OTP and login/register user"""
    identifier = data.email or data.phone
    otp = data.otp
    
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    # Check if OTP exists and is valid
    stored = otp_storage.get(identifier)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if datetime.now(timezone.utc) > stored["expires"]:
        del otp_storage[identifier]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    if stored["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # OTP is valid, clean up
    del otp_storage[identifier]
    
    # Check if user exists with this email or phone
    if data.email:
        result = await db.execute(
            select(UserDB).where(UserDB.email == data.email)
        )
    else:
        result = await db.execute(
            select(UserDB).where(UserDB.phone == data.phone)
        )
    user = result.scalar_one_or_none()
    
    if not user:
        # Retrieve stored registration data
        reg_data = stored.get("data", {})
        
        # Create new user using stored data
        user = UserDB(
            email=reg_data.get("email") or data.email,
            phone=reg_data.get("phone") or data.phone,
            full_name=reg_data.get("name"), # Use name from stored data
            password_hash=hash_password(reg_data.get("password") or identifier), # Use stored password or identifier
            role='customer'
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Create token
    token = create_token(str(user.id))
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name or "Customer",
            "phone": user.phone,
            "role": user.role
        }
    }

# ============================================
# TRACKING ENDPOINT
# ============================================

@api_router.post("/track")
async def track_event(event: dict = Body(...)):
    """Track analytics events (placeholder for now)"""
    # In production, store this in a database or send to analytics service
    logger.info(f"Track event: {event}")
    return {"success": True}

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register new user"""
    # Check if email exists
    result = await db.execute(
        select(UserDB).where(UserDB.email == user_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    new_user = UserDB(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.name,
        phone=user_data.phone,
        role='customer'
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Create token
    token = create_token(str(new_user.id))
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "name": new_user.full_name,
            "role": new_user.role,
            "address": new_user.address,
            "city": new_user.city,
            "state": new_user.state,
            "pincode": new_user.pincode,
            "country": new_user.country
        }
    }

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """User login"""
    result = await db.execute(
        select(UserDB).where(UserDB.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user.id))
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "role": user.role,
            "phone": user.phone,
            "address": user.address,
            "city": user.city,
            "state": user.state,
            "pincode": user.pincode,
            "country": user.country
        }
    }

@api_router.post("/auth/owner-login", response_model=AuthResponse)
async def owner_login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Owner/Admin login"""
    # Check hardcoded owner credentials
    if credentials.email == OWNER_USERNAME and credentials.password == OWNER_PASSWORD:
        # Create/get owner user
        result = await db.execute(
            select(UserDB).where(UserDB.email == OWNER_USERNAME)
        )
        owner = result.scalar_one_or_none()
        
        if not owner:
            owner = UserDB(
                email=OWNER_USERNAME,
                password_hash=hash_password(OWNER_PASSWORD),
                full_name="Owner",
                role='owner'
            )
            db.add(owner)
            await db.commit()
            await db.refresh(owner)
        
        token = create_token(str(owner.id))
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(owner.id),
                "email": owner.email,
                "name": owner.full_name,
                "role": owner.role
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid owner credentials")

@api_router.get("/auth/me")
async def get_me(current_user: UserDB = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "address": current_user.address,
        "city": current_user.city,
        "state": current_user.state,
        "pincode": current_user.pincode,
        "country": current_user.country
    }

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

@api_router.put("/auth/profile")
async def update_profile(
    user_data: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    # Check if email is being changed and if it's already taken
    if user_data.email and user_data.email != current_user.email:
        result = await db.execute(
            select(UserDB).where(UserDB.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_data.email
    
    if user_data.name:
        current_user.full_name = user_data.name
    
    if user_data.phone:
        current_user.phone = user_data.phone
        
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "address": current_user.address,
        "city": current_user.city,
        "state": current_user.state,
        "pincode": current_user.pincode,
        "country": current_user.country
    }

# ============================================
# OWNER LOGIN (alternate route for frontend compatibility)
# ============================================

@api_router.post("/owner/login")
async def owner_login_alt(credentials: OwnerLogin, db: AsyncSession = Depends(get_db)):
    """Owner/Admin login - alternate route"""
    # Check hardcoded owner credentials
    if credentials.email == OWNER_USERNAME and credentials.password == OWNER_PASSWORD:
        # Create/get owner user
        result = await db.execute(
            select(UserDB).where(UserDB.email == OWNER_USERNAME)
        )
        owner = result.scalar_one_or_none()
        
        if not owner:
            owner = UserDB(
                email=OWNER_USERNAME,
                password_hash=hash_password(OWNER_PASSWORD),
                full_name="Owner",
                role='owner'
            )
            db.add(owner)
            await db.commit()
            await db.refresh(owner)
        
        token = create_token(str(owner.id))
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(owner.id),
                "email": owner.email,
                "name": owner.full_name,
                "role": owner.role
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid owner credentials")

# ============================================
# MOUNT API ROUTER
# ============================================


# Owner verify endpoint
@api_router.get("/owner/verify")
async def verify_owner(current_user: UserDB = Depends(get_current_user)):
    if current_user.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"valid": True, "role": current_user.role}

# ============================================
# ADMIN - CUSTOMERS API
# ============================================

@api_router.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    owner: UserDB = Depends(get_owner)
):
    """Upload a file (image) to Cloudinary"""
    try:
        # Upload using Cloudinary SDK
        # folder parameter organizes images in Cloudinary
        result = cloudinary.uploader.upload(file.file, folder="anya-jewellery")
        
        return {"url": result.get("secure_url")}
        
    except Exception as e:
        print(f"Cloudinary Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# ============================================
# ADMIN - NAVIGATION API
# ============================================

NAVIGATION_FILE = "navigation_config.json"

def get_default_navigation():
    """Return default navigation structure"""
    return [
        {
            "name": "ENGAGEMENT RINGS",
            "columns": [
                {"title": None, "items": ["Solitaire Diamond Rings", "Halo Diamond Rings", "Three Stone Diamond Rings", "Lab Grown Diamond Rings", "All Engagement Rings"]},
                {"title": "DIAMOND CUT", "items": ["Round", "Oval", "Emerald", "Pear", "Other"]}
            ]
        },
        {
            "name": "DIAMOND JEWELLERY",
            "columns": [
                {"title": "JEWELLERY TYPE", "items": ["Diamond Eternity Rings", "Diamond Dress Rings", "Diamond Pendants", "Diamond Bracelets", "Diamond Bangles", "Diamond Earrings", "Diamond Necklets", "All Diamond Jewellery"]},
                {"title": "GEMSTONE TYPE", "items": ["Diamond", "Sapphire", "Emerald", "Ruby", "Pearl", "All Gemstone Jewellery"]}
            ]
        },
        {
            "name": "WEDDING RINGS",
            "columns": [
                {"title": "LADIES WEDDING RINGS", "items": ["Diamond Rings", "White Gold Rings", "Yellow Gold Rings", "Platinum Rings"]},
                {"title": "GENTS WEDDING RINGS", "items": ["White Gold Rings", "Yellow Gold Rings", "Platinum Rings", "All Wedding Rings"]}
            ]
        },
        {
            "name": "GOLD JEWELLERY",
            "columns": [
                {"title": None, "items": ["Gold Pendants", "Gold Bracelets", "Gold Bangles", "Gold Earrings", "Gold Necklets"]},
                {"title": None, "items": ["Gold Rings", "Gold Chains", "All Gold Jewellery"]}
            ]
        },
        {
            "name": "SILVER JEWELLERY",
            "columns": [
                {"title": None, "items": ["Silver Rings", "Silver Pendants", "Silver Bracelets"]},
                {"title": None, "items": ["Silver Earrings", "Silver Necklets", "All Silver Jewellery"]}
            ]
        }
    ]

@api_router.get("/admin/navigation")
async def get_navigation(owner: UserDB = Depends(get_owner)):
    """Get navigation menu structure"""
    try:
        if os.path.exists(NAVIGATION_FILE):
            with open(NAVIGATION_FILE, 'r') as f:
                return json.load(f)
        return get_default_navigation()
    except Exception as e:
        logger.error(f"Error loading navigation: {e}")
        return get_default_navigation()

@api_router.put("/admin/navigation")
async def update_navigation(
    nav_items: list = Body(...),
    owner: UserDB = Depends(get_owner)
):
    """Update navigation menu structure"""
    try:
        with open(NAVIGATION_FILE, 'w') as f:
            json.dump(nav_items, f, indent=2)
        return {"success": True, "message": "Navigation saved successfully"}
    except Exception as e:
        logger.error(f"Error saving navigation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save navigation: {str(e)}")

# ============================================
# ADMIN - CUSTOMERS API
# ============================================

@api_router.get("/admin/customers")
async def get_customers(
    limit: int = Query(100, le=500),
    offset: int = 0,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get customers with aggregated order stats"""
    stats_subq = (
        select(
            OrderDB.customer_id.label("customer_id"),
            func.count().label("order_count"),
            func.coalesce(func.sum(OrderDB.grand_total), 0).label("total_spent")
        )
        .group_by(OrderDB.customer_id)
        .subquery()
    )

    stmt = (
        select(
            UserDB,
            stats_subq.c.order_count,
            stats_subq.c.total_spent
        )
        .outerjoin(stats_subq, stats_subq.c.customer_id == cast(UserDB.id, String))
        .where(UserDB.role == 'customer')
        .order_by(UserDB.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "orders": int(order_count or 0),
            "totalSpent": float(total_spent or 0),
            "createdAt": user.created_at.isoformat() if user.created_at else None
        }
        for user, order_count, total_spent in rows
    ]

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

@api_router.post("/admin/customers")
async def create_customer(
    customer_data: CustomerCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create new customer"""
    import uuid as uuid_lib
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Check existing
    res = await db.execute(select(UserDB).where(UserDB.email == customer_data.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_customer = UserDB(
        id=str(uuid_lib.uuid4()),
        email=customer_data.email,
        full_name=customer_data.name,
        phone=customer_data.phone,
        password_hash=pwd_context.hash("customer123"), # Default password
        role="customer",
        is_active=True
    )
    
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    
    return {"id": new_customer.id, "name": new_customer.full_name, "email": new_customer.email}

# ============================================
# DASHBOARD ANALYTICS (real data)
# ============================================

@api_router.get("/navigation")
async def get_navigation_tree(db: AsyncSession = Depends(get_db)):
    """
    Returns the navigation structure.
    Priority:
    1. Manual Configuration (navigation_config.json) if it exists.
    2. Dynamic DB Structure (as fallback).
    
    Both methods get dynamic Featured Products populated at runtime.
    """
    from sqlalchemy.sql.expression import func
    import json
    import os
    
    # --- Helper: Get Featured Products ---
    async def get_featured_products(category_name, keywords=None):
        # Build filters. If keywords provided (from old config), use them.
        # Otherwise match category name.
        filters = []
        if keywords:
             for k in keywords:
                 filters.append(ProductDB.category.ilike(f"%{k}%"))
                 filters.append(ProductDB.subcategory.ilike(f"%{k}%"))
                 filters.append(ProductDB.name.ilike(f"%{k}%"))
             filter_cond = or_(*filters)
        else:
             filter_cond = (ProductDB.category == category_name)

        stmt = (
            select(ProductDB)
            .where(
                and_(
                    filter_cond,
                    ProductDB.status == 'active',
                    ProductDB.stock_quantity > 0,
                    ProductDB.image.isnot(None),
                    ProductDB.image != ""
                )
            )
            .order_by(func.random())
            .limit(2)
        )
        result = await db.execute(stmt)
        products = result.scalars().all()
        return [
            {"title": p.name, "link": f"/product/{p.id}", "image": p.image}
            for p in products
        ]

    nav_structure = []
    use_dynamic = True

    # 1. Try to load Manual Configuration
    if os.path.exists(NAVIGATION_FILE):
        try:
            with open(NAVIGATION_FILE, 'r') as f:
                saved_nav = json.load(f)
                if saved_nav and isinstance(saved_nav, list) and len(saved_nav) > 0:
                    nav_structure = saved_nav
                    use_dynamic = False
        except Exception as e:
            print(f"Error loading navigation config: {e}")
            # Fallback to dynamic

    # 2. Dynamic Fallback
    if use_dynamic:
        # Fetch all distinct Category/Subcategory pairs
        result = await db.execute(
            select(ProductDB.category, ProductDB.subcategory)
            .where(ProductDB.status == 'active')
            .distinct()
            .order_by(ProductDB.category, ProductDB.subcategory)
        )
        rows = result.all()
        
        # Group by Category
        tree = {}
        for cat, sub in rows:
            if not cat: continue
            cat = cat.strip()
            sub = sub.strip() if sub else None
            if cat not in tree: tree[cat] = set()
            if sub: tree[cat].add(sub)
        
        # Sort Categories
        sorted_categories = sorted(list(tree.keys()))
        priority_order = ["Engagement Rings", "Diamond Jewellery", "Wedding Rings", "Gold Jewellery", "Silver Jewellery"]
        def sort_key(x):
            try: return priority_order.index(x)
            except ValueError: return 999 + (1 if x > "" else 0)
        sorted_categories.sort(key=sort_key)

        for cat in sorted_categories:
            subcats = sorted(list(tree[cat]))
            
            # Split into columns
            columns = []
            chunk_size = 6
            for i in range(0, len(subcats), chunk_size):
                chunk = subcats[i:i + chunk_size]
                columns.append({
                    "title": "Browse" if i == 0 else None,
                    "items": chunk
                })
            
            if not columns: columns.append({"title": None, "items": []})
            
            # Add "All [Category]"
            if columns[0]["items"]: columns[0]["items"].append(f"All {cat}")
            else: columns[0]["items"] = [f"All {cat}"]

            nav_structure.append({
                "name": cat,
                "columns": columns
            })

    # 3. Populate Featured Products for the final structure
    final_nav = []
    for item in nav_structure:
        # Check if item has 'keywords' (from manual config) or just 'name'
        keywords = item.get("keywords")
        # Legacy config might imply keywords map. 
        # But simpler: use name as category lookup if keywords missing.
        
        cat_name = item.get("name", "")
        
        # If manual config has specific keywords, use them.
        # Otherwise, assume the manual category name matches DB category name.
        featured = await get_featured_products(cat_name, keywords)
        
        final_nav.append({
            "name": cat_name,
            "columns": item.get("columns", []),
            "featured": featured
        })
        
    return final_nav


@api_router.get("/admin/dashboard")
async def get_dashboard_stats(
    period: str = "7d",
    channel: str = None,
    start_date: str = None,
    end_date: str = None,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics with percentage changes"""
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc)
    
    if period == 'custom' and start_date and end_date:
        try:
            # Parse ISO formatted dates (assuming YYYY-MM-DD)
            # Add time components to cover the full day
            dt_start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            dt_end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            
            # Calculate duration for previous period comparison
            duration = dt_end - dt_start
            
            current_start = dt_start
            now = dt_end # Use custom end date instead of 'now' for the query limit
            previous_start = current_start - duration
        except ValueError:
             # Fallback if parsing fails
             current_start = now - timedelta(days=7)
             previous_start = current_start - timedelta(days=7)
    else:
        # Standard periods
        if period == 'today':
            import pytz
            ist = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.now(ist)
            today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            current_start = today_start_ist.astimezone(timezone.utc)
            previous_start = current_start - timedelta(days=1)
        else:
            days_map = {"7d": 7, "30d": 30, "90d": 90}
            days = days_map.get(period, 7)
            current_start = now - timedelta(days=days)
            previous_start = current_start - timedelta(days=days)
    
    async def get_period_stats(start_time, end_time):
        # Build base conditions
        conditions = [OrderDB.created_at >= start_time, OrderDB.created_at < end_time]
        if channel:
            if channel == 'online':
                conditions.append(OrderDB.channel == 'online')
            else: # pos
                conditions.append(OrderDB.channel != 'online')
        
        from sqlalchemy import case
        
        stmt = select(
            func.sum(OrderDB.grand_total).label('gross_sales'),
            func.sum(case((OrderDB.payment_status == 'paid', OrderDB.grand_total), else_=0)).label('net_sales'),
            func.sum(case((OrderDB.payment_status == 'paid', OrderDB.gross_profit), else_=0)).label('gross_profit')
        ).where(and_(*conditions))
        
        result = await db.execute(stmt)
        row = result.one()
        
        gross_sales = row.gross_sales or 0
        net_sales = row[1] or 0 # accessing by index/label
        gross_profit = row[2] or 0
        
        # Net profit (simplified)
        net_profit = gross_profit
        
        return {
            "gross_sales": float(gross_sales),
            "net_sales": float(net_sales),
            "gross_profit": float(gross_profit),
            "net_profit": float(net_profit)
        }

    # Get current and previous period stats
    current = await get_period_stats(current_start, now)
    previous = await get_period_stats(previous_start, current_start)
    
    def calculate_change(curr, prev):
        if prev == 0:
            return "+0.0%" if curr == 0 else "+100%"
        change = ((curr - prev) / prev) * 100
        sign = "+" if change >= 0 else ""
        return f"{sign}{change:.1f}%"

    # Other non-comparative stats
    # Combined order counts
    conditions = [OrderDB.created_at >= current_start]
    if channel:
        if channel == 'online':
            conditions.append(OrderDB.channel == 'online')
        else:
            conditions.append(OrderDB.channel != 'online')
            
    stmt = select(
        func.count().label('total_orders'),
        func.count().filter(OrderDB.status == 'pending').label('pending_orders'),
        func.count().filter(OrderDB.status == 'delivered').label('delivered_orders'),
        func.count().filter(OrderDB.status == 'returned').label('returned_orders')
    ).where(and_(*conditions))
    
    counts_res = await db.execute(stmt)
    counts_row = counts_res.one()
    
    order_count = counts_row[0] or 0
    pending_count = counts_row[1] or 0
    delivered_count = counts_row[2] or 0
    returned_count = counts_row[3] or 0
    
    # Inventory value
    inventory_value_result = await db.execute(
        select(func.sum(ProductDB.selling_price * ProductDB.stock_quantity))
    )
    inventory_value = inventory_value_result.scalar() or 0
    
    # Low stock count
    low_stock_result = await db.execute(
        select(func.count()).select_from(ProductDB)
        .where(ProductDB.stock_quantity <= ProductDB.low_stock_threshold)
    )
    low_stock_count = low_stock_result.scalar() or 0
    
    # Stockout count (0 quantity)
    stockout_result = await db.execute(
        select(func.count()).select_from(ProductDB)
        .where(ProductDB.stock_quantity == 0)
    )
    stockout_count = stockout_result.scalar() or 0
    
    return {
        "gross_sales": current["gross_sales"],
        "gross_sales_change": calculate_change(current["gross_sales"], previous["gross_sales"]),
        
        "net_sales": current["net_sales"],
        "net_sales_change": calculate_change(current["net_sales"], previous["net_sales"]),
        
        "gross_profit": current["gross_profit"],
        "gross_profit_change": calculate_change(current["gross_profit"], previous["gross_profit"]),
        
        "net_profit": current["net_profit"],
        "net_profit_change": calculate_change(current["net_profit"], previous["net_profit"]),
        
        "orders_count": order_count,
        "orders_pending": pending_count,
        "orders_delivered": delivered_count,
        "orders_returned": returned_count,
        
        "inventory_value": float(inventory_value),
        "low_stock_count": low_stock_count,
        "stockout_count": stockout_count
    }


@api_router.get("/admin/notifications")
async def get_notifications(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get admin notifications (Low Stock, New Orders, etc.)"""
    notifications = []
    
    # 1. Low Stock Products
    low_stock_res = await db.execute(
        select(func.count()).select_from(ProductDB)
        .where(ProductDB.stock_quantity <= ProductDB.low_stock_threshold)
    )
    low_stock_count = low_stock_res.scalar() or 0
    
    if low_stock_count > 0:
        notifications.append({
            "id": "low_stock",
            "type": "warning",
            "title": "Low Stock Alert",
            "message": f"{low_stock_count} items are low on stock",
            "time": "Just now",
            "read": False
        })
        
    # 2. Recent Orders (Last 24 hours)
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    
    recent_orders_res = await db.execute(
        select(func.count()).select_from(OrderDB)
        .where(OrderDB.created_at >= last_24h)
    )
    recent_orders_count = recent_orders_res.scalar() or 0
    
    if recent_orders_count > 0:
        notifications.append({
            "id": "new_orders",
            "type": "info",
            "title": "New Orders",
            "message": f"{recent_orders_count} new orders in last 24h",
            "time": "Recent",
            "read": False
        })
        
    # 3. Pending Orders (Total)
    pending_orders_res = await db.execute(
        select(func.count()).select_from(OrderDB)
        .where(OrderDB.status == 'pending')
    )
    pending_orders_count = pending_orders_res.scalar() or 0
    
    if pending_orders_count > 0:
        notifications.append({
            "id": "pending_orders",
            "type": "info",
            "title": "Pending Processing",
            "message": f"{pending_orders_count} orders are pending",
            "time": "Current",
            "read": False
        })

    return notifications
    

@api_router.get("/admin/analytics/sales")
async def get_sales_analytics(
    period: str = "7d",
    days: int = 7,  # Kept for backward compatibility
    channel: str = None,
    start_date: str = None,
    end_date: str = None,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get sales trend data"""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    
    # Determine start_date based on period/custom
    if period == 'custom' and start_date and end_date:
        try:
            dt_start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            # For charts, we just need the start date, but maybe we want to filter up to end_date too?
            # The current chart logic groups by day > start_date.
            query_start = dt_start
            # If we want to strictly filter upper bound, we'd need to add where(created_at <= end_date)
            # For now let's just set the lower bound correctly
        except ValueError:
             query_start = now - timedelta(days=days)
    elif period == 'today':
            import pytz
            ist = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.now(ist)
            today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            query_start = today_start_ist.astimezone(timezone.utc)
    else:
        # standard days (7d, 30d)
        # If period is passed, map it, otherwise fallback to days param
        days_map = {"7d": 7, "30d": 30, "90d": 90}
        d = days_map.get(period, days)
        query_start = now - timedelta(days=d)

    # Build query
    from sqlalchemy import case, Date
    stmt = select(
        func.cast(OrderDB.created_at, Date).label('date'),
        func.sum(case((OrderDB.payment_status == 'paid', OrderDB.grand_total), else_=0)).label('sales'),
        func.sum(case((OrderDB.payment_status == 'paid', OrderDB.gross_profit), else_=0)).label('profit')
    ).where(OrderDB.created_at >= query_start)
    
    if period == 'custom' and end_date:
        try:
             dt_end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
             stmt = stmt.where(OrderDB.created_at <= dt_end)
        except: pass
    
    if channel:
        if channel == 'online':
            stmt = stmt.where(OrderDB.channel == 'online')
        else: # pos / main store
            stmt = stmt.where(OrderDB.channel != 'online')

    # Get daily sales
    # Group by the date directly
    result = await db.execute(
        stmt.group_by(func.cast(OrderDB.created_at, Date))
        .order_by(func.cast(OrderDB.created_at, Date))
    )
    
    data = [
        {
            "date": row.date.isoformat() if row.date else None,
            "sales": float(row.sales or 0),
            "profit": float(row.profit or 0)
        }
        for row in result.all()
    ]
    
    return data

    return data

@api_router.get("/admin/analytics/sales-by-channel")
async def get_sales_by_channel(
    days: int = 7,  
    start_date: str = None,
    end_date: str = None,
    channel: str = None, # ignored but kept for compatibility
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get sales breakdown by channel"""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import case, func
    
    current_start = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Custom dates
    if start_date:
        try:
            current_start = datetime.strptime(start_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except: pass
            
    stmt = select(
        OrderDB.channel,
        func.count(OrderDB.id).label('orders'),
        func.sum(case((OrderDB.payment_status == 'paid', OrderDB.grand_total), else_=0)).label('sales'),
        func.sum(case((OrderDB.payment_status == 'paid', OrderDB.gross_profit), else_=0)).label('profit')
    ).where(OrderDB.created_at >= current_start)
    
    result = await db.execute(stmt.group_by(OrderDB.channel))
    rows = result.all()
    
    # Process results
    data = []
    channel_map = {
        'online': 'Online Store',
        'pos': 'In-Store (POS)',
        'wholesale': 'Wholesale'
    }
    
    for row in rows:
        channel_code = row.channel or 'unknown'
        data.append({
            "channel": channel_code,
            "label": channel_map.get(channel_code, channel_code.title()),
            "orders": row.orders,
            "sales": float(row.sales or 0),
            "profit": float(row.profit or 0)
        })
        
    return data

@api_router.get("/admin/analytics/top-products")
async def get_top_products(
    days: int = 7,
    channel: str = None,
    start_date: str = None,
    end_date: str = None,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get top selling products"""
    from datetime import datetime, timedelta, timezone
    
    # Date logic to match get_dashboard_stats
    current_start = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Custom range override
    if start_date and end_date:
        try:
            current_start = datetime.strptime(start_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            # end_date is usually inclusive of the day, so we might want to go to end of that day
            # relying on frontend or just taking date.
        except Exception:
            pass # fallback to days

    stmt = select(OrderDB).where(OrderDB.created_at >= current_start)
    
    if channel:
        if channel == 'online':
            stmt = stmt.where(OrderDB.channel == 'online')
        else: # pos / main store
            stmt = stmt.where(OrderDB.channel != 'online')

    # Query orders and extract product info from items JSONB
    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    # Aggregate product sales
    product_sales = {}
    
    # Need to fetch costs for accurate profit calculation
    # Only fetch products that have been sold to avoid fetching entire DB
    # Optimized: Fetch standard cost for all products first (caching strategy)
    # OR: Just trust product snapshots in items if we added cost there.
    # Checking `place_order`: we only added id, name, quantity, price, image, category. 
    # We DID NOT add cost to the item snapshot.
    # So we must fetch current product cost from DB.
    
    # 1. Collect all product IDs first
    product_ids = set()
    for order in orders:
        if order.items:
            for item in order.items:
                pid = item.get('id') or item.get('productId')
                if pid:
                    product_ids.add(pid)
    
    # 2. Fetch costs
    product_costs = {}
    if product_ids:
        # Convert IDs to UUIDs if needed, assuming they are stored as strings in items JSON
        try:
             import uuid as uuid_lib
             ids_as_uuid = [uuid_lib.UUID(pid) for pid in product_ids]
             prod_res = await db.execute(select(ProductDB).where(ProductDB.id.in_(ids_as_uuid)))
             products = prod_res.scalars().all()
             product_costs = {str(p.id): float(p.total_cost or 0) for p in products}
        except Exception as e:
             logging.error(f"Error fetching product costs: {e}")
    
    for order in orders:
        if order.items:
            for item in order.items:
                product_id = item.get('id') or item.get('productId')
                name = item.get('name', 'Unknown')
                
                if name:
                    if name not in product_sales:
                        product_sales[name] = {
                            "name": name,
                            "quantity": 0,
                            "revenue": 0,
                            "profit": 0,
                            # Keep one ID for reference, though it might be mixed
                            "id": product_id 
                        }
                    quantity = item.get('quantity', 1)
                    price = item.get('price', 0)
                    cost = product_costs.get(product_id, 0)
                    
                    revenue = quantity * price
                    profit = revenue - (cost * quantity)
                    
                    product_sales[name]["quantity"] += quantity
                    product_sales[name]["revenue"] += revenue
                    product_sales[name]["profit"] += profit
    
    # Sort by profit (since the UI title is "Top Products by Profit")
    top_products = sorted(
        [{"id": v["id"], **v} for k, v in product_sales.items()],
        key=lambda x: x["profit"],
        reverse=True
    )[:10]
    
    return top_products

@api_router.get("/admin/analytics/low-stock")
async def get_low_stock_items(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get low stock items"""
    result = await db.execute(
        select(ProductDB)
        .where(ProductDB.stock_quantity <= ProductDB.low_stock_threshold)
        .order_by(ProductDB.stock_quantity.asc())
        .limit(20)
    )
    products = result.scalars().all()
    
    return [{
        "id": str(p.id),
        "sku": p.sku,
        "product_name": p.name,
        "available": p.stock_quantity,
        "lowStockThreshold": p.low_stock_threshold,
        "category": p.category
    } for p in products]

@api_router.get("/admin/analytics/traffic")
async def get_traffic_analytics(
    days: int = 30,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get traffic analytics over time (simulated data for now)"""
    import random
    from datetime import datetime, timedelta
    
    traffic_data = []
    today = datetime.now()
    
    for i in range(days, 0, -1):
        date = today - timedelta(days=i)
        # Generate realistic-looking traffic data with some variance
        base_visitors = random.randint(50, 200)
        traffic_data.append({
            "date": date.strftime("%b %d"),
            "visitors": base_visitors,
            "pageviews": base_visitors * random.randint(2, 5)
        })
    
    return traffic_data

@api_router.get("/admin/analytics/pages")
async def get_top_pages(
    limit: int = 5,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get top visited pages with analytics"""
    import random
    
    pages = [
        {"page": "/", "views": random.randint(500, 2000), "bounce": random.randint(20, 50)},
        {"page": "/products", "views": random.randint(300, 1500), "bounce": random.randint(25, 45)},
        {"page": "/collections/engagement-rings", "views": random.randint(200, 800), "bounce": random.randint(30, 55)},
        {"page": "/collections/gold-jewellery", "views": random.randint(150, 600), "bounce": random.randint(28, 50)},
        {"page": "/about", "views": random.randint(100, 400), "bounce": random.randint(35, 60)},
        {"page": "/contact", "views": random.randint(80, 300), "bounce": random.randint(40, 65)},
        {"page": "/cart", "views": random.randint(150, 500), "bounce": random.randint(15, 35)}
    ]
    
    # Sort by views and return top N
    pages.sort(key=lambda x: x["views"], reverse=True)
    return pages[:limit]

@api_router.get("/admin/analytics/devices")
async def get_device_analytics(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get device breakdown analytics"""
    import random
    
    total = random.randint(2000, 5000)
    mobile_pct = random.uniform(0.45, 0.65)
    desktop_pct = random.uniform(0.25, 0.40)
    tablet_pct = 1 - mobile_pct - desktop_pct
    
    return [
        {"device": "Mobile", "sessions": int(total * mobile_pct)},
        {"device": "Desktop", "sessions": int(total * desktop_pct)},
        {"device": "Tablet", "sessions": int(total * tablet_pct)}
    ]

@api_router.get("/admin/analytics/sources")
async def get_traffic_sources(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get traffic source breakdown"""
    import random
    
    # Generate percentages that sum to ~1
    direct = random.uniform(0.25, 0.40)
    organic = random.uniform(0.20, 0.35)
    social = random.uniform(0.10, 0.25)
    referral = random.uniform(0.05, 0.15)
    paid = 1 - direct - organic - social - referral
    
    return [
        {"source": "Direct", "percent": round(direct, 3)},
        {"source": "Organic Search", "percent": round(organic, 3)},
        {"source": "Social Media", "percent": round(social, 3)},
        {"source": "Referral", "percent": round(referral, 3)},
        {"source": "Paid Ads", "percent": round(max(0, paid), 3)}
    ]

# ============================================
# VENDORS
# ============================================

class VendorCreate(BaseModel):
    name: str
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = 0

@api_router.post("/admin/products/import")
async def import_products(
    file: UploadFile = File(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Import products from CSV file using UPSERT pattern"""
    import csv
    import codecs
    import uuid as uuid_lib
    import io
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    
    print(f"DEBUG: Starting import for file: {file.filename}")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")
        
    try:
        # Read file content
        content = await file.read()
        print(f"DEBUG: Read {len(content)} bytes")
        
        # Decode using utf-8-sig to handle BOM if present
        decoded_content = content.decode('utf-8-sig')
        
        # Use StringIO to handle universal newlines
        csv_file = io.StringIO(decoded_content)
        csv_reader = csv.DictReader(csv_file)
        
        # Log headers
        print(f"DEBUG: CSV Headers detected: {csv_reader.fieldnames}")
        
        values_list = []
        rows_processed = 0
        skipped_count = 0
        
        # Helper to parse float safely
        def parse_float(val, default=0.0):
            if not val: return default
            try:
                return float(str(val).replace(',', '').strip())
            except:
                return default
        
        # Helper to parse int safely
        def parse_int(val, default=0):
            if not val: return default
            try:
                return int(float(str(val).replace(',', '').strip()))
            except:
                return default
        
        for i, row in enumerate(csv_reader):
            rows_processed += 1
            
            # Skip empty rows
            if not any(v for v in row.values() if v is not None and str(v).strip()):
                skipped_count += 1
                continue
                
            # Basic validation
            name = row.get('name')
            price = row.get('sellingPrice')
            
            if not name or not price:
                print(f"DEBUG: Skipping invalid row {i} - Name: {name}, Price: {price}")
                skipped_count += 1
                continue
            
            # Calculations
            selling_price = parse_float(row.get('sellingPrice'))
            cost_gold = parse_float(row.get('costGold'))
            cost_stone = parse_float(row.get('costStone'))
            cost_making = parse_float(row.get('costMaking'))
            cost_other = parse_float(row.get('costOther'))
            
            total_cost = cost_gold + cost_stone + cost_making + cost_other
            profit_margin = 0
            margin_percent = 0
            
            if selling_price > 0:
                profit_margin = selling_price - total_cost
                margin_percent = (profit_margin / selling_price) * 100

            # Build dict for execute(stmt)
            product_dict = {
                "id": uuid_lib.uuid4(), # Note: On conflict update, ID won't change if exists
                "sku": row.get('sku') or f"SKU-{uuid_lib.uuid4().hex[:8].upper()}",
                "barcode": row.get('barcode'),
                "hsn_code": row.get('hsnCode', '7113'),
                
                "name": row.get('name'),
                "description": row.get('description'),
                "category": row.get('category'),
                "subcategory": row.get('subcategory'),
                "tags": row.get('tags', '').split(',') if row.get('tags') else [],
                "status": row.get('status', 'active'),
                
                "metal": row.get('metal'),
                "purity": row.get('purity'),
                "gross_weight": parse_float(row.get('grossWeight')),
                "net_weight": parse_float(row.get('netWeight')),
                "stone_weight": parse_float(row.get('stoneWeight')),
                "stone_type": row.get('stoneType'),
                "stone_quality": row.get('stoneQuality'),
                
                "selling_price": selling_price,
                "price": parse_float(row.get('netPrice')) or selling_price,
                
                "cost_gold": cost_gold,
                "cost_stone": cost_stone,
                "cost_making": cost_making,
                "cost_other": cost_other,
                
                "total_cost": total_cost,
                "profit_margin": profit_margin,
                "margin_percent": margin_percent,
                
                "stock_quantity": parse_int(row.get('stockQuantity')),
                "low_stock_threshold": parse_int(row.get('lowStockThreshold'), 2),
                "track_inventory": True,
                "in_stock": parse_int(row.get('stockQuantity')) > 0
            }
            values_list.append(product_dict)
            
        print(f"DEBUG: Total rows: {rows_processed}, Skipped: {skipped_count}, To add/update: {len(values_list)}")
        
        # Alternative approach: Delete existing and insert fresh
        # This avoids unique constraint issues between SKU and barcode
        if values_list:
            # First, delete all products that match SKUs in the import
            skus_to_import = [v['sku'] for v in values_list]
            await db.execute(
                delete(ProductDB).where(ProductDB.sku.in_(skus_to_import))
            )
            
            # Also delete by barcode to avoid conflicts
            barcodes_to_import = [v['barcode'] for v in values_list if v.get('barcode')]
            if barcodes_to_import:
                await db.execute(
                    delete(ProductDB).where(ProductDB.barcode.in_(barcodes_to_import))
                )
            
            # Now insert all products fresh
            from sqlalchemy import insert as sql_insert
            stmt = sql_insert(ProductDB).values(values_list)
            
            await db.execute(stmt)
            await db.commit()
            print("DEBUG: Commit successful")
            
        return {
            "success": True, 
            "message": f"Processed {len(values_list)} products",
            "count": len(values_list),
            "inserted": len(values_list), # We treat upserts as 'success'
            "updated": 0
        }
        
    except Exception as e:
        print(f"Import Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


class BulkDeleteRequest(BaseModel):
    productIds: List[str]

@api_router.post("/admin/products/bulk-delete")
async def bulk_delete_products(
    request: BulkDeleteRequest,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete multiple products by ID"""
    try:
        # Convert string IDs to UUIDs if needed, though Postgres handles string->uuid cast automatically often
        # Validating IDs first
        valid_uuids = []
        for pid in request.productIds:
            try:
                valid_uuids.append(uuid_lib.UUID(pid))
            except ValueError:
                pass
                
        if not valid_uuids:
            return {"success": True, "count": 0, "message": "No valid IDs provided"}
            
        # Execute delete
        result = await db.execute(
            delete(ProductDB).where(ProductDB.id.in_(valid_uuids))
        )
        await db.commit()
        
        return {
            "success": True, 
            "message": f"Successfully deleted {result.rowcount} products"
        }
    except Exception as e:
        await db.rollback()
        print(f"Bulk Delete Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")



@api_router.get("/admin/products/export")
async def export_products(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Export all products to CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    # Fetch all products
    stmt = select(ProductDB).order_by(ProductDB.created_at.desc())
    result = await db.execute(stmt)
    products = result.scalars().all()

    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers match import format
    headers = [
        'sku', 'barcode', 'hsnCode', 'name', 'description',
        'category', 'subcategory', 'tags', 'status', 'metal',
        'purity', 'grossWeight', 'netWeight', 'stoneWeight',
        'stoneType', 'stoneQuality', 'sellingPrice', 'netPrice',
        'costGold', 'costStone', 'costMaking', 'costOther',
        'stockQuantity', 'lowStockThreshold'
    ]
    writer.writerow(headers)

    for p in products:
        writer.writerow([
            p.sku,
            p.barcode,
            p.hsn_code,
            p.name,
            p.description,
            p.category,
            p.subcategory,
            ",".join(p.tags) if p.tags else "",
            p.status,
            p.metal,
            p.purity,
            float(p.gross_weight) if p.gross_weight else 0.0,
            float(p.net_weight) if p.net_weight else 0.0,
            float(p.stone_weight) if p.stone_weight else 0.0,
            p.stone_type,
            p.stone_quality,
            float(p.selling_price),
            float(p.price) if p.price else float(p.selling_price),
            float(p.cost_gold) if p.cost_gold else 0.0,
            float(p.cost_stone) if p.cost_stone else 0.0,
            float(p.cost_making) if p.cost_making else 0.0,
            float(p.cost_other) if p.cost_other else 0.0,
            p.stock_quantity,
            p.low_stock_threshold
        ])

    output.seek(0)
    
    filename = f"products_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/admin/products")
async def get_products(
    limit: Optional[int] = Query(None, le=1000),
    offset: int = 0,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all products for admin dashboard"""
    # Fetch products with newest first
    stmt = select(ProductDB).order_by(ProductDB.created_at.desc())
    if limit is not None:
        stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    products = result.scalars().all()

    # Calculate reserved quantities from pending/processing orders
    reserved_map = {}
    stmt_orders = select(OrderDB).where(OrderDB.status.in_(['pending', 'processing']))
    result_orders = await db.execute(stmt_orders)
    active_orders = result_orders.scalars().all()
    
    for order in active_orders:
        if order.items:
            for item in order.items:
                # item is a dict stored in JSON column
                pid = item.get('id') 
                qty = int(item.get('quantity', 0))
                if pid:
                    reserved_map[str(pid)] = reserved_map.get(str(pid), 0) + qty
    
    return [
        {
            "id": str(p.id),
            "sku": p.sku,
            "barcode": p.barcode,
            "hsnCode": p.hsn_code,
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "subcategory": p.subcategory,
            "tags": ",".join(p.tags) if p.tags else "",
            "status": p.status,
            "price": float(p.selling_price),
            "image": p.image,
            "metal": p.metal,
            "purity": p.purity,
            "grossWeight": float(p.gross_weight) if p.gross_weight else 0.0,
            "netWeight": float(p.net_weight) if p.net_weight else 0.0,
            "stoneWeight": float(p.stone_weight) if p.stone_weight else 0.0,
            "stoneType": p.stone_type,
            "stoneQuality": p.stone_quality,
            "certification": p.certification,
            "sellingPrice": float(p.selling_price),
            "netPrice": float(p.price) if p.price else float(p.selling_price),
            "costGold": float(p.cost_gold) if p.cost_gold else 0.0,
            "costStone": float(p.cost_stone) if p.cost_stone else 0.0,
            "costMaking": float(p.cost_making) if p.cost_making else 0.0,
            "costOther": float(p.cost_other) if p.cost_other else 0.0,
            "totalCost": float(p.total_cost) if p.total_cost else 0.0,
            "profitMargin": float(p.profit_margin) if p.profit_margin else 0.0,
            "marginPercent": float(p.margin_percent) if p.margin_percent else 0.0,
            "stockQuantity": p.stock_quantity,
            "reserved": reserved_map.get(str(p.id), 0),
            "onHand": p.stock_quantity + reserved_map.get(str(p.id), 0),
            "lowStockThreshold": p.low_stock_threshold,
            "inStock": p.in_stock,
            "vendorName": p.vendor_name,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "sales": 0, # Placeholder
            "rating": 5.0 # Placeholder
        }
        for p in products
    ]

@api_router.get("/admin/products/summary")
async def get_products_summary_admin(
    limit: int = Query(200, le=1000),
    offset: int = 0,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get lightweight product list for admin dropdowns"""
    stmt = (
        select(
            ProductDB.id,
            ProductDB.sku,
            ProductDB.name,
            ProductDB.selling_price,
            ProductDB.total_cost,
            ProductDB.image,
            ProductDB.category,
            ProductDB.subcategory,
            ProductDB.stock_quantity,
            ProductDB.low_stock_threshold,
            ProductDB.vendor_id,
            ProductDB.vendor_name
        )
        .order_by(ProductDB.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": str(row.id),
            "sku": row.sku,
            "name": row.name,
            "price": float(row.selling_price),
            "totalCost": float(row.total_cost) if row.total_cost else 0.0,
            "image": row.image,
            "category": row.category,
            "subcategory": row.subcategory,
            "stockQuantity": row.stock_quantity,
            "lowStockThreshold": row.low_stock_threshold,
            "vendorId": row.vendor_id,
            "vendorName": row.vendor_name
        }
        for row in rows
    ]

@api_router.put("/admin/products/{product_id}")
async def update_product(
    product_id: str,
    product_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a product by ID"""
    try:
        # Find the product
        result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Update product fields
        if "name" in product_data:
            product.name = product_data["name"]
        if "description" in product_data:
            product.description = product_data.get("description")
        if "category" in product_data:
            product.category = product_data["category"]
        if "subcategory" in product_data:
            product.subcategory = product_data.get("subcategory")
        if "sku" in product_data:
            product.sku = product_data["sku"]
        if "barcode" in product_data:
            product.barcode = product_data.get("barcode")
        if "hsnCode" in product_data:
            product.hsn_code = product_data.get("hsnCode")
        if "image" in product_data:
            product.image = product_data.get("image")
        if "images" in product_data:
            product.images = product_data.get("images", [])
        if "metal" in product_data:
            product.metal = product_data.get("metal")
        if "purity" in product_data:
            product.purity = product_data.get("purity")
        if "grossWeight" in product_data:
            product.gross_weight = product_data.get("grossWeight")
        if "netWeight" in product_data:
            product.net_weight = product_data.get("netWeight")
        if "stoneWeight" in product_data:
            product.stone_weight = product_data.get("stoneWeight")
        if "stoneType" in product_data:
            product.stone_type = product_data.get("stoneType")
        if "stoneQuality" in product_data:
            product.stone_quality = product_data.get("stoneQuality")
        if "certification" in product_data:
            product.certification = product_data.get("certification")
        if "sellingPrice" in product_data or "price" in product_data:
            product.selling_price = product_data.get("sellingPrice") or product_data.get("price")
            product.price = product.selling_price
        if "costGold" in product_data:
            product.cost_gold = product_data.get("costGold")
        if "costStone" in product_data:
            product.cost_stone = product_data.get("costStone")
        if "costMaking" in product_data:
            product.cost_making = product_data.get("costMaking")
        if "costOther" in product_data:
            product.cost_other = product_data.get("costOther")
        if "totalCost" in product_data:
            product.total_cost = product_data.get("totalCost")
        if "profitMargin" in product_data:
            product.profit_margin = product_data.get("profitMargin")
        if "marginPercent" in product_data:
            product.margin_percent = product_data.get("marginPercent")
        if "stockQuantity" in product_data:
            product.stock_quantity = product_data.get("stockQuantity")
        if "lowStockThreshold" in product_data:
            product.low_stock_threshold = product_data.get("lowStockThreshold")
        if "inStock" in product_data:
            product.in_stock = product_data.get("inStock")
        if "status" in product_data:
            product.status = product_data.get("status")
        if "vendorId" in product_data:
            product.vendor_id = product_data.get("vendorId")
        if "vendorName" in product_data:
            product.vendor_name = product_data.get("vendorName")
        if "taxRate" in product_data:
            product.tax_rate = product_data.get("taxRate")
        if "isTaxable" in product_data:
            product.is_taxable = product_data.get("isTaxable")
        if "hasDiscount" in product_data:
            product.has_discount = product_data.get("hasDiscount")
        if "discountType" in product_data:
            product.discount_type = product_data.get("discountType")
        if "discountValue" in product_data:
            product.discount_value = product_data.get("discountValue")
        if "discountedPrice" in product_data:
            product.discounted_price = product_data.get("discountedPrice")
        if "allowCoupons" in product_data:
            product.allow_coupons = product_data.get("allowCoupons")
        if "tags" in product_data:
            product.tags = product_data.get("tags", [])
            
        await db.commit()
        
        return {"success": True, "message": "Product updated successfully", "id": str(product.id)}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")

@api_router.post("/admin/products")
async def create_product(
    product_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new product"""
    try:
        # Generate unique identifiers if not provided
        sku = product_data.get("sku") or f"SKU-{uuid_lib.uuid4().hex[:8].upper()}"
        barcode = product_data.get("barcode") or f"{uuid_lib.uuid4().int % 10**13:013d}"
        
        new_product = ProductDB(
            id=uuid_lib.uuid4(),
            sku=sku,
            barcode=barcode,
            hsn_code=product_data.get("hsnCode", "7113"),
            name=product_data.get("name"),
            description=product_data.get("description"),
            category=product_data.get("category", "Gold Jewellery"),
            subcategory=product_data.get("subcategory"),
            tags=product_data.get("tags", []),
            status=product_data.get("status", "active"),
            image=product_data.get("image"),
            images=product_data.get("images", []),
            metal=product_data.get("metal"),
            purity=product_data.get("purity"),
            gross_weight=product_data.get("grossWeight"),
            net_weight=product_data.get("netWeight"),
            stone_weight=product_data.get("stoneWeight"),
            stone_type=product_data.get("stoneType"),
            stone_quality=product_data.get("stoneQuality"),
            certification=product_data.get("certification"),
            selling_price=product_data.get("sellingPrice") or product_data.get("price"),
            price=product_data.get("sellingPrice") or product_data.get("price"),
            cost_gold=product_data.get("costGold"),
            cost_stone=product_data.get("costStone"),
            cost_making=product_data.get("costMaking"),
            cost_other=product_data.get("costOther"),
            total_cost=product_data.get("totalCost"),
            profit_margin=product_data.get("profitMargin"),
            margin_percent=product_data.get("marginPercent"),
            stock_quantity=product_data.get("stockQuantity", 0),
            low_stock_threshold=product_data.get("lowStockThreshold", 2),
            in_stock=product_data.get("inStock", True),
            vendor_id=product_data.get("vendorId"),
            vendor_name=product_data.get("vendorName"),
            tax_rate=product_data.get("taxRate", 3),
            is_taxable=product_data.get("isTaxable", True),
            has_discount=product_data.get("hasDiscount", False),
            discount_type=product_data.get("discountType"),
            discount_value=product_data.get("discountValue"),
            discounted_price=product_data.get("discountedPrice"),
            allow_coupons=product_data.get("allowCoupons", True)
        )
        
        db.add(new_product)
        await db.commit()
        
        return {"success": True, "message": "Product created successfully", "id": str(new_product.id)}
        
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@api_router.get("/admin/vendors")
async def get_vendors(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all vendors"""
    result = await db.execute(select(VendorDB))
    vendors = result.scalars().all()
    
    return [{
        "id": v.id,
        "name": v.name,
        "code": v.code,
        "email": v.email,
        "phone": v.phone,
        "contact_person": v.contact_person,
        "address": v.address,
        "payment_terms": v.payment_terms,
        "lead_time_days": v.lead_time_days,
        "contacts": [{"name": v.contact_person, "email": v.email, "phone": v.phone}] if v.contact_person else [],
        "isActive": v.is_active
    } for v in vendors]

@api_router.get("/admin/vendors/{vendor_id}")
async def get_vendor(
    vendor_id: str,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get vendor by ID"""
    stmt = select(VendorDB).where(VendorDB.id == vendor_id)
    result = await db.execute(stmt)
    v = result.scalar_one_or_none()
    
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    return {
        "id": v.id,
        "name": v.name,
        "code": v.code,
        "email": v.email,
        "phone": v.phone,
        "contact_person": v.contact_person,
        "address": v.address,
        "gst_number": v.gst_number,
        "payment_terms": v.payment_terms,
        "lead_time_days": v.lead_time_days,
        "isActive": v.is_active
    }

@api_router.post("/admin/vendors")
async def create_vendor(
    vendor_data: VendorCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create new vendor"""
    import uuid as uuid_lib
    import random
    
    # Combine address
    full_address = vendor_data.address or ""
    if vendor_data.city: full_address += f", {vendor_data.city}"
    if vendor_data.state: full_address += f", {vendor_data.state}"
    if vendor_data.pincode: full_address += f" - {vendor_data.pincode}"
    
    new_vendor = VendorDB(
        id=str(uuid_lib.uuid4()),
        name=vendor_data.name,
        code=vendor_data.code or f"VND-{random.randint(100, 999)}",
        email=vendor_data.email,
        phone=vendor_data.phone,
        contact_person=vendor_data.contact_person,
        address=full_address.strip(", -"),
        gst_number=vendor_data.gst_number,
        payment_terms=vendor_data.payment_terms,
        lead_time_days=vendor_data.lead_time_days,
        is_active=True
    )
    
    db.add(new_vendor)
    await db.commit()
    await db.refresh(new_vendor)
    
    return {"id": new_vendor.id, "name": new_vendor.name}

# ============================================
# COUPONS
# ============================================

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = ""
    type: str
    value: float
    minOrderValue: Optional[float] = 0
    maxDiscount: Optional[float] = None
    scope: str = "general"
    applicableProducts: List[str] = []
    usageLimit: Optional[int] = None
    perCustomerLimit: int = 1
    validFrom: Optional[str] = None
    validTo: Optional[str] = None
    isActive: bool = True

@api_router.get("/admin/coupons")
async def get_coupons(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all coupons"""
    result = await db.execute(select(CouponDB))
    coupons = result.scalars().all()
    
    return [{
        "id": str(c.id),
        "code": c.code,
        "description": c.description,
        "type": c.type,
        "value": float(c.value),
        "minOrderValue": float(c.min_order_value) if c.min_order_value else 0,
        "maxDiscount": float(c.max_discount) if c.max_discount else None,
        "scope": c.scope,
        "applicableProducts": c.applicable_products,
        "usageLimit": c.usage_limit,
        "perCustomerLimit": c.per_customer_limit,
        "validFrom": c.valid_from.isoformat() if c.valid_from else None,
        "validTo": c.valid_to.isoformat() if c.valid_to else None,
        "isActive": c.is_active,
        "usageCount": c.usage_count
    } for c in coupons]

@api_router.post("/admin/coupons")
async def create_coupon(
    coupon_data: CouponCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create new coupon"""
    import uuid as uuid_lib
    from datetime import datetime
    
    # Parse dates if provided
    valid_from = None
    if coupon_data.validFrom:
        try:
            valid_from = datetime.fromisoformat(coupon_data.validFrom.replace('Z', '+00:00'))
        except:
            pass
            
    valid_to = None
    if coupon_data.validTo:
        try:
            valid_to = datetime.fromisoformat(coupon_data.validTo.replace('Z', '+00:00'))
        except:
            pass

    new_coupon = CouponDB(
        id=uuid_lib.uuid4(),
        code=coupon_data.code.upper(),
        description=coupon_data.description,
        type=coupon_data.type,
        value=coupon_data.value,
        min_order_value=coupon_data.minOrderValue,
        max_discount=coupon_data.maxDiscount,
        scope=coupon_data.scope,
        applicable_products=coupon_data.applicableProducts,
        usage_limit=coupon_data.usageLimit,
        per_customer_limit=coupon_data.perCustomerLimit,
        valid_from=valid_from,
        valid_to=valid_to,
        is_active=coupon_data.isActive,
        usage_count=0
    )
    db.add(new_coupon)
    await db.commit()
    await db.refresh(new_coupon)
    return new_coupon

@api_router.put("/admin/coupons/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    coupon_data: CouponCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update existing coupon"""
    import uuid as uuid_lib
    from datetime import datetime
    
    try:
        # Check if coupon exists
        result = await db.execute(select(CouponDB).where(CouponDB.id == uuid_lib.UUID(coupon_id)))
        coupon = result.scalar_one_or_none()
        
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        
        # Update fields
        coupon.code = coupon_data.code.upper()
        coupon.description = coupon_data.description
        coupon.type = coupon_data.type
        coupon.value = coupon_data.value
        coupon.min_order_value = coupon_data.minOrderValue
        coupon.max_discount = coupon_data.maxDiscount
        coupon.scope = coupon_data.scope
        coupon.applicable_products = coupon_data.applicableProducts
        coupon.usage_limit = coupon_data.usageLimit
        coupon.per_customer_limit = coupon_data.perCustomerLimit
        coupon.is_active = coupon_data.isActive
        
        # Update dates
        if coupon_data.validFrom:
            try:
                coupon.valid_from = datetime.fromisoformat(coupon_data.validFrom.replace('Z', '+00:00'))
            except:
                pass
        else:
            coupon.valid_from = None
            
        if coupon_data.validTo:
            try:
                coupon.valid_to = datetime.fromisoformat(coupon_data.validTo.replace('Z', '+00:00'))
            except:
                pass
        else:
            coupon.valid_to = None
            
        await db.commit()
        await db.refresh(coupon)
        return coupon
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid coupon ID format")

@api_router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(
    coupon_id: str,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a coupon"""
    import uuid as uuid_lib
    try:
        # Check if coupon exists
        result = await db.execute(select(CouponDB).where(CouponDB.id == uuid_lib.UUID(coupon_id)))
        coupon = result.scalar_one_or_none()
        
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
            
        await db.delete(coupon)
        await db.commit()
        return {"success": True}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid coupon ID format")

class CouponVerify(BaseModel):
    code: str
    orderTotal: float

@api_router.post("/coupons/verify")
async def verify_coupon_endpoint(
    data: CouponVerify,
    db: AsyncSession = Depends(get_db)
):
    """Verify coupon code and return discount details"""
    logger.info(f"Verifying coupon: {data.code} for amount {data.orderTotal}")
    
    result = await db.execute(
        select(CouponDB).where(
            CouponDB.code == data.code.upper(),
            CouponDB.is_active == True
        )
    )
    coupon = result.scalar_one_or_none()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
        
    if coupon.min_order_value > data.orderTotal:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum order value of ₹{coupon.min_order_value} required"
        )
        
    # Calculate discount
    discount_amount = 0
    if coupon.type == 'percent':
        discount_amount = (data.orderTotal * coupon.value) / 100
        if coupon.max_discount and discount_amount > coupon.max_discount:
            discount_amount = coupon.max_discount
    else: # fixed amount
        discount_amount = coupon.value
        
    # Ensure discount doesn't exceed order total
    if discount_amount > data.orderTotal:
        discount_amount = data.orderTotal
        
    return {
        "code": coupon.code,
        "type": coupon.type,
        "value": coupon.value,
        "discountAmount": float(discount_amount),
        "description": coupon.description
    }

# ============================================
# ORDERS & EMAIL SERVICE
# ============================================

class OrderItem(BaseModel):
    productId: str
    quantity: int

class Address(BaseModel):
    firstName: str
    lastName: str
    address: str
    city: str
    state: str
    pincode: str
    country: str
    phone: str

class OrderCreate(BaseModel):
    items: List[OrderItem]
    shippingAddress: Address
    paymentMethod: str
    couponCode: Optional[str] = None
    idempotencyKey: Optional[str] = None
    sessionId: Optional[str] = None

# Using existing send_email function for consistency
# async def send_email_background(to_email: str, subject: str, body: str):
#     """Deprecated: Use send_email directly"""
#     await send_email(to_email, subject, body, is_html=True)

@api_router.get("/admin/orders")
async def get_admin_orders(
    status: str = None,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all orders for admin dashboard"""
    stmt = select(OrderDB).order_by(OrderDB.created_at.desc())
    
    if status and status != 'all':
        if status == 'paid':
            stmt = stmt.where(OrderDB.payment_status == 'paid')
        elif status == 'pending':
            stmt = stmt.where(OrderDB.payment_status == 'pending')
        else:
            stmt = stmt.where(OrderDB.status == status)

    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "customer": {
                "name": o.customer_name,
                "email": o.customer_email
            },
            "total": float(o.grand_total) if o.grand_total else 0,
            "status": o.status,
            "paymentStatus": o.payment_status,
            "createdAt": o.created_at.isoformat() if o.created_at else None,
            "channel": o.channel,
            "items": o.items,
            "shippingAddress": o.shipping_address
        }
        for o in orders
    ]

@api_router.get("/admin/orders/{order_id}")
async def get_admin_order_detail(
    order_id: str,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get order details for admin"""
    result = await db.execute(select(OrderDB).where(OrderDB.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    return {
        "id": str(order.id),
        "orderNumber": order.order_number,
        "customerName": order.customer_name,
        "customerEmail": order.customer_email,
        "customerPhone": order.customer_phone,
        "items": order.items,
        "subtotal": float(order.subtotal),
        "shippingTotal": float(order.shipping_total),
        "total": float(order.grand_total),
        "status": order.status,
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment_method,
        "shippingAddress": order.shipping_address,
        "createdAt": order.created_at.isoformat() if order.created_at else None,
        "channel": order.channel
    }

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update order status"""
    result = await db.execute(select(OrderDB).where(OrderDB.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if "status" in status_data:
        new_status = status_data["status"]
        order.status = new_status
        
        # Auto-update payment status for logical consistency
        if new_status in ['delivered', 'paid']:
            order.payment_status = 'paid'
        elif new_status == 'pending':
            order.payment_status = 'pending'
            
    await db.commit()
    return {"success": True, "status": order.status}

class CreateOrderLineItem(BaseModel):
    product_id: str
    quantity: int

class CreateOrderAddress(BaseModel):
    firstName: str
    lastName: str = ""
    address: str
    city: str
    state: str
    pincode: str
    country: str = "India"

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    items: List[CreateOrderLineItem]
    payment_status: str = 'pending' # paid, pending
    fulfillment_status: str = 'pending' # pending, shipped, delivered
    channel: str = 'pos' # online, pos
    discount_amount: float = 0.0
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = None # cash, card, upi
    shipping_address: Optional[CreateOrderAddress] = None

@api_router.post("/admin/orders/create")
async def create_manual_order(
    order_data: CreateOrderRequest,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Manually create an order from admin panel"""
    import uuid
    
    # Generate Order Number early
    order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    
    # 1. Get or Create Customer
    # For manual orders, we might not want to enforce full auth user creation if it's just a walk-in,
    # but maintaining a user record is good for history.
    # Let's check if user exists by email
    stmt = select(UserDB).where(UserDB.email == order_data.customer_email)
    result = await db.execute(stmt)
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Create a "guest" or implicit customer
        customer = UserDB(
            id=uuid.uuid4(),
            email=order_data.customer_email,
            full_name=order_data.customer_name,
            role="customer",
            password_hash=pwd_context.hash("manual_order_guest")
        )
        db.add(customer)
        await db.flush() # get ID
        
    # 2. Process Items & Deduct Stock
    line_items = []
    subtotal = 0
    total_cost = 0
    
    for item in order_data.items:
        # Fetch product
        prod_result = await db.execute(select(ProductDB).where(ProductDB.id == item.product_id))
        product = prod_result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
            
        if product.stock_quantity < item.quantity:
             raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
             
        # Deduct stock
        qty_change = -item.quantity
        product.stock_quantity += qty_change
        
        # Log to Ledger
        ledger_entry = InventoryLedgerDB(
            product_id=str(product.id),
            sku=product.sku,
            product_name=product.name,
            event_type='sale',
            quantity_change=qty_change,
            running_balance=product.stock_quantity,
            reference_id=order_number,
            reference_type='order',
            notes=f"Admin Order Placed by {owner.full_name}",
            created_by=owner.full_name
        )
        db.add(ledger_entry)
        
        # Calculate financials
        price = float(product.price)
        cost = float(product.total_cost or 0)
        line_total = price * item.quantity
        
        subtotal += line_total
        total_cost += (cost * item.quantity)
        
        line_items.append({
            "id": str(product.id),
            "name": product.name,
            "sku": product.sku,
            "price": price,
            "quantity": item.quantity,
            "image": product.images[0] if product.images else None
        })
        
    # 3. Create Order
    # Apply discount
    discount = order_data.discount_amount
    grand_total = max(0, subtotal - discount)
    gross_profit = grand_total - total_cost
    
    # Generate Order Number (Already generated at top)
    from datetime import datetime
    
    # Prepare shipping address dict if provided
    shipping_addr_dict = order_data.shipping_address.dict() if order_data.shipping_address else None

    new_order = OrderDB(
        id=uuid.uuid4(),
        order_number=order_number,
        channel=order_data.channel,
        customer_id=str(customer.id),
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        items=line_items,
        subtotal=subtotal,
        discount_total=discount,
        coupon_code=order_data.coupon_code,
        coupon_discount=discount,
        grand_total=grand_total,
        total_cost=total_cost,
        gross_profit=gross_profit,
        status=order_data.fulfillment_status,
        payment_status=order_data.payment_status,
        payment_method=order_data.payment_method,
        fulfillment_status=order_data.fulfillment_status,
        shipping_address=shipping_addr_dict,
        created_at=datetime.utcnow()
    )
    
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    
    return {"success": True, "order_id": str(new_order.id), "order_number": new_order.order_number}

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    # User authentication is tricky here if we don't have user dependency on the router level,
    # but the frontend sends headers. For public endpoints, we might need `get_current_user`.
    # Assuming this is customer facing, we should verify the user owns the order.
    # But for quick fix to match the frontend call:
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an order"""
    # include items relationship to restore stock
    result = await db.execute(
        select(OrderDB).where(OrderDB.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Verify ownership (if user is not admin)
    if order.customer_email != current_user.email:
         # In a real app we'd check ID, but here email is safer if IDs vary
         # Or check if current_user.role is admin
         if current_user.role != 'owner':
             raise HTTPException(status_code=403, detail="Not authorized to cancel this order")

    if order.status not in ['pending', 'processing', 'unpaid', 'placed']:
        raise HTTPException(status_code=400, detail="Cannot cancel order in current status")
        
    # Restore stock
    if order.items:
        for item in order.items:
             # Find product
             prod_result = await db.execute(select(ProductDB).where(ProductDB.id == item["id"]))
             product = prod_result.scalar_one_or_none()
             if product:
                 product.stock_quantity += item["quantity"]
                 # Re-enable in_stock if it was 0
                 if product.stock_quantity > 0:
                     product.in_stock = True
    
    order.status = 'cancelled'
    await db.commit()
    return {"success": True, "status": "cancelled"}

@api_router.post("/orders")
async def place_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Place a new order with atomic inventory locking"""
    try:
        import uuid as uuid_lib
        from datetime import datetime, timezone
        from sqlalchemy import or_
        now = datetime.now(timezone.utc)
        
        # 0. Idempotency Check
        if order_data.idempotencyKey:
            existing_res = await db.execute(select(OrderDB).where(OrderDB.idempotency_key == order_data.idempotencyKey))
            existing_order = existing_res.scalar_one_or_none()
            if existing_order:
                return {
                    "success": True, 
                    "message": "Order already processed (Idempotent)",
                    "order_number": existing_order.order_number,
                    "id": str(existing_order.id)
                }

        order_number = f"ORD-{uuid_lib.uuid4().hex[:8].upper()}"

        # 1. Atomic Inventory Check & Lock
        sorted_items = sorted(order_data.items, key=lambda x: x.productId)
        
        total_amount = 0
        total_cost = 0
        items_json = []
        
        for item in sorted_items:
            # Atomic Lock
            stmt = select(ProductDB).where(ProductDB.id == item.productId).with_for_update()
            result = await db.execute(stmt)
            product = result.scalar_one_or_none()
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.productId} not found")
                
            # A. Stock Check
            if product.stock_quantity < item.quantity:
                raise HTTPException(status_code=409, detail=f"Insufficient stock for {product.name}")
            
            # B. Status Check
            if product.status != 'active':
                 raise HTTPException(status_code=409, detail=f"Product {product.name} is not available")
                 
            # C. Reservation Check
            if product.reserved_until and product.reserved_until > now:
                # Strictly check session ownership if reservation exists
                session_match = (order_data.sessionId and product.reserved_by == order_data.sessionId)
                if not session_match:
                     raise HTTPException(status_code=409, detail=f"{product.name} is reserved by another user")
            
            # Update Totals
            item_total = float(product.selling_price) * item.quantity
            total_amount += item_total
            if product.total_cost:
                total_cost += float(product.total_cost) * item.quantity
            
            items_json.append({
                "id": str(product.id),
                "name": product.name,
                "quantity": item.quantity,
                "price": float(product.selling_price),
                "image": product.image,
                "category": product.category
            })
            
            # Deduct Stock
            qty_change = -item.quantity
            product.stock_quantity += qty_change
            
            # Clear Reservation
            product.reserved_until = None
            product.reserved_by = None
            
            # Log to Ledger
            ledger_entry = InventoryLedgerDB(
                product_id=str(product.id),
                sku=product.sku,
                product_name=product.name,
                event_type='sale',
                quantity_change=qty_change,
                running_balance=product.stock_quantity,
                reference_id=order_number,
                reference_type='order',
                notes=f"Order Placed by {current_user.full_name}",
                created_by=current_user.full_name
            )
            db.add(ledger_entry)

            if product.stock_quantity <= 0:
                product.in_stock = False
                
        # 2. Apply Coupon
        discount_amount = 0
        coupon = None
        
        if order_data.couponCode:
            result = await db.execute(
                select(CouponDB).where(
                    CouponDB.code == order_data.couponCode.upper(),
                    CouponDB.is_active == True
                )
            )
            coupon = result.scalar_one_or_none()
            
            if coupon:
                if total_amount >= float(coupon.min_order_value):
                    if coupon.type == 'percent':
                        calc_discount = (total_amount * float(coupon.value)) / 100
                        if coupon.max_discount and calc_discount > float(coupon.max_discount):
                            calc_discount = float(coupon.max_discount)
                        discount_amount = calc_discount
                    else:
                        discount_amount = float(coupon.value)
                    
                    if discount_amount > total_amount:
                        discount_amount = total_amount
                        
                    coupon.usage_count += 1
        
        # 3. Create Order
        shipping_cost = 0 if total_amount > 5000 else 100
        
        tax_total = float(total_amount - discount_amount) * 0.03
        grand_total = float(total_amount - discount_amount) + shipping_cost
        
        new_order = OrderDB(
            id=uuid_lib.uuid4(),
            order_number=order_number,
            idempotency_key=order_data.idempotencyKey,
            customer_id=str(current_user.id),
            customer_name=f"{order_data.shippingAddress.firstName} {order_data.shippingAddress.lastName}",
            customer_email=current_user.email,
            customer_phone=order_data.shippingAddress.phone,
            
            items=items_json,
            subtotal=total_amount,
            shipping_total=shipping_cost,
            grand_total=grand_total,
            discount_total=discount_amount,
            coupon_code=coupon.code if coupon else None,
            coupon_discount=discount_amount if coupon else 0,
            
            total_cost=total_cost,
            gross_profit=grand_total - total_cost,
            net_profit=grand_total - total_cost,
            
            status="paid" if order_data.paymentMethod.lower() != 'cod' else "pending",
            payment_status="paid" if order_data.paymentMethod.lower() != 'cod' else "pending",
            payment_method=order_data.paymentMethod,
            shipping_address=order_data.shippingAddress.dict(),
            
            channel="online"
        )
        
        db.add(new_order)
        await db.commit()
        await db.refresh(new_order)
        
        # 3. Send Email
        # Construct email body with details
        items_html = ""
        for item in items_json:
            item_total = item['price'] * item['quantity']
            items_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">{item['name']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">{item['quantity']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹{item['price']}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹{item_total}</td>
            </tr>
            """
            
        discount_row = ""
        if discount_amount > 0:
            discount_row = f"""
            <tr>
                <td colspan="3" style="text-align: right; padding: 8px;"><strong>Discount:</strong></td>
                <td style="padding: 8px; color: green;">-₹{discount_amount}</td>
            </tr>
            """
            
        email_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h1 style="color: #333; text-align: center;">Order Confirmation</h1>
            <p>Dear {current_user.full_name},</p>
            <p>Thank you for your order! Your order number is <strong>{order_number}</strong>.</p>
            
            <h3 style="border-bottom: 2px solid #c4ad94; padding-bottom: 10px; margin-top: 30px;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f8f8f8;">
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Product</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Qty</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Price</th>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 8px; border-top: 1px solid #ddd;"><strong>Subtotal:</strong></td>
                        <td style="padding: 8px; border-top: 1px solid #ddd;">₹{total_amount}</td>
                    </tr>
                    {discount_row}
                    <tr>
                        <td colspan="3" style="text-align: right; padding: 8px;"><strong>Shipping:</strong></td>
                        <td style="padding: 8px;">₹{shipping_cost}</td>
                    </tr>
                    <tr style="background-color: #f8f8f8;">
                        <td colspan="3" style="text-align: right; padding: 12px; font-size: 1.1em;"><strong>Grand Total:</strong></td>
                        <td style="padding: 12px; font-size: 1.1em;"><strong>₹{grand_total}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <p style="margin-top: 20px;">We will notify you when your order is shipped.</p>
            <br>
            <p style="color: #666; font-size: 0.9em;">Best regards,<br>The Annya Jewellers Team</p>
        </div>
        """
        # Use simple background task wrapper to match async signature if needed, 
        # or just pass the async function to BackgroundTasks (FastAPI supports it)
        background_tasks.add_task(send_email_via_vercel, to_email=current_user.email, subject=f"Order Confirmation #{order_number}", body=email_body)
        
        # 4. Auto-save Address to Profile
        if order_data.shippingAddress:
            current_user.address = order_data.shippingAddress.address
            current_user.city = order_data.shippingAddress.city
            current_user.state = order_data.shippingAddress.state
            current_user.pincode = order_data.shippingAddress.pincode
            current_user.country = order_data.shippingAddress.country
            # Phone is already saved during reg, but update if changed? 
            # current_user.phone = order_data.shippingAddress.phone 
            db.add(current_user)
            await db.commit()
        
        return {"success": True, "orderId": str(new_order.id), "orderNumber": order_number}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order failed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders")
async def get_my_orders(
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's order history"""
    result = await db.execute(
        select(OrderDB)
        .where(OrderDB.customer_id == str(current_user.id))
        .order_by(OrderDB.created_at.desc())
    )
    orders = result.scalars().all()
    
    return [
        {
            "id": str(o.id),
            "orderNumber": o.order_number,
            "total": float(o.grand_total) if o.grand_total else 0,
            "status": o.status,
            "paymentStatus": o.payment_status,
            "createdAt": o.created_at.isoformat() if o.created_at else None,
            "items": o.items,
            "shippingAddress": o.shipping_address
        }
        for o in orders
    ]

@api_router.get("/orders/{order_id}")
async def get_my_order_detail(
    order_id: str,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific order for the current user"""
    result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.id == order_id,
            OrderDB.customer_id == str(current_user.id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check for return request
    return_req_result = await db.execute(
        select(ReturnRequestDB).where(ReturnRequestDB.order_id == order_id)
    )
    return_req = return_req_result.scalar_one_or_none()

    return {
        "id": str(order.id),
        "orderNumber": order.order_number,
        "total": float(order.grand_total) if order.grand_total else 0,
        "subtotal": float(order.subtotal) if order.subtotal else 0,
        "shippingTotal": float(order.shipping_total) if order.shipping_total else 0,
        "status": order.status,
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment_method,
        "createdAt": order.created_at.isoformat() if order.created_at else None,
        "items": order.items,
        "shippingAddress": order.shipping_address,
        "returnRequest": {
            "status": return_req.status,
            "reason": return_req.reason,
            "createdAt": return_req.created_at.isoformat() if return_req.created_at else None
        } if return_req else None
    }

@api_router.get("/orders/{order_id}/invoice")
async def download_invoice(
    order_id: str,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download GST-compliant invoice PDF for an order"""
    from fastapi.responses import StreamingResponse
    from invoice_generator import generate_invoice_pdf
    
    # Get order
    result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.id == order_id,
            OrderDB.customer_id == str(current_user.id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    pdf_buffer = generate_invoice_pdf(order)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=invoice-{order.order_number}.pdf"
        }
    )


# -------------------------------------------------------------------------
# Returns & Refunds System
# -------------------------------------------------------------------------

class ReturnRequest(BaseModel):
    reason: str  # defective, wrong_item, not_as_described, changed_mind
    description: Optional[str] = None

@api_router.post("/orders/{order_id}/return")
async def request_return(
    order_id: str,
    return_data: ReturnRequest,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Request a return for an order"""
    # Verify order exists and belongs to user
    result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.id == order_id,
            OrderDB.customer_id == str(current_user.id)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order is eligible for return (delivered within 7 days)
    if order.status not in ['delivered', 'completed']:
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")
    
    # Check for existing return request
    existing = await db.execute(
        select(ReturnRequestDB).where(ReturnRequestDB.order_id == order_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Return request already exists for this order")
    
    # Create return request
    return_request = ReturnRequestDB(
        order_id=order_id,
        customer_id=current_user.id,
        reason=return_data.reason,
        description=return_data.description,
        refund_amount=order.grand_total,
        status='pending'
    )
    db.add(return_request)
    await db.commit()
    await db.refresh(return_request)
    
    return {
        "id": str(return_request.id),
        "status": return_request.status,
        "message": "Return request submitted successfully"
    }

@api_router.get("/my-returns")
async def get_my_returns(
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all return requests for current user"""
    result = await db.execute(
        select(ReturnRequestDB)
        .where(ReturnRequestDB.customer_id == current_user.id)
        .order_by(ReturnRequestDB.created_at.desc())
    )
    returns = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "orderId": str(r.order_id),
            "reason": r.reason,
            "description": r.description,
            "status": r.status,
            "refundAmount": float(r.refund_amount) if r.refund_amount else 0,
            "adminNotes": r.admin_notes,
            "createdAt": r.created_at.isoformat() if r.created_at else None
        }
        for r in returns
    ]

@api_router.get("/admin/returns")
async def get_all_returns(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Get all return requests for admin"""
    query = select(ReturnRequestDB).order_by(ReturnRequestDB.created_at.desc())
    if status:
        query = query.where(ReturnRequestDB.status == status)
    
    result = await db.execute(query)
    returns = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "orderId": str(r.order_id),
            "customerId": str(r.customer_id),
            "reason": r.reason,
            "description": r.description,
            "status": r.status,
            "refundAmount": float(r.refund_amount) if r.refund_amount else 0,
            "adminNotes": r.admin_notes,
            "createdAt": r.created_at.isoformat() if r.created_at else None
        }
        for r in returns
    ]

class ReturnAction(BaseModel):
    action: str  # approve, reject
    notes: Optional[str] = None
    refund_amount: Optional[float] = None

@api_router.post("/admin/returns/{return_id}/action")
async def process_return(
    return_id: str,
    action_data: ReturnAction,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Approve or reject a return request"""
    result = await db.execute(
        select(ReturnRequestDB).where(ReturnRequestDB.id == return_id)
    )
    return_request = result.scalar_one_or_none()
    
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    if return_request.status != 'pending':
        raise HTTPException(status_code=400, detail="Return already processed")
    
    if action_data.action == 'approve':
        return_request.status = 'approved'
        if action_data.refund_amount:
            return_request.refund_amount = action_data.refund_amount
        
        # Update order status
        order_result = await db.execute(
            select(OrderDB).where(OrderDB.id == return_request.order_id)
        )
        order = order_result.scalar_one_or_none()
        if order:
            order.status = 'return_approved'
            
    elif action_data.action == 'reject':
        return_request.status = 'rejected'
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    return_request.admin_notes = action_data.notes
    await db.commit()
    
    return {
        "success": True,
        "status": return_request.status,
        "message": f"Return request {action_data.action}d"
    }

# -------------------------------------------------------------------------
# Shipping Integration (Shiprocket)
# -------------------------------------------------------------------------

class ServiceabilityRequest(BaseModel):
    pickup_pincode: int
    delivery_pincode: int
    weight: float
    cod: int = 0

@api_router.post("/shipping/check-serviceability")
async def check_serviceability(data: ServiceabilityRequest, current_user: UserDB = Depends(get_current_user)):
    """Check if delivery is available for a pincode"""
    from shiprocket_client import shiprocket
    try:
        result = shiprocket.check_serviceability(
            pickup_postcode=data.pickup_pincode,
            delivery_postcode=data.delivery_pincode,
            weight=data.weight,
            cod=data.cod
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/orders/{order_id}/ship")
async def ship_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Create a shipment in Shiprocket for an order"""
    from shiprocket_client import shiprocket
    
    # Get Order
    result = await db.execute(select(OrderDB).where(OrderDB.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Prepare data
    shipping = order.shipping_address or {}
    order_data = {
        "order_id": order.order_number,
        "order_date": order.created_at.strftime("%Y-%m-%d %H:%M"),
        "customer_name": shipping.get("firstName", "") + " " + shipping.get("lastName", ""),
        "address": shipping.get("address", ""),
        "city": shipping.get("city", ""),
        "pincode": shipping.get("postalCode", ""),
        "state": shipping.get("state", ""),
        "email": "customer@example.com", # Should be real email from UserDB
        "phone": shipping.get("phone", ""),
        "payment_method": "Prepaid", # Simplified
        "sub_total": float(order.subtotal or 0),
        "items": [
            {
                "name": item.get("name"),
                "sku": item.get("id"),
                "units": item.get("quantity"),
                "selling_price": item.get("price")
            }
            for item in order.items
        ]
    }
    
    try:
        response = shiprocket.create_order(order_data)
        
        # Save tracking details if successful
        if response.get("order_id"):
            order.status = "processing" # Update status
            # In a real app, save 'shipment_id' and 'awb_code' to DB
            await db.commit()
            
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------------
# Abandoned Cart System (Guest & Logged-in Users)
# -------------------------------------------------------------------------

class CartSaveRequest(BaseModel):
    email: str
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    items: List[Dict[str, Any]]
    cart_total: float
    session_id: Optional[str] = None

@api_router.post("/cart/save")
async def save_cart_for_reminder(
    cart_data: CartSaveRequest,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Save cart state for abandoned cart reminders.
    Works for both guests (email only) and logged-in users.
    Called when:
    - User enters email on checkout (guest)
    - User navigates away from checkout (logged-in)
    """
    user_id = None
    
    # Check if user is logged in
    if credentials and credentials.credentials:
        try:
            token_user_id = decode_token(credentials.credentials)
            if token_user_id:
                result = await db.execute(select(UserDB).where(UserDB.id == token_user_id))
                user = result.scalar_one_or_none()
                if user:
                    user_id = user.id
        except:
            pass  # Continue as guest
    
    # Check for existing cart with same email
    existing = await db.execute(
        select(AbandonedCartDB)
        .where(
            AbandonedCartDB.email == cart_data.email,
            AbandonedCartDB.status == 'active'
        )
    )
    cart = existing.scalar_one_or_none()
    
    if cart:
        # Update existing cart
        cart.items = cart_data.items
        cart.cart_total = cart_data.cart_total
        cart.customer_name = cart_data.customer_name or cart.customer_name
        cart.phone = cart_data.phone or cart.phone
        cart.session_id = cart_data.session_id or cart.session_id
        if user_id:
            cart.user_id = user_id
    else:
        # Create new cart entry
        cart = AbandonedCartDB(
            email=cart_data.email,
            user_id=user_id,
            customer_name=cart_data.customer_name,
            phone=cart_data.phone,
            items=cart_data.items,
            cart_total=cart_data.cart_total,
            session_id=cart_data.session_id,
            status='active'
        )
        db.add(cart)
    
    await db.commit()
    
    return {"success": True, "message": "Cart saved for reminder"}

@api_router.post("/cart/convert")
async def mark_cart_converted(
    email: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    """Mark cart as converted after successful order placement"""
    result = await db.execute(
        select(AbandonedCartDB)
        .where(
            AbandonedCartDB.email == email,
            AbandonedCartDB.status == 'active'
        )
    )
    cart = result.scalar_one_or_none()
    
    if cart:
        cart.status = 'converted'
        await db.commit()
    
    return {"success": True}

# Settings endpoints

@api_router.get("/admin/settings/abandoned-cart")
async def get_abandoned_cart_settings(
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Get abandoned cart settings"""
    result = await db.execute(
        select(AdminSettingsDB).where(AdminSettingsDB.key == "abandoned_cart_minutes")
    )
    setting = result.scalar_one_or_none()
    return {"reminderMinutes": int(setting.value) if setting else 15}

@api_router.post("/admin/settings/abandoned-cart")
async def update_abandoned_cart_settings(
    settings: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Update abandoned cart settings"""
    if "reminderMinutes" in settings:
        minutes = settings["reminderMinutes"]
        if minutes in [5, 10, 15]:
            # Update or create setting
            result = await db.execute(
                select(AdminSettingsDB).where(AdminSettingsDB.key == "abandoned_cart_minutes")
            )
            setting = result.scalar_one_or_none()
            
            if setting:
                setting.value = str(minutes)
            else:
                db.add(AdminSettingsDB(key="abandoned_cart_minutes", value=str(minutes)))
                
            await db.commit()
            return {"success": True, "reminderMinutes": minutes}
            
    return {"success": False, "error": "Invalid timing value"}

@api_router.get("/admin/abandoned-carts")
async def get_abandoned_carts(
    status: Optional[str] = "active",
    timing: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Get list of abandoned carts for admin"""
    from datetime import timedelta
    
    # Use provided timing or fetch from DB
    if timing:
        minutes = timing
    else:
        settings_res = await db.execute(
            select(AdminSettingsDB).where(AdminSettingsDB.key == "abandoned_cart_minutes")
        )
        setting_row = settings_res.scalar_one_or_none()
        minutes = int(setting_row.value) if setting_row else 15
        
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    
    query = select(AbandonedCartDB).order_by(AbandonedCartDB.updated_at.desc())
    
    if status == "active":
        query = query.where(AbandonedCartDB.status == 'active')
    elif status == "converted":
        query = query.where(AbandonedCartDB.status == 'converted')
    # 'all' = no filter
    
    result = await db.execute(query.limit(100))
    carts = result.scalars().all()
    
    return [
        {
            "id": str(c.id),
            "email": c.email,
            "customerName": c.customer_name,
            "phone": c.phone,
            "items": c.items,
            "cartTotal": float(c.cart_total) if c.cart_total else 0,
            "reminderCount": c.reminder_count,
            "lastReminderAt": c.last_reminder_at.isoformat() if c.last_reminder_at else None,
            "status": c.status,
            "eligibleForReminder": bool(c.updated_at and c.updated_at < cutoff and c.reminder_count < 3),
            "createdAt": c.created_at.isoformat() if c.created_at else None,
            "updatedAt": c.updated_at.isoformat() if c.updated_at else None
        }
        for c in carts
    ]

@api_router.post("/admin/email/test")
async def send_test_email(
    email: EmailStr = Body(..., embed=True),
    owner: UserDB = Depends(get_owner)
):
    """Send a test email using SMTP configuration."""
    sent = await send_email_via_vercel(
        to_email=email,
        subject="Test Email - Annya Jewellers",
        body="<p>This is a test email from the SMTP configuration.</p>"
    )
    if not sent:
        raise HTTPException(status_code=500, detail="SMTP send failed. Check server logs for details.")
    return {"success": True}

@api_router.post("/admin/abandoned-carts/send-reminders")
async def send_abandoned_cart_reminders(
    timing: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """
    Send reminder emails to all eligible abandoned carts.
    Eligibility: active, not updated past timing threshold, less than 3 reminders sent
    """
    from datetime import timedelta
    
    # Use provided timing or fetch from DB
    if timing:
        minutes = timing
    else:
        settings_res = await db.execute(
            select(AdminSettingsDB).where(AdminSettingsDB.key == "abandoned_cart_minutes")
        )
        setting_row = settings_res.scalar_one_or_none()
        minutes = int(setting_row.value) if setting_row else 15

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    
    result = await db.execute(
        select(AbandonedCartDB)
        .where(
            AbandonedCartDB.status == 'active',
            AbandonedCartDB.updated_at < cutoff,
            AbandonedCartDB.reminder_count < 3
        )
        .limit(50)
    )
    carts = result.scalars().all()
    
    sent_count = 0
    errors = []
    
    for cart in carts:
        try:
            # Build email content
            items_html = ""
            for item in (cart.items or []):
                items_html += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <img src="{item.get('image', '')}" width="60" height="60" style="border-radius: 4px;" />
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        {item.get('name', 'Product')}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        ₹{item.get('price', 0):,.0f}
                    </td>
                </tr>
                """
            
            email_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #c4ad94; text-align: center;">You left something behind!</h1>
                
                <p>Hi {cart.customer_name or 'there'},</p>
                
                <p>We noticed you left some beautiful items in your cart. They're waiting for you!</p>
                
                <table style="width: 100%; margin: 20px 0;">
                    {items_html}
                </table>
                
                <p style="text-align: center; font-size: 18px;">
                    <strong>Cart Total: ₹{float(cart.cart_total):,.0f}</strong>
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://annyajewellers.com/cart" 
                       style="background: #c4ad94; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Complete Your Purchase
                    </a>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    If you have any questions, reply to this email or call us at +91 9100496169
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                
                <p style="color: #999; font-size: 11px; text-align: center;">
                    Annya Jewellers | Hyderabad, India<br/>
                    <a href="https://annyajewellers.com" style="color: #c4ad94;">www.annyajewellers.com</a>
                </p>
            </div>
            """
            
            # Send email via Vercel
            await send_email_via_vercel(
                to_email=cart.email,
                subject=f"Your cart is waiting for you - Annya Jewellers",
                body=email_body
            )
            
            # Update reminder tracking
            cart.reminder_count += 1
            cart.last_reminder_at = datetime.now(timezone.utc)
            sent_count += 1
            
        except Exception as e:
            errors.append({"email": cart.email, "error": str(e)})
    
    await db.commit()
    
    return {
        "success": True,
        "sent": sent_count,
        "errors": errors
    }

@api_router.post("/admin/abandoned-carts/{cart_id}/send-reminder")
async def send_single_reminder(
    cart_id: str,
    db: AsyncSession = Depends(get_db),
    owner: UserDB = Depends(get_owner)
):
    """Send reminder to a specific abandoned cart"""
    result = await db.execute(
        select(AbandonedCartDB).where(AbandonedCartDB.id == cart_id)
    )
    cart = result.scalar_one_or_none()
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Build simplified email
    items_list = ", ".join([item.get('name', 'Product') for item in (cart.items or [])[:3]])
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #c4ad94;">Complete Your Order</h1>
        <p>Hi {cart.customer_name or 'there'},</p>
        <p>Your cart with {items_list}... is still waiting!</p>
        <p><strong>Total: ₹{float(cart.cart_total):,.0f}</strong></p>
        <p><a href="https://annyajewellers.com/cart" style="background: #c4ad94; color: white; padding: 10px 20px; text-decoration: none;">Complete Purchase</a></p>
    </div>
    """
    
    await send_email_via_vercel(
        to_email=cart.email,
        subject="Complete your order - Annya Jewellers",
        body=email_body
    )
    
    cart.reminder_count += 1
    cart.last_reminder_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"success": True, "message": f"Reminder sent to {cart.email}"}

# -------------------------------------------------------------------------
# Inventory & Transfer Management (New)
# -------------------------------------------------------------------------

# Helper to log movement
async def log_stock_movement(
    db: AsyncSession,
    product_id: str,
    quantity_change: int,
    event_type: str,
    reference_id: str,
    reference_type: str,
    notes: str = None,
    created_by: str = "System"
):
    # Fetch product to update stock and get balance
    result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    product = result.scalar_one_or_none()
    
    if product:
        # Update stock
        product.stock_quantity = (product.stock_quantity or 0) + quantity_change
        
        # Log entry
        entry = InventoryLedgerDB(
            product_id=str(product.id),
            sku=product.sku,
            product_name=product.name,
            event_type=event_type,
            quantity_change=quantity_change,
            running_balance=product.stock_quantity,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=notes,
            created_by=created_by
        )
        db.add(entry)
        # Note: We don't commit here to allow atomic transactions with the caller

@api_router.get("/admin/inventory/ledger")
async def get_inventory_ledger(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get inventory ledger history"""
    stmt = select(InventoryLedgerDB).order_by(InventoryLedgerDB.created_at.desc()).limit(100)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    
    return [
        {
            "id": str(e.id),
            "product_name": e.product_name,
            "sku": e.sku,
            "event_type": e.event_type,
            "qty_delta": e.quantity_change,
            "qty_after": e.running_balance,
            "reference": e.reference_id,
            "note": e.notes,
            "created_at": e.created_at.isoformat()
        }
        for e in entries
    ]

@api_router.post("/admin/inventory/adjust")
async def adjust_inventory(
    adjustment_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Manual inventory adjustment"""
    import uuid
    product_id = adjustment_data.get('product_id')
    new_quantity = int(adjustment_data.get('new_quantity'))
    reason = adjustment_data.get('reason', 'Manual Adjustment')
    notes = adjustment_data.get('notes')
    
    result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    current_qty = product.stock_quantity or 0
    delta = new_quantity - current_qty
    
    if delta == 0:
        return {"message": "No change in quantity"}
        
    await log_stock_movement(
        db, 
        product_id, 
        delta, 
        'adjust', 
        f"ADJ-{uuid.uuid4().hex[:6].upper()}", 
        'manual', 
        f"{reason}: {notes}" if notes else reason,
        owner.full_name
    )
    
    await db.commit()
    return {"message": "Inventory adjusted successfully"}

@api_router.get("/admin/locations")
async def get_locations(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all locations"""
    result = await db.execute(select(LocationDB).where(LocationDB.is_active == True))
    locations = result.scalars().all()
    return locations

@api_router.post("/admin/locations")
async def create_location(
    location_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new location"""
    new_location = LocationDB(
        name=location_data.get('name'),
        type=location_data.get('type', 'store'),
        address=location_data.get('address')
    )
    db.add(new_location)
    await db.commit()
    return new_location

@api_router.get("/admin/transfers")
async def get_transfers(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all stock transfers"""
    stmt = select(TransferDB).order_by(TransferDB.created_at.desc())
    result = await db.execute(stmt)
    transfers = result.scalars().all()
    
    loc_result = await db.execute(select(LocationDB))
    locations = {str(l.id): l.name for l in loc_result.scalars().all()}
    
    return [
        {
            "id": t.transfer_number,
            "uuid": str(t.id),
            "from_location": locations.get(t.from_location_id, "Unknown"),
            "to_location": locations.get(t.to_location_id, "Unknown"),
            "from_location_id": t.from_location_id,
            "to_location_id": t.to_location_id,
            "items_count": t.items_count,
            "items": t.items,
            "status": t.status,
            "created_at": t.created_at.isoformat()
        }
        for t in transfers
    ]

@api_router.post("/admin/transfers")
async def create_transfer(
    transfer_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new transfer"""
    import random
    import string
    suffix = ''.join(random.choices(string.digits, k=6))
    trf_id = f"TRF-{suffix}"
    
    items = transfer_data.get('items', [])
    items_count = sum(int(item.get('quantity', 0)) for item in items)
    
    # Log stock movements (Net zero change to global stock, but records history)
    for item in items:
        p_id = item.get('product_id')
        qty = int(item.get('quantity', 0))
        if p_id and qty > 0:
             # Out from Source
             await log_stock_movement(
                 db, p_id, -qty, 'transfer_out', trf_id, 'transfer', 
                 f"Transfer to {transfer_data.get('toLocationId')}", owner.full_name
             )
             # In to Dest
             await log_stock_movement(
                 db, p_id, qty, 'transfer_in', trf_id, 'transfer', 
                 f"Transfer from {transfer_data.get('fromLocationId')}", owner.full_name
             )

    new_transfer = TransferDB(
        transfer_number=trf_id,
        from_location_id=transfer_data.get('fromLocationId'),
        to_location_id=transfer_data.get('toLocationId'),
        status='pending',
        items=items,
        items_count=items_count,
        notes=transfer_data.get('notes'),
        created_by=owner.full_name
    )
    
    db.add(new_transfer)
    await db.commit()
    return {"message": "Transfer created", "id": trf_id}

@api_router.put("/admin/transfers/{transfer_id}/status")
async def update_transfer_status(
    transfer_id: str,
    status_data: dict = Body(...),
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update transfer status"""
    stmt = select(TransferDB).where(TransferDB.transfer_number == transfer_id)
    result = await db.execute(stmt)
    transfer = result.scalar_one_or_none()
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    transfer.status = status_data.get('status')
    await db.commit()
    return {"message": "Status updated"}

# ============================================
# PURCHASE ORDERS
# ============================================

class POItem(BaseModel):
    productId: str
    sku: str
    name: str
    quantity: int
    unitCost: float

class POCreate(BaseModel):
    vendorId: str
    items: List[POItem]
    notes: Optional[str] = None
    expectedDate: Optional[str] = None

@api_router.get("/admin/purchase-orders")
async def get_purchase_orders(
    status: Optional[str] = None,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PurchaseOrderDB).order_by(PurchaseOrderDB.created_at.desc())
    if status and status != 'all':
        stmt = stmt.where(PurchaseOrderDB.status == status)
    
    result = await db.execute(stmt)
    pos = result.scalars().all()
    
    return [{
        "id": str(po.id),
        "po_number": po.po_number,
        "vendor_name": po.vendor_name,
        "status": po.status,
        "total_amount": float(po.total_amount) if po.total_amount else 0,
        "items_count": po.items_count,
        "received_count": po.received_count,
        "created_at": po.created_at.isoformat(),
        "expected_date": po.expected_date.isoformat() if po.expected_date else None
    } for po in pos]

@api_router.post("/admin/purchase-orders")
async def create_purchase_order(
    po_data: POCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    import uuid as uuid_lib
    import random
    from datetime import datetime
    
    # Verify vendor
    res = await db.execute(select(VendorDB).where(VendorDB.id == po_data.vendorId))
    vendor = res.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # Calculate totals
    total_amount = 0
    total_items = 0
    items_json = []
    
    for item in po_data.items:
        cost = item.quantity * item.unitCost
        total_amount += cost
        total_items += item.quantity
        items_json.append({
            "product_id": item.productId,
            "sku": item.sku,
            "name": item.name,
            "quantity": item.quantity,
            "unit_cost": item.unitCost,
            "total_cost": cost,
            "received_qty": 0
        })
        
    # Generate PO Number
    year = datetime.now().year
    po_number = f"PO-{year}-{random.randint(1000, 9999)}"
    
    # Parse date
    exp_date = None
    if po_data.expectedDate:
        try:
            exp_date = datetime.fromisoformat(po_data.expectedDate.replace('Z', '+00:00'))
        except:
            pass

    new_po = PurchaseOrderDB(
        id=uuid_lib.uuid4(),
        po_number=po_number,
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        status="ordered",
        total_amount=total_amount,
        items_count=total_items,
        items=items_json,
        notes=po_data.notes,
        expected_date=exp_date
    )
    
    db.add(new_po)
    await db.commit()
    return {"success": True, "id": str(new_po.id), "po_number": po_number}

# ============================================
# SEO: Sitemap Generation
# ============================================

@app.get("/sitemap.xml")
async def generate_sitemap(db: AsyncSession = Depends(get_db)):
    """Generate dynamic sitemap.xml for SEO"""
    from fastapi.responses import Response
    from datetime import datetime
    
    base_url = os.getenv("FRONTEND_URL", "https://annyajewellers.com")
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/products", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/contact", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/faq", "priority": "0.6", "changefreq": "monthly"},
        {"loc": "/book-appointment", "priority": "0.8", "changefreq": "weekly"},
    ]
    
    # Get all active products
    result = await db.execute(
        select(ProductDB.id, ProductDB.updated_at)
        .where(ProductDB.status == 'active')
        .order_by(ProductDB.created_at.desc())
        .limit(1000)
    )
    products = result.all()
    
    # Get all categories
    cat_result = await db.execute(
        select(ProductDB.category).distinct().where(ProductDB.status == 'active')
    )
    categories = [row[0] for row in cat_result.all() if row[0]]
    
    # Build XML
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add static pages
    for page in static_pages:
        xml += f"""  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n"""
    
    # Add category pages
    for cat in categories:
        xml += f"""  <url>
    <loc>{base_url}/products?category={cat.replace(" ", "%20")}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n"""
    
    # Add product pages
    for product_id, updated_at in products:
        lastmod = updated_at.strftime("%Y-%m-%d") if updated_at else datetime.now().strftime("%Y-%m-%d")
        xml += f"""  <url>
    <loc>{base_url}/product/{product_id}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n"""
    
    xml += '</urlset>'
    
    return Response(content=xml, media_type="application/xml")

# ============================================
# INVENTORY RESERVATION SYSTEM
# ============================================

class ReservationRequest(BaseModel):
    product_id: str
    session_id: str
    quantity: int = 1  # Support reserving multiple quantities

@api_router.post("/cart/reserve")
async def reserve_product(data: ReservationRequest, db: AsyncSession = Depends(get_db)):
    """
    Reserve a product for a specific session.
    Atomic locking prevents race conditions.
    Uses separate reservations table for accurate tracking.
    """
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func as sql_func
    
    logger.info(f"🔒 Attempting reservation for Product: {data.product_id}, Qty: {data.quantity}, Session: {data.session_id}")
    
    import uuid
    try:
        product_uuid = uuid.UUID(data.product_id)
    except ValueError:
        logger.error(f"❌ Invalid UUID format: {data.product_id}")
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    now = datetime.now(timezone.utc)
    expiry = now + timedelta(minutes=5)
    
    try:
        # 1. Clean up expired reservations first
        await db.execute(
            ProductReservationDB.__table__.delete().where(
                ProductReservationDB.expires_at < now
            )
        )
        
        # 2. Lock the product row
        stmt = select(ProductDB).where(ProductDB.id == product_uuid).with_for_update()
        result = await db.execute(stmt)
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # 3. Check if product is active
        if product.status != 'active':
            return JSONResponse(
                status_code=409, 
                content={"success": False, "message": "Product is not available"}
            )
        
        # 4. Check for existing reservation by this session
        existing_res = await db.execute(
            select(ProductReservationDB).where(
                ProductReservationDB.product_id == data.product_id,
                ProductReservationDB.session_id == data.session_id,
                ProductReservationDB.expires_at > now
            )
        )
        existing = existing_res.scalar_one_or_none()
        
        if existing:
            # Already reserved by this session - extend the reservation
            existing.expires_at = now + timedelta(minutes=5)
            existing.quantity = data.quantity
            await db.commit()
            return {
                "success": True,
                "message": "Reservation extended",
                "reserved_until": existing.expires_at.isoformat()
            }
        
        # 5. Count active reservations for this product (from OTHER sessions)
        reserved_count_result = await db.execute(
            select(sql_func.coalesce(sql_func.sum(ProductReservationDB.quantity), 0))
            .where(
                ProductReservationDB.product_id == data.product_id,
                ProductReservationDB.expires_at > now
            )
        )
        total_reserved = int(reserved_count_result.scalar() or 0)
        
        # 6. Calculate available quantity
        available = product.stock_quantity - total_reserved
        
        if available <= 0:
            return JSONResponse(
                status_code=409, 
                content={"success": False, "message": "Product is sold out or all units are currently reserved"}
            )
        
        if data.quantity > available:
            return JSONResponse(
                status_code=409, 
                content={
                    "success": False, 
                    "message": f"Only {available} units available for reservation",
                    "available": available
                }
            )
        
        # 7. Create new reservation
        expiry = now + timedelta(minutes=5)
        reservation = ProductReservationDB(
            product_id=data.product_id,
            session_id=data.session_id,
            quantity=data.quantity,
            expires_at=expiry
        )
        db.add(reservation)
        await db.commit()
        
        return {
            "success": True,
            "message": "Product reserved",
            "reserved_until": expiry.isoformat(),
            "quantity_reserved": data.quantity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Reservation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cart/release")
async def release_product(data: ReservationRequest, db: AsyncSession = Depends(get_db)):
    """
    Release a reservation manually (e.g., removed from cart)
    """
    try:
        # Delete reservation for this session and product
        await db.execute(
            ProductReservationDB.__table__.delete().where(
                ProductReservationDB.product_id == data.product_id,
                ProductReservationDB.session_id == data.session_id
            )
        )
        await db.commit()
        return {"success": True, "message": "Reservation released"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cart/check-availability/{product_id}")
async def check_product_availability(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check real-time availability of a product (stock minus active reservations)
    """
    from datetime import datetime, timezone
    from sqlalchemy import func as sql_func
    
    now = datetime.now(timezone.utc)
    
    # Get product
    result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Count active reservations
    reserved_result = await db.execute(
        select(sql_func.coalesce(sql_func.sum(ProductReservationDB.quantity), 0))
        .where(
            ProductReservationDB.product_id == product_id,
            ProductReservationDB.expires_at > now
        )
    )
    total_reserved = int(reserved_result.scalar() or 0)
    
    available = max(0, product.stock_quantity - total_reserved)
    
    return {
        "productId": product_id,
        "stockQuantity": product.stock_quantity,
        "reserved": total_reserved,
        "available": available,
        "isSoldOut": available == 0
    }

# Include router AFTER all endpoints are defined
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
