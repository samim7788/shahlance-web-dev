"""
ShahLance backend regression suite.
Covers: auth, roles/admin gating, orders CRUD, reviews, saved, seller apply/decide/upload,
files upload, payments checkout (Stripe test), download gating.
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://marketplace-preview-110.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

ADMIN = {"identifier": "rajavai247@gmail.com", "password": "Amijanina7799@@"}
BUYER = {"identifier": "tbuyer1@example.com", "password": "Password123!"}
SELLER = {"identifier": "tseller1@example.com", "password": "Password123!"}


def _login(cred):
    r = requests.post(f"{API}/auth/login", json=cred, timeout=20)
    assert r.status_code == 200, f"login {cred['identifier']}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def buyer_token():
    # ensure buyer exists — try login, else register
    r = requests.post(f"{API}/auth/login", json=BUYER, timeout=20)
    if r.status_code == 200:
        return r.json()["token"]
    reg = requests.post(f"{API}/auth/register", json={
        "fullName": "Test Buyer", "username": "tbuyer1",
        "email": "tbuyer1@example.com", "password": "Password123!",
        "country": "US", "accountType": "client",
    }, timeout=20)
    assert reg.status_code == 200, reg.text
    return reg.json()["token"]


@pytest.fixture(scope="session")
def seller_token(admin_token):
    r = requests.post(f"{API}/auth/login", json=SELLER, timeout=20)
    if r.status_code == 200:
        return r.json()["token"]
    reg = requests.post(f"{API}/auth/register", json={
        "fullName": "Test Seller", "username": "tseller1",
        "email": "tseller1@example.com", "password": "Password123!",
        "country": "US", "accountType": "freelancer",
    }, timeout=20)
    assert reg.status_code == 200, reg.text
    token = reg.json()["token"]
    # apply + approve
    app_r = requests.post(f"{API}/seller/applications", headers=_h(token),
                         json={"sellerType": "freelancer", "data": {"bio": "test"}}, timeout=20)
    if app_r.status_code == 200:
        app_id = app_r.json()["id"]
        d = requests.post(f"{API}/seller/applications/{app_id}/decide",
                          headers=_h(admin_token), json={"action": "approve"}, timeout=20)
        assert d.status_code == 200, d.text
    return token


# ---------- Health / auth ----------
def test_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_admin_login_and_me(admin_token):
    r = requests.get(f"{API}/auth/me", headers=_h(admin_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert r.json()["email"] == ADMIN["identifier"].lower()


def test_login_bad_password():
    r = requests.post(f"{API}/auth/login", json={"identifier": "rajavai247@gmail.com", "password": "wrong"}, timeout=10)
    assert r.status_code == 400


def test_me_requires_auth():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_register_new_user_and_login():
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    uname = f"test_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/auth/register", json={
        "fullName": "Reg Test", "username": uname, "email": email,
        "password": "Password123!", "country": "US", "accountType": "client",
    }, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "buyer"
    assert data["user"]["email"] == email.lower()
    assert "passwordHash" not in data["user"]
    # duplicate email should fail
    r2 = requests.post(f"{API}/auth/register", json={
        "fullName": "x", "username": f"x_{uuid.uuid4().hex[:6]}",
        "email": email, "password": "Password123!", "accountType": "client",
    }, timeout=20)
    assert r2.status_code == 400


# ---------- Admin gating ----------
def test_admin_overview_gating(admin_token, buyer_token):
    r = requests.get(f"{API}/admin/overview", headers=_h(admin_token), timeout=10)
    assert r.status_code == 200
    for k in ("users", "orders", "sellerProducts", "applications", "reviews"):
        assert k in r.json()
    r2 = requests.get(f"{API}/admin/overview", headers=_h(buyer_token), timeout=10)
    assert r2.status_code == 403
    r3 = requests.get(f"{API}/admin/overview", timeout=10)
    assert r3.status_code == 401


def test_seller_applications_admin_only(buyer_token):
    r = requests.get(f"{API}/seller/applications", headers=_h(buyer_token), timeout=10)
    assert r.status_code == 403


# ---------- Orders flow (buyer creates) ----------
@pytest.fixture(scope="session")
def buyer_order(buyer_token):
    payload = {
        "productId": f"seed_svc_{uuid.uuid4().hex[:6]}",
        "title": "TEST Service", "sellerName": "Seed Seller",
        "price": 25.0, "priceLabel": "$25", "category": "graphics",
        "deliveryDays": 3, "note": "test order",
    }
    r = requests.post(f"{API}/orders", headers=_h(buyer_token), json=payload, timeout=20)
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["status"] == "pending"
    assert o["paymentStatus"] == "pending"
    assert o["price"] == 25.0
    assert o["id"].startswith("o_")
    return o


def test_create_order_then_get(buyer_token, buyer_order):
    r = requests.get(f"{API}/orders/{buyer_order['id']}", headers=_h(buyer_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == buyer_order["id"]


def test_orders_list_buyer_scope(buyer_token, buyer_order):
    r = requests.get(f"{API}/orders", headers=_h(buyer_token), timeout=10)
    assert r.status_code == 200
    ids = [o["id"] for o in r.json()]
    assert buyer_order["id"] in ids


def test_order_get_forbidden_for_other(buyer_order):
    # create a random new user, ensure they can't see this order
    email = f"other_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "fullName": "Other", "username": f"other_{uuid.uuid4().hex[:6]}",
        "email": email, "password": "Password123!", "accountType": "client",
    }, timeout=20)
    assert r.status_code == 200
    other_token = r.json()["token"]
    r2 = requests.get(f"{API}/orders/{buyer_order['id']}", headers=_h(other_token), timeout=10)
    assert r2.status_code == 403


def test_order_status_update(buyer_token, buyer_order):
    r = requests.patch(f"{API}/orders/{buyer_order['id']}/status", headers=_h(buyer_token),
                       json={"status": "cancelled"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


# ---------- Payments ----------
def test_payments_checkout_returns_stripe_url(buyer_token):
    # create fresh order for checkout (previous one is cancelled)
    r = requests.post(f"{API}/orders", headers=_h(buyer_token), json={
        "productId": "seed_svc_pay", "title": "TEST Pay Service",
        "sellerName": "x", "price": 15.0, "priceLabel": "$15",
    }, timeout=20)
    assert r.status_code == 200
    oid = r.json()["id"]
    r2 = requests.post(f"{API}/payments/checkout", headers=_h(buyer_token),
                       json={"order_id": oid, "origin_url": "https://example.com"}, timeout=30)
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert "checkout_url" in data and "session_id" in data
    assert "stripe.com" in data["checkout_url"]
    # status endpoint responds
    s = requests.get(f"{API}/payments/status/{data['session_id']}", timeout=30)
    assert s.status_code == 200
    payload = s.json()
    for k in ("session_id", "status", "payment_status", "order_id"):
        assert k in payload


def test_payments_checkout_not_owner_forbidden(buyer_token, buyer_order):
    # register other user, try to checkout for the buyer's order
    email = f"other2_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "fullName": "Other2", "username": f"other2_{uuid.uuid4().hex[:6]}",
        "email": email, "password": "Password123!", "accountType": "client",
    }, timeout=20)
    other_token = r.json()["token"]
    r2 = requests.post(f"{API}/payments/checkout", headers=_h(other_token),
                       json={"order_id": buyer_order["id"], "origin_url": "https://example.com"}, timeout=15)
    assert r2.status_code == 403


# ---------- Download gating ----------
def test_download_forbidden_before_payment(buyer_token, buyer_order):
    r = requests.get(f"{API}/orders/{buyer_order['id']}/download", headers=_h(buyer_token), timeout=10)
    assert r.status_code == 403  # unpaid


# ---------- Reviews ----------
def test_review_create_and_list(buyer_token):
    r = requests.post(f"{API}/reviews", headers=_h(buyer_token), json={
        "productId": "seed_prod_1", "productTitle": "TEST product",
        "sellerName": "seller", "rating": 5, "comment": "great",
    }, timeout=10)
    assert r.status_code == 200
    rid = r.json()["id"]
    assert rid.startswith("r_")
    lr = requests.get(f"{API}/reviews", timeout=10)
    assert lr.status_code == 200
    assert any(x["id"] == rid for x in lr.json())


def test_review_hide_admin_only(buyer_token, admin_token):
    r = requests.post(f"{API}/reviews", headers=_h(buyer_token), json={
        "productId": "seed_prod_2", "rating": 4, "comment": "ok",
    }, timeout=10)
    rid = r.json()["id"]
    bad = requests.patch(f"{API}/reviews/{rid}/hidden", headers=_h(buyer_token), json={"hidden": True}, timeout=10)
    assert bad.status_code == 403
    ok = requests.patch(f"{API}/reviews/{rid}/hidden", headers=_h(admin_token), json={"hidden": True}, timeout=10)
    assert ok.status_code == 200
    assert ok.json()["hidden"] is True


# ---------- Saved ----------
def test_saved_toggle(buyer_token):
    pid = f"saved_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/saved/toggle", headers=_h(buyer_token), json={"productId": pid}, timeout=10)
    assert r.status_code == 200
    assert pid in r.json()
    r2 = requests.get(f"{API}/saved", headers=_h(buyer_token), timeout=10)
    assert pid in r2.json()
    r3 = requests.post(f"{API}/saved/toggle", headers=_h(buyer_token), json={"productId": pid}, timeout=10)
    assert pid not in r3.json()


# ---------- Seller flow (file upload + product) ----------
def test_seller_upload_product_after_approval(seller_token):
    # verify seller has approved application
    apps = requests.get(f"{API}/seller/applications/mine", headers=_h(seller_token), timeout=10)
    assert apps.status_code == 200
    approved = [a for a in apps.json() if a["status"] == "approved"]
    assert approved, "seller should have approved application"

    # upload a deliverable file
    files = {"file": ("test.txt", io.BytesIO(b"hello deliverable"), "text/plain")}
    fr = requests.post(f"{API}/files/upload",
                       headers={"Authorization": f"Bearer {seller_token}"}, files=files, timeout=30)
    assert fr.status_code == 200, fr.text
    file_id = fr.json()["id"]

    # create product
    pr = requests.post(f"{API}/seller/products", headers=_h(seller_token), json={
        "title": "TEST Product", "category": "graphics", "price": 12.5,
        "description": "This is a sufficiently long product description for validation.",
        "fileId": file_id, "fileName": "test.txt",
    }, timeout=15)
    assert pr.status_code == 200, pr.text
    assert pr.json()["status"] == "pending"


def test_non_approved_seller_cannot_upload_product(buyer_token):
    r = requests.post(f"{API}/seller/products", headers=_h(buyer_token), json={
        "title": "should fail", "category": "x", "price": 5,
        "description": "desc " * 10,
    }, timeout=10)
    assert r.status_code == 403


# ---------- Download gating after mark paid (admin path) ----------
def test_download_after_paid(admin_token, buyer_token, seller_token):
    # seller creates product with a real file
    files = {"file": ("deliver.txt", io.BytesIO(b"PAID_CONTENT_XYZ"), "text/plain")}
    fr = requests.post(f"{API}/files/upload",
                       headers={"Authorization": f"Bearer {seller_token}"}, files=files, timeout=30)
    assert fr.status_code == 200, fr.text
    file_id = fr.json()["id"]
    pr = requests.post(f"{API}/seller/products", headers=_h(seller_token), json={
        "title": "TEST Deliverable", "category": "graphics", "price": 9.0,
        "description": "x" * 40, "fileId": file_id, "fileName": "deliver.txt",
    }, timeout=15)
    assert pr.status_code == 200
    prod_id = pr.json()["id"]
    # admin approves
    dec = requests.post(f"{API}/seller/products/{prod_id}/decide",
                        headers=_h(admin_token), json={"action": "approve"}, timeout=10)
    assert dec.status_code == 200
    # buyer orders it
    orr = requests.post(f"{API}/orders", headers=_h(buyer_token), json={
        "productId": prod_id, "title": "TEST Deliverable",
        "sellerName": "tseller1", "price": 9.0,
    }, timeout=15)
    assert orr.status_code == 200
    oid = orr.json()["id"]
    # before pay → 403
    d1 = requests.get(f"{API}/orders/{oid}/download", headers=_h(buyer_token), timeout=15)
    assert d1.status_code == 403
    # admin sets payment paid
    pay = requests.patch(f"{API}/orders/{oid}/payment", headers=_h(admin_token),
                         json={"paymentStatus": "paid"}, timeout=10)
    assert pay.status_code == 200
    # now buyer can download
    d2 = requests.get(f"{API}/orders/{oid}/download", headers=_h(buyer_token), timeout=30)
    assert d2.status_code == 200, d2.text
    assert b"PAID_CONTENT_XYZ" in d2.content
    # third-party buyer cannot
    email = f"other3_{uuid.uuid4().hex[:6]}@example.com"
    rr = requests.post(f"{API}/auth/register", json={
        "fullName": "Other3", "username": f"other3_{uuid.uuid4().hex[:6]}",
        "email": email, "password": "Password123!", "accountType": "client",
    }, timeout=20)
    other = rr.json()["token"]
    d3 = requests.get(f"{API}/orders/{oid}/download", headers=_h(other), timeout=10)
    assert d3.status_code == 403
