import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import CategoryIcon from '../components/CategoryIcon';
import { Button } from '../components/ui/button';
import {
  Search, ArrowUpDown, Sparkles, ShieldCheck, ChevronRight, Store, Filter,
  ArrowRight, X, Grid3x3,
} from 'lucide-react';
import { CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';

const SORTS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
];

const PRIMARY_CATEGORIES = [
  'accounts', 'crypto', 'flash-crypto', 'gift-cards', 'currency-exchange',
  'virtual-payment-cards', 'digital-marketing', 'premium-subscriptions',
  'sms-verification', 'virtual-sim', 'esim', 'hosting', 'vps-dedicated',
  'payment-gateway', 'kyc-verification',
];

export default function Marketplace() {
  const { products: PRODUCTS } = useProducts();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const initialCat = sp.get('category') || 'all';
  const initialQ = sp.get('q') || '';

  const [q, setQ] = useState(initialQ);
  const [activeCat, setActiveCat] = useState(initialCat);
  const [sort, setSort] = useState('popular');
  const [view, setView] = useState('grid');
  const [visibleCount, setVisibleCount] = useState(12);

  const primaryCats = useMemo(
    () => CATEGORIES.filter((c) => PRIMARY_CATEGORIES.includes(c.id)),
    []
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      if (term) {
        const hay = `${p.title} ${p.description} ${p.category} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    switch (sort) {
      case 'newest': list = list.slice().reverse(); break;
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'popular':
      default: list.sort((a, b) => b.reviews - a.reviews);
    }
    return list;
  }, [q, activeCat, sort, PRODUCTS]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;

  const submit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    if (q.trim()) next.set('q', q.trim()); else next.delete('q');
    setSp(next);
    setVisibleCount(12);
  };

  const pickCategory = (id) => {
    setActiveCat(id);
    setVisibleCount(12);
    const next = new URLSearchParams(sp);
    if (id === 'all') next.delete('category'); else next.set('category', id);
    setSp(next);
  };

  const activeCatMeta = CATEGORIES.find((c) => c.id === activeCat);

  return (
    <div>
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden hero-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8 sm:pt-20 sm:pb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Store size={13} /> Digital Marketplace
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Buy every <span className="text-gradient-green">digital service</span> in one place
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Accounts, crypto, gift cards, subscriptions, hosting, verification and more — all escrow-protected.
          </p>

          <form onSubmit={submit} className="mt-8 mx-auto max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur px-2 py-2 shadow-xl shadow-black/20">
              <div className="pl-4 pr-2 text-slate-400"><Search size={18} /></div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products — 'Gmail', 'Telegram', 'Nitro'..."
                className="flex-1 bg-transparent outline-none text-sm sm:text-base text-slate-100 placeholder:text-slate-500 py-2"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center" aria-label="Clear">
                  <X size={14} />
                </button>
              )}
              <Button type="submit" className="rounded-full h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">Search</Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500">Popular:</span>
            {['Gmail', 'Telegram', 'WhatsApp', 'Nitro', 'Amazon Gift Card'].map((t) => (
              <button
                key={t}
                onClick={() => { setQ(t); const next = new URLSearchParams(sp); next.set('q', t); setSp(next); setVisibleCount(12); }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 hover:text-white hover:border-emerald-500/40 btn-hover"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section className="relative section-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Browse categories</h2>
              <p className="text-sm text-slate-400 mt-0.5">Jump straight to what you need</p>
            </div>
            <button
              onClick={() => pickCategory('all')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold btn-hover border ${
                activeCat === 'all'
                  ? 'bg-emerald-500 border-emerald-500 text-slate-900'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Grid3x3 size={13} /> All categories
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-8 gap-3">
            {primaryCats.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 btn-hover ${
                  activeCat === c.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30'
                }`}
              >
                <CategoryIconInline category={c} />
                <span className="text-[11px] text-slate-200 text-center leading-tight font-medium">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">
              {activeCat === 'all' ? 'All products' : activeCatMeta?.name}
            </h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-sm text-slate-300"><span className="text-white font-semibold">{filtered.length}</span> results</span>
            {activeCat !== 'all' && (
              <button
                onClick={() => pickCategory('all')}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-0.5 text-xs text-slate-300 btn-hover"
              >
                Clear filter <X size={11} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-3 pr-2 h-9">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none text-sm text-slate-200" style={{ colorScheme: 'dark' }}>
                {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-[#0f1526]">{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 ? (
          <EmptyState onReset={() => { setQ(''); pickCategory('all'); }} />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => <MarketplaceProductCard key={p.id} product={p} />)}
            </div>
            {canLoadMore && (
              <div className="mt-10 flex justify-center">
                <Button onClick={() => setVisibleCount((n) => n + 12)} className="rounded-full h-11 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white">
                  Load more results
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* TRUST STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-6 sm:p-8 grid gap-6 sm:grid-cols-3">
          <TrustCell Icon={ShieldCheck} title="Escrow protected" desc="Funds held safely until delivery" />
          <TrustCell Icon={Sparkles} title="Verified sellers" desc="Every seller identity-checked" />
          <TrustCell Icon={ArrowRight} title="Instant delivery" desc="Most services delivered same-day" />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CategoryIconInline({ category }) {
  return <CategoryIcon category={category} />; // reuse existing component
}

function TrustCell({ Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// Enhanced card with explicit "View Details" + "Request/Buy" placeholder buttons
function MarketplaceProductCard({ product }) {
  return (
    <div className="group relative">
      <ProductCard product={product} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          to={`/product/${product.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold py-2 btn-hover"
        >
          View Details <ChevronRight size={12} />
        </Link>
        <Link
          to={`/product/${product.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-semibold py-2 btn-hover"
        >
          Buy Now
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="card-surface rounded-3xl p-10 sm:p-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <Filter size={28} />
      </div>
      <h3 className="mt-6 text-2xl font-bold text-white">No products match your filters</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">Try clearing the search or picking a different category.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={onReset} className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">Reset filters</Button>
      </div>
    </div>
  );
}
