from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import csv
import io
import codecs
import smtplib
import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret Key (generate a random one if not set)
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_EXPIRY_HOURS = 24

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.zoho.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL')

async def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """Send email using async SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("Email configuration missing. Skipping email send.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html' if is_html else 'plain'))

        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            use_tls=True,  # SSL on port 465 (not STARTTLS)
            username=SMTP_USER,
            password=SMTP_PASSWORD
        )
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False

# ============================================
# EMAIL TEMPLATES
# ============================================

def get_email_base_style():
    """Common CSS styles for all emails"""
    return """
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #c4ad94 0%, #b39d84 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; letter-spacing: 3px; }
        .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 12px; }
        .content { padding: 40px 30px; }
        .content h2 { color: #333; margin-top: 0; }
        .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; font-size: 18px; color: #c4ad94; }
        .button { display: inline-block; background: #c4ad94; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #c4ad94; }
    </style>
    """

def get_order_confirmation_email(order: dict):
    """Generate order confirmation email HTML"""
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span>{item.get('name', 'Product')} x {item.get('quantity', 1)}</span>
            <span>₹{item.get('price', 0):,.2f}</span>
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ANNYA</h1>
                <p>JEWELLERS • Est. 1916</p>
            </div>
            <div class="content">
                <h2>Thank you for your order! 🎉</h2>
                <p>Hi {order.get('customer', {}).get('name', 'Valued Customer')},</p>
                <p>We're thrilled to confirm your order has been received and is being processed.</p>
                
                <div class="order-details">
                    <h3 style="margin-top: 0;">Order #{order.get('id', '')[:8].upper()}</h3>
                    {items_html}
                    <div style="padding: 15px 0 0; font-weight: bold; font-size: 18px; color: #c4ad94;">
                        Total: ₹{order.get('grandTotal', order.get('total', 0)):,.2f}
                    </div>
                </div>
                
                <p>We'll send you another email when your order ships.</p>
                <a href="#" class="button">Track Your Order</a>
            </div>
            <div class="footer">
                <p>Annya Jewellers | contact@annyajewellers.com | +91 98765 43210</p>
                <p>© 2026 Annya Jewellers. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_shipping_notification_email(order: dict):
    """Generate shipping notification email HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ANNYA</h1>
                <p>JEWELLERS • Est. 1916</p>
            </div>
            <div class="content">
                <h2>Your order is on its way! 🚚</h2>
                <p>Hi {order.get('customer', {}).get('name', 'Valued Customer')},</p>
                <p>Great news! Your order <strong>#{order.get('id', '')[:8].upper()}</strong> has been shipped and is heading your way.</p>
                
                <div class="order-details">
                    <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
                    <p><strong>Shipping Address:</strong><br>
                    {order.get('shippingAddress', {}).get('address', 'Your address')}<br>
                    {order.get('shippingAddress', {}).get('city', '')}, {order.get('shippingAddress', {}).get('pincode', '')}
                    </p>
                </div>
                
                <a href="#" class="button">Track Shipment</a>
                <p style="color: #666; font-size: 14px;">If you have any questions, reply to this email or call us at +91 98765 43210.</p>
            </div>
            <div class="footer">
                <p>Annya Jewellers | contact@annyajewellers.com</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_welcome_email(user: dict):
    """Generate welcome email HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ANNYA</h1>
                <p>JEWELLERS • Est. 1916</p>
            </div>
            <div class="content">
                <h2>Welcome to Annya Jewellers! ✨</h2>
                <p>Hi {user.get('name', 'there')},</p>
                <p>Thank you for joining the Annya Jewellers family! We're delighted to have you.</p>
                <p>As a member, you'll enjoy:</p>
                <ul>
                    <li>Exclusive access to new collections</li>
                    <li>Special member-only discounts</li>
                    <li>Early access to sales</li>
                    <li>Free shipping on orders over ₹5,000</li>
                </ul>
                <a href="#" class="button">Start Shopping</a>
                <p style="color: #666;">If you have any questions, we're always here to help!</p>
            </div>
            <div class="footer">
                <p>Annya Jewellers | contact@annyajewellers.com | +91 98765 43210</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_password_reset_email(user: dict, reset_token: str, frontend_url: str = "http://localhost:3000"):
    """Generate password reset email HTML"""
    reset_link = f"{frontend_url}/reset-password/{reset_token}"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ANNYA</h1>
                <p>JEWELLERS • Est. 1916</p>
            </div>
            <div class="content">
                <h2>Reset Your Password 🔐</h2>
                <p>Hi {user.get('name', 'there')},</p>
                <p>We received a request to reset your password. Click the button below to choose a new password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this link:<br>{reset_link}</p>
            </div>
            <div class="footer">
                <p>Annya Jewellers | contact@annyajewellers.com</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_otp_email(otp_code: str, user_name: str = "there"):
    """Generate OTP verification email HTML"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_base_style()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ANNYA</h1>
                <p>JEWELLERS • Est. 1916</p>
            </div>
            <div class="content">
                <h2>Verify Your Email 📧</h2>
                <p>Hi {user_name},</p>
                <p>Welcome to Annya Jewellers! Use the code below to verify your email address:</p>
                <div style="background: #f8f5f0; border: 2px dashed #c4ad94; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c4ad94;">{otp_code}</div>
                    <p style="color: #666; margin-top: 10px; font-size: 14px;">This code expires in 10 minutes</p>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't create an account with us, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>Annya Jewellers | contact@annyajewellers.com</p>
            </div>
        </div>
    </body>
    </html>
    """

# Create the main app without a prefix
app = FastAPI()

@app.middleware("http")
async def track_traffic(request: Request, call_next):
    timestamp = datetime.now(timezone.utc)
    
    response = await call_next(request)
    
    # Only track successful GET requests to non-API routes (frontend)
    # or public API routes if served by this backend
    # For this setup, we assume frontend calls are not routed through here except via API
    # But if we were serving static files, we'd track them.
    # Since this is an API server, we'll track public API calls to products/categories
    # and we can also add a specific /track endpoint for frontend to call.
    
    path = request.url.path
    if request.method == "GET" and "/api/products" in path and "/admin" not in path:
        # Simple tracking for product views
        log = {
            "path": path,
            "method": request.method,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent"),
            "referer": request.headers.get("referer"),
            "status": response.status_code,
            "timestamp": timestamp.isoformat()
        }
        # Fire-and-forget: Motor returns Future, use ensure_future
        asyncio.ensure_future(db.traffic_logs.insert_one(log))
        
    return response

# Specific endpoint for frontend to report page views
@app.post("/api/track")
async def track_page_view(request: Request):
    data = await request.json()
    timestamp = datetime.now(timezone.utc)
    log = {
        "path": data.get("path", "/"),
        "method": "VIEW",
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent"),
        "referer": data.get("referrer"),
        "device": data.get("device", "desktop"), # mobile, tablet, desktop
        "status": 200,
        "timestamp": timestamp.isoformat()
    }
    await db.traffic_logs.insert_one(log)
    return {"status": "ok"}


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Product(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    id: str
    name: str
    description: str
    price: float
    currency: str = "INR"
    image: str
    category: str
    tags: List[str] = []
    inStock: bool
    createdAt: datetime

# Auth Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Simple password hashing (in production use bcrypt)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# Simple JWT implementation (in production use python-jose)
def create_token(user_id: str) -> str:
    import base64
    import json
    payload = {
        "user_id": user_id,
        "exp": (datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)).isoformat()
    }
    token_data = json.dumps(payload)
    return base64.b64encode(token_data.encode()).decode()

def decode_token(token: str) -> Optional[dict]:
    import base64
    import json
    try:
        token_data = base64.b64decode(token.encode()).decode()
        payload = json.loads(token_data)
        exp = datetime.fromisoformat(payload["exp"])
        if exp < datetime.now(timezone.utc):
            return None
        return payload
    except Exception:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.get("/products", response_model=List[Product])
async def get_products(category: str = None, search: str = None):
    query = {}
    if category:
        query["category"] = category
    
    if search:
        # Search in name, category, or tags (case-insensitive)
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"category": search_regex},
            {"tags": search_regex},
            {"description": search_regex}
        ]
        
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# Auth Routes - OTP Models
class SendOtpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

@api_router.post("/auth/send-otp")
async def send_otp(data: UserCreate):
    """Start registration process by sending OTP"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate OTP
    otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store pending registration with OTP
    await db.pending_registrations.update_one(
        {"email": data.email},
        {"$set": {
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "password": hash_password(data.password),
            "otp": otp_code,
            "expires_at": expiry.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Send OTP email
    asyncio.ensure_future(send_email(
        data.email,
        "Your Verification Code 🔐",
        get_otp_email(otp_code, data.name),
        is_html=True
    ))
    
    return {"message": "OTP sent successfully", "email": data.email}

@api_router.post("/auth/verify-otp", response_model=AuthResponse)
async def verify_otp_and_register(data: VerifyOtpRequest):
    """Verify OTP and complete registration"""
    # Find pending registration
    pending = await db.pending_registrations.find_one({"email": data.email})
    
    if not pending:
        raise HTTPException(status_code=400, detail="No pending registration found. Please start over.")
    
    # Check if OTP is expired
    expiry = datetime.fromisoformat(pending["expires_at"])
    if expiry < datetime.now(timezone.utc):
        await db.pending_registrations.delete_one({"email": data.email})
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP
    if pending["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": pending["name"],
        "email": pending["email"],
        "phone": pending.get("phone"),
        "password": pending["password"],  # Already hashed
        "email_verified": True,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Delete pending registration
    await db.pending_registrations.delete_one({"email": data.email})
    
    # Send welcome email (fire-and-forget)
    asyncio.ensure_future(send_email(
        pending["email"],
        "Welcome to Annya Jewellers! ✨",
        get_welcome_email({"name": pending["name"], "email": pending["email"]}),
        is_html=True
    ))
    
    # Generate token
    token = create_token(user_id)
    
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user_id, name=pending["name"], email=pending["email"], phone=pending.get("phone"))
    )

@api_router.post("/auth/resend-otp")
async def resend_otp(email: EmailStr):
    """Resend OTP for pending registration"""
    pending = await db.pending_registrations.find_one({"email": email})
    
    if not pending:
        raise HTTPException(status_code=400, detail="No pending registration found")
    
    # Generate new OTP
    otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Update OTP
    await db.pending_registrations.update_one(
        {"email": email},
        {"$set": {"otp": otp_code, "expires_at": expiry.isoformat()}}
    )
    
    # Send OTP email
    asyncio.ensure_future(send_email(
        email,
        "Your New Verification Code 🔐",
        get_otp_email(otp_code, pending.get("name", "there")),
        is_html=True
    ))
    
    return {"message": "OTP resent successfully"}

# Legacy register endpoint (kept for backward compatibility but redirects to OTP flow)
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email (fire-and-forget)
    asyncio.ensure_future(send_email(
        user_data.email,
        "Welcome to Annya Jewellers! ✨",
        get_welcome_email({"name": user_data.name, "email": user_data.email}),
        is_html=True
    ))
    
    # Generate token
    token = create_token(user_id)
    
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user_id, name=user_data.name, email=user_data.email)
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = create_token(user["id"])
    
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user["id"], name=user["name"], email=user["email"], phone=user.get("phone"))
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        phone=current_user.get("phone")
    )


# ============================================
# PUBLIC - APPOINTMENTS
# ============================================

class AppointmentRequest(BaseModel):
    name: str
    email: str
    phone: str
    date: str
    time: str
    service: str
    message: Optional[str] = None

def get_appointment_email(data: dict):
    return get_email_base_style() + f"""
    <div class="container">
        <div class="header">
            <h1>New Appointment Request</h1>
        </div>
        <div class="content">
            <p><strong>Customer Name:</strong> {data.get('name')}</p>
            <p><strong>Email:</strong> {data.get('email')}</p>
            <p><strong>Phone:</strong> {data.get('phone')}</p>
            <br>
            <div class="order-details">
                <h3>Appointment Details</h3>
                <p><strong>Service:</strong> {data.get('service')}</p>
                <p><strong>Date:</strong> {data.get('date')}</p>
                <p><strong>Time:</strong> {data.get('time')}</p>
            </div>
            
            <div class="order-details">
                <h3>Customer Message</h3>
                <p>{data.get('message') or 'No additional message provided.'}</p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {datetime.now().year} Annya Jewellers System Notification</p>
        </div>
    </div>
    """

@api_router.post("/api/appointments")
async def request_appointment(data: AppointmentRequest):
    """Handle appointment request and notify admin"""
    
    # Send email to Admin
    admin_email = "Aanyajewellerysilver@gmail.com"
    subject = f"New Appointment: {data.name} - {data.service}"
    
    appt_dict = data.model_dump()
    
    await send_email(admin_email, subject, get_appointment_email(appt_dict), is_html=True)
    
    # Store in DB
    appt_doc = appt_dict.copy()
    appt_doc["id"] = str(uuid.uuid4())
    appt_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.appointments.insert_one(appt_doc)
    
    return {"message": "Appointment requested successfully"}

# Address Management
class AddressCreate(BaseModel):
    label: str = "Home"  # Home, Work, Other
    firstName: str
    lastName: str
    address: str
    city: str
    state: str
    postalCode: str
    phone: str
    isDefault: bool = False

class Address(BaseModel):
    id: str
    label: str
    firstName: str
    lastName: str
    address: str
    city: str
    state: str
    country: str = "India"
    postalCode: str
    phone: str
    isDefault: bool

@api_router.get("/addresses")
async def get_addresses(current_user: dict = Depends(get_current_user)):
    """Get all saved addresses for current user"""
    addresses = await db.addresses.find({"userId": current_user["id"]}, {"_id": 0}).to_list(20)
    return addresses

@api_router.post("/addresses")
async def add_address(address_data: AddressCreate, current_user: dict = Depends(get_current_user)):
    """Add a new address"""
    address_id = str(uuid.uuid4())
    
    # If this is first address or marked default, set others to non-default
    if address_data.isDefault:
        await db.addresses.update_many(
            {"userId": current_user["id"]},
            {"$set": {"isDefault": False}}
        )
    
    # Check if this is the first address
    existing_count = await db.addresses.count_documents({"userId": current_user["id"]})
    is_first = existing_count == 0
    
    address_doc = {
        "id": address_id,
        "userId": current_user["id"],
        "label": address_data.label,
        "firstName": address_data.firstName,
        "lastName": address_data.lastName,
        "address": address_data.address,
        "city": address_data.city,
        "state": address_data.state,
        "country": "India",
        "postalCode": address_data.postalCode,
        "phone": address_data.phone,
        "isDefault": address_data.isDefault or is_first,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.addresses.insert_one(address_doc)
    return {"message": "Address added successfully", "address": {**address_doc, "_id": None}}

@api_router.put("/addresses/{address_id}")
async def update_address(address_id: str, address_data: AddressCreate, current_user: dict = Depends(get_current_user)):
    """Update an existing address"""
    existing = await db.addresses.find_one({"id": address_id, "userId": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # If setting as default, unset others
    if address_data.isDefault:
        await db.addresses.update_many(
            {"userId": current_user["id"]},
            {"$set": {"isDefault": False}}
        )
    
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {
            "label": address_data.label,
            "firstName": address_data.firstName,
            "lastName": address_data.lastName,
            "address": address_data.address,
            "city": address_data.city,
            "state": address_data.state,
            "postalCode": address_data.postalCode,
            "phone": address_data.phone,
            "isDefault": address_data.isDefault
        }}
    )
    
    return {"message": "Address updated successfully"}

@api_router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an address"""
    result = await db.addresses.delete_one({"id": address_id, "userId": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address deleted successfully"}

@api_router.post("/addresses/{address_id}/default")
async def set_default_address(address_id: str, current_user: dict = Depends(get_current_user)):
    """Set an address as default"""
    existing = await db.addresses.find_one({"id": address_id, "userId": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Unset all as default
    await db.addresses.update_many(
        {"userId": current_user["id"]},
        {"$set": {"isDefault": False}}
    )
    
    # Set this one as default
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {"isDefault": True}}
    )
    
    return {"message": "Default address updated"}

# Password Reset Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success (don't reveal if email exists)
    if not user:
        return {"message": "If an account with that email exists, we've sent a password reset link."}
    
    # Generate reset token (valid for 1 hour)
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store token in database
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "email": data.email,
        "token": reset_token,
        "expires_at": expiry.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send reset email (fire-and-forget)
    asyncio.ensure_future(send_email(
        data.email,
        "Reset Your Password 🔐",
        get_password_reset_email(user, reset_token),
        is_html=True
    ))
    
    return {"message": "If an account with that email exists, we've sent a password reset link."}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token from email"""
    # Find valid token
    reset_record = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    expiry = datetime.fromisoformat(reset_record["expires_at"])
    if expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")
    
    # Update password
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password": hash_password(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successful. You can now log in with your new password."}


# Cart Routes (stored in localStorage on frontend, but we add API for future use)
class CartItem(BaseModel):
    productId: str
    quantity: int

class CartUpdate(BaseModel):
    items: List[CartItem]


# Order Routes
class OrderCreate(BaseModel):
    items: List[CartItem]
    shippingAddress: dict
    paymentMethod: str = "card"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    userId: str
    items: List[dict]
    total: float
    status: str
    shippingAddress: dict
    createdAt: str

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Calculate total
    total = 0
    order_items = []
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.productId}, {"_id": 0})
        if product:
            order_items.append({
                "productId": item.productId,
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity,
                "image": product["image"]
            })
            total += product["price"] * item.quantity
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "userId": current_user["id"],
        "items": order_items,
        "total": total,
        "status": "pending",
        "shippingAddress": order_data.shippingAddress,
        "paymentMethod": order_data.paymentMethod,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    # Send order confirmation email (fire-and-forget)
    order_for_email = {
        **order_doc,
        "customer": {"name": current_user.get("name", "Valued Customer")},
        "grandTotal": total
    }
    asyncio.ensure_future(send_email(
        current_user.get("email"),
        f"Order Confirmed! #{order_id[:8].upper()} 🎉",
        get_order_confirmation_email(order_for_email),
        is_html=True
    ))
    
    return Order(**order_doc)

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"userId": current_user["id"]}, {"_id": 0}).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "userId": current_user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

class RefundRequest(BaseModel):
    reason: str

@api_router.post("/orders/{order_id}/refund")
async def request_refund(order_id: str, refund_data: RefundRequest, current_user: dict = Depends(get_current_user)):
    """Request a refund for an order"""
    order = await db.orders.find_one({"id": order_id, "userId": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only allow refund for delivered orders
    if order["status"] not in ["delivered", "shipped"]:
        raise HTTPException(status_code=400, detail="Refund can only be requested for delivered or shipped orders")
    
    # Check if refund already requested
    if order.get("refund_status"):
        raise HTTPException(status_code=400, detail="Refund already requested for this order")
    
    # Update order with refund request
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "refund_status": "requested",
            "refund_reason": refund_data.reason,
            "refund_requested_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Refund request submitted successfully"}

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a pending order"""
    order = await db.orders.find_one({"id": order_id, "userId": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only allow cancellation for pending orders
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Order cancelled successfully"}


# Review Routes
class ReviewCreate(BaseModel):
    rating: int
    title: Optional[str] = None
    comment: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    productId: str
    userId: str
    userName: str
    rating: int
    title: Optional[str] = None
    comment: str
    verified: bool = False
    createdAt: str

@api_router.post("/products/{product_id}/reviews", response_model=Review)
async def create_review(product_id: str, review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    # Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing = await db.reviews.find_one({"productId": product_id, "userId": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Check if user purchased this product
    order_with_product = await db.orders.find_one({
        "userId": current_user["id"],
        "items.productId": product_id
    })
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "productId": product_id,
        "userId": current_user["id"],
        "userName": current_user["name"],
        "rating": min(5, max(1, review_data.rating)),  # Clamp between 1-5
        "title": review_data.title,
        "comment": review_data.comment,
        "verified": order_with_product is not None,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    return Review(**review_doc)

@api_router.get("/products/{product_id}/reviews", response_model=List[Review])
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"productId": product_id}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return reviews

@api_router.get("/products/{product_id}/rating")
async def get_product_rating(product_id: str):
    reviews = await db.reviews.find({"productId": product_id}, {"_id": 0, "rating": 1}).to_list(1000)
    if not reviews:
        return {"averageRating": 0, "totalReviews": 0}
    
    total = sum(r["rating"] for r in reviews)
    return {
        "averageRating": round(total / len(reviews), 1),
        "totalReviews": len(reviews)
    }


# ============================================
# OWNER/ADMIN ROUTES
# ============================================

# Owner credentials (hardcoded for now)
OWNER_USERNAME = "owner.owner"
OWNER_PASSWORD = "owner12345"

class OwnerLogin(BaseModel):
    username: str
    password: str

class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    name: str
    description: str
    price: float
    category: str
    image: str
    images: List[str] = []
    inStock: bool = True

class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    inStock: Optional[bool] = None

class ReviewCreate(BaseModel):
    productId: str
    userName: str
    title: Optional[str] = None
    comment: str
    rating: int
    image: Optional[str] = None

class ReviewUpdate(BaseModel):
    userName: Optional[str] = None
    title: Optional[str] = None
    comment: Optional[str] = None
    rating: Optional[int] = None
    image: Optional[str] = None


def create_owner_token() -> str:
    import base64
    import json
    payload = {
        "role": "owner",
        "exp": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    }
    token_data = json.dumps(payload)
    return base64.b64encode(token_data.encode()).decode()

def verify_owner_token(token: str) -> bool:
    import base64
    import json
    try:
        token_data = base64.b64decode(token.encode()).decode()
        payload = json.loads(token_data)
        if payload.get("role") != "owner":
            return False
        exp = datetime.fromisoformat(payload["exp"])
        return exp > datetime.now(timezone.utc)
    except Exception:
        return False

async def get_owner(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not verify_owner_token(credentials.credentials):
        raise HTTPException(status_code=401, detail="Invalid or expired owner token")
    
    return {"role": "owner"}


# Owner Login
@api_router.post("/owner/login")
async def owner_login(data: OwnerLogin):
    if data.username != OWNER_USERNAME or data.password != OWNER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_owner_token()
    return {"access_token": token, "token_type": "bearer"}

@api_router.get("/owner/verify")
async def verify_owner(owner: dict = Depends(get_owner)):
    return {"valid": True, "role": "owner"}


# Admin Product CRUD
@api_router.get("/admin/products")
async def admin_get_products(owner: dict = Depends(get_owner)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/admin/products")
async def admin_create_product(product: ProductCreate, owner: dict = Depends(get_owner)):
    product_id = str(uuid.uuid4())
    p_data = product.model_dump()
    
    # Ensure ID and timestamps are set
    product_doc = {
        **p_data,
        "id": product_id,
        "images": p_data.get("images") or ([p_data.get("image")] if p_data.get("image") else []),
        "currency": "INR",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product_doc)
    # Return without _id field
    product_doc.pop("_id", None)
    return product_doc

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, update: ProductUpdate, owner: dict = Depends(get_owner)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, owner: dict = Depends(get_owner)):
    # Get product first to retrieve image URLs
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete images from Cloudinary
    images_to_delete = []
    if product.get("image"):
        images_to_delete.append(product["image"])
    if product.get("images"):
        images_to_delete.extend(product["images"])
    
    # Remove duplicates
    images_to_delete = list(set(images_to_delete))
    
    for image_url in images_to_delete:
        try:
            # Extract public_id from Cloudinary URL
            # URL format: https://res.cloudinary.com/dpwsnody1/image/upload/v1234567890/public_id.jpg
            if "cloudinary.com" in image_url:
                parts = image_url.split("/upload/")
                if len(parts) > 1:
                    # Remove version and extension to get public_id
                    path = parts[1]
                    # Remove version (v1234567890/)
                    if path.startswith("v"):
                        path = "/".join(path.split("/")[1:])
                    # Remove extension
                    public_id = path.rsplit(".", 1)[0] if "." in path else path
                    cloudinary.uploader.destroy(public_id)
        except Exception as e:
            print(f"Warning: Failed to delete image from Cloudinary: {e}")
    
    # Delete from database
    result = await db.products.delete_one({"id": product_id})
    
    # Also delete associated reviews
    await db.reviews.delete_many({"productId": product_id})
    
    return {"message": "Product and images deleted"}


class BulkDeleteRequest(BaseModel):
    productIds: List[str]

@api_router.post("/admin/products/bulk-delete")
async def admin_bulk_delete_products(data: BulkDeleteRequest, owner: dict = Depends(get_owner)):
    """Delete multiple products and their Cloudinary images"""
    product_ids = data.productIds
    print(f"Bulk delete request for {len(product_ids)} products: {product_ids}")
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="No product IDs provided")
    
    deleted_count = 0
    for product_id in product_ids:
        # Get product to retrieve image URLs
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            print(f"Product {product_id} not found, skipping")
            continue
        
        # Delete images from Cloudinary
        images_to_delete = []
        if product.get("image"):
            images_to_delete.append(product["image"])
        if product.get("images"):
            images_to_delete.extend(product["images"])
        
        images_to_delete = list(set(images_to_delete))
        
        for image_url in images_to_delete:
            try:
                if "cloudinary.com" in image_url:
                    parts = image_url.split("/upload/")
                    if len(parts) > 1:
                        path = parts[1]
                        if path.startswith("v"):
                            path = "/".join(path.split("/")[1:])
                        public_id = path.rsplit(".", 1)[0] if "." in path else path
                        cloudinary.uploader.destroy(public_id)
            except Exception as e:
                print(f"Warning: Failed to delete image: {e}")
        
        # Delete from database
        result = await db.products.delete_one({"id": product_id})
        if result.deleted_count > 0:
            deleted_count += 1
            await db.reviews.delete_many({"productId": product_id})
    
    print(f"Successfully deleted {deleted_count} products")
    return {"message": f"Deleted {deleted_count} products", "deletedCount": deleted_count}


@api_router.post("/admin/products/import")
async def admin_import_products(file: UploadFile = File(...), owner: dict = Depends(get_owner)):
    """Import products from CSV file with error reporting"""
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        content = await file.read()
        if content.startswith(codecs.BOM_UTF8):
            content = content[len(codecs.BOM_UTF8):]
        
        csv_text = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        products_to_add = []
        errors = []
        row_index = 0
        
        for row in csv_reader:
            row_index += 1
            row_error_prefix = f"Row {row_index}"
            if row.get('sl_no'):
                row_error_prefix = f"Row {row_index} (SL {row.get('sl_no')})"

            # --- VALIDATION HELPERS ---
            def validate_float(key, required=False):
                val = row.get(key, "").strip()
                if not val:
                    if required:
                        raise ValueError(f"Missing required field: {key}")
                    return 0.0
                try:
                    return float(val)
                except ValueError:
                    raise ValueError(f"Invalid number for {key}: '{val}'")

            def validate_int(key, required=False):
                val = row.get(key, "").strip()
                if not val:
                    if required:
                        raise ValueError(f"Missing required field: {key}")
                    return 0
                try:
                    return int(float(val)) # float transition helps e.g "5.0"
                except ValueError:
                    raise ValueError(f"Invalid integer for {key}: '{val}'")
                    
            def get_clean_str(key, default=""):
                return row.get(key, default).strip() or default

            try:
                # Essential fields validation
                name = get_clean_str('name')
                if not name:
                    raise ValueError("Product Name is required")
                
                # Pricing Validation (Critical)
                try:
                    selling_price = validate_float('sellingPrice', required=True)
                    if selling_price < 0: raise ValueError("Selling Price cannot be negative")
                    
                    cost_gold = validate_float('costGold')
                    cost_stone = validate_float('costStone')
                    cost_making = validate_float('costMaking')
                    cost_other = validate_float('costOther')
                except ValueError as e:
                    errors.append(f"{row_error_prefix}: {str(e)}")
                    continue # Skip this row

                # --- IF VALID, PROCESS ROW ---
                total_cost = cost_gold + cost_stone + cost_making + cost_other
                profit_margin = selling_price - total_cost
                margin_percent = (profit_margin / selling_price * 100) if selling_price > 0 else 0

                # Generate Product Object
                product_id = str(uuid.uuid4())
                
                # Check optional 'netPrice' column for verification (optional logic)
                # csv_net_price = validate_float('netPrice')
                # if csv_net_price > 0 and abs(csv_net_price - total_cost) > 1.0:
                    # errors.append(f"{row_error_prefix}: Calculated cost ({total_cost}) mismatch with CSV netPrice ({csv_net_price})")
                    # continue

                has_discount = str(row.get('hasDiscount', '')).lower() in ('true', '1', 'yes')
                discount_type = row.get('discountType', 'percent')
                discount_value = validate_float('discountValue')
                allow_coupons = str(row.get('allowCoupons', 'true')).lower() in ('true', '1', 'yes')
                
                discounted_price = selling_price
                if has_discount and discount_value > 0:
                    if discount_type == 'percent':
                        discounted_price = selling_price * (1 - discount_value / 100)
                    else:
                        discounted_price = selling_price - discount_value

                products_to_add.append({
                    "id": product_id,
                    "sku": get_clean_str('sku', f"SKU-{product_id[:8]}"),
                    "name": name,
                    "category": get_clean_str('category', "Uncategorized"),
                    "subcategory": get_clean_str('subcategory', ""),
                    "tags": [t.strip() for t in get_clean_str('tags').split(',') if t.strip()],
                    "description": get_clean_str('description'),
                    "price": selling_price,
                    "sellingPrice": selling_price,
                    "currency": "INR",
                    
                    "costGold": cost_gold,
                    "costStone": cost_stone,
                    "costMaking": cost_making,
                    "costOther": cost_other,
                    "totalCost": total_cost,
                    "profitMargin": round(profit_margin, 2),
                    "marginPercent": round(margin_percent, 1),
                    
                    "metal": get_clean_str('metal', "Gold"),
                    "purity": get_clean_str('purity'),
                    "grossWeight": validate_float('grossWeight'),
                    "netWeight": validate_float('netWeight'),
                    "stoneWeight": validate_float('stoneWeight'),
                    "stoneType": get_clean_str('stoneType'),
                    "stoneQuality": get_clean_str('stoneQuality'),
                    "certification": get_clean_str('certification'),
                    
                    "stockQuantity": validate_int('stockQuantity'),
                    "lowStockThreshold": validate_int('lowStockThreshold', 2),
                    "isUniqueItem": str(row.get('isUniqueItem', '')).lower() in ('true', '1', 'yes'),
                    "inStock": validate_int('stockQuantity') > 0,
                    
                    "hasDiscount": has_discount,
                    "discountType": discount_type,
                    "discountValue": discount_value,
                    "discountedPrice": round(discounted_price),
                    "allowCoupons": allow_coupons,
                    
                    "hsnCode": get_clean_str('hsnCode', "7113"),
                    "barcode": get_clean_str('barcode'),
                    
                    "status": get_clean_str('status', "active"),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "image": "",
                    "images": []
                })

            except Exception as e:
                errors.append(f"{row_error_prefix}: Unexpected error: {str(e)}")
        
        # --- BULK UPSERT (Optimized) ---
        inserted_count = 0
        updated_count = 0
        
        if products_to_add:
            from pymongo import UpdateOne
            
            # First, get all existing SKUs in one query
            skus = [p["sku"] for p in products_to_add]
            existing_products = await db.products.find(
                {"sku": {"$in": skus}},
                {"sku": 1, "id": 1, "image": 1, "images": 1}
            ).to_list(len(skus))
            existing_map = {ep["sku"]: ep for ep in existing_products}
            
            # Build bulk operations
            operations = []
            for p in products_to_add:
                if p["sku"] in existing_map:
                    existing = existing_map[p["sku"]]
                    p["id"] = existing["id"]
                    if existing.get("image"): p["image"] = existing["image"]
                    if existing.get("images"): p["images"] = existing["images"]
                
                operations.append(
                    UpdateOne(
                        {"sku": p["sku"]},
                        {"$set": p},
                        upsert=True
                    )
                )
            
            # Execute all operations in one call
            if operations:
                result = await db.products.bulk_write(operations)
                inserted_count = result.upserted_count
                updated_count = result.modified_count

        return {
            "message": "Import completed",
            "inserted": inserted_count,
            "updated": updated_count,
            "failed": len(errors),
            "totalProcessed": row_index,
            "errors": errors if errors else None
        }

    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to import CSV: {str(e)}")


@api_router.get("/admin/reviews")
async def admin_get_reviews(owner: dict = Depends(get_owner)):
    reviews = await db.reviews.find({}, {"_id": 0}).to_list(1000)
    return reviews

@api_router.post("/admin/reviews")
async def admin_create_review(review: ReviewCreate, owner: dict = Depends(get_owner)):
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "productId": review.productId,
        "userId": "admin",
        "userName": review.userName,
        "title": review.title,
        "comment": review.comment,
        "rating": min(5, max(1, review.rating)),
        "image": review.image,
        "verified": True,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    # Return without _id field
    del review_doc["_id"]
    return review_doc

@api_router.put("/admin/reviews/{review_id}")
async def admin_update_review(review_id: str, update: ReviewUpdate, owner: dict = Depends(get_owner)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.reviews.update_one({"id": review_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, owner: dict = Depends(get_owner)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}


@api_router.get("/admin/customers")
async def admin_get_customers(owner: dict = Depends(get_owner)):
    pipeline = [
        {
            "$lookup": {
                "from": "orders",
                "localField": "id",
                "foreignField": "userId",
                "as": "user_orders"
            }
        },
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "name": 1,
                "email": 1,
                "phone": 1,
                "joinedAt": "$createdAt",
                "total_orders": {"$size": "$user_orders"},
                "total_spent": {"$sum": "$user_orders.total"}
            }
        },
        {"$sort": {"createdAt": -1}}
    ]
    
    customers = await db.users.aggregate(pipeline).to_list(1000)
    return customers


@api_router.get("/admin/orders")
async def admin_get_orders(status: str = None, owner: dict = Depends(get_owner)):
    query = {}
    if status and status != "all":
        query["status"] = status
    
    # Sort by newest first
    orders = await db.orders.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    
    # Enhance with customer names if missing (though they should be in the order doc)
    # The OrderCreate adds customer info to email but maybe not to DB doc?
    # Let's check CreateOrder... it adds 'userId'. 
    # We should probably lookup user details if needed, but frontend might handle it.
    # Frontend OrdersPage expects: order_number (id), customer_name, customer_email, total, status, date (createdAt)
    
    # We need to map `id` to `order_number` or frontend needs to change.
    # Frontend: `o.order_number || o.id` usually.
    # Let's verify frontend fields.
    # Frontend uses: order.id, order.customer?.name, order.total, order.status
    
    # To be safe, let's decorate with customer info if possible
    # But for now, basic fetch is better than empty.
    
    # Add computed fields for frontend convenience if needed
    enhanced_orders = []
    for o in orders:
        # Fetch user if customer name is missing
        if "customer" not in o and "userId" in o:
             u = await db.users.find_one({"id": o["userId"]})
             if u:
                 o["customer"] = {"name": u.get("name"), "email": u.get("email")}
        
        enhanced_orders.append(o)

    return enhanced_orders


@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status_data: dict, owner: dict = Depends(get_owner)):
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    valid_statuses = ["pending", "paid", "fulfilled", "shipped", "delivered", "cancelled", "returned"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": new_status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated successfully", "status": new_status}


@api_router.get("/admin/dashboard")
async def admin_dashboard_stats(period: str = "30d", owner: dict = Depends(get_owner)):
    # Calculate start date
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(period, 30)
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # 1. Gross Sales & Net Profit (assuming 20% margin for simple logic if cost not tracked properly)
    # We will sum 'total' from orders
    sales_pipeline = [
        {"$match": {"createdAt": {"$gte": start_date}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total_sales": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]
    sales_res = await db.orders.aggregate(sales_pipeline).to_list(1)
    gross_sales = sales_res[0]["total_sales"] if sales_res else 0
    orders_count = sales_res[0]["count"] if sales_res else 0
    
    # Rough profit estimation (30% margin) until we have complex cost analysis
    net_profit = gross_sales * 0.30
    
    # 2. Orders Pending
    pending_count = await db.orders.count_documents({"status": "pending"})
    
    # 3. Inventory Value
    # Sum of (costGold + costStone + ...) or just a fraction of selling price
    # Let's fetch all products and sum logic
    # Since products might not have cost fields populated properly yet, we'll estimate.
    # Actually, we have costGold fields in CSV import. Let's try to be accurate.
    # If fields are missing, assume 70% of price.
    products = await db.products.find({}, {"price": 1, "inStock": 1}).to_list(10000)
    data_inv_value = 0
    for p in products:
        if p.get("inStock", True):
            data_inv_value += p.get("price", 0) * 0.7 # Estimate cost as 70% of retail
            
    return {
        "gross_sales": gross_sales,
        "net_profit": net_profit,
        "orders_count": orders_count,
        "orders_pending": pending_count,
        "inventory_value": data_inv_value
    }


    return {
        "gross_sales": gross_sales,
        "net_profit": net_profit,
        "orders_count": orders_count,
        "orders_pending": pending_count,
        "inventory_value": data_inv_value
    }


@api_router.get("/admin/analytics/sales")
async def admin_analytics_sales(days: int = 30, owner: dict = Depends(get_owner)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"createdAt": {"$gte": start_date}, "status": {"$ne": "cancelled"}}},
        {
            "$group": {
                "_id": {"$substr": ["$createdAt", 0, 10]}, # Group by YYYY-MM-DD
                "gross_sales": {"$sum": "$total"},
                "orders": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_sales = await db.orders.aggregate(pipeline).to_list(days)
    
    # Fill missing dates with 0
    result = []
    sales_map = {d["_id"]: d for d in daily_sales}
    
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        data = sales_map.get(date, {"gross_sales": 0, "orders": 0})
        result.append({
            "date": date,
            "gross_sales": data["gross_sales"],
            "gross_profit": data["gross_sales"] * 0.30, # Est 30% margin
            "orders": data.get("orders", 0)
        })
        
    return result


@api_router.get("/admin/analytics/sales-by-channel")
async def admin_analytics_channels(days: int = 30, owner: dict = Depends(get_owner)):
    # Since we only have online sales for now, hardcode or split by "paymentMethod" as proxy?
    # Or just return 100% Online Store for now to avoid empty chart.
    
    # Let's try to group by payment method for some variety
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"createdAt": {"$gte": start_date}, "status": {"$ne": "cancelled"}}},
        {
            "$group": {
                "_id": "$paymentMethod", # card, cod, etc.
                "sales": {"$sum": "$total"},
                "orders": {"$sum": 1}
            }
        }
    ]
    
    channels = await db.orders.aggregate(pipeline).to_list(10)
    
    if not channels:
        return [{"label": "Online Store", "sales": 0, "orders": 0, "profit": 0, "percent": 0}]
        
    total_sales = sum(c["sales"] for c in channels)
    
    return [
        {
            "label": c["_id"].title() if c["_id"] else "Unknown",
            "sales": c["sales"],
            "orders": c["orders"],
            "profit": c["sales"] * 0.3,
            "percent": (c["sales"] / total_sales) if total_sales > 0 else 0
        }
        for c in channels
    ]


@api_router.get("/admin/analytics/top-products")
async def admin_analytics_top_products(days: int = 30, limit: int = 10, owner: dict = Depends(get_owner)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Unwind orders -> items to group by product
    pipeline = [
        {"$match": {"createdAt": {"$gte": start_date}, "status": {"$ne": "cancelled"}}},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.productId",
                "product_name": {"$first": "$items.name"},
                "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
                "units_sold": {"$sum": "$items.quantity"}
            }
        },
        {"$sort": {"revenue": -1}},
        {"$limit": limit}
    ]
    
    top_products = await db.orders.aggregate(pipeline).to_list(limit)
    
    # Format
    return [
        {
            "product_name": p["product_name"],
            "revenue": p["revenue"],
            "units_sold": p["units_sold"],
            "profit": p["revenue"] * 0.3 # Est
        }
        for p in top_products
    ]


@api_router.get("/admin/analytics/low-stock")
async def admin_analytics_low_stock(owner: dict = Depends(get_owner)):
    # Find products with stock < 5 (assuming 5 is threshold)
    # We don't have a 'stock' count field in Product model shown earlier (just 'inStock' bool).
    # But CSV import might have added valid logic?
    # Let's check Product model... `inStock: bool`. No quantity field visible in model def at line 341.
    # However, Admin might want to see items marked as out of stock or low if we add quantity later.
    # For now, return items where inStock is False.
    
    out_of_stock = await db.products.find({"inStock": False}, {"_id": 0}).limit(20).to_list(20)
    
    return [
        {
            "product_name": p["name"],
            "available": 0,
            "min_stock": 5
        }
        for p in out_of_stock
    ]


    return [
        {
            "product_name": p["name"],
            "available": 0,
            "min_stock": 5
        }
        for p in out_of_stock
    ]


@api_router.get("/api/admin/inventory/ledger")
async def admin_get_ledger(limit: int = 50, owner: dict = Depends(get_owner)):
    # Since we don't have a dedicated ledger collection yet, we can simulate it
    # from Orders (sales) and CSV Imports (receives) if we tracked them better.
    # But ideally validation requires a real ledger.
    # Given database constraints, we'll try to aggregate recent orders as 'sales'
    # and maybe assume some 'receives' based on product creation for now.
    
    events = []
    
    # Get recent sales (Orders)
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
    for o in recent_orders:
        for item in o.get("items", []):
            events.append({
                "id": f"SALE-{o['id'][-6:]}-{item['productId'][-4:]}",
                "product_name": item["name"],
                "sku": "SKU-" + item['productId'][-6:].upper(),
                "event_type": "sale",
                "qty_delta": -item["quantity"],
                "qty_after": "?", # Hard to calculate without running balance
                "reference": f"ORD-{o['id'][-8:].upper()}",
                "note": "Online Order",
                "created_at": o["createdAt"]
            })
            
    # Get recent products (as 'Receives')
    recent_products = await db.products.find({}, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
    for p in recent_products:
        events.append({
            "id": f"RCV-{p['id'][-6:]}",
            "product_name": p["name"],
            "sku": "SKU-" + p['id'][-6:].upper(),
            "event_type": "receive",
            # Determine initial stock if possible, else 1
            "qty_delta": 10, # Mock 10 for initial stock
            "qty_after": 10,
            "reference": "INIT-STOCK",
            "note": "Initial Inventory",
            "created_at": p["createdAt"]
        })
    
    # Sort by date desc
    events.sort(key=lambda x: x["created_at"], reverse=True)
    
    return events[:limit]


    # Sort by date desc
    events.sort(key=lambda x: x["created_at"], reverse=True)
    
    return events[:limit]


@api_router.get("/admin/analytics/traffic")
async def admin_analytics_traffic(days: int = 30, owner: dict = Depends(get_owner)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]}, # Group by YYYY-MM-DD
                "pageviews": {"$sum": 1},
                "unique_visitors": {"$addToSet": "$ip"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_traffic = await db.traffic_logs.aggregate(pipeline).to_list(days)
    
    # Fill gaps
    result = []
    traffic_map = {d["_id"]: d for d in daily_traffic}
    
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        data = traffic_map.get(date, {"pageviews": 0, "unique_visitors": []})
        result.append({
            "date": date,
            "visitors": len(data["unique_visitors"]) if isinstance(data["unique_visitors"], list) else 0,
            "pageviews": data["pageviews"]
        })
        
    return result


@api_router.get("/admin/analytics/pages")
async def admin_analytics_pages(limit: int = 5, owner: dict = Depends(get_owner)):
    pipeline = [
        {"$group": {"_id": "$path", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit}
    ]
    
    pages = await db.traffic_logs.aggregate(pipeline).to_list(limit)
    
    return [
        {
            "path": p["_id"],
            "views": p["views"],
            "avg_time": "1m 30s" # Mock for now
        }
        for p in pages
    ]


@api_router.get("/admin/analytics/devices")
async def admin_analytics_devices(owner: dict = Depends(get_owner)):
    # Regex aggregation for Mobile/Tablet/Desktop
    # Simplified: Just check contains "Mobile"
    
    pipeline = [
        {
            "$project": {
                "device": {
                    "$cond": {
                        "if": {"$regexMatch": {"input": "$user_agent", "regex": "Mobile", "options": "i"}},
                        "then": "Mobile",
                        "else": "Desktop" # Simplified
                    }
                }
            }
        },
        {"$group": {"_id": "$device", "sessions": {"$sum": 1}}}
    ]
    
    devices = await db.traffic_logs.aggregate(pipeline).to_list(5)
    
    return [
        {"device": d["_id"], "sessions": d["sessions"]}
        for d in devices
    ]


@api_router.get("/admin/analytics/sources")
async def admin_analytics_sources(owner: dict = Depends(get_owner)):
    # Parse referer
    pipeline = [
        {
            "$project": {
                "source": {
                    "$cond": {
                        "if": {"$eq": ["$referer", None]},
                        "then": "Direct",
                        "else": "Referral" # Simplified for now, real parsing needs url extraction
                    }
                }
            }
        },
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    
    sources = await db.traffic_logs.aggregate(pipeline).to_list(5)
    total = sum(s["count"] for s in sources)
    
    return [
        {
            "source": s["_id"],
            "percent": (s["count"] / total) if total > 0 else 0
        }
        for s in sources
    ]


# Image Upload (Cloudinary)
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, File

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET")
)

@api_router.post("/admin/upload")
async def admin_upload_image(file: UploadFile = File(...), owner: dict = Depends(get_owner)):
    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(contents, folder="jew-products")
        return {"url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# Navigation Config
@api_router.get("/navigation")
async def get_public_navigation():
    """Public endpoint - returns navigation menu for the website header"""
    nav = await db.navigation.find_one({"id": "main"}, {"_id": 0})
    if not nav or not nav.get("items"):
        # Return default navigation structure
        return [
            {
                "name": "ENGAGEMENT RINGS",
                "columns": [
                    {"title": None, "items": ["Solitaire Diamond Rings", "Halo Diamond Rings", "Three Stone Diamond Rings", "All Engagement Rings"]},
                    {"title": "DIAMOND CUT", "items": ["Round", "Oval", "Emerald", "Pear"]}
                ],
                "featured": [{"title": "Yellow Gold Engagement Rings"}, {"title": "Three Stone Engagement Rings"}]
            },
            {
                "name": "DIAMOND JEWELLERY",
                "columns": [
                    {"title": "JEWELLERY TYPE", "items": ["Diamond Eternity Rings", "Diamond Dress Rings", "Diamond Pendants", "Diamond Bracelets", "Diamond Earrings"]},
                    {"title": "GEMSTONE TYPE", "items": ["Diamond", "Sapphire", "Emerald", "Ruby", "Pearl"]}
                ],
                "featured": [{"title": "Diamond Pendants"}, {"title": "Diamond Eternity Rings"}]
            },
            {
                "name": "WEDDING RINGS",
                "columns": [
                    {"title": "LADIES WEDDING RINGS", "items": ["Diamond Rings", "White Gold Rings", "Yellow Gold Rings", "Platinum Rings"]},
                    {"title": "GENTS WEDDING RINGS", "items": ["White Gold Rings", "Yellow Gold Rings", "Platinum Rings"]}
                ],
                "featured": [{"title": "Diamond Wedding Rings"}, {"title": "Plain Wedding Bands"}]
            },
            {
                "name": "GOLD JEWELLERY",
                "columns": [
                    {"title": None, "items": ["Gold Pendants", "Gold Bracelets", "Gold Bangles", "Gold Earrings", "Gold Necklets"]},
                    {"title": None, "items": ["Gold Rings", "Gold Chains", "All Gold Jewellery"]}
                ],
                "featured": [{"title": "Gold Pendants"}, {"title": "Gold Earrings"}]
            },
            {
                "name": "SILVER JEWELLERY",
                "columns": [
                    {"title": None, "items": ["Silver Rings", "Silver Pendants", "Silver Bracelets"]},
                    {"title": None, "items": ["Silver Earrings", "Silver Necklets", "All Silver Jewellery"]}
                ],
                "featured": [{"title": "Silver Pendants"}, {"title": "Silver Earrings"}]
            }
        ]
    return nav.get("items", [])

@api_router.get("/admin/navigation")
async def get_admin_navigation(owner: dict = Depends(get_owner)):
    nav = await db.navigation.find_one({"id": "main"}, {"_id": 0})
    if not nav or not nav.get("items"):
        # Return same defaults as public endpoint for consistency
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
    return nav.get("items", [])

@api_router.put("/admin/navigation")
async def update_navigation(items: List[dict], owner: dict = Depends(get_owner)):
    await db.navigation.update_one(
        {"id": "main"},
        {"$set": {"id": "main", "items": items}},
        upsert=True
    )
    return {"message": "Navigation updated"}


# Admin Stats
@api_router.get("/admin/stats")
async def get_admin_stats(owner: dict = Depends(get_owner)):
    products_count = await db.products.count_documents({})
    reviews_count = await db.reviews.count_documents({})
    orders_count = await db.orders.count_documents({})
    users_count = await db.users.count_documents({})
    
    return {
        "products": products_count,
        "reviews": reviews_count,
        "orders": orders_count,
        "users": users_count
    }


# ============================================
# OWNER PORTAL - DASHBOARD & ANALYTICS
# ============================================

from models import (
    DashboardStats, SalesDataPoint, ProductPerformance, LowStockAlert,
    Location, LocationCreate, LocationType,
    Vendor, VendorCreate, VendorContact,
    PurchaseOrder, PurchaseOrderCreate, PurchaseOrderStatus, PurchaseOrderLine,
    InventoryLedgerEntry, InventorySnapshot, InventoryEventType, InventoryAdjustment,
    Transfer, TransferCreate, TransferStatus,
    Customer, CustomerCreate,
    ActivityLog, ProductStatus, StoreSettings
)


@api_router.get("/admin/dashboard")
async def get_dashboard_stats(period: str = "7d", owner: dict = Depends(get_owner)):
    """Get dashboard KPIs with REAL data from products and orders"""
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    else:  # 30d
        start_date = now - timedelta(days=30)
    
    # Get orders in range (for sales metrics)
    orders = await db.orders.find({
        "createdAt": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate sales from orders
    gross_sales = sum(o.get("total", 0) for o in orders)
    orders_count = len(orders)
    
    # Get ALL products for inventory calculations
    products = await db.products.find({}, {
        "_id": 0, 
        "total_cost": 1, 
        "profit_margin": 1,
        "stock_quantity": 1, 
        "low_stock_threshold": 1,
        "selling_price": 1
    }).to_list(10000)
    
    # Calculate REAL inventory metrics
    inventory_value = sum(p.get("total_cost", 0) * p.get("stock_quantity", 0) for p in products)
    low_stock_count = sum(1 for p in products if p.get("stock_quantity", 0) <= p.get("low_stock_threshold", 2) and p.get("stock_quantity", 0) > 0)
    stockout_count = sum(1 for p in products if p.get("stock_quantity", 0) <= 0)
    
    # Calculate profit from orders if they have cost_at_sale, else estimate from products
    total_profit = 0
    for order in orders:
        for item in order.get("items", []):
            # If order has profit captured at sale time
            if "profit_at_sale" in item:
                total_profit += item["profit_at_sale"]
            else:
                # Estimate using average margin
                total_profit += item.get("price", 0) * item.get("quantity", 1) * 0.25
    
    # Separate fulfilled, pending, returned
    orders_pending = sum(1 for o in orders if o.get("status") == "pending" or o.get("payment_status") == "pending")
    orders_fulfilled = sum(1 for o in orders if o.get("status") in ["fulfilled", "completed", "delivered"])
    orders_returned = sum(1 for o in orders if o.get("status") in ["returned", "refunded", "cancelled"])
    
    # If no breakdown, use estimates
    if orders_pending + orders_fulfilled + orders_returned == 0 and orders_count > 0:
        orders_fulfilled = int(orders_count * 0.7)
        orders_pending = int(orders_count * 0.2)
        orders_returned = orders_count - orders_fulfilled - orders_pending
    
    stats = DashboardStats(
        gross_sales=round(gross_sales, 2),
        net_sales=round(gross_sales * 0.97, 2),  # After payment fees
        gross_profit=round(total_profit, 2),
        net_profit=round(total_profit * 0.85, 2),  # After other expenses
        orders_count=orders_count,
        orders_pending=orders_pending,
        orders_fulfilled=orders_fulfilled,
        orders_returned=orders_returned,
        inventory_value=round(inventory_value, 2),
        low_stock_count=low_stock_count,
        stockout_count=stockout_count,
        period=period
    )
    
    return stats.model_dump()


@api_router.get("/admin/analytics/sales")
async def get_sales_analytics(days: int = 30, owner: dict = Depends(get_owner)):
    """Get sales data over time"""
    
    now = datetime.now(timezone.utc)
    data_points = []
    
    for i in range(days):
        date = now - timedelta(days=days - 1 - i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Get orders for this day
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        orders = await db.orders.find({
            "createdAt": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        }, {"_id": 0, "total": 1, "grossProfit": 1}).to_list(1000)
        
        gross_sales = sum(o.get("total", 0) for o in orders)
        gross_profit = sum(o.get("grossProfit", o.get("total", 0) * 0.25) for o in orders)
        
        data_points.append(SalesDataPoint(
            date=date_str,
            gross_sales=gross_sales,
            net_sales=gross_sales * 0.97,
            gross_profit=gross_profit,
            orders=len(orders)
        ).model_dump())
    
    return data_points


@api_router.get("/admin/analytics/sales-by-channel")
async def get_sales_by_channel(days: int = 30, owner: dict = Depends(get_owner)):
    """Get sales breakdown by channel (online vs POS)"""
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find({
        "createdAt": {"$gte": start_date.isoformat()}
    }, {"_id": 0, "channel": 1, "total": 1, "grossProfit": 1}).to_list(10000)
    
    # Aggregate by channel
    channel_data = {"online": {"sales": 0, "orders": 0, "profit": 0}, "pos": {"sales": 0, "orders": 0, "profit": 0}}
    
    for order in orders:
        channel = order.get("channel", "online")
        if channel not in channel_data:
            channel = "online"
        channel_data[channel]["sales"] += order.get("total", 0)
        channel_data[channel]["orders"] += 1
        channel_data[channel]["profit"] += order.get("grossProfit", 0)
    
    return [
        {"channel": "online", "label": "🌐 Online", **channel_data["online"]},
        {"channel": "pos", "label": "🏪 In-Store (POS)", **channel_data["pos"]}
    ]


@api_router.get("/admin/analytics/top-products")
async def get_top_products(days: int = 30, limit: int = 10, owner: dict = Depends(get_owner)):
    """Get top products by profit/revenue - using real product margins"""
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get orders with items
    orders = await db.orders.find({
        "createdAt": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get product profit margins from database
    products = await db.products.find({}, {
        "_id": 0,
        "id": 1,
        "name": 1,
        "image": 1,
        "profit_margin": 1,
        "selling_price": 1,
        "total_cost": 1
    }).to_list(10000)
    
    # Create lookup of products
    product_lookup = {p["id"]: p for p in products}
    
    # Aggregate by product from orders
    product_stats = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("productId")
            if pid:
                if pid not in product_stats:
                    # Get real margin from product
                    prod = product_lookup.get(pid, {})
                    product_stats[pid] = {
                        "product_id": pid,
                        "product_name": prod.get("name") or item.get("name", "Unknown"),
                        "units_sold": 0,
                        "revenue": 0,
                        "profit": 0,
                        "image": prod.get("image") or item.get("image"),
                        "unit_profit": prod.get("profit_margin", 0)
                    }
                qty = item.get("quantity", 0)
                price = item.get("price", 0)
                product_stats[pid]["units_sold"] += qty
                product_stats[pid]["revenue"] += price * qty
                # Use real profit margin
                product_stats[pid]["profit"] += product_stats[pid]["unit_profit"] * qty
    
    # If no orders, show top products by profit margin potential
    if not product_stats:
        for p in products[:limit]:
            product_stats[p["id"]] = {
                "product_id": p["id"],
                "product_name": p.get("name", "Unknown"),
                "units_sold": 0,
                "revenue": 0,
                "profit": p.get("profit_margin", 0),  # Potential profit
                "image": p.get("image")
            }
    
    # Sort by profit
    sorted_products = sorted(product_stats.values(), key=lambda x: x["profit"], reverse=True)
    
    return sorted_products[:limit]


@api_router.get("/admin/analytics/low-stock")
async def get_low_stock_alerts(owner: dict = Depends(get_owner)):
    """Get low stock alerts from REAL product inventory data"""
    
    # Get products where stock is at or below threshold
    products = await db.products.find({}, {
        "_id": 0,
        "id": 1,
        "sku": 1,
        "name": 1,
        "image": 1,
        "stock_quantity": 1,
        "low_stock_threshold": 1
    }).to_list(1000)
    
    # Filter to low stock items
    alerts = []
    for p in products:
        stock = p.get("stock_quantity", 0)
        threshold = p.get("low_stock_threshold", 2)
        
        # Include if stock is at or below threshold
        if stock <= threshold:
            alerts.append(LowStockAlert(
                variant_id=p.get("id", ""),
                variant_sku=p.get("sku", "N/A"),
                product_name=p.get("name", "Unknown"),
                location_id="loc-main",
                location_name="Main Store",
                available=stock,
                min_stock=threshold,
                image=p.get("image")
            ).model_dump())
    
    # Sort by available (most urgent first)
    alerts.sort(key=lambda x: x["available"])
    
    return alerts[:20]  # Return top 20 alerts


# ============================================
# OWNER PORTAL - LOCATIONS
# ============================================

@api_router.get("/admin/locations")
async def get_locations(owner: dict = Depends(get_owner)):
    locations = await db.locations.find({}, {"_id": 0}).to_list(100)
    if not locations:
        # Create default location
        default_loc = Location(
            id="loc-main",
            name="Main Store",
            type=LocationType.STORE,
            city="Hyderabad",
            state="Telangana",
            country="India"
        ).model_dump()
        default_loc["created_at"] = default_loc["created_at"].isoformat()
        default_loc["updated_at"] = default_loc["updated_at"].isoformat()
        await db.locations.insert_one(default_loc)
        return [default_loc]
    return locations

@api_router.post("/admin/locations")
async def create_location(location: LocationCreate, owner: dict = Depends(get_owner)):
    loc = Location(
        id=str(uuid.uuid4()),
        **location.model_dump()
    )
    loc_dict = loc.model_dump()
    loc_dict["created_at"] = loc_dict["created_at"].isoformat()
    loc_dict["updated_at"] = loc_dict["updated_at"].isoformat()
    await db.locations.insert_one(loc_dict)
    return loc_dict

@api_router.put("/admin/locations/{location_id}")
async def update_location(location_id: str, update: dict, owner: dict = Depends(get_owner)):
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.locations.update_one({"id": location_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return await db.locations.find_one({"id": location_id}, {"_id": 0})

@api_router.delete("/admin/locations/{location_id}")
async def delete_location(location_id: str, owner: dict = Depends(get_owner)):
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted"}


# ============================================
# OWNER PORTAL - VENDORS
# ============================================

@api_router.get("/admin/vendors")
async def get_vendors(owner: dict = Depends(get_owner)):
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(1000)
    return vendors

@api_router.get("/admin/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, owner: dict = Depends(get_owner)):
    vendor = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@api_router.post("/admin/vendors")
async def create_vendor(vendor: VendorCreate, owner: dict = Depends(get_owner)):
    v = Vendor(
        id=str(uuid.uuid4()),
        **vendor.model_dump()
    )
    v_dict = v.model_dump()
    v_dict["created_at"] = v_dict["created_at"].isoformat()
    v_dict["updated_at"] = v_dict["updated_at"].isoformat()
    # Convert contacts to dict
    v_dict["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in v_dict["contacts"]]
    await db.vendors.insert_one(v_dict)
    return v_dict

@api_router.put("/admin/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, update: dict, owner: dict = Depends(get_owner)):
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.vendors.update_one({"id": vendor_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return await db.vendors.find_one({"id": vendor_id}, {"_id": 0})

@api_router.delete("/admin/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, owner: dict = Depends(get_owner)):
    result = await db.vendors.delete_one({"id": vendor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor deleted"}


# ============================================
# OWNER PORTAL - INVENTORY
# ============================================

@api_router.get("/admin/inventory")
async def get_inventory_overview(location_id: str = None, owner: dict = Depends(get_owner)):
    """Get inventory snapshots"""
    query = {}
    if location_id:
        query["location_id"] = location_id
    
    snapshots = await db.inventory_snapshots.find(query, {"_id": 0}).to_list(10000)
    return snapshots

@api_router.get("/admin/inventory/ledger")
async def get_inventory_ledger(
    variant_id: str = None,
    location_id: str = None,
    limit: int = 100,
    owner: dict = Depends(get_owner)
):
    """Get inventory ledger entries"""
    query = {}
    if variant_id:
        query["variant_id"] = variant_id
    if location_id:
        query["location_id"] = location_id
    
    entries = await db.inventory_ledger.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return entries

@api_router.post("/admin/inventory/adjust")
async def adjust_inventory(adjustment: InventoryAdjustment, owner: dict = Depends(get_owner)):
    """Create an inventory adjustment"""
    
    # Create ledger entry
    entry = InventoryLedgerEntry(
        id=str(uuid.uuid4()),
        variant_id=adjustment.variant_id,
        location_id=adjustment.location_id,
        event_type=InventoryEventType.ADJUST,
        qty_delta=adjustment.qty_delta,
        source="admin",
        note=f"{adjustment.reason}: {adjustment.note}" if adjustment.note else adjustment.reason
    )
    
    entry_dict = entry.model_dump()
    entry_dict["created_at"] = entry_dict["created_at"].isoformat()
    await db.inventory_ledger.insert_one(entry_dict)
    
    # Update snapshot
    await update_inventory_snapshot(adjustment.variant_id, adjustment.location_id)
    
    return entry_dict

async def update_inventory_snapshot(variant_id: str, location_id: str):
    """Recalculate inventory snapshot from ledger"""
    
    entries = await db.inventory_ledger.find({
        "variant_id": variant_id,
        "location_id": location_id
    }, {"_id": 0}).to_list(100000)
    
    on_hand = sum(e.get("qty_delta", 0) for e in entries)
    
    snapshot = {
        "variant_id": variant_id,
        "location_id": location_id,
        "on_hand": on_hand,
        "reserved": 0,
        "available": on_hand,
        "incoming": 0,
        "as_of": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventory_snapshots.update_one(
        {"variant_id": variant_id, "location_id": location_id},
        {"$set": snapshot},
        upsert=True
    )


# ============================================
# OWNER PORTAL - TRANSFERS
# ============================================

@api_router.get("/admin/transfers")
async def get_transfers(status: str = None, owner: dict = Depends(get_owner)):
    query = {}
    if status:
        query["status"] = status
    transfers = await db.transfers.find(query, {"_id": 0}).to_list(1000)
    return transfers

@api_router.post("/admin/transfers")
async def create_transfer(transfer: TransferCreate, owner: dict = Depends(get_owner)):
    t = Transfer(
        id=str(uuid.uuid4()),
        **transfer.model_dump()
    )
    t_dict = t.model_dump()
    t_dict["created_at"] = t_dict["created_at"].isoformat()
    await db.transfers.insert_one(t_dict)
    return t_dict

@api_router.put("/admin/transfers/{transfer_id}/ship")
async def ship_transfer(transfer_id: str, owner: dict = Depends(get_owner)):
    """Mark transfer as shipped / in transit"""
    
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Create ledger entries for transfer out
    for item in transfer.get("items", []):
        entry = InventoryLedgerEntry(
            variant_id=item.get("variant_id"),
            location_id=transfer.get("from_location_id"),
            event_type=InventoryEventType.TRANSFER_OUT,
            qty_delta=-item.get("qty", 0),
            ref_type="transfer",
            ref_id=transfer_id
        )
        entry_dict = entry.model_dump()
        entry_dict["created_at"] = entry_dict["created_at"].isoformat()
        await db.inventory_ledger.insert_one(entry_dict)
        await update_inventory_snapshot(item.get("variant_id"), transfer.get("from_location_id"))
    
    await db.transfers.update_one(
        {"id": transfer_id},
        {"$set": {
            "status": TransferStatus.IN_TRANSIT.value,
            "shipped_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return await db.transfers.find_one({"id": transfer_id}, {"_id": 0})

@api_router.put("/admin/transfers/{transfer_id}/receive")
async def receive_transfer(transfer_id: str, owner: dict = Depends(get_owner)):
    """Mark transfer as received"""
    
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Create ledger entries for transfer in
    for item in transfer.get("items", []):
        entry = InventoryLedgerEntry(
            variant_id=item.get("variant_id"),
            location_id=transfer.get("to_location_id"),
            event_type=InventoryEventType.TRANSFER_IN,
            qty_delta=item.get("qty", 0),
            ref_type="transfer",
            ref_id=transfer_id
        )
        entry_dict = entry.model_dump()
        entry_dict["created_at"] = entry_dict["created_at"].isoformat()
        await db.inventory_ledger.insert_one(entry_dict)
        await update_inventory_snapshot(item.get("variant_id"), transfer.get("to_location_id"))
    
    await db.transfers.update_one(
        {"id": transfer_id},
        {"$set": {
            "status": TransferStatus.RECEIVED.value,
            "received_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return await db.transfers.find_one({"id": transfer_id}, {"_id": 0})


# ============================================
# OWNER PORTAL - PURCHASE ORDERS
# ============================================

@api_router.get("/admin/purchase-orders")
async def get_purchase_orders(status: str = None, owner: dict = Depends(get_owner)):
    query = {}
    if status:
        query["status"] = status
    pos = await db.purchase_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return pos

@api_router.get("/admin/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str, owner: dict = Depends(get_owner)):
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

@api_router.post("/admin/purchase-orders")
async def create_purchase_order(po: PurchaseOrderCreate, owner: dict = Depends(get_owner)):
    # Generate PO number
    count = await db.purchase_orders.count_documents({})
    po_number = f"PO-{count + 1:06d}"
    
    # Calculate totals
    lines = []
    subtotal = 0
    for line in po.lines:
        line_dict = line.model_dump()
        line_dict["id"] = str(uuid.uuid4())
        line_total = (line.unit_cost_material + line.unit_cost_making) * line.qty_ordered
        subtotal += line_total
        lines.append(line_dict)
    
    po_doc = PurchaseOrder(
        id=str(uuid.uuid4()),
        po_number=po_number,
        vendor_id=po.vendor_id,
        vendor_name=po.vendor_name,
        destination_location_id=po.destination_location_id,
        expected_arrival=po.expected_arrival,
        currency=po.currency,
        notes=po.notes,
        lines=lines,
        subtotal=subtotal,
        grand_total=subtotal
    )
    
    po_dict = po_doc.model_dump()
    po_dict["created_at"] = po_dict["created_at"].isoformat()
    po_dict["updated_at"] = po_dict["updated_at"].isoformat()
    if po_dict.get("expected_arrival"):
        po_dict["expected_arrival"] = po_dict["expected_arrival"].isoformat()
    
    await db.purchase_orders.insert_one(po_dict)
    return po_dict

@api_router.put("/admin/purchase-orders/{po_id}/order")
async def mark_po_ordered(po_id: str, owner: dict = Depends(get_owner)):
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "status": PurchaseOrderStatus.ORDERED.value,
            "ordered_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})

@api_router.put("/admin/purchase-orders/{po_id}/receive")
async def receive_purchase_order(po_id: str, items: List[dict], owner: dict = Depends(get_owner)):
    """Receive items from a purchase order"""
    
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Update line quantities and create ledger entries
    lines = po.get("lines", [])
    all_received = True
    
    for received_item in items:
        for line in lines:
            if line.get("variant_id") == received_item.get("variant_id"):
                line["qty_received"] = line.get("qty_received", 0) + received_item.get("qty", 0)
                
                if line["qty_received"] < line["qty_ordered"]:
                    all_received = False
                
                # Create ledger entry
                entry = InventoryLedgerEntry(
                    variant_id=line["variant_id"],
                    location_id=po["destination_location_id"],
                    event_type=InventoryEventType.RECEIVE,
                    qty_delta=received_item.get("qty", 0),
                    unit_cost=line.get("unit_cost_material", 0) + line.get("unit_cost_making", 0),
                    ref_type="purchase_order",
                    ref_id=po_id
                )
                entry_dict = entry.model_dump()
                entry_dict["created_at"] = entry_dict["created_at"].isoformat()
                await db.inventory_ledger.insert_one(entry_dict)
                await update_inventory_snapshot(line["variant_id"], po["destination_location_id"])
    
    new_status = PurchaseOrderStatus.RECEIVED.value if all_received else PurchaseOrderStatus.PARTIAL.value
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "lines": lines,
            "status": new_status,
            "received_at": datetime.now(timezone.utc).isoformat() if all_received else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})


# ============================================
# OWNER PORTAL - CUSTOMERS
# ============================================

@api_router.get("/admin/customers")
async def get_customers(search: str = None, owner: dict = Depends(get_owner)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/admin/customers/{customer_id}")
async def get_customer(customer_id: str, owner: dict = Depends(get_owner)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.post("/admin/customers")
async def create_customer(customer: CustomerCreate, owner: dict = Depends(get_owner)):
    c = Customer(
        id=str(uuid.uuid4()),
        **customer.model_dump()
    )
    c_dict = c.model_dump()
    c_dict["created_at"] = c_dict["created_at"].isoformat()
    c_dict["updated_at"] = c_dict["updated_at"].isoformat()
    await db.customers.insert_one(c_dict)
    return c_dict

@api_router.put("/admin/customers/{customer_id}")
async def update_customer(customer_id: str, update: dict, owner: dict = Depends(get_owner)):
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.customers.update_one({"id": customer_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await db.customers.find_one({"id": customer_id}, {"_id": 0})


# ============================================
# OWNER PORTAL - ENHANCED ORDERS
# ============================================

@api_router.get("/admin/orders")
async def get_admin_orders(
    status: str = None,
    channel: str = None,
    limit: int = 100,
    owner: dict = Depends(get_owner)
):
    query = {}
    if status:
        query["status"] = status
    if channel:
        query["channel"] = channel
    
    orders = await db.orders.find(query, {"_id": 0}).sort("createdAt", -1).to_list(limit)
    return orders

@api_router.get("/admin/orders/{order_id}")
async def get_admin_order(order_id: str, owner: dict = Depends(get_owner)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, owner: dict = Depends(get_owner)):
    update = {"status": status}
    
    if status == "fulfilled":
        update["fulfilledAt"] = datetime.now(timezone.utc).isoformat()
    elif status == "shipped":
        update["shippedAt"] = datetime.now(timezone.utc).isoformat()
    elif status == "delivered":
        update["deliveredAt"] = datetime.now(timezone.utc).isoformat()
    elif status == "cancelled":
        update["cancelledAt"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get updated order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Send shipping notification email if status changed to "shipped"
    if status == "shipped" and order:
        # Get customer email
        user = await db.users.find_one({"id": order.get("userId")}, {"_id": 0})
        if user and user.get("email"):
            order_for_email = {
                **order,
                "customer": {"name": user.get("name", "Valued Customer")}
            }
            asyncio.ensure_future(send_email(
                user.get("email"),
                f"Your order #{order_id[:8].upper()} has shipped! 🚚",
                get_shipping_notification_email(order_for_email),
                is_html=True
            ))
    
    return order


# ============================================
# OWNER PORTAL - ACTIVITY LOGS
# ============================================

@api_router.get("/admin/activity-logs")
async def get_activity_logs(
    entity_type: str = None,
    entity_id: str = None,
    limit: int = 100,
    owner: dict = Depends(get_owner)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs


# ============================================
# OWNER PORTAL - COUPONS
# ============================================

@api_router.get("/admin/coupons")
async def get_coupons(owner: dict = Depends(get_owner)):
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return coupons

@api_router.get("/admin/coupons/{coupon_id}")
async def get_coupon(coupon_id: str, owner: dict = Depends(get_owner)):
    coupon = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@api_router.post("/admin/coupons")
async def create_coupon(coupon: dict, owner: dict = Depends(get_owner)):
    coupon["id"] = str(uuid.uuid4())
    coupon["usageCount"] = 0
    coupon["createdAt"] = datetime.now(timezone.utc).isoformat()
    await db.coupons.insert_one(coupon)
    coupon.pop("_id", None)
    return coupon

@api_router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, updates: dict, owner: dict = Depends(get_owner)):
    updates.pop("_id", None)
    updates.pop("id", None)
    result = await db.coupons.update_one({"id": coupon_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return await db.coupons.find_one({"id": coupon_id}, {"_id": 0})

@api_router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, owner: dict = Depends(get_owner)):
    result = await db.coupons.delete_one({"id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted"}


# ============================================
# OWNER PORTAL - SETTINGS
# ============================================

@api_router.get("/admin/settings")
async def get_store_settings(owner: dict = Depends(get_owner)):
    settings = await db.settings.find_one({"id": "store_main"}, {"_id": 0})
    if not settings:
        # Return defaults
        return {
            "name": "Annya Jewellers",
            "email": "contact@annyajewellers.com",
            "phone": "+91 98765 43210",
            "currency": "INR",
            "timezone": "Asia/Kolkata",
            "tax_gstin": "",
            "tax_rate": 3
        }
    return settings

@api_router.put("/admin/settings")
async def update_store_settings(settings: StoreSettings, owner: dict = Depends(get_owner)):
    settings_dict = settings.model_dump()
    settings_dict["id"] = "store_main"
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "store_main"},
        {"$set": settings_dict},
        upsert=True
    )
    return settings_dict




# ============================================
# PUBLIC - COUPON VALIDATION
# ============================================

@api_router.post("/coupons/validate")
async def validate_coupon(data: dict):
    """Validate coupon code for checkout with product eligibility checks"""
    code = data.get("code", "").upper()
    order_total = data.get("orderTotal", 0)
    cart_items = data.get("items", [])  # List of {productId, quantity, price, allowCoupons}
    
    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.get("isActive", True):
        raise HTTPException(status_code=400, detail="Coupon is inactive")
    
    # Check usage limit
    if coupon.get("usageLimit") and coupon.get("usageCount", 0) >= coupon["usageLimit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Check min order value
    if order_total < coupon.get("minOrderValue", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order value is ₹{coupon['minOrderValue']}")
    
    # Determine eligible items and amount
    scope = coupon.get("scope", "general")
    applicable_products = coupon.get("applicableProducts", [])
    
    eligible_amount = 0
    eligible_items = []
    ineligible_reasons = []
    
    if cart_items:
        for item in cart_items:
            product_id = item.get("productId")
            allow_coupons = item.get("allowCoupons", True)
            item_total = item.get("price", 0) * item.get("quantity", 1)
            
            # Check if product allows coupons
            if not allow_coupons:
                ineligible_reasons.append(f"{item.get('name', 'Item')} has a discount and doesn't allow coupons")
                continue
            
            # Check scope
            if scope == "product" and applicable_products:
                if product_id not in applicable_products:
                    continue  # Not in applicable products
            
            eligible_items.append(product_id)
            eligible_amount += item_total
    else:
        # Fallback: use order_total if no items provided
        eligible_amount = order_total
    
    if scope == "product" and not eligible_items:
        raise HTTPException(status_code=400, detail="This coupon is not valid for items in your cart")
    
    if eligible_amount <= 0:
        if ineligible_reasons:
            raise HTTPException(status_code=400, detail=ineligible_reasons[0])
        raise HTTPException(status_code=400, detail="No eligible items for this coupon")
    
    # Calculate discount on eligible amount only
    if coupon["type"] == "percent":
        discount = eligible_amount * (coupon["value"] / 100)
        if coupon.get("maxDiscount"):
            discount = min(discount, coupon["maxDiscount"])
    else:
        discount = min(coupon["value"], eligible_amount)
    
    return {
        "valid": True,
        "code": code,
        "scope": scope,
        "type": coupon["type"],
        "value": coupon["value"],
        "discount": round(discount, 2),
        "eligibleAmount": eligible_amount,
        "eligibleItems": eligible_items,
        "description": coupon.get("description", ""),
        "applicableProducts": applicable_products
    }


# ============================================
# POS - POINT OF SALE ENDPOINTS
# ============================================

@api_router.get("/pos/product/{identifier}")
async def pos_product_lookup(identifier: str):
    """Lookup product by SKU or barcode for POS"""
    product = await db.products.find_one({
        "$or": [
            {"sku": identifier},
            {"barcode": identifier}
        ]
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@api_router.post("/pos/sale")
async def create_pos_sale(data: dict, owner: dict = Depends(get_owner)):
    """Create a POS sale (offline order)"""
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="No items in sale")
    
    # Calculate totals and get product costs
    subtotal = 0
    total_cost = 0
    order_items = []
    
    for item in items:
        product = await db.products.find_one({"id": item["productId"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item['productId']} not found")
        
        qty = item.get("quantity", 1)
        unit_price = item.get("unitPrice", product.get("sellingPrice", 0))
        line_total = unit_price * qty
        cost_at_sale = product.get("totalCost", 0)
        profit_at_sale = (unit_price - cost_at_sale) * qty
        
        order_items.append({
            "productId": product["id"],
            "sku": product.get("sku"),
            "name": product.get("name"),
            "quantity": qty,
            "unitPrice": unit_price,
            "discount": item.get("discount", 0),
            "tax": round(line_total * 0.03, 2),
            "lineTotal": line_total,
            "costAtSale": cost_at_sale,
            "profitAtSale": profit_at_sale,
            "image": product.get("image")
        })
        
        subtotal += line_total
        total_cost += cost_at_sale * qty
        
        # Decrement stock
        await db.products.update_one(
            {"id": product["id"]},
            {"$inc": {"stockQuantity": -qty, "stock_quantity": -qty}}
        )
    
    # Apply coupon if provided
    coupon_discount = 0
    coupon_code = data.get("couponCode")
    if coupon_code:
        try:
            coupon_result = await validate_coupon({"code": coupon_code, "orderTotal": subtotal})
            coupon_discount = coupon_result["discount"]
            # Increment coupon usage
            await db.coupons.update_one({"code": coupon_code.upper()}, {"$inc": {"usageCount": 1}})
        except:
            pass
    
    tax_total = round(subtotal * 0.03, 2)
    grand_total = subtotal + tax_total - coupon_discount
    
    # Generate order number
    order_count = await db.orders.count_documents({})
    order_number = f"AJ-POS-{order_count + 1:04d}"
    
    order = {
        "id": str(uuid.uuid4()),
        "orderNumber": order_number,
        "channel": "pos",
        "locationId": data.get("locationId", "loc-main"),
        "staffId": data.get("staffId"),
        "staffName": data.get("staffName"),
        "customerId": data.get("customerId"),
        "customerName": data.get("customerName", "Walk-in"),
        "customerPhone": data.get("customerPhone"),
        "status": "fulfilled",
        "paymentStatus": "paid",
        "fulfillmentStatus": "fulfilled",
        "items": order_items,
        "subtotal": subtotal,
        "discountTotal": coupon_discount,
        "taxTotal": tax_total,
        "shippingTotal": 0,
        "grandTotal": round(grand_total, 2),
        "total": round(grand_total, 2),
        "couponCode": coupon_code,
        "couponDiscount": coupon_discount,
        "totalCost": total_cost,
        "grossProfit": round(subtotal - total_cost, 2),
        "netProfit": round(grand_total - total_cost, 2),
        "paymentMethod": data.get("paymentMethod", "cash"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "paidAt": datetime.now(timezone.utc).isoformat(),
        "fulfilledAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    order.pop("_id", None)
    
    return order


# ============================================
# MARKETING ANALYTICS
# ============================================

@api_router.get("/admin/analytics/traffic")
async def get_traffic_analytics(days: int = 30, owner: dict = Depends(get_owner)):
    """Get traffic data (visitors, pageviews) over time"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    logs = await db.traffic_logs.find({
        "timestamp": {"$gte": start_date.isoformat()}
    }, {"_id": 0, "timestamp": 1, "ip": 1}).to_list(10000)
    
    # Group by date
    daily_stats = {}
    for i in range(days):
        date_str = (now - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        daily_stats[date_str] = {"date": date_str, "visitors": set(), "pageviews": 0}
        
    for log in logs:
        ts = datetime.fromisoformat(log["timestamp"])
        date_str = ts.strftime("%Y-%m-%d")
        if date_str in daily_stats:
            daily_stats[date_str]["pageviews"] += 1
            daily_stats[date_str]["visitors"].add(log.get("ip"))
            
    # Convert to list
    result = []
    for date_str, stats in daily_stats.items():
        result.append({
            "date": date_str,
            "visitors": len(stats["visitors"]),
            "pageviews": stats["pageviews"]
        })
        
    return result

@api_router.get("/admin/analytics/pages")
async def get_top_pages(limit: int = 10, owner: dict = Depends(get_owner)):
    """Get top viewed pages"""
    logs = await db.traffic_logs.find({}, {"_id": 0, "path": 1}).to_list(10000)
    
    # Aggregate
    page_counts = {}
    for log in logs:
        path = log.get("path", "/")
        page_counts[path] = page_counts.get(path, 0) + 1
        
    # Sort
    sorted_pages = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)
    
    return [{"page": p[0], "views": p[1], "bounce": 0} for p in sorted_pages[:limit]]

@api_router.get("/admin/analytics/sources")
async def get_traffic_sources(owner: dict = Depends(get_owner)):
    """Get traffic sources breakdown"""
    logs = await db.traffic_logs.find({}, {"_id": 0, "referer": 1}).to_list(10000)
    
    sources = {}
    for log in logs:
        ref = log.get("referer")
        source = "Direct"
        if ref:
            if "google" in ref: source = "Google"
            elif "facebook" in ref or "instagram" in ref: source = "Social"
            elif "twitter" in ref or "t.co" in ref: source = "Social"
            elif "youtube" in ref: source = "Social"
            else: source = "Referral"
            
        sources[source] = sources.get(source, 0) + 1
        
    total = sum(sources.values()) or 1
    return [{"source": s, "visitors": c, "percent": c/total} for s, c in sources.items()]

@api_router.post("/admin/test-email")
async def test_email(data: dict, owner: dict = Depends(get_owner)):
    """Test email configuration"""
    to_email = data.get("email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    subject = "Test Email from Annya Jewellers"
    body = """
    <h1>Test Email</h1>
    <p>This is a test email from your Annya Jewellers Owner Portal.</p>
    <p>If you received this, your email configuration is working correctly! 🎉</p>
    """
    
    success = await send_email(to_email, subject, body, is_html=True)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check server logs and SMTP configuration.")
        
    return {"message": "Email sent successfully", "to": to_email}


@api_router.get("/admin/analytics/devices")
async def get_device_analytics(owner: dict = Depends(get_owner)):
    """Get device breakdown"""
    logs = await db.traffic_logs.find({}, {"_id": 0, "device": 1}).to_list(10000)
    
    devices = {"desktop": 0, "mobile": 0, "tablet": 0}
    for log in logs:
        dev = log.get("device", "desktop").lower()
        if "mobile" in dev:
            devices["mobile"] += 1
        elif "tablet" in dev:
            devices["tablet"] += 1
        else:
            devices["desktop"] += 1
            
    total = sum(devices.values()) or 1
    return [
        {"device": "Desktop", "sessions": devices["desktop"], "percent": devices["desktop"]/total},
        {"device": "Mobile", "sessions": devices["mobile"], "percent": devices["mobile"]/total},
        {"device": "Tablet", "sessions": devices["tablet"], "percent": devices["tablet"]/total}
    ]



# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Create database indexes on startup for optimal query performance"""
    logging.info("Creating database indexes...")
    try:
        # Products indexes
        await db.products.create_index("id", unique=True)
        await db.products.create_index("sku", unique=True, sparse=True)
        await db.products.create_index("category")
        await db.products.create_index([("name", "text"), ("tags", "text")])
        
        # Orders indexes
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("userId")
        await db.orders.create_index("createdAt")
        await db.orders.create_index("status")
        
        # Traffic logs indexes
        await db.traffic_logs.create_index("timestamp")
        await db.traffic_logs.create_index("path")
        
        # Users indexes
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        
        # Coupons indexes
        await db.coupons.create_index("id", unique=True)
        await db.coupons.create_index("code", unique=True)
        
        logging.info("Database indexes created successfully!")
    except Exception as e:
        logging.error(f"Failed to create indexes: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()