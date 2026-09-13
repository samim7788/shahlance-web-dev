import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AccountMenu from '../components/AccountMenu';
import OrderStatusBadge, { PaymentBadge } from '../components/OrderStatusBadge';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import StarRating from '../components/StarRating';
import { Button } from '../components/ui/button';
import { Package, Clock, CheckCircle2, XCircle, Heart, Star, CreditCard, ChevronRight, Home as HomeIcon } from 'lucide-react';
import { useProducts } from '../contexts/ProductsContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { ORDER_STATUS } from '../services/orderService';
import { savedService } from '../services/savedService';
import api from '../services/apiClient';
import { useToast } from '../hooks/use-toast';

const TABS = [
  { id: 'all', label: 'My Orders', Icon: Package },
  { id: 'active', label: 'Active', Icon: Clock },
  { id: 'completed', label: 'Completed', Icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', Icon: XCircle },
  { id: 'saved', label: 'Saved', Icon: Heart },
  { id: 'reviews', label: 'Reviews', Icon: Star },
  { id: 'payments', label: 'Payments', Icon: CreditCard },
];

export default function BuyerOrders() {
  const { user } = useAuth();
  const { products: PRODUCTS } = useProducts();
  const { orders, reviews, updateOrderStatus, submitReview } = useOrders();
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    if (user) savedService.list(user.id).then(setSavedIds).catch(() => setSavedIds([]));
  }, [user]);

  const myOrders = useMemo(
    () => orders.filter((o) => o.buyerId === user?.id),
    [orders, user?.id]
  );
  const myReviews = useMemo(
    () => reviews.filter((r) => r.buyerId === user?.id),
    [reviews, user?.id]
  );
  const savedProducts = useMemo(
    () => PRODUCTS.filter((p) => savedIds.includes(p.id)),
    [savedIds, PRODUCTS]
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case 'active':
        return myOrders.filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PROCESSING);
      case 'completed':
        return myOrders.filter((o) => o.status === ORDER_STATUS.COMPLETED);
      case 'cancelled':
        return myOrders.filter((o) => o.status === ORDER_STATUS.CANCELLED);
      default:
        return myOrders;
    }
  }, [tab, myOrders]);

  const cancelOrder = async (o) => {
    await updateOrderStatus(o.id, ORDER_STATUS.CANCELLED);
    toast({ title: 'Order cancelled' });
  };

  const handleReview = async ({ rating, comment }) => {
    if (!reviewingOrder) return;
    setSubmittingReview(true);
    try {
      await submitReview({
        productId: reviewingOrder.productId,
        productTitle: reviewingOrder.title,
        sellerName: reviewingOrder.sellerName,
        orderId: reviewingOrder.id,
        buyerId: user.id,
        buyerName: user.fullName || user.username,
        rating,
        comment,
      });
      toast({ title: 'Review submitted', description: 'Thanks for sharing feedback!' });
      setReviewingOrder(null);
    } catch (e) {
      toast({ title: 'Could not submit review', description: e.message, variant: 'destructive' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleSaved = async (productId) => {
    const next = await savedService.toggle(user.id, productId);
    setSavedIds(next);
  };

  const downloadDeliverable = async (o) => {
    try {
      const res = await api.get(`/orders/${o.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = o.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Download unavailable', description: 'The file could not be downloaded.', variant: 'destructive' });
    }
  };

  const paidOrders = useMemo(
    () => myOrders.filter((o) => o.paymentStatus === 'paid' || o.status === ORDER_STATUS.COMPLETED),
    [myOrders]
  );
  const totalSpent = paidOrders.reduce((s, o) => s + Number(o.price || 0), 0);

  return (
    <div>
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Link to="/" className="hover:text-emerald-400 btn-hover inline-flex items-center gap-1"><HomeIcon size={12} /> Home</Link>
          <ChevronRight size={12} />
          <Link to="/dashboard/buyer" className="hover:text-emerald-400">Buyer Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-slate-300">Orders & Reviews</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Buyer orders & activity</h1>
            <p className="text-sm text-slate-400 mt-1">Track your orders, saved services, reviews and payment history.</p>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm px-4 py-2 btn-hover"
            data-testid="buyer-orders-browse-btn"
          >
            Browse services <ChevronRight size={13} />
          </Link>
        </div>

        <div className="mt-6"><AccountMenu /></div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Orders" value={myOrders.length} Icon={Package} color="from-emerald-500 to-green-500" />
          <StatCard
            label="Active"
            value={myOrders.filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PROCESSING).length}
            Icon={Clock}
            color="from-orange-500 to-amber-500"
          />
          <StatCard label="Total Spent" value={`$${totalSpent.toFixed(2)}`} Icon={CreditCard} color="from-blue-500 to-indigo-500" />
          <StatCard label="Reviews Given" value={myReviews.length} Icon={Star} color="from-violet-500 to-purple-500" />
        </div>

        {/* Tabs */}
        <div className="mt-6 card-surface rounded-2xl p-2 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {TABS.map((t) => {
              const Icon = t.Icon;
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm btn-hover ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  data-testid={`buyer-orders-tab-${t.id}`}
                >
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {['all', 'active', 'completed', 'cancelled'].includes(tab) && (
            <OrdersTable
              orders={filtered}
              onCancel={cancelOrder}
              onReview={setReviewingOrder}
              onDownload={downloadDeliverable}
              testId={`buyer-orders-table-${tab}`}
            />
          )}

          {tab === 'saved' && (
            <SavedList products={savedProducts} onToggle={toggleSaved} />
          )}

          {tab === 'reviews' && (
            <div data-testid="buyer-orders-reviews-panel">
              <ReviewList reviews={myReviews} showProduct emptyText="You haven't written any reviews yet." />
            </div>
          )}

          {tab === 'payments' && (
            <PaymentsList orders={myOrders} />
          )}
        </div>
      </section>

      {/* Review modal */}
      {reviewingOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setReviewingOrder(null)}
          data-testid="review-modal"
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-white font-semibold">Review: {reviewingOrder.title}</p>
              <button
                onClick={() => setReviewingOrder(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <ReviewForm onSubmit={handleReview} submitting={submittingReview} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function StatCard({ label, value, Icon, color }) {
  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function OrdersTable({ orders, onCancel, onReview, onDownload, testId }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-10 text-center" data-testid={`${testId}-empty`}>
        <p className="text-white font-semibold">No orders here yet</p>
        <p className="text-sm text-slate-400 mt-2">Discover trusted services on the marketplace and place your first order.</p>
        <Link
          to="/services"
          className="mt-4 inline-flex items-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-5 py-2 text-sm btn-hover"
        >
          Browse services
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3" data-testid={testId}>
      {orders.map((o) => (
        <li key={o.id} className="card-surface rounded-2xl p-4 sm:p-5" data-testid={`buyer-order-${o.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Order #{o.id.slice(2, 8)}</p>
              <p className="mt-0.5 text-white font-semibold truncate">{o.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                Seller: <span className="text-slate-200">{o.sellerName}</span> · Placed {new Date(o.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold text-white">${Number(o.price).toFixed(2)}</p>
              <div className="mt-1 flex items-center gap-2 justify-end">
                <OrderStatusBadge status={o.status} />
                <PaymentBadge status={o.paymentStatus} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/services/${o.productId}`}
              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold px-3 py-1.5 btn-hover"
            >
              View service
            </Link>
            {(o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.PROCESSING) && (
              <button
                onClick={() => onCancel(o)}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 text-xs font-semibold px-3 py-1.5 btn-hover"
                data-testid={`buyer-order-cancel-${o.id}`}
              >
                Cancel order
              </button>
            )}
            {o.status === ORDER_STATUS.COMPLETED && (
              <Button
                onClick={() => onReview(o)}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-semibold px-3 py-1.5 h-auto"
                data-testid={`buyer-order-review-${o.id}`}
              >
                Leave review
              </Button>
            )}
            {o.paymentStatus === 'paid' && o.fileId && (
              <button
                onClick={() => onDownload(o)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 text-xs font-semibold px-3 py-1.5 btn-hover"
                data-testid={`buyer-order-download-${o.id}`}
              >
                Download files
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SavedList({ products, onToggle }) {
  if (!products || products.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-10 text-center" data-testid="buyer-saved-empty">
        <p className="text-white font-semibold">No saved services yet</p>
        <p className="text-sm text-slate-400 mt-2">Tap the heart on any service to save it here for later.</p>
        <Link
          to="/services"
          className="mt-4 inline-flex items-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-5 py-2 text-sm btn-hover"
        >
          Browse services
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="buyer-saved-list">
      {products.map((p) => (
        <li key={p.id} className="card-surface rounded-2xl p-4 flex items-center gap-3">
          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${p.color} shrink-0`} />
          <div className="min-w-0 flex-1">
            <Link to={`/services/${p.id}`} className="text-white font-semibold text-sm truncate block hover:text-emerald-300">
              {p.title}
            </Link>
            <p className="text-xs text-slate-400 truncate">{p.seller.name} · ${p.price.toFixed(2)}</p>
            <div className="mt-1"><StarRating value={p.rating} size={11} /></div>
          </div>
          <button
            onClick={() => onToggle(p.id)}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-200 font-semibold px-3 py-1.5 btn-hover"
            data-testid={`buyer-saved-remove-${p.id}`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function PaymentsList({ orders }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="card-surface rounded-2xl p-10 text-center" data-testid="buyer-payments-empty">
        <p className="text-white font-semibold">No payment activity yet</p>
        <p className="text-sm text-slate-400 mt-2">Your payments will appear here as you place orders.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5 card-surface rounded-2xl" data-testid="buyer-payments-list">
      {orders.map((o) => (
        <li key={o.id} className="flex items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold truncate">{o.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(o.createdAt).toLocaleString()} · {o.sellerName}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-extrabold text-white">${Number(o.price).toFixed(2)}</p>
            <PaymentBadge status={o.paymentStatus} />
          </div>
        </li>
      ))}
    </ul>
  );
}
