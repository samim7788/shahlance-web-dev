import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Search as SearchIcon, SlidersHorizontal, X, ArrowUpDown, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../mock/data';
import { useProducts } from '../contexts/ProductsContext';

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
];

const PAGE_SIZE = 9;

export default function Search() {
  const { products: PRODUCTS } = useProducts();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const q = sp.get('q') || '';
  const catFromUrl = sp.get('category') || '';

  const [inputQ, setInputQ] = useState(q);
  const [selectedCategories, setSelectedCategories] = useState(catFromUrl ? [catFromUrl] : []);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { setInputQ(q); }, [q]);
  useEffect(() => { setPage(1); }, [q, selectedCategories, priceRange, minRating, sort]);

  useEffect(() => {
    if (catFromUrl && !selectedCategories.includes(catFromUrl)) {
      setSelectedCategories([catFromUrl]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catFromUrl]);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    if (inputQ.trim()) next.set('q', inputQ.trim()); else next.delete('q');
    setSp(next);
  };

  const clearSearch = () => {
    const next = new URLSearchParams(sp);
    next.delete('q');
    setInputQ('');
    setSp(next);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (term) {
        const hay = `${p.title} ${p.description} ${p.category} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (selectedCategories.length && !selectedCategories.includes(p.category)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (p.rating < minRating) return false;
      return true;
    });
    switch (sort) {
      case 'popular': list = list.sort((a, b) => b.reviews - a.reviews); break;
      case 'newest': list = list.slice().reverse(); break;
      case 'price-asc': list = list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list = list.sort((a, b) => b.price - a.price); break;
      case 'rating': list = list.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }
    return list;
  }, [q, selectedCategories, priceRange, minRating, sort, PRODUCTS]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const canLoadMore = visible.length < filtered.length;

  const toggleCategory = (id) => {
    setSelectedCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 500]);
    setMinRating(0);
    setSort('relevance');
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    setSp(next);
  };

  return (
    <div>
      <Header />

      {/* Sub-hero: search + breadcrumb */}
      <section className="relative border-b border-white/5 hero-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
            <Link to="/" className="hover:text-emerald-400 btn-hover">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-300">Search Results</span>
            {q && (<><ChevronRight size={12} /><span className="text-emerald-400 font-medium">“{q}”</span></>)}
          </nav>

          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur px-2 py-2">
            <div className="pl-4 pr-2 text-slate-400"><SearchIcon size={18} /></div>
            <input
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              placeholder="Search for services, accounts, tools..."
              className="flex-1 bg-transparent outline-none text-sm sm:text-base text-slate-100 placeholder:text-slate-500 py-2"
            />
            {inputQ && (
              <button type="button" onClick={() => setInputQ('')} className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center">
                <X size={14} />
              </button>
            )}
            <Button type="submit" className="rounded-full h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">Search</Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {q ? <>Results for <span className="text-emerald-400">“{q}”</span></> : 'All Services'}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {filtered.length.toLocaleString()} {filtered.length === 1 ? 'result' : 'results'} found
                {selectedCategories.length > 0 && ` in ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                    <SlidersHorizontal size={15} className="mr-2" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-[#0a0f1e] border-white/10 text-slate-100 w-[85%] sm:w-[380px]">
                  <SheetHeader><SheetTitle className="text-white">Filters</SheetTitle></SheetHeader>
                  <div className="mt-4">
                    <FiltersPanel
                      selectedCategories={selectedCategories}
                      toggleCategory={toggleCategory}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      minRating={minRating}
                      setMinRating={setMinRating}
                      onClear={clearAllFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
                    <ArrowUpDown size={15} className="mr-2" />
                    Sort: {SORTS.find((s) => s.id === sort)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0f1526] border-white/10 text-slate-100">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                    {SORTS.map((s) => (
                      <DropdownMenuRadioItem key={s.id} value={s.id} className="focus:bg-emerald-500/10 focus:text-emerald-300">
                        {s.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 card-surface rounded-2xl p-5">
              <FiltersPanel
                selectedCategories={selectedCategories}
                toggleCategory={toggleCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                minRating={minRating}
                setMinRating={setMinRating}
                onClear={clearAllFilters}
              />
            </div>
          </aside>

          {/* Results */}
          <div>
            {filtered.length === 0 ? (
              <EmptyState q={q} onClear={clearSearch} onReset={clearAllFilters} />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {canLoadMore && (
                  <div className="mt-10 flex justify-center">
                    <Button
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-full h-11 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                    >
                      Load more results
                    </Button>
                  </div>
                )}
                {!canLoadMore && visible.length > PAGE_SIZE && (
                  <p className="mt-8 text-center text-xs text-slate-500">You’ve reached the end of results</p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FiltersPanel({ selectedCategories, toggleCategory, priceRange, setPriceRange, minRating, setMinRating, onClear }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Filters</h3>
        <button onClick={onClear} className="text-xs text-emerald-400 hover:text-emerald-300 btn-hover">Clear all</button>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Category</h4>
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {CATEGORIES.map((c) => (
            <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={selectedCategories.includes(c.id)}
                onCheckedChange={() => toggleCategory(c.id)}
                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span className="text-sm text-slate-300 group-hover:text-white btn-hover">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Price Range</h4>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={500}
            step={5}
            className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}+</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Minimum Rating</h4>
        <div className="grid grid-cols-5 gap-2">
          {[0, 3, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`h-9 rounded-lg text-xs font-medium btn-hover border ${
                minRating === r
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              {r === 0 ? 'Any' : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {['Verified', 'Escrow', 'Bestseller', 'Top Rated'].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox id={`type-${t}`} className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
              <Label htmlFor={`type-${t}`} className="text-sm text-slate-300 cursor-pointer">{t}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ q, onClear, onReset }) {
  return (
    <div className="card-surface rounded-3xl p-10 sm:p-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <SearchIcon size={28} />
      </div>
      <h3 className="mt-6 text-2xl font-bold text-white">No results found</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
        {q ? <>We couldn’t find any services matching <span className="text-slate-200 font-semibold">“{q}”</span>. Try a different keyword or adjust your filters.</> : 'Try adjusting your filters to see more results.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {q && (
          <Button onClick={onClear} className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">
            Clear search
          </Button>
        )}
        <Button onClick={onReset} variant="outline" className="rounded-full bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white">
          Reset filters
        </Button>
      </div>
      <div className="mt-8">
        <p className="text-xs text-slate-500 mb-3">Popular searches:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {['Gmail', 'Telegram', 'WhatsApp', 'Discord', 'AI', 'Instagram'].map((s) => (
            <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 btn-hover">
              {s}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
