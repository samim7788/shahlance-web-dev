import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { ChevronLeft, Star, Clock, Shield, CheckCircle2, MessageCircle, Heart, Share2, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';
import { useToast } from '../hooks/use-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products: PRODUCTS, loading: productsLoading } = useProducts();
  const product = PRODUCTS.find((p) => p.id === id);

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
          <h1 className="text-2xl font-bold text-white">Product not found</h1>
          <p className="mt-2 text-slate-400">The listing you are looking for doesn’t exist or was removed.</p>
          <Button onClick={() => navigate('/')} className="mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const Icon = Icons[product.icon] || Icons.Package;
  const category = CATEGORIES.find((c) => c.id === product.category);
  const related = PRODUCTS.filter((p) => p.id !== product.id && (p.category === product.category || p.tags.some((t) => product.tags.includes(t)))).slice(0, 4);

  return (
    <div>
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-emerald-400 btn-hover">Home</Link>
          <ChevronRight size={12} />
          <Link to={`/search?category=${product.category}`} className="hover:text-emerald-400 btn-hover">{category?.name || 'Category'}</Link>
          <ChevronRight size={12} />
          <span className="text-slate-300 truncate">{product.title}</span>
        </nav>

        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white btn-hover mb-6">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: media + description */}
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{product.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  <span className="text-white font-semibold">{product.rating.toFixed(1)}</span>
                  <span className="text-slate-400">({product.reviews} reviews)</span>
                </span>
                <span className="h-4 w-px bg-white/10" />
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Clock size={15} /> {product.deliveryDays}-day delivery
                </span>
                <span className="h-4 w-px bg-white/10" />
                <Link to={`/search?category=${product.category}`} className="text-emerald-400 hover:text-emerald-300 btn-hover">{category?.name}</Link>
              </div>
            </div>

            <div className="mt-8 card-surface rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white">About this service</h2>
              <p className="mt-3 text-slate-300 leading-relaxed">{product.description}</p>
              <p className="mt-3 text-slate-400 leading-relaxed text-sm">
                This service is offered by a verified seller on ShahLance with escrow-protected payment.
                Funds are only released once you confirm delivery, giving you complete peace of mind.
              </p>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">What’s included</h3>
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
                  <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white btn-hover">
                    #{t}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: price + seller */}
          <div>
            <div className="sticky top-24 space-y-5">
              <div className="card-surface rounded-2xl p-6">
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
                  onClick={() => toast({ title: 'Added to cart', description: `${product.title} is ready for checkout.` })}
                  className="mt-5 w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
                >
                  Continue — ${product.price.toFixed(2)}
                </Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => toast({ title: 'Saved', description: 'Added to your favourites.' })} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                    <Heart size={15} className="mr-2" /> Save
                  </Button>
                  <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast({ title: 'Link copied' }); }} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                    <Share2 size={15} className="mr-2" /> Share
                  </Button>
                </div>
              </div>

              <div className="card-surface rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Seller</h3>
                <div className="mt-4 flex items-center gap-3">
                  <img src={product.seller.avatar} alt={product.seller.name} className="h-12 w-12 rounded-full bg-slate-700 border border-white/10" />
                  <div>
                    <p className="text-white font-semibold">{product.seller.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" /> {product.seller.rating.toFixed(1)} · {product.seller.sales} sales
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => toast({ title: 'Message sent', description: 'The seller will respond shortly.' })} className="mt-4 w-full bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                  <MessageCircle size={15} className="mr-2" /> Contact seller
                </Button>
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
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
