"""
Annya Jewellers E-commerce Backend - Clean PostgreSQL Version
Built from scratch with modern FastAPI and SQLAlchemy
"""
from fastapi import FastAPI, Depends, HTTPException, status, Body, Query, APIRouter, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import text, func, update, delete, or_, and_
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
from db_models import UserDB, OrderDB, ProductDB, VendorDB, CouponDB

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

# Initialize Database on Startup
@app.on_event("startup")
async def startup_event():
    await create_tables()

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

def send_email_sync(to_email: str, subject: str, body: str, is_html: bool = False):
    """Blocking SMTP email function (to be run in thread)"""
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = SMTP_PASSWORD
    from_email = SMTP_FROM_EMAIL or smtp_user
    
    if not smtp_user or not smtp_password:
        logger.warning(f"SMTP not configured. Would send to {to_email}: {subject}")
        print(f"DEBUG EMAIL: To: {to_email}, Subject: {subject}")
        return
    
    try:
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        
        content_type = 'html' if is_html else 'plain'
        msg.attach(MIMEText(body, content_type))
        
        context = ssl.create_default_context()
        
        # Try SSL first (port 465), then TLS (port 587)
        if smtp_port == 465:
            logger.info(f"Connecting to {smtp_host}:{smtp_port} using SSL...")
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=60) as server:
                logger.info("SSL Connection established. Logging in...")
                server.login(smtp_user, smtp_password)
                logger.info("Logged in. Sending message...")
                server.send_message(msg)
        else:
            logger.info(f"Connecting to {smtp_host}:{smtp_port} using TLS...")
            with smtplib.SMTP(smtp_host, smtp_port, timeout=60) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                logger.info("TLS Connection established. Logging in...")
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Auth failed for {to_email}: {e}")
        print(f"SMTP Auth Error: Check username/password in .env")
        raise
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error sending to {to_email}: {e}")
        print(f"SMTP Error: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        print(f"Email error: {e}")
        raise

async def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """Async wrapper for blocking email function"""
    try:
        # Run blocking SMTP call in a separate thread so it doesn't freeze the main loop
        await asyncio.to_thread(send_email_sync, to_email, subject, body, is_html)
    except Exception as e:
        logger.error(f"Async email wrapper failed: {e}")
        # Re-raise so the caller knows it failed
        raise

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
    search: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get all products with optional filtering"""
    query = select(ProductDB).where(ProductDB.status == 'active')
    
    if category:
        query = query.where(ProductDB.category == category)
    
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
async def send_otp(data: OTPRequest):
    """Send OTP to email or phone"""
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
            await send_email(
                to_email=data.email,
                subject="Your Annya Jewellers Verification Code",
                body=f"""<div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #c4ad94;">Annya Jewellers</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 36px; letter-spacing: 8px; color: #333;">{otp}</h1>
                    <p>This code expires in 5 minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>""",
                is_html=True
            )
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
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
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all customers (users with role='customer')"""
    result = await db.execute(
        select(UserDB).where(UserDB.role == 'customer')
        .order_by(UserDB.created_at.desc())
    )
    customers = result.scalars().all()
    
    # Get order counts and total spent for each customer
    customer_list = []
    for customer in customers:
        # Count orders
        order_count_result = await db.execute(
            select(func.count()).select_from(OrderDB)
            .where(OrderDB.customer_id == str(customer.id))
        )
        order_count = order_count_result.scalar() or 0
        
        # Sum total spent
        total_spent_result = await db.execute(
            select(func.sum(OrderDB.grand_total))
            .where(OrderDB.customer_id == str(customer.id))
        )
        total_spent = total_spent_result.scalar() or 0
        
        customer_list.append({
            "id": str(customer.id),
            "name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "orders": order_count,
            "totalSpent": float(total_spent),
            "createdAt": customer.created_at.isoformat() if customer.created_at else None
        })
    
    return customer_list

# ============================================
# DASHBOARD ANALYTICS (real data)
# ============================================

@api_router.get("/navigation")
async def get_navigation_tree(db: AsyncSession = Depends(get_db)):
    """
    Returns the navigation structure with dynamic featured products.
    If no products found for a category, featured list is empty (hiding mock images).
    """
    from sqlalchemy.sql.expression import func
    
    # Helper to get 2 random products for a category/keyword
    async def get_featured(keywords):
        # Build search filters
        filters = []
        for keyword in keywords:
            filters.append(ProductDB.category.ilike(f"%{keyword}%"))
            filters.append(ProductDB.subcategory.ilike(f"%{keyword}%"))
            filters.append(ProductDB.name.ilike(f"%{keyword}%"))
            
        stmt = (
            select(ProductDB)
            .where(
                and_(
                    or_(*filters),
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
            {
                "title": p.name,
                "link": f"/product/{p.id}",
                "image": p.image
            } 
            for p in products
        ]

    # Define default navigation structure
    default_nav_structure = [
        {
            "name": 'ENGAGEMENT RINGS',
            "keywords": ["engagement"],
            "columns": [
                {"title": None, "items": ['Solitaire Diamond Rings', 'Halo Diamond Rings', 'Three Stone Diamond Rings', 'Lab Grown Diamond Rings', 'All Engagement Rings']},
                {"title": 'DIAMOND CUT', "items": ['Round', 'Oval', 'Emerald', 'Pear', 'Other']}
            ]
        },
        {
            "name": 'DIAMOND JEWELLERY',
            "keywords": ["diamond"],
            "columns": [
                {"title": 'JEWELLERY TYPE', "items": ['Diamond Eternity Rings', 'Diamond Dress Rings', 'Diamond Pendants', 'Diamond Bracelets', 'Diamond Bangles', 'Diamond Earrings', 'Diamond Necklets', 'All Diamond Jewellery']},
                {"title": 'GEMSTONE TYPE', "items": ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Pearl', 'All Gemstone Jewellery']}
            ]
        },
        {
            "name": 'WEDDING RINGS',
            "keywords": ["wedding", "band"],
            "columns": [
                {"title": 'LADIES WEDDING RINGS', "items": ['Diamond Rings', 'White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings']},
                {"title": 'GENTS WEDDING RINGS', "items": ['White Gold Rings', 'Yellow Gold Rings', 'Platinum Rings', 'All Wedding Rings']}
            ]
        },
        {
            "name": 'GOLD JEWELLERY',
            "keywords": ["gold"],
            "columns": [
                {"title": None, "items": ['Gold Pendants', 'Gold Bracelets', 'Gold Bangles', 'Gold Earrings', 'Gold Necklets']},
                {"title": None, "items": ['Gold Rings', 'Gold Chains', 'All Gold Jewellery']}
            ]
        },
        {
            "name": 'SILVER JEWELLERY',
            "keywords": ["silver"],
            "columns": [
                {"title": None, "items": ['Silver Rings', 'Silver Pendants', 'Silver Bracelets']},
                {"title": None, "items": ['Silver Earrings', 'Silver Necklets', 'All Silver Jewellery']}
            ]
        }
    ]

    # Try to load saved navigation from config file
    nav_structure = default_nav_structure
    try:
        if os.path.exists(NAVIGATION_FILE):
            with open(NAVIGATION_FILE, 'r') as f:
                saved_nav = json.load(f)
                if saved_nav and len(saved_nav) > 0:
                    # Add keywords based on category name for featured product lookup
                    keyword_map = {
                        "ENGAGEMENT RINGS": ["engagement"],
                        "DIAMOND JEWELLERY": ["diamond"],
                        "WEDDING RINGS": ["wedding", "band"],
                        "GOLD JEWELLERY": ["gold"],
                        "SILVER JEWELLERY": ["silver"]
                    }
                    nav_structure = []
                    for item in saved_nav:
                        nav_structure.append({
                            "name": item.get("name", ""),
                            "keywords": keyword_map.get(item.get("name", "").upper(), [item.get("name", "").lower().split()[0]]),
                            "columns": item.get("columns", [])
                        })
    except Exception as e:
        logger.error(f"Error loading saved navigation: {e}")
        nav_structure = default_nav_structure

    # Populate featured arrays dynamically
    final_nav = []
    for item in nav_structure:
        featured_items = await get_featured(item.get("keywords", []))
        final_nav.append({
            "name": item["name"],
            "columns": item["columns"],
            "featured": featured_items  # Will be list of 0-2 items
        })
        
    return final_nav


@api_router.get("/admin/dashboard")
async def get_dashboard_stats(
    period: str = "7d",
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics with percentage changes"""
    from datetime import datetime, timedelta, timezone
    
    # Calculate date ranges
    days_map = {"today": 1, "7d": 7, "30d": 30, "90d": 90}
    days = days_map.get(period, 7)
    
    now = datetime.now(timezone.utc)
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    
    async def get_period_stats(start_time, end_time):
        # Gross sales
        gross_sales_res = await db.execute(
            select(func.sum(OrderDB.grand_total))
            .where(and_(OrderDB.created_at >= start_time, OrderDB.created_at < end_time))
        )
        gross_sales = gross_sales_res.scalar() or 0
        
        # Net sales (paid)
        net_sales_res = await db.execute(
            select(func.sum(OrderDB.grand_total))
            .where(and_(
                OrderDB.created_at >= start_time, 
                OrderDB.created_at < end_time,
                OrderDB.payment_status == 'paid'
            ))
        )
        net_sales = net_sales_res.scalar() or 0
        
        # Gross profit
        gross_profit_res = await db.execute(
            select(func.sum(OrderDB.gross_profit))
            .where(and_(
                OrderDB.created_at >= start_time,
                OrderDB.created_at < end_time,
                OrderDB.payment_status == 'paid'
            ))
        )
        gross_profit = gross_profit_res.scalar() or 0
        
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
    # Order count
    order_count_result = await db.execute(
        select(func.count()).select_from(OrderDB)
        .where(OrderDB.created_at >= current_start)
    )
    order_count = order_count_result.scalar() or 0
    
    # Pending orders count
    pending_count_result = await db.execute(
        select(func.count()).select_from(OrderDB)
        .where(
            and_(
                OrderDB.created_at >= current_start,
                OrderDB.status == 'pending'
            )
        )
    )
    pending_count = pending_count_result.scalar() or 0
    
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
        "orders_fulfilled": 0, # Placeholder or implement query
        "orders_returned": 0, # Placeholder or implement query
        
        "inventory_value": float(inventory_value),
        "low_stock_count": low_stock_count,
        "stockout_count": stockout_count
    }

@api_router.get("/admin/analytics/sales")
async def get_sales_analytics(
    days: int = 7,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get sales trend data"""
    from datetime import datetime, timedelta, timezone
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get daily sales
    # Get daily sales
    # Use text() for GROUP BY to avoid SQLAlchemy/Postgres expression matching issues
    from sqlalchemy import text
    result = await db.execute(
        select(
            func.date_trunc('day', OrderDB.created_at).label('date'),
            func.sum(OrderDB.grand_total).label('sales'),
            func.sum(OrderDB.gross_profit).label('profit')
        )
        .where(OrderDB.created_at >= start_date)
        .group_by(text('date'))
        .order_by(text('date'))
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

@api_router.get("/admin/analytics/top-products")
async def get_top_products(
    days: int = 7,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get top selling products"""
    from datetime import datetime, timedelta, timezone
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Query orders and extract product info from items JSONB
    result = await db.execute(
        select(OrderDB)
        .where(OrderDB.created_at >= start_date)
    )
    orders = result.scalars().all()
    
    # Aggregate product sales
    product_sales = {}
    for order in orders:
        if order.items:
            for item in order.items:
                product_id = item.get('id') or item.get('productId')
                if product_id:
                    if product_id not in product_sales:
                        product_sales[product_id] = {
                            "name": item.get('name', 'Unknown'),
                            "quantity": 0,
                            "revenue": 0
                        }
                    quantity = item.get('quantity', 1)
                    price = item.get('price', 0)
                    product_sales[product_id]["quantity"] += quantity
                    product_sales[product_id]["revenue"] += quantity * price
    
    # Sort by quantity and return top 10
    top_products = sorted(
        [{"id": k, **v} for k, v in product_sales.items()],
        key=lambda x: x["quantity"],
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
        "name": p.name,
        "stockQuantity": p.stock_quantity,
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


@api_router.get("/admin/products")
async def get_products(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all products for admin dashboard"""
    # Fetch products with newest first
    stmt = select(ProductDB).order_by(ProductDB.created_at.desc())
    result = await db.execute(stmt)
    products = result.scalars().all()
    
    return [
        {
            "id": str(p.id),
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "image": p.image,
            "price": p.selling_price,
            "inventory": p.stock_quantity,
            "inStock": p.in_stock,
            "status": p.status,
            "sales": 0, # Placeholder for now
            "rating": 5.0 # Placeholder
        }
        for p in products
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
        "isActive": v.is_active
    } for v in vendors]

@api_router.post("/admin/vendors")
async def create_vendor(
    vendor_data: VendorCreate,
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create new vendor"""
    import uuid as uuid_lib
    import random
    new_vendor = VendorDB(
        id=str(uuid_lib.uuid4()),
        name=vendor_data.name,
        code=vendor_data.code or f"VND-{random.randint(100, 999)}",
        email=vendor_data.email,
        phone=vendor_data.phone,
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

# Using existing send_email function for consistency
# async def send_email_background(to_email: str, subject: str, body: str):
#     """Deprecated: Use send_email directly"""
#     await send_email(to_email, subject, body, is_html=True)

@api_router.get("/admin/orders")
async def get_admin_orders(
    owner: UserDB = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all orders for admin dashboard"""
    result = await db.execute(
        select(OrderDB).order_by(OrderDB.created_at.desc())
    )
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
        order.status = status_data["status"]
        
    await db.commit()
    return {"success": True, "status": order.status}

@api_router.post("/orders")
async def place_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: UserDB = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Place a new order"""
    try:
        import uuid as uuid_lib
        from datetime import datetime
        
        # 1. Calculate totals and validate stock
        total_amount = 0
        total_cost = 0
        items_json = []
        
        for item in order_data.items:
            # Fetch product
            result = await db.execute(select(ProductDB).where(ProductDB.id == item.productId))
            product = result.scalar_one_or_none()
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.productId} not found")
                
            if product.stock_quantity < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
                
            # Calculate price
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
            
            # Decrement stock
            product.stock_quantity -= item.quantity
            if product.stock_quantity <= 0:
                product.in_stock = False
                
        if product.stock_quantity <= 0:
                product.in_stock = False
                
        # 2. Apply Coupon
        discount_amount = 0
        coupon = None
        
        if order_data.couponCode:
            # Verify coupon again for security
            result = await db.execute(
                select(CouponDB).where(
                    CouponDB.code == order_data.couponCode.upper(),
                    CouponDB.is_active == True
                )
            )
            coupon = result.scalar_one_or_none()
            
            if coupon:
                # Check constraints
                if total_amount >= float(coupon.min_order_value):
                    if coupon.type == 'percent':
                        calc_discount = (total_amount * float(coupon.value)) / 100
                        if coupon.max_discount and calc_discount > float(coupon.max_discount):
                            calc_discount = float(coupon.max_discount)
                        discount_amount = calc_discount
                    else:
                        discount_amount = float(coupon.value)
                    
                    # Cap at total amount
                    if discount_amount > total_amount:
                        discount_amount = total_amount
                        
                    # Increment usage
                    coupon.usage_count += 1
        
        # 3. Create Order
        shipping_cost = 0 if total_amount > 5000 else 100
        
        # Final calculation
        tax_total = float(total_amount - discount_amount) * 0.03 # Est 3% Tax
        grand_total = float(total_amount - discount_amount) + shipping_cost
        
        # Generate Order Number
        
        # Generate Order Number
        order_number = f"ORD-{uuid_lib.uuid4().hex[:8].upper()}"
        
        new_order = OrderDB(
            id=uuid_lib.uuid4(),
            order_number=order_number,
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
            gross_profit=grand_total - total_cost, # Simplified
            net_profit=grand_total - total_cost,
            
            status="pending",
            payment_status="pending", # COD
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
        background_tasks.add_task(send_email, current_user.email, f"Order Confirmation #{order_number}", email_body, True)
        
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
        "shippingAddress": order.shipping_address
    }

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
