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

from catalog_seed import build_seed_products, CATEGORIES as SEED_CATEGORIES, CATEGORY_NAME_TO_ID
import email_service

CATEGORY_COLOR = {c['id']: c['color'] for c in SEED_CATEGORIES}
CATEGORY_ICON = {c['id']: c['icon'] for c in SEED_CATEGORIES}
DEFAULT_FEATURES = [
    'Escrow protected payment',
    'Instant or same-day delivery',
    '30-day support included',
    'Money-back guarantee',
]

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


@api_router.get("/orders/{order_id}/receipt")
async def get_order_receipt(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({'id': order_id})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if user.get('role') != 'admin' and user['id'] != order.get('buyerId'):
        raise HTTPException(status_code=403, detail='Not allowed')
    rcpt = await db.email_receipts.find_one({'orderId': order_id}, sort=[('sentAt', -1)])
    if not rcpt:
        return {'sent': False}
    return {
        'sent': True,
        'to': rcpt.get('to'),
        'subject': rcpt.get('subject'),
        'downloadUrl': rcpt.get('downloadUrl'),
        'provider': rcpt.get('provider'),
        'status': rcpt.get('status'),
        'sentAt': rcpt.get('sentAt'),
    }


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
# Products (public catalog: seeded catalog + approved seller uploads)
# ---------------------------------------------------------------------------
async def _rating_map(product_ids):
    """avg rating + count per productId from visible reviews."""
    if not product_ids:
        return {}
    pipeline = [
        {'$match': {'hidden': {'$ne': True}, 'productId': {'$in': list(product_ids)}}},
        {'$group': {'_id': '$productId', 'avg': {'$avg': '$rating'}, 'count': {'$sum': 1}}},
    ]
    out = {}
    async for row in db.reviews.aggregate(pipeline):
        out[row['_id']] = {'avg': round(row['avg'], 1), 'count': row['count']}
    return out


async def _map_seller_product(sp: dict) -> dict:
    cat_id = CATEGORY_NAME_TO_ID.get((sp.get('category') or '').strip().lower(), 'custom-services')
    seller_user = await db.users.find_one({'id': sp.get('userId')})
    seller_name = (seller_user or {}).get('fullName') or (seller_user or {}).get('username') or 'Seller'
    from urllib.parse import quote
    return {
        'id': sp['id'],
        'title': sp.get('title', ''),
        'description': sp.get('description', ''),
        'category': cat_id,
        'tags': sp.get('tags', []),
        'price': float(sp.get('price', 0)),
        'priceLabel': sp.get('priceLabel') or 'One-time',
        'rating': 0,
        'reviews': 0,
        'icon': CATEGORY_ICON.get(cat_id, 'Package'),
        'color': CATEGORY_COLOR.get(cat_id, 'from-emerald-500 to-teal-500'),
        'badge': 'New',
        'image': sp.get('image', ''),
        'seller': {'name': seller_name, 'rating': 5.0, 'sales': 0,
                   'avatar': f"https://api.dicebear.com/7.x/avataaars/svg?seed={quote(seller_name)}"},
        'deliveryDays': sp.get('deliveryDays', 3),
        'features': DEFAULT_FEATURES,
        'source': 'seller',
    }


async def _all_products() -> List[dict]:
    seed = [clean(d) for d in await db.products.find({'status': 'approved'}).to_list(2000)]
    seller_docs = await db.seller_products.find({'status': 'approved'}).sort('createdAt', -1).to_list(2000)
    mapped = [await _map_seller_product(sp) for sp in seller_docs]
    combined = mapped + seed  # newest seller uploads first
    ratings = await _rating_map([p['id'] for p in combined])
    for p in combined:
        r = ratings.get(p['id'])
        if r:
            p['rating'] = r['avg']
            p['reviews'] = r['count']
    return combined


@api_router.get("/products")
async def list_products():
    return await _all_products()


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    products = await _all_products()
    match = next((p for p in products if p['id'] == product_id), None)
    if not match:
        raise HTTPException(status_code=404, detail='Product not found')
    return match


@api_router.get("/categories")
async def list_categories():
    return SEED_CATEGORIES


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
        'origin_url': body.origin_url,
        'emailSent': False,
        'created_at': now_iso(),
        'updated_at': now_iso(),
    })
    return {'checkout_url': session.url, 'session_id': session.session_id}


async def _send_order_receipt(tx: dict):
    """Send the order confirmation receipt once (idempotent via emailSent flag)."""
    if tx.get('emailSent'):
        return
    order = await db.orders.find_one({'id': tx['order_id']})
    if not order:
        return
    buyer = await db.users.find_one({'id': order.get('buyerId')})
    to_email = (buyer or {}).get('email')
    if not to_email:
        return
    origin = (tx.get('origin_url') or '').rstrip('/')
    download_url = f"{origin}/dashboard/buyer-orders" if origin else ''
    subject = f"Your ShahLance receipt — {order.get('title', 'order')}"
    html = email_service.build_receipt_html(order, download_url)
    result = email_service.send_email(to_email, subject, html)
    await db.email_receipts.insert_one({
        'id': f"rcpt_{uuid.uuid4().hex[:12]}",
        'orderId': order['id'],
        'buyerId': order.get('buyerId'),
        'to': to_email,
        'subject': subject,
        'downloadUrl': download_url,
        'provider': result.get('provider'),
        'status': result.get('status'),
        'html': html,
        'sentAt': now_iso(),
    })
    await db.payment_transactions.update_one({'session_id': tx['session_id']}, {'$set': {'emailSent': True}})
    await db.orders.update_one({'id': order['id']}, {'$set': {'receiptSent': True}})


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
        tx = await db.payment_transactions.find_one({'session_id': session_id})
    # Send the confirmation receipt (idempotent).
    await _send_order_receipt(tx)


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
        await db.products.create_index('id', unique=True)
    except Exception as e:
        logger.warning(f"index setup: {e}")
    # Seed catalog products (idempotent upsert by id)
    try:
        for p in build_seed_products():
            await db.products.update_one({'id': p['id']}, {'$setOnInsert': p}, upsert=True)
        count = await db.products.count_documents({})
        logger.info(f"Catalog products in DB: {count}")
    except Exception as e:
        logger.error(f"product seed failed: {e}")
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
