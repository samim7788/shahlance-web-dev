import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2, XCircle, Home, Mail } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useOrders } from '../contexts/OrdersContext';

const MAX_POLLS = 12;

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useOrders();
  const sessionId = params.get('session_id');
  const [state, setState] = useState('checking'); // checking | paid | timeout | error
  const [orderId, setOrderId] = useState(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setState('error'); return; }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await orderService.paymentStatus(sessionId);
        setOrderId(res.order_id);
        if (res.payment_status === 'paid') {
          setState('paid');
          refresh();
          return;
        }
        if (res.status === 'expired' || res.payment_status === 'failed') {
          setState('error');
          return;
        }
      } catch {
        // keep trying
      }
      attempts.current += 1;
      if (attempts.current >= MAX_POLLS) { setState('timeout'); return; }
      setTimeout(poll, 2000);
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  return (
    <div>
      <Header />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card-surface rounded-3xl p-8 sm:p-10 text-center" data-testid="payment-return-panel">
          {state === 'checking' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <Loader2 size={32} className="text-emerald-400 animate-spin" />
              </div>
              <h1 className="mt-6 text-2xl font-bold text-white">Confirming your payment…</h1>
              <p className="mt-2 text-slate-400 text-sm">Please wait, this only takes a moment.</p>
            </>
          )}
          {state === 'paid' && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-white">Payment successful</h1>
              <p className="mt-2 text-slate-400 text-sm">Your order is confirmed and now being processed.</p>
              <p className="mt-3 inline-flex items-center gap-2 text-emerald-300 text-sm" data-testid="payment-receipt-note">
                <Mail size={15} /> A confirmation email with your secure download link has been sent.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => navigate(orderId ? `/orders/success/${orderId}` : '/dashboard/buyer-orders')}
                  className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
                  data-testid="payment-view-order-btn"
                >
                  View order
                </Button>
                <Link to="/services" className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold inline-flex items-center justify-center gap-2">
                  <Home size={16} /> Continue browsing
                </Link>
              </div>
            </>
          )}
          {(state === 'timeout' || state === 'error') && (
            <>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
                <XCircle size={32} className="text-rose-400" />
              </div>
              <h1 className="mt-6 text-2xl font-bold text-white">
                {state === 'timeout' ? 'Still confirming…' : 'Payment not completed'}
              </h1>
              <p className="mt-2 text-slate-400 text-sm">
                {state === 'timeout'
                  ? 'Your payment is taking longer than expected. Check your orders shortly.'
                  : 'We could not confirm your payment. You can try again from the marketplace.'}
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                <Button onClick={() => navigate('/dashboard/buyer-orders')} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">
                  My orders
                </Button>
                <Link to="/services" className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold inline-flex items-center justify-center gap-2">
                  <Home size={16} /> Marketplace
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
