import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MarketplaceServiceCard from '../components/MarketplaceServiceCard';
import ReviewList from '../components/ReviewList';
import StarRating from '../components/StarRating';
import { Button } from '../components/ui/button';
import * as Icons from 'lucide-react';
import { ChevronLeft, Clock, Shield, CheckCircle2, ChevronRight, Heart, Share2, ShoppingBag, Lock } from 'lucide-react';
import { CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { savedService } from '../services/savedService';
import { summarize } from '../services/reviewService';
import { useToast } from '../hooks/use-toast';

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { reviews } = useOrders();
  const { products: PRODUCTS, loading: productsLoading } = useProducts();
  const product = PRODUCTS.find((p) => p.id === id);

  const productReviews = useMemo(
    () => (product ? reviews.filter((r) => r.productId === product.id && !r.hidden) : []),
    [reviews, product]
  );
  const sellerReviews = useMemo(
    () => (product ? reviews.filter((r) => r.sellerName === product.seller.name && !r.hidden) : []),
    [reviews, product]
  );
  const productSummary = summarize(productReviews);
  const sellerSummary = summarize(sellerReviews);

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-white">Service not found</h1>
          <p className="mt-2 text-slate-400">The service you are looking for doesn't exist or was removed.</p>
          <Button onClick={() => navigate('/services')} className="mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">
            Back to marketplace
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = Icons[product.icon] || Icons.Package;
  const category = CATEGORIES.find((c) => c.id === product.category);
  const related = PRODUCTS
    .filter((p) => p.id !== product.id && (p.category === product.category || p.tags.some((t) => product.tags.includes(t))))
    .slice(0, 4);

  const rating = productSummary.count > 0 ? productSummary.avg : product.rating;
  const rCount = productSummary.count > 0 ? productSummary.count : product.reviews;

  const startOrder = () => {
    if (!user) { navigate('/login'); return; }
    navigate(`/orders/checkout/${product.id}`);
  };

  const toggleSaved = async () => {
    if (!user) { navigate('/login'); return; }
    await savedService.toggle(user.id, product.id);
    toast({ title: 'Updated', description: 'Your saved services list has been updated.' });
  };

  return (
    <div>
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-emerald-400 btn-hover">Home</Link>
          <ChevronRight size={12} />
          <Link to="/services" className="hover:text-emerald-400 btn-hover">Services</Link>
          <ChevronRight size={12} />
          <span className="text-slate-300 truncate">{product.title}</span>
        </nav>

        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white btn-hover mb-6">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: image + description + reviews */}
          <div>
            <div className={`relative aspect-[16/10] rounded-3xl bg-gradient-to-br ${product.color} overflow-hidden shadow-2xl shadow-black/40 flex items-center justify-center`}>
              <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_-50%,rgba(255,255,255,0.25),transparent)]" />
              <Icon className="h-28 w-28 sm:h-36 sm:w-36 text-white drop-shadow-2xl" strokeWidth={1.4} />
              {product.badge && (
                <span className="absolute top-4 left-4 rounded-full bg-black/40 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white border border-white/20">
                  {product.badge}
                </span>
              )}
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-400/30">
                <Shield size={12} /> Escrow Protected
              </span>
            </div>

            <div className="mt-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight" data-testid="service-details-title">
                {product.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <StarRating value={rating} size={16} />
                  <span className="text-white font-semibold" data-testid="service-details-rating">{Number(rating).toFixed(1)}</span>
                  <span className="text-slate-400">({rCount} reviews)</span>
                </span>
                <span className="h-4 w-px bg-white/10" />
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Clock size={15} /> {product.deliveryDays}-day delivery
                </span>
                <span className="h-4 w-px bg-white/10" />
                <Link to={`/services?category=${product.category}`} className="text-emerald-400 hover:text-emerald-300 btn-hover">
                  {category?.name}
                </Link>
              </div>
            </div>

            <div className="mt-8 card-surface rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white">About this service</h2>
              <p className="mt-3 text-slate-300 leading-relaxed">{product.description}</p>
              <p className="mt-3 text-slate-400 leading-relaxed text-sm">
                Offered by a verified seller on ShahLance with escrow-protected payment.
                Funds are held safely and only released once you confirm delivery.
              </p>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">What's included</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                    <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/services?q=${encodeURIComponent(t)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white btn-hover"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </div>

            {/* Reviews block */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Reviews</h2>
                <div className="text-xs text-slate-400">
                  Average: <span className="text-white font-semibold">{Number(rating).toFixed(1)}</span> · {rCount} rating{rCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="mt-4">
                <ReviewList reviews={productReviews} emptyText="Be the first to review this service after ordering." />
              </div>
            </div>
          </div>

          {/* RIGHT: pricing + seller preview (NO contact) */}
          <div>
            <div className="sticky top-24 space-y-5">
              <div className="card-surface rounded-2xl p-6" data-testid="service-details-price-panel">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400">{product.priceLabel}</span>
                  <span className="text-3xl font-extrabold text-white">${product.price.toFixed(2)}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-slate-200"><Clock size={14} className="text-emerald-400" /> Delivery in {product.deliveryDays} days</li>
                  <li className="flex items-center gap-2 text-slate-200"><Shield size={14} className="text-emerald-400" /> Escrow-secured payment</li>
                  <li className="flex items-center gap-2 text-slate-200"><CheckCircle2 size={14} className="text-emerald-400" /> 100% money-back guarantee</li>
                </ul>
                <Button
                  onClick={startOrder}
                  className="mt-5 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold inline-flex items-center justify-center gap-2"
                  data-testid="service-buy-btn"
                >
                  <ShoppingBag size={16} /> Buy Now — ${product.price.toFixed(2)}
                </Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={toggleSaved} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                    <Heart size={15} className="mr-2" /> Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { navigator.clipboard?.writeText(window.location.href); toast({ title: 'Link copied' }); }}
                    className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <Share2 size={15} className="mr-2" /> Share
                  </Button>
                </div>

                {/* Privacy notice — no direct contact */}
                <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
                  <Lock size={12} className="mt-0.5 text-emerald-400 shrink-0" />
                  For your safety, direct seller contact is disabled. All communication is
                  managed through your order once purchased.
                </p>
              </div>

              {/* Seller profile preview — no phone/whatsapp/telegram */}
              <div className="card-surface rounded-2xl p-6" data-testid="service-details-seller">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Seller</h3>
                <div className="mt-4 flex items-center gap-3">
                  <img src={product.seller.avatar} alt={product.seller.name} className="h-12 w-12 rounded-full bg-slate-700 border border-white/10" />
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{product.seller.name}</p>
                    <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-400">
                      <StarRating value={sellerSummary.count > 0 ? sellerSummary.avg : product.seller.rating} size={11} />
                      <span>
                        {(sellerSummary.count > 0 ? sellerSummary.avg : product.seller.rating).toFixed(1)}
                        · {sellerSummary.count > 0 ? sellerSummary.count : product.seller.sales} {sellerSummary.count > 0 ? 'reviews' : 'sales'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-slate-400">Response</p>
                    <p className="text-white font-semibold mt-1">Within {product.deliveryDays}d</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-slate-400">Delivery</p>
                    <p className="text-white font-semibold mt-1">{product.deliveryDays} days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Related services</h2>
          <p className="text-sm text-slate-400 mt-1">More from {category?.name}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <MarketplaceServiceCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
