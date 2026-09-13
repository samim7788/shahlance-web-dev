import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CategoryIcon from '../components/CategoryIcon';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Search, Shield, Sparkles, ArrowRight, TrendingUp, Clock3, Zap, CheckCircle2 } from 'lucide-react';
import { CATEGORIES, FEATURED_IDS, POPULAR_IDS, RECENT_IDS, FREELANCER_CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';
import { FEATURED_SERVICES } from '../mock/extendedData';
import FreelancerServiceCard from '../components/FreelancerServiceCard';
import WorkAndEarnSection from '../components/WorkAndEarnSection';
import PremiumHomeSections, { FooterTopStrip } from '../components/PremiumHomeSections';
import * as Icons from 'lucide-react';

const byIds = (ids, PRODUCTS) => ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);

export default function Home() {
  const { products: PRODUCTS } = useProducts();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(`/search?q=${encodeURIComponent(query || 'Gmail')}`);
  };

  const featured = byIds(FEATURED_IDS, PRODUCTS);
  const popular = byIds(POPULAR_IDS, PRODUCTS);
  const recent = byIds(RECENT_IDS, PRODUCTS);

  return (
    <div className="relative">
      <Header />

      {/* NEW: Premium Fiverr/Upwork-style sections (additive) */}
      <PremiumHomeSections />

      {/* HERO */}
      <section className="relative overflow-hidden hero-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Shield size={13} /> Escrow Protected Marketplace
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white">
            Welcome to <span className="text-gradient-green">ShahLance</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-300 font-medium">Your Complete Digital Marketplace</p>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Buy and sell digital services securely with escrow protection and complete confidence.
          </p>

          <form onSubmit={submit} className="mt-8 mx-auto max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur px-2 py-2 shadow-xl shadow-black/20">
              <div className="pl-4 pr-2 text-slate-400"><Search size={18} /></div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What service are you looking for today?"
                className="flex-1 bg-transparent outline-none text-sm sm:text-base text-slate-100 placeholder:text-slate-500 py-2"
              />
              <Button type="submit" className="rounded-full h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">
                Search
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-500">Trending:</span>
              {['Gmail', 'Telegram', 'WhatsApp', 'Discord', 'AI Chatbot'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(t)}`)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 hover:text-white hover:border-emerald-500/40 btn-hover"
                >
                  {t}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="relative section-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Sparkles size={13} /> Digital Marketplace
          </span>
          <h2 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Digital <span className="text-gradient-green">Marketplace</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Discover premium digital products and services from trusted sellers. Everything you need in one secure marketplace.
          </p>

          <div className="mt-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
            {CATEGORIES.map((c) => <CategoryIcon key={c.id} category={c} />)}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <Section
        eyebrow={{ icon: 'Sparkles', label: 'Featured Products' }}
        title="Handpicked Featured Services"
        subtitle="Top-rated services from our best sellers, chosen for quality and value."
        ctaLabel="Browse all"
        onCta={() => navigate('/search?q=')}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      {/* FREELANCER CATEGORIES */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Expert Freelancers
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Hire a Freelancer</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Hire trusted professionals for every digital service. Browse expert categories and find the right freelancer for your project.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FREELANCER_CATEGORIES.map((f) => {
              const Icon = Icons[f.icon] || Icons.Briefcase;
              return (
                <button
                  key={f.title}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(f.title)}`)}
                  className="group card-surface card-hover rounded-2xl p-6 text-left flex items-start gap-4"
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{f.count} services</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-400 font-medium">Browse <ArrowRight size={14} /></span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <TrustBadge Icon={Shield} title="Secure & Protected" desc="Your payments are always safe and encrypted" />
            <TrustBadge Icon={Zap} title="Fast Delivery" desc="Get quality work delivered on time, every time" />
            <TrustBadge Icon={CheckCircle2} title="Top Quality" desc="Work with verified, top-rated freelancers" />
          </div>
        </div>
      </section>

      {/* WORK & EARN */}
      <WorkAndEarnSection showDashboards={false} />

      {/* FEATURED FREELANCER SERVICES */}
      <section id="featured" className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Featured Services</h2>
              <p className="mt-1.5 text-sm text-slate-400">Hand-picked top-rated services from our best freelancers</p>
            </div>
            <button onClick={() => navigate('/search?q=')} className="self-start md:self-auto inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300 btn-hover">
              Browse all services <ArrowRight size={15} />
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_SERVICES.map((s) => <FreelancerServiceCard key={s.slug} service={s} />)}
          </div>
        </div>
      </section>

      <Section
        eyebrow={{ icon: 'TrendingUp', label: 'Popular Now' }}
        title="Popular Products"
        subtitle="What everyone is buying this week."
        ctaLabel="See more"
        onCta={() => navigate('/search?q=Telegram')}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      <Section
        eyebrow={{ icon: 'Clock3', label: 'Recently Added' }}
        title="New on ShahLance"
        subtitle="Fresh services just added by verified sellers."
        ctaLabel="View all"
        onCta={() => navigate('/search?q=')}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-10 sm:p-14 text-center shadow-2xl shadow-emerald-500/10">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Ready to start earning?</h3>
          <p className="mt-3 text-emerald-50 max-w-xl mx-auto">
            Join thousands of freelancers who are growing their business on ShahLance. Create your seller profile and start offering services today.
          </p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 btn-hover px-6 py-3 font-semibold shadow-lg">
            Become a Seller <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* NEW: Footer top strip (improves footer design without editing Footer.jsx) */}
      <FooterTopStrip />

      <Footer />
    </div>
  );
}

function Section({ eyebrow, title, subtitle, children, ctaLabel, onCta }) {
  const Icon = Icons[eyebrow.icon] || Icons.Sparkles;
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <Icon size={12} /> {eyebrow.label}
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {ctaLabel && (
            <button onClick={onCta} className="self-start md:self-auto inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300 btn-hover">
              {ctaLabel} <ArrowRight size={15} />
            </button>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function TrustBadge({ Icon, title, desc }) {
  return (
    <div className="card-surface rounded-2xl p-5 flex items-start gap-4">
      <div className="h-11 w-11 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-white font-semibold">{title}</h4>
        <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
