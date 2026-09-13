import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MarketplaceServiceCard from '../components/MarketplaceServiceCard';
import MarketplaceFilters from '../components/MarketplaceFilters';
import { Sparkles, Flame, ArrowUpDown, Store, ShieldCheck, Zap } from 'lucide-react';
import { POPULAR_IDS, FEATURED_IDS } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';
import { useOrders } from '../contexts/OrdersContext';
import { summarize } from '../services/reviewService';

const SORTS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'newest', label: 'Newest' },
];

export default function ServicesMarketplace() {
  const { products: PRODUCTS } = useProducts();
  const [sp, setSp] = useSearchParams();
  const { reviews } = useOrders();

  const [q, setQ] = useState(sp.get('q') || '');
  const [category, setCategory] = useState(sp.get('category') || 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('popular');

  // Build a map of productId => summary of user reviews (fallback to seed rating)
  const reviewMap = useMemo(() => {
    const map = {};
    reviews.forEach((r) => {
      if (!map[r.productId]) map[r.productId] = [];
      map[r.productId].push(r);
    });
    const out = {};
    Object.keys(map).forEach((k) => { out[k] = summarize(map[k]); });
    return out;
  }, [reviews]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Infinity;
    let list = PRODUCTS.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (term) {
        const hay = `${p.title} ${p.description} ${p.category} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (p.price < min || p.price > max) return false;
      const effRating = reviewMap[p.id]?.avg || p.rating;
      if (effRating < Number(minRating)) return false;
      return true;
    });
    switch (sort) {
      case 'newest': list = list.slice().reverse(); break;
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => (reviewMap[b.id]?.avg || b.rating) - (reviewMap[a.id]?.avg || a.rating)); break;
      default: list.sort((a, b) => b.reviews - a.reviews);
    }
    return list;
  }, [q, category, minPrice, maxPrice, minRating, sort, reviewMap, PRODUCTS]);

  const popular = useMemo(
    () => PRODUCTS.filter((p) => POPULAR_IDS.includes(p.id)).slice(0, 4),
    [PRODUCTS]
  );
  const recommended = useMemo(
    () => PRODUCTS.filter((p) => FEATURED_IDS.includes(p.id)).slice(0, 4),
    [PRODUCTS]
  );

  const clearAll = () => {
    setQ(''); setCategory('all'); setMinPrice(''); setMaxPrice(''); setMinRating(0);
    setSp({});
  };

  return (
    <div>
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden hero-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 sm:pt-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Store size={13} /> Buyer Marketplace
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Browse & order every <span className="text-gradient-green">digital service</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Filter by category, price and rating. Order securely — funds held until delivery.
          </p>
        </div>

        {/* Trust strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TrustStrip Icon={ShieldCheck} title="Escrow protected" desc="Funds released only after delivery" />
            <TrustStrip Icon={Zap} title="Instant order" desc="One-tap purchase, no direct contact needed" />
            <TrustStrip Icon={Sparkles} title="Verified sellers" desc="Every seller manually approved" />
          </div>
        </div>
      </section>

      {/* POPULAR ROW */}
      <ServiceRow
        title="Popular services"
        subtitle="Buyers love these right now"
        Icon={Flame}
        products={popular}
        reviewMap={reviewMap}
        testId="popular-services"
      />

      {/* RECOMMENDED ROW */}
      <ServiceRow
        title="Recommended for you"
        subtitle="Hand-picked by our team"
        Icon={Sparkles}
        products={recommended}
        reviewMap={reviewMap}
        testId="recommended-services"
      />

      {/* FILTERS + LIST */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:h-max">
            <MarketplaceFilters
              q={q} setQ={setQ}
              category={category} setCategory={setCategory}
              minPrice={minPrice} setMinPrice={setMinPrice}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              minRating={minRating} setMinRating={setMinRating}
              onClear={clearAll}
            />
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold text-white">All services</h2>
                <span className="text-sm text-slate-400">
                  <span className="text-white font-semibold" data-testid="marketplace-result-count">{filtered.length}</span> results
                </span>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-3 pr-2 h-9">
                <ArrowUpDown size={13} className="text-slate-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent outline-none text-sm text-slate-200"
                  style={{ colorScheme: 'dark' }}
                  data-testid="marketplace-sort-select"
                >
                  {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-[#0f1526]">{s.label}</option>)}
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="card-surface rounded-2xl p-10 text-center" data-testid="marketplace-empty">
                <p className="text-white font-semibold">No services match your filters</p>
                <p className="text-sm text-slate-400 mt-2">Try adjusting the search, category or price range.</p>
                <button
                  onClick={clearAll}
                  className="mt-4 inline-flex items-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-5 py-2 text-sm btn-hover"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <MarketplaceServiceCard
                    key={p.id}
                    product={p}
                    avgRating={reviewMap[p.id]?.avg}
                    reviewCount={reviewMap[p.id]?.count}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function TrustStrip({ Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-xs text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function ServiceRow({ title, subtitle, Icon, products, reviewMap, testId }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2" data-testid={testId}>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Icon size={14} /> {title}
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <MarketplaceServiceCard
            key={p.id}
            product={p}
            avgRating={reviewMap[p.id]?.avg}
            reviewCount={reviewMap[p.id]?.count}
          />
        ))}
      </div>
    </section>
  );
}
