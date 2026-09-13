from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

# ---------------------------------------------------------------------------
# Config & DB
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com').strip().lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY') or 'sk_test_emergent'

# Object storage
STORAGE_BASE = (os.environ.get('INTEGRATION_PROXY_URL') or '').strip() or 'https://integrations.emergentagent.com'
STORAGE_URL = STORAGE_BASE.rstrip('/') + '/objstore/api/v1/storage'
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = 'shahlance'
_storage_key = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
        'type': 'access',
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def sanitize_user(u: dict) -> dict:
    if not u:
        return u
    u = dict(u)
    u.pop('_id', None)
    u.pop('passwordHash', None)
    return u


async def get_optional_user(request: Request) -> Optional[dict]:
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['sub']})
        return sanitize_user(user) if user else None
    except Exception:
        return None


async def get_current_user(request: Request) -> dict:
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=401, detail='Not authenticated')
    return user


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return user


# ---- Object storage ----
def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterBody(BaseModel):
    fullName: str
    username: str
    email: EmailStr
    password: str
    phone: str = ''
    country: str = ''
    accountType: str = 'freelancer'
    profilePhoto: str = ''


class LoginBody(BaseModel):
    identifier: str
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class OrderCreate(BaseModel):
    productId: str
    title: str
    sellerName: str
    sellerAvatar: str = ''
    price: float
    priceLabel: str = ''
    category: str = ''
    deliveryDays: int = 3
    note: str = ''


class StatusBody(BaseModel):
    status: str


class PaymentBody(BaseModel):
    paymentStatus: str


class ReviewCreate(BaseModel):
    productId: str
    productTitle: str = ''
    sellerName: str = ''
    orderId: str = ''
    rating: int = 5
    comment: str = ''


class HiddenBody(BaseModel):
    hidden: bool


class ToggleSavedBody(BaseModel):
    productId: str


class ApplicationCreate(BaseModel):
    sellerType: str
    data: dict = {}


class DecideBody(BaseModel):
    action: str
    reason: str = ''


class SellerProductCreate(BaseModel):
    title: str
    category: str
    isCustomCategory: bool = False
    price: float
    description: str
    image: str = ''
    fileId: str = ''
    fileName: str = ''


class WithdrawalCreate(BaseModel):
    amount: float
    method: str = 'Bank transfer'


class CheckoutBody(BaseModel):
    order_id: str
    origin_url: str


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "ShahLance API", "status": "ok"}


@api_router.post("/auth/register")
async def register(body: RegisterBody):
    email = body.email.strip().lower()
    username = body.username.strip().lower()
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters.')
    if await db.users.find_one({'email': email}):
        raise HTTPException(status_code=400, detail='An account with this email already exists.')
    if await db.users.find_one({'username': username}):
        raise HTTPException(status_code=400, detail='This username is already taken.')
    role = 'admin' if email == ADMIN_EMAIL else ('buyer' if body.accountType == 'client' else 'seller')
    user = {
        'id': f"u_{uuid.uuid4().hex[:12]}",
        'fullName': body.fullName.strip(),
        'username': username,
        'email': email,
        'phone': body.phone or '',
        'country': body.country or '',
        'accountType': body.accountType,
        'role': role,
        'profilePhoto': body.profilePhoto or '',
        'skills': [],
        'services': [],
        'company': {'name': '', 'website': '', 'industry': ''},
        'passwordHash': hash_password(body.password),
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user['id'], email)
    return {'token': token, 'user': sanitize_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginBody):
    ident = body.identifier.strip().lower()
    # Brute-force lockout: 8 failed attempts within 15 min blocks further tries.
    attempt = await db.login_attempts.find_one({'identifier': ident})
    if attempt and attempt.get('count', 0) >= 8:
        last = attempt.get('last')
        if last is not None:
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - last) < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail='Too many failed attempts. Please try again in a few minutes.')
    user = await db.users.find_one({'$or': [{'email': ident}, {'username': ident}]})
    if not user or not verify_password(body.password, user.get('passwordHash', '')):
        await db.login_attempts.update_one(
            {'identifier': ident},
            {'$inc': {'count': 1}, '$set': {'last': datetime.now(timezone.utc)}},
            upsert=True)
        detail = 'No account found with that email or username.' if not user else 'Incorrect password. Please try again.'
        raise HTTPException(status_code=400, detail=detail)
    await db.login_attempts.delete_one({'identifier': ident})
    token = create_access_token(user['id'], user['email'])
    return {'token': token, 'user': sanitize_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.put("/auth/me")
async def update_me(patch: dict, user: dict = Depends(get_current_user)):
    # Allowlist: prevent privilege / flag injection (e.g. role, isSeller).
    allowed = {'fullName', 'username', 'phone', 'country', 'profilePhoto', 'skills', 'services', 'company', 'bio'}
    clean_patch = {k: v for k, v in patch.items() if k in allowed}
    if 'username' in clean_patch:
        uname = str(clean_patch['username']).strip().lower()
        clash = await db.users.find_one({'username': uname, 'id': {'$ne': user['id']}})
        if clash:
            raise HTTPException(status_code=400, detail='This username is already taken.')
        clean_patch['username'] = uname
    clean_patch['updatedAt'] = now_iso()
    await db.users.update_one({'id': user['id']}, {'$set': clean_patch})
    updated = await db.users.find_one({'id': user['id']})
    return sanitize_user(updated)


@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotBody):
    email = body.email.strip().lower()
    user = await db.users.find_one({'email': email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            'token': token, 'userId': user['id'],
            'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1),
            'used': False, 'createdAt': now_iso(),
        })
        logger.info(f"Password reset link for {email}: /reset-password?token={token}")
    return {'ok': True}


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
def clean(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop('_id', None)
    return doc


@api_router.get("/orders")
async def list_orders(request: Request):
    user = await get_optional_user(request)
    if not user:
        return []
    if user.get('role') == 'admin':
        docs = await db.orders.find().sort('createdAt', -1).to_list(2000)
    else:
        docs = await db.orders.find({'$or': [{'buyerId': user['id']}, {'sellerId': user['id']}]}).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/orders")
async def create_order(body: OrderCreate, user: dict = Depends(get_current_user)):
    # Server-side price: trust a backend seller-product price when available.
    price = float(body.price)
    seller_prod = await db.seller_products.find_one({'id': body.productId})
    if seller_prod:
        price = float(seller_prod.get('price', price))
    order = {
        'id': f"o_{uuid.uuid4().hex[:12]}",
        'productId': body.productId,
        'title': body.title,
        'sellerName': body.sellerName,
        'sellerAvatar': body.sellerAvatar or '',
        'sellerId': seller_prod.get('userId') if seller_prod else '',
        'buyerId': user['id'],
        'buyerName': user.get('fullName') or user.get('username') or 'Buyer',
        'price': price,
        'priceLabel': body.priceLabel or '',
        'category': body.category or '',
        'deliveryDays': body.deliveryDays or 3,
        'status': 'pending',
        'paymentStatus': 'pending',
        'note': body.note or '',
        'fileId': seller_prod.get('fileId', '') if seller_prod else '',
        'fileName': seller_prod.get('fileName', '') if seller_prod else '',
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }
    await db.orders.insert_one(order)
    return clean(order)


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_optional_user(request)
    doc = await db.orders.find_one({'id': order_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Order not found')
    if not user or (user.get('role') != 'admin' and user['id'] not in (doc.get('buyerId'), doc.get('sellerId'))):
        raise HTTPException(status_code=403, detail='Not allowed')
    return clean(doc)


@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: StatusBody, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one({'id': order_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Order not found')
    status = body.status
    if status not in ('pending', 'processing', 'completed', 'cancelled'):
        raise HTTPException(status_code=400, detail='Invalid status')
    role = user.get('role')
    is_buyer = user['id'] == doc.get('buyerId')
    is_seller = user['id'] == doc.get('sellerId')
    if role == 'admin':
        pass  # admin may set any status
    elif is_buyer:
        if status != 'cancelled':
            raise HTTPException(status_code=403, detail='Buyers can only cancel an order')
    elif is_seller:
        if status not in ('processing', 'completed', 'cancelled'):
            raise HTTPException(status_code=403, detail='Not allowed to set this status')
    else:
        raise HTTPException(status_code=403, detail='Not allowed')
    await db.orders.update_one({'id': order_id}, {'$set': {'status': status, 'updatedAt': now_iso()}})
    return clean(await db.orders.find_one({'id': order_id}))


@api_router.patch("/orders/{order_id}/payment")
async def update_order_payment(order_id: str, body: PaymentBody, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one({'id': order_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Order not found')
    if user.get('role') not in ('admin',) and user['id'] != doc.get('sellerId'):
        raise HTTPException(status_code=403, detail='Not allowed')
    await db.orders.update_one({'id': order_id}, {'$set': {'paymentStatus': body.paymentStatus, 'updatedAt': now_iso()}})
    return clean(await db.orders.find_one({'id': order_id}))


@api_router.get("/orders/{order_id}/download")
async def download_deliverable(order_id: str, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one({'id': order_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Order not found')
    if user.get('role') != 'admin' and user['id'] != doc.get('buyerId'):
        raise HTTPException(status_code=403, detail='Not allowed')
    if doc.get('paymentStatus') != 'paid':
        raise HTTPException(status_code=403, detail='Payment required before download')
    file_id = doc.get('fileId')
    if not file_id:
        raise HTTPException(status_code=404, detail='No deliverable file for this order')
    record = await db.files.find_one({'id': file_id, 'is_deleted': False})
    if not record:
        raise HTTPException(status_code=404, detail='File not found')
    data, content_type = get_object(record['storage_path'])
    return Response(content=data, media_type=record.get('content_type', content_type),
                    headers={'Content-Disposition': f'attachment; filename="{record.get("original_filename", "download")}"'})


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
@api_router.get("/reviews")
async def list_reviews(request: Request):
    user = await get_optional_user(request)
    if user and user.get('role') == 'admin':
        docs = await db.reviews.find().sort('createdAt', -1).to_list(2000)
    else:
        docs = await db.reviews.find({'hidden': {'$ne': True}}).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/reviews")
async def create_review(body: ReviewCreate, user: dict = Depends(get_current_user)):
    review = {
        'id': f"r_{uuid.uuid4().hex[:12]}",
        'productId': body.productId,
        'productTitle': body.productTitle,
        'sellerName': body.sellerName,
        'orderId': body.orderId,
        'buyerId': user['id'],
        'buyerName': user.get('fullName') or user.get('username') or 'Buyer',
        'rating': max(1, min(5, int(body.rating))),
        'comment': (body.comment or '').strip(),
        'hidden': False,
        'createdAt': now_iso(),
    }
    await db.reviews.insert_one(review)
    return clean(review)


@api_router.patch("/reviews/{review_id}/hidden")
async def set_review_hidden(review_id: str, body: HiddenBody, user: dict = Depends(require_admin)):
    doc = await db.reviews.find_one({'id': review_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Review not found')
    await db.reviews.update_one({'id': review_id}, {'$set': {'hidden': body.hidden}})
    return clean(await db.reviews.find_one({'id': review_id}))


@api_router.delete("/reviews/{review_id}")
async def remove_review(review_id: str, user: dict = Depends(require_admin)):
    await db.reviews.delete_one({'id': review_id})
    return {'ok': True}


# ---------------------------------------------------------------------------
# Saved / Wishlist
# ---------------------------------------------------------------------------
@api_router.get("/saved")
async def list_saved(user: dict = Depends(get_current_user)):
    doc = await db.saved.find_one({'userId': user['id']})
    return doc.get('items', []) if doc else []


@api_router.post("/saved/toggle")
async def toggle_saved(body: ToggleSavedBody, user: dict = Depends(get_current_user)):
    doc = await db.saved.find_one({'userId': user['id']})
    items = doc.get('items', []) if doc else []
    items = [i for i in items if i != body.productId] if body.productId in items else [body.productId] + items
    await db.saved.update_one({'userId': user['id']}, {'$set': {'items': items}}, upsert=True)
    return items


@api_router.delete("/saved/{product_id}")
async def remove_saved(product_id: str, user: dict = Depends(get_current_user)):
    doc = await db.saved.find_one({'userId': user['id']})
    items = [i for i in (doc.get('items', []) if doc else []) if i != product_id]
    await db.saved.update_one({'userId': user['id']}, {'$set': {'items': items}}, upsert=True)
    return items


# ---------------------------------------------------------------------------
# Seller: applications, products, withdrawals
# ---------------------------------------------------------------------------
@api_router.post("/seller/applications")
async def submit_application(body: ApplicationCreate, user: dict = Depends(get_current_user)):
    existing = await db.seller_applications.find_one({'userId': user['id'], 'sellerType': body.sellerType, 'status': {'$ne': 'rejected'}})
    if existing:
        raise HTTPException(status_code=400, detail='You already have a pending or approved application for this seller type.')
    app_doc = {
        'id': f"app_{uuid.uuid4().hex[:12]}",
        'userId': user['id'],
        'sellerType': body.sellerType,
        'status': 'pending',
        'createdAt': now_iso(),
        **(body.data or {}),
    }
    await db.seller_applications.insert_one(app_doc)
    return clean(app_doc)


@api_router.get("/seller/applications")
async def list_applications(request: Request, status: Optional[str] = None):
    await require_admin(request)
    q = {'status': status} if status else {}
    docs = await db.seller_applications.find(q).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.get("/seller/applications/mine")
async def list_my_applications(user: dict = Depends(get_current_user)):
    docs = await db.seller_applications.find({'userId': user['id']}).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/seller/applications/{app_id}/decide")
async def decide_application(app_id: str, body: DecideBody, user: dict = Depends(require_admin)):
    doc = await db.seller_applications.find_one({'id': app_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Application not found.')
    new_status = 'approved' if body.action == 'approve' else 'rejected'
    patch = {'status': new_status, 'decidedAt': now_iso()}
    if body.reason:
        patch['reason'] = body.reason
    await db.seller_applications.update_one({'id': app_id}, {'$set': patch})
    if new_status == 'approved':
        await db.users.update_one({'id': doc['userId']}, {'$set': {'isSeller': True}})
    return clean(await db.seller_applications.find_one({'id': app_id}))


@api_router.post("/seller/products")
async def submit_product(body: SellerProductCreate, user: dict = Depends(get_current_user)):
    approved = await db.seller_applications.find_one({'userId': user['id'], 'status': 'approved'})
    if not approved and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='You need an approved seller application to upload products.')
    prod = {
        'id': f"sp_{uuid.uuid4().hex[:12]}",
        'userId': user['id'],
        'status': 'pending',
        'title': body.title,
        'category': body.category,
        'isCustomCategory': body.isCustomCategory,
        'price': float(body.price),
        'description': body.description,
        'image': body.image or '',
        'fileId': body.fileId or '',
        'fileName': body.fileName or '',
        'createdAt': now_iso(),
    }
    await db.seller_products.insert_one(prod)
    return clean(prod)


@api_router.get("/seller/products")
async def list_seller_products(request: Request, status: Optional[str] = None, userId: Optional[str] = None):
    user = await get_optional_user(request)
    q = {}
    if status:
        q['status'] = status
    if userId:
        q['userId'] = userId
    else:
        # non-admin without explicit filter only see approved catalog
        if not user or user.get('role') != 'admin':
            q['status'] = q.get('status', 'approved')
    docs = await db.seller_products.find(q).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/seller/products/{product_id}/decide")
async def decide_product(product_id: str, body: DecideBody, user: dict = Depends(require_admin)):
    doc = await db.seller_products.find_one({'id': product_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Product not found.')
    patch = {'status': 'approved' if body.action == 'approve' else 'rejected', 'decidedAt': now_iso()}
    if body.reason:
        patch['reason'] = body.reason
    await db.seller_products.update_one({'id': product_id}, {'$set': patch})
    return clean(await db.seller_products.find_one({'id': product_id}))


@api_router.patch("/seller/products/{product_id}")
async def update_seller_product(product_id: str, patch: dict, user: dict = Depends(get_current_user)):
    doc = await db.seller_products.find_one({'id': product_id})
    if not doc:
        raise HTTPException(status_code=404, detail='Product not found.')
    if user.get('role') != 'admin' and user['id'] != doc.get('userId'):
        raise HTTPException(status_code=403, detail='Not allowed')
    patch.pop('id', None)
    patch.pop('userId', None)
    patch['updatedAt'] = now_iso()
    await db.seller_products.update_one({'id': product_id}, {'$set': patch})
    return clean(await db.seller_products.find_one({'id': product_id}))


@api_router.post("/seller/withdrawals")
async def request_withdrawal(body: WithdrawalCreate, user: dict = Depends(get_current_user)):
    w = {
        'id': f"wd_{uuid.uuid4().hex[:10]}",
        'userId': user['id'],
        'amount': float(body.amount),
        'method': body.method or 'Bank transfer',
        'status': 'pending',
        'createdAt': now_iso(),
    }
    await db.withdrawals.insert_one(w)
    return clean(w)


@api_router.get("/seller/withdrawals")
async def list_withdrawals(request: Request, status: Optional[str] = None, userId: Optional[str] = None):
    user = await get_optional_user(request)
    q = {}
    if status:
        q['status'] = status
    if userId:
        q['userId'] = userId
    elif not user or user.get('role') != 'admin':
        if user:
            q['userId'] = user['id']
        else:
            return []
    docs = await db.withdrawals.find(q).sort('createdAt', -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/seller/withdrawals/{wid}/decide")
async def decide_withdrawal(wid: str, body: DecideBody, user: dict = Depends(require_admin)):
    doc = await db.withdrawals.find_one({'id': wid})
    if not doc:
        raise HTTPException(status_code=404, detail='Withdrawal not found.')
    await db.withdrawals.update_one({'id': wid}, {'$set': {'status': 'approved' if body.action == 'approve' else 'rejected', 'decidedAt': now_iso()}})
    return clean(await db.withdrawals.find_one({'id': wid}))


# ---------------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------------
@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split('.')[-1].lower() if '.' in (file.filename or '') else 'bin'
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File too large (max 50MB).')
    result = put_object(path, data, file.content_type or 'application/octet-stream')
    file_id = f"f_{uuid.uuid4().hex[:12]}"
    await db.files.insert_one({
        'id': file_id,
        'storage_path': result['path'],
        'original_filename': file.filename,
        'content_type': file.content_type,
        'size': result.get('size', len(data)),
        'ownerId': user['id'],
        'is_deleted': False,
        'created_at': now_iso(),
    })
    return {'id': file_id, 'filename': file.filename, 'size': result.get('size', len(data))}


# ---------------------------------------------------------------------------
# Payments (Stripe)
# ---------------------------------------------------------------------------
@api_router.post("/payments/checkout")
async def create_checkout(body: CheckoutBody, request: Request, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({'id': body.order_id})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.get('buyerId') != user['id']:
        raise HTTPException(status_code=403, detail='Not allowed')
    amount = float(order['price'])  # server-side amount
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    success_url = f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/payment/cancel"
    req = CheckoutSessionRequest(
        amount=amount, currency='usd',
        success_url=success_url, cancel_url=cancel_url,
        metadata={'order_id': order['id'], 'user_id': user['id']},
    )
    session = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        'id': f"pt_{uuid.uuid4().hex[:12]}",
        'session_id': session.session_id,
        'order_id': order['id'],
        'user_id': user['id'],
        'amount': amount,
        'currency': 'usd',
        'status': 'initiated',
        'payment_status': 'pending',
        'created_at': now_iso(),
        'updated_at': now_iso(),
    })
    return {'checkout_url': session.url, 'session_id': session.session_id}


async def _mark_paid(session_id: str):
    tx = await db.payment_transactions.find_one({'session_id': session_id})
    if not tx:
        return
    if tx.get('payment_status') != 'paid':
        await db.payment_transactions.update_one(
            {'session_id': session_id, 'payment_status': {'$ne': 'paid'}},
            {'$set': {'status': 'completed', 'payment_status': 'paid', 'updated_at': now_iso()}})
        await db.orders.update_one(
            {'id': tx['order_id']},
            {'$set': {'paymentStatus': 'paid', 'status': 'processing', 'updatedAt': now_iso()}})


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    tx = await db.payment_transactions.find_one({'session_id': session_id})
    if not tx:
        raise HTTPException(status_code=404, detail='Transaction not found')
    if tx.get('payment_status') != 'paid':
        try:
            stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url='https://example.com/api/webhook/stripe')
            status = await stripe_checkout.get_checkout_status(session_id)
            if status.payment_status == 'paid' or status.status == 'complete':
                await _mark_paid(session_id)
                tx = await db.payment_transactions.find_one({'session_id': session_id})
        except Exception as e:
            logger.warning(f"status poll failed: {e}")
    return {'session_id': session_id, 'status': tx['status'], 'payment_status': tx['payment_status'], 'order_id': tx['order_id']}


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get('Stripe-Signature')
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=str(request.base_url) + 'api/webhook/stripe')
        resp = await stripe_checkout.handle_webhook(body, sig)
        if resp.payment_status == 'paid' and resp.session_id:
            await _mark_paid(resp.session_id)
    except Exception as e:
        logger.warning(f"webhook error: {e}")
    return {'status': 'ok'}


# ---------------------------------------------------------------------------
# Admin overview
# ---------------------------------------------------------------------------
@api_router.get("/admin/overview")
async def admin_overview(user: dict = Depends(require_admin)):
    return {
        'users': await db.users.count_documents({}),
        'orders': await db.orders.count_documents({}),
        'sellerProducts': await db.seller_products.count_documents({}),
        'applications': await db.seller_applications.count_documents({'status': 'pending'}),
        'reviews': await db.reviews.count_documents({}),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Indexes
    try:
        await db.users.create_index('email', unique=True)
        await db.users.create_index('username', unique=True)
        await db.users.create_index('id', unique=True)
        await db.orders.create_index('id', unique=True)
        await db.reviews.create_index('id', unique=True)
        await db.password_reset_tokens.create_index('expiresAt', expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"index setup: {e}")
    # Seed admin
    try:
        existing = await db.users.find_one({'email': ADMIN_EMAIL})
        if not existing:
            await db.users.insert_one({
                'id': f"u_{uuid.uuid4().hex[:12]}",
                'fullName': 'Admin',
                'username': 'admin',
                'email': ADMIN_EMAIL,
                'phone': '', 'country': '',
                'accountType': 'both', 'role': 'admin',
                'profilePhoto': '', 'skills': [], 'services': [],
                'company': {'name': '', 'website': '', 'industry': ''},
                'passwordHash': hash_password(ADMIN_PASSWORD),
                'createdAt': now_iso(), 'updatedAt': now_iso(),
            })
            logger.info(f"Seeded admin {ADMIN_EMAIL}")
        elif not verify_password(ADMIN_PASSWORD, existing.get('passwordHash', '')):
            await db.users.update_one({'email': ADMIN_EMAIL}, {'$set': {'passwordHash': hash_password(ADMIN_PASSWORD), 'role': 'admin'}})
        elif existing.get('role') != 'admin':
            await db.users.update_one({'email': ADMIN_EMAIL}, {'$set': {'role': 'admin'}})
    except Exception as e:
        logger.error(f"admin seed failed: {e}")
    # Storage
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
