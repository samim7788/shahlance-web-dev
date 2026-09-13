import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import * as Icons from 'lucide-react';
import { ChevronLeft, Clock, Shield, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { orderService } from '../services/orderService';
import { useNotifications } from '../contexts/NotificationsContext';
import { useToast } from '../hooks/use-toast';

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrder } = useOrders();
  const { push } = useNotifications();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { products: PRODUCTS, loading: productsLoading } = useProducts();
  const product = PRODUCTS.find((p) => p.id === id);
  const category = product ? CATEGORIES.find((c) => c.id === product.category) : null;
  const Icon = product ? (Icons[product.icon] || Icons.Package) : Icons.Package;

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
          <Link to="/services" className="mt-6 inline-block text-emerald-400 hover:text-emerald-300">
            Back to marketplace
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      const order = await createOrder({
        productId: product.id,
        title: product.title,
        sellerName: product.seller.name,
        sellerAvatar: product.seller.avatar,
        buyerId: user.id,
        buyerName: user.fullName || user.username,
        price: product.price,
        priceLabel: product.priceLabel,
        category: product.category,
        deliveryDays: product.deliveryDays,
        note,
      });
      // Redirect to Stripe Checkout (test mode).
      const { checkout_url } = await orderService.startCheckout(order.id, window.location.origin);
      push({
        title: 'Redirecting to secure payment',
        message: `Complete payment for "${product.title}" to confirm your order.`,
        kind: 'info',
        category: 'product',
        link: '/dashboard/buyer-orders',
      });
      window.location.href = checkout_url;
    } catch (e) {
      toast({ title: 'Could not start checkout', description: e.message || 'Please try again.', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link to="/services" className="hover:text-emerald-400 btn-hover">Services</Link>
          <ChevronRight size={12} />
          <Link to={`/services/${product.id}`} className="hover:text-emerald-400 btn-hover truncate max-w-[220px]">
            {product.title}
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-300">Checkout</span>
        </nav>

        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white btn-hover mb-4">
          <ChevronLeft size={16} /> Back to service
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-white">Confirm your order</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review the details below. Your funds stay in escrow until the service is delivered.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: order summary */}
          <div className="card-surface rounded-2xl p-6" data-testid="checkout-summary">
            <div className="flex gap-4">
              <div className={`relative h-24 w-32 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shrink-0 overflow-hidden`}>
                <div className="absolute inset-0 bg-[radial-gradient(300px_120px_at_50%_-50%,rgba(255,255,255,0.25),transparent)]" />
                <Icon className="h-10 w-10 text-white" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">{category?.name}</p>
                <h2 className="mt-1 text-base font-semibold text-white leading-snug">{product.title}</h2>
                <p className="mt-1 text-xs text-slate-400">by <span className="text-slate-200">{product.seller.name}</span></p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300">
                  <Clock size={12} /> {product.deliveryDays}-day delivery
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold text-white">Order note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Add any custom requirements for the seller..."
                className="mt-2 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none"
                data-testid="checkout-note-input"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                No personal contact info — messages happen inside the order.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
              <Lock size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">Privacy protected</p>
                <p className="text-xs text-slate-400 mt-1">
                  Direct seller phone, WhatsApp and Telegram are hidden. All communication
                  happens through the order after purchase.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: payment (mock) */}
          <div className="card-surface rounded-2xl p-6" data-testid="checkout-payment">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Payment</h3>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Service price" value={`$${product.price.toFixed(2)}`} />
              <Row label="Platform fee" value="$0.00" />
              <div className="border-t border-white/5 pt-3 mt-3">
                <Row label="Total" value={`$${product.price.toFixed(2)}`} bold />
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Shield size={13} className="text-emerald-400" /> Escrow-secured payment</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> 100% money-back guarantee</li>
              <li className="flex items-center gap-2"><Clock size={13} className="text-emerald-400" /> Delivery in {product.deliveryDays} days</li>
            </ul>

            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="mt-6 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
              data-testid="checkout-confirm-btn"
            >
              {submitting ? 'Redirecting to payment...' : `Pay securely — $${product.price.toFixed(2)}`}
            </Button>

            <p className="mt-3 text-[11px] text-slate-500 text-center">
              Secured by Stripe · Use test card 4242 4242 4242 4242
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-slate-400 ${bold ? 'text-white font-semibold' : ''}`}>{label}</span>
      <span className={`text-slate-200 ${bold ? 'text-lg text-white font-extrabold' : ''}`}>{value}</span>
    </div>
  );
}
