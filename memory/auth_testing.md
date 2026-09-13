# ShahLance Auth Testing Playbook

Auth uses JWT bearer tokens (stored in localStorage `shahlance_token`, sent as `Authorization: Bearer`).

## MongoDB verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {passwordHash: 1})   // bcrypt hash starts with $2b$
```

## API testing (use REACT_APP_BACKEND_URL/api)
```
# Admin login
curl -X POST $API/auth/login -H "Content-Type: application/json" \
  -d '{"identifier":"rajavai247@gmail.com","password":"Amijanina7799@@"}'

# Register buyer
curl -X POST $API/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Test Buyer","username":"tbuyer","email":"tb@example.com","password":"Password123!","accountType":"client"}'

# Me
curl $API/auth/me -H "Authorization: Bearer <token>"
```

## Role expectations
- accountType `client` → role `buyer`
- accountType `freelancer` / `both` → role `seller`
- seeded ADMIN_EMAIL → role `admin`

## Admin-only endpoints (403 for non-admin)
- GET `/api/seller/applications`
- POST `/api/seller/applications/{id}/decide`
- POST `/api/seller/products/{id}/decide`
- PATCH `/api/reviews/{id}/hidden`, DELETE `/api/reviews/{id}`
- GET `/api/admin/overview`

## Payment / download gating
- `GET /api/orders/{id}/download` → 403 unless the requester is the buyer (or admin) AND `paymentStatus == 'paid'` AND order has a `fileId`.
