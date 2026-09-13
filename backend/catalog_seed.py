"""Canonical ShahLance product catalog seed.

These are seeded into MongoDB as APPROVED products on startup so the public
marketplace is served entirely from the database. Real seller uploads are
merged into the same shape by server.py.
"""

CATEGORIES = [
    {"id": "accounts", "name": "Accounts", "icon": "Users", "color": "from-blue-500 to-blue-600"},
    {"id": "crypto", "name": "Crypto", "icon": "Globe", "color": "from-amber-500 to-orange-500"},
    {"id": "flash-crypto", "name": "Flash Crypto", "icon": "Zap", "color": "from-yellow-400 to-yellow-500"},
    {"id": "gift-cards", "name": "Gift Cards", "icon": "Gift", "color": "from-pink-500 to-rose-500"},
    {"id": "currency-exchange", "name": "Currency Exchange", "icon": "ArrowLeftRight", "color": "from-emerald-500 to-teal-500"},
    {"id": "virtual-payment-cards", "name": "Virtual Payment Cards", "icon": "CreditCard", "color": "from-violet-500 to-purple-500"},
    {"id": "digital-marketing", "name": "Digital Marketing", "icon": "Megaphone", "color": "from-sky-500 to-blue-500"},
    {"id": "premium-subscriptions", "name": "Premium Subscriptions", "icon": "Star", "color": "from-amber-500 to-yellow-500"},
    {"id": "sms-verification", "name": "SMS Verification", "icon": "MessageSquare", "color": "from-cyan-500 to-blue-500"},
    {"id": "virtual-sim", "name": "Virtual SIM", "icon": "Smartphone", "color": "from-blue-500 to-indigo-500"},
    {"id": "esim", "name": "eSIM", "icon": "Wifi", "color": "from-teal-500 to-cyan-500"},
    {"id": "hosting", "name": "Hosting", "icon": "Server", "color": "from-slate-500 to-slate-600"},
    {"id": "vps-dedicated", "name": "VPS & Dedicated", "icon": "HardDrive", "color": "from-zinc-500 to-slate-600"},
    {"id": "payment-gateway", "name": "Payment Gateway", "icon": "Wallet", "color": "from-emerald-500 to-green-500"},
    {"id": "kyc-verification", "name": "KYC Verification", "icon": "ShieldCheck", "color": "from-indigo-500 to-blue-500"},
    {"id": "proxy-vpn", "name": "Proxy & VPN", "icon": "ShieldQuestion", "color": "from-purple-500 to-fuchsia-500"},
    {"id": "documents", "name": "Documents", "icon": "FileText", "color": "from-slate-500 to-gray-500"},
    {"id": "security-hacking", "name": "Security & Hacking", "icon": "Shield", "color": "from-red-500 to-rose-500"},
    {"id": "software", "name": "Software", "icon": "Code2", "color": "from-blue-500 to-cyan-500"},
    {"id": "dedicated-teams", "name": "Dedicated Teams", "icon": "UsersRound", "color": "from-teal-500 to-emerald-500"},
    {"id": "gaming", "name": "Gaming", "icon": "Gamepad2", "color": "from-pink-500 to-rose-500"},
    {"id": "learning-course", "name": "Learning Course", "icon": "BookOpen", "color": "from-orange-500 to-amber-500"},
    {"id": "pages-channels", "name": "Pages & Channels", "icon": "Megaphone", "color": "from-rose-500 to-pink-500"},
    {"id": "custom-services", "name": "Custom Services", "icon": "Settings", "color": "from-slate-500 to-zinc-500"},
]

CATEGORY_NAME_TO_ID = {c["name"].lower(): c["id"] for c in CATEGORIES}

SELLERS = [
    {"name": "Isabella Rossi", "rating": 5.0, "sales": 1240},
    {"name": "Sofia Chen", "rating": 5.0, "sales": 890},
    {"name": "Liam Anderson", "rating": 4.9, "sales": 2150},
    {"name": "Maya Patel", "rating": 4.9, "sales": 1780},
    {"name": "Alex Morgan", "rating": 4.9, "sales": 3400},
    {"name": "Olivia Brown", "rating": 4.9, "sales": 950},
    {"name": "Lucas Wright", "rating": 4.9, "sales": 640},
    {"name": "James Wilson", "rating": 4.8, "sales": 2210},
    {"name": "Nadia Khan", "rating": 4.9, "sales": 1120},
    {"name": "Ethan Cole", "rating": 4.7, "sales": 780},
    {"name": "Aria Singh", "rating": 4.8, "sales": 1560},
    {"name": "Noah Reyes", "rating": 4.9, "sales": 2040},
]

DELIVERY_PATTERN = [2, 3, 4, 5, 7, 10, 14]
FEATURES = [
    "Escrow protected payment",
    "Instant or same-day delivery",
    "30-day support included",
    "Money-back guarantee",
]

# Base products (mirrors frontend/src/mock/data.js). Seller/deliveryDays/features derived below.
BASE_PRODUCTS = [
    {"id": "p-001", "title": "Aged Gmail Accounts (2018-2020) Bulk Pack", "description": "Verified aged Gmail accounts with recovery info, phone verified, ready to use for business and outreach.", "category": "accounts", "tags": ["gmail", "accounts", "email", "aged"], "price": 4.5, "priceLabel": "per account", "rating": 4.9, "reviews": 512, "icon": "Mail", "color": "from-red-500 to-rose-500", "badge": "Bestseller"},
    {"id": "p-002", "title": "Fresh Gmail Accounts - PVA (US IP)", "description": "Phone verified Gmail accounts created from US IPs. Instant delivery after purchase.", "category": "accounts", "tags": ["gmail", "accounts", "pva", "usa"], "price": 2.75, "priceLabel": "per account", "rating": 4.8, "reviews": 341, "icon": "Mail", "color": "from-red-500 to-orange-500"},
    {"id": "p-003", "title": "Gmail Cold Email Setup & Warmup Service", "description": "Full inbox setup, SPF/DKIM/DMARC records, and 14-day warmup for high deliverability.", "category": "digital-marketing", "tags": ["gmail", "cold email", "marketing", "outreach"], "price": 89, "priceLabel": "Starting at", "rating": 5.0, "reviews": 128, "icon": "Send", "color": "from-blue-500 to-indigo-500", "badge": "Top Rated"},
    {"id": "p-004", "title": "Gmail Auto-Reply & Filter Automation", "description": "Custom filters, labels, auto-responders, and forwarding rules configured for your workflow.", "category": "software", "tags": ["gmail", "automation", "productivity"], "price": 45, "priceLabel": "Starting at", "rating": 4.9, "reviews": 76, "icon": "Zap", "color": "from-amber-500 to-orange-500"},
    {"id": "p-005", "title": "Google Workspace Gmail Migration Expert", "description": "Migrate emails, contacts, calendars from any provider to Google Workspace with zero downtime.", "category": "software", "tags": ["gmail", "google workspace", "migration"], "price": 199, "priceLabel": "Starting at", "rating": 5.0, "reviews": 54, "icon": "ArrowLeftRight", "color": "from-emerald-500 to-teal-500"},
    {"id": "p-006", "title": "Gmail SMTP for Bulk Mailing (Verified)", "description": "High-limit SMTP credentials for legit bulk email campaigns with monitoring dashboard.", "category": "digital-marketing", "tags": ["gmail", "smtp", "email", "marketing"], "price": 25, "priceLabel": "per month", "rating": 4.7, "reviews": 210, "icon": "Server", "color": "from-slate-500 to-slate-700"},
    {"id": "p-007", "title": "Telegram Premium Subscription (1 Year)", "description": "Genuine Telegram Premium with all features unlocked. Instant delivery to your account.", "category": "premium-subscriptions", "tags": ["telegram", "premium", "subscription"], "price": 39, "priceLabel": "per year", "rating": 4.9, "reviews": 892, "icon": "Send", "color": "from-sky-500 to-blue-500", "badge": "Bestseller"},
    {"id": "p-008", "title": "Telegram Channel Members - Real & Active", "description": "Boost your Telegram channel with real, targeted members. Country and niche targeting available.", "category": "digital-marketing", "tags": ["telegram", "members", "growth"], "price": 12, "priceLabel": "per 1K", "rating": 4.8, "reviews": 445, "icon": "UsersRound", "color": "from-blue-500 to-cyan-500"},
    {"id": "p-009", "title": "Custom Telegram Bot Development", "description": "Fully custom Telegram bots for automation, moderation, payments, and more. Node.js / Python.", "category": "software", "tags": ["telegram", "bot", "automation", "development"], "price": 149, "priceLabel": "Starting at", "rating": 5.0, "reviews": 87, "icon": "Bot", "color": "from-purple-500 to-fuchsia-500", "badge": "Top Rated"},
    {"id": "p-010", "title": "Telegram Aged Accounts (Tdata + Session)", "description": "Aged Telegram accounts, phone verified, delivered as Tdata or session files. 2FA optional.", "category": "accounts", "tags": ["telegram", "accounts", "aged"], "price": 3.2, "priceLabel": "per account", "rating": 4.7, "reviews": 623, "icon": "MessageCircle", "color": "from-sky-500 to-indigo-500"},
    {"id": "p-011", "title": "WhatsApp Business API Setup", "description": "Complete onboarding on the official WhatsApp Business API with template approval.", "category": "software", "tags": ["whatsapp", "api", "business"], "price": 249, "priceLabel": "Starting at", "rating": 5.0, "reviews": 62, "icon": "MessageSquare", "color": "from-green-500 to-emerald-500", "badge": "Verified"},
    {"id": "p-012", "title": "WhatsApp Broadcast Automation Tool", "description": "Send personalized messages to thousands of contacts safely. Anti-ban delays and rotation.", "category": "software", "tags": ["whatsapp", "automation", "marketing"], "price": 79, "priceLabel": "per month", "rating": 4.6, "reviews": 234, "icon": "Send", "color": "from-emerald-500 to-teal-500"},
    {"id": "p-013", "title": "WhatsApp Chatbot with AI (GPT Powered)", "description": "Intelligent AI chatbot for customer support, order taking, and lead qualification on WhatsApp.", "category": "software", "tags": ["whatsapp", "ai", "chatbot", "automation"], "price": 189, "priceLabel": "Starting at", "rating": 4.9, "reviews": 141, "icon": "Bot", "color": "from-green-500 to-lime-500"},
    {"id": "p-014", "title": "Discord Server Setup & Design", "description": "Fully branded Discord server with roles, channels, bots, permissions, and welcome flow.", "category": "digital-marketing", "tags": ["discord", "community", "setup"], "price": 120, "priceLabel": "Starting at", "rating": 4.9, "reviews": 176, "icon": "MessageCircle", "color": "from-indigo-500 to-violet-500"},
    {"id": "p-015", "title": "Discord Nitro (1 Month) - Instant", "description": "Genuine Discord Nitro subscription. Instant activation to your account after purchase.", "category": "premium-subscriptions", "tags": ["discord", "nitro", "subscription"], "price": 8.5, "priceLabel": "per month", "rating": 4.8, "reviews": 512, "icon": "Star", "color": "from-purple-500 to-pink-500"},
    {"id": "p-016", "title": "Discord Members Boost (Real Users)", "description": "Grow your Discord server with real, active members. Targeted by interest and region.", "category": "digital-marketing", "tags": ["discord", "members", "growth"], "price": 18, "priceLabel": "per 1K", "rating": 4.7, "reviews": 298, "icon": "UsersRound", "color": "from-violet-500 to-purple-500"},
    {"id": "p-017", "title": "Instagram Aged Accounts (5K+ Followers)", "description": "Established Instagram accounts with real followers, aged 1-3 years. Full ownership transfer.", "category": "accounts", "tags": ["instagram", "accounts", "aged", "followers"], "price": 89, "priceLabel": "per account", "rating": 4.9, "reviews": 421, "icon": "Camera", "color": "from-pink-500 to-rose-500", "badge": "Bestseller"},
    {"id": "p-018", "title": "Instagram Growth Management (30 Days)", "description": "Organic growth strategy: content plan, hashtags, engagement, targeted followers.", "category": "digital-marketing", "tags": ["instagram", "growth", "marketing"], "price": 149, "priceLabel": "per month", "rating": 4.8, "reviews": 267, "icon": "TrendingUp", "color": "from-rose-500 to-orange-500"},
    {"id": "p-019", "title": "Instagram Reels Editing Package (10 Reels)", "description": "High-retention Reels edited with captions, effects, and viral hooks. 24-hour turnaround.", "category": "digital-marketing", "tags": ["instagram", "reels", "video", "editing"], "price": 79, "priceLabel": "Starting at", "rating": 5.0, "reviews": 189, "icon": "Video", "color": "from-fuchsia-500 to-pink-500"},
    {"id": "p-020", "title": "Facebook Ads Manager Setup + Pixel", "description": "Complete Ads Manager, Business Suite, and Pixel configuration for tracking and conversions.", "category": "digital-marketing", "tags": ["facebook", "ads", "marketing"], "price": 99, "priceLabel": "Starting at", "rating": 4.9, "reviews": 312, "icon": "Megaphone", "color": "from-blue-600 to-indigo-600"},
    {"id": "p-021", "title": "Facebook Business Manager Verified", "description": "Fully verified Facebook Business Manager with unlimited ad account creation ability.", "category": "accounts", "tags": ["facebook", "business", "ads"], "price": 349, "priceLabel": "per BM", "rating": 4.8, "reviews": 156, "icon": "Building2", "color": "from-blue-500 to-blue-700"},
    {"id": "p-022", "title": "Facebook Page Likes - Real Fans", "description": "Grow your Facebook page with real, targeted fans. Country and niche targeting.", "category": "digital-marketing", "tags": ["facebook", "likes", "growth"], "price": 15, "priceLabel": "per 1K", "rating": 4.6, "reviews": 402, "icon": "ThumbsUp", "color": "from-sky-500 to-blue-600"},
    {"id": "p-023", "title": "Google Voice Number (US) - Permanent", "description": "Permanent US Google Voice number for calls, texts, and verifications. Instant delivery.", "category": "sms-verification", "tags": ["google", "voice", "number", "usa"], "price": 12, "priceLabel": "per number", "rating": 4.9, "reviews": 673, "icon": "Phone", "color": "from-emerald-500 to-green-500"},
    {"id": "p-024", "title": "Google Ads Campaign Optimization", "description": "Full campaign audit, keyword restructure, and bid optimization by certified Ads specialist.", "category": "digital-marketing", "tags": ["google", "ads", "ppc", "marketing"], "price": 249, "priceLabel": "Starting at", "rating": 5.0, "reviews": 98, "icon": "BarChart3", "color": "from-blue-500 to-cyan-500", "badge": "Top Rated"},
    {"id": "p-025", "title": "Google Workspace Business Setup", "description": "Domain email, drive, meet, calendar setup with admin console for your team. 5 users.", "category": "software", "tags": ["google", "workspace", "business"], "price": 129, "priceLabel": "Starting at", "rating": 4.9, "reviews": 134, "icon": "Briefcase", "color": "from-yellow-500 to-orange-500"},
    {"id": "p-026", "title": "Custom AI Chatbot with GPT-4", "description": "Trained on your data. Deployable on website, WhatsApp, Telegram, or Discord.", "category": "software", "tags": ["ai", "chatbot", "gpt", "automation"], "price": 299, "priceLabel": "Starting at", "rating": 5.0, "reviews": 92, "icon": "Bot", "color": "from-violet-500 to-purple-500", "badge": "Verified"},
    {"id": "p-027", "title": "AI Content Generation Suite (Access)", "description": "Access to premium AI writing, image, and voice tools bundled with priority queue.", "category": "premium-subscriptions", "tags": ["ai", "content", "subscription"], "price": 29, "priceLabel": "per month", "rating": 4.8, "reviews": 445, "icon": "Sparkles", "color": "from-fuchsia-500 to-purple-500"},
    {"id": "p-028", "title": "Zapier / Make.com Automation Setup", "description": "Custom workflows connecting your apps. Save hours of manual work every week.", "category": "software", "tags": ["automation", "zapier", "make", "productivity"], "price": 149, "priceLabel": "Starting at", "rating": 4.9, "reviews": 178, "icon": "Zap", "color": "from-orange-500 to-red-500"},
    {"id": "p-029", "title": "Full SEO Audit & Backlink Package", "description": "Detailed SEO audit, on-page fixes, and 30 high-authority backlinks over 30 days.", "category": "digital-marketing", "tags": ["seo", "marketing", "backlinks"], "price": 399, "priceLabel": "Starting at", "rating": 4.9, "reviews": 231, "icon": "Search", "color": "from-teal-500 to-cyan-500"},
    {"id": "p-030", "title": "Notion Workspace Template Pack (Pro)", "description": "25+ Notion templates for teams, CRM, projects, and personal productivity. Lifetime updates.", "category": "software", "tags": ["productivity", "notion", "templates"], "price": 49, "priceLabel": "One-time", "rating": 4.9, "reviews": 612, "icon": "BookOpen", "color": "from-slate-500 to-slate-700"},
    {"id": "p-031", "title": "Crypto Wallet KYC Verification Kit", "description": "Guided KYC completion for major exchanges with document guidance and support.", "category": "kyc-verification", "tags": ["crypto", "kyc", "verification"], "price": 59, "priceLabel": "Starting at", "rating": 4.7, "reviews": 143, "icon": "ShieldCheck", "color": "from-indigo-500 to-blue-500"},
    {"id": "p-032", "title": "Premium Residential Proxies (10 GB)", "description": "Rotating residential proxies with 195+ countries. Sticky sessions and unlimited threads.", "category": "proxy-vpn", "tags": ["proxy", "residential", "security"], "price": 65, "priceLabel": "per month", "rating": 4.8, "reviews": 289, "icon": "Shield", "color": "from-purple-500 to-fuchsia-500"},
    {"id": "p-033", "title": "Amazon Gift Card - $100 (Instant)", "description": "Instant Amazon gift card code delivered to your email after purchase. USD region.", "category": "gift-cards", "tags": ["giftcards", "amazon"], "price": 92, "priceLabel": "One-time", "rating": 4.9, "reviews": 1204, "icon": "Gift", "color": "from-orange-500 to-amber-500"},
]


def _avatar(name: str) -> str:
    from urllib.parse import quote
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={quote(name)}"


def build_seed_products():
    """Return the full seed product docs in the frontend product shape."""
    out = []
    for i, p in enumerate(BASE_PRODUCTS):
        s = SELLERS[i % len(SELLERS)]
        doc = dict(p)
        doc["seller"] = {"name": s["name"], "rating": s["rating"], "sales": s["sales"], "avatar": _avatar(s["name"])}
        doc["deliveryDays"] = DELIVERY_PATTERN[i % len(DELIVERY_PATTERN)]
        doc["features"] = list(FEATURES)
        doc["source"] = "seed"
        doc["status"] = "approved"
        out.append(doc)
    return out
