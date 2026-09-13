import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import {
  ArrowLeft, Upload, Tag, DollarSign, FileText, Image as ImageIcon, X,
  AlertCircle, CheckCircle2, Clock, Sparkles, ShieldCheck, Package,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { sellerService, SELLER_CATEGORIES } from '../services/sellerService';
import { useToast } from '../hooks/use-toast';

export default function SellerUpload() {
  const { user, isAuthenticated, loading } = useAuth();
  const { push } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [approved, setApproved] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ title: '', category: '', customCategory: '', price: '', description: '', image: '' });
  const [deliverable, setDeliverable] = useState(null); // { file, name }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/login', { state: { from: { pathname: '/seller/upload' } } }); return; }
    (async () => {
      const apps = await sellerService.listUserApplications(user.id);
      setApproved(apps.some((a) => a.status === 'approved'));
      setProducts(await sellerService.listProducts({ userId: user.id }));
      setChecking(false);
    })();
  }, [loading, isAuthenticated, user, navigate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => set('image', reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (form.title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (!form.category && !form.customCategory) return 'Choose a category or add a custom one.';
    if (!form.price || Number(form.price) <= 0) return 'Please enter a valid price.';
    if (form.description.trim().length < 30) return 'Please describe the product (min 30 chars).';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    try {
      const category = form.customCategory || form.category;
      let fileId = '';
      let fileName = '';
      if (deliverable?.file) {
        const uploaded = await sellerService.uploadFile(deliverable.file);
        fileId = uploaded.id;
        fileName = uploaded.filename;
      }
      const p = await sellerService.submitProduct(user.id, {
        title: form.title,
        category,
        isCustomCategory: !!form.customCategory,
        price: Number(form.price),
        description: form.description,
        image: form.image,
        fileId,
        fileName,
      });
      push({
        title: 'Product submitted for review',
        message: `“${p.title}” has been sent to admin. You’ll be notified when it’s approved.`,
        kind: 'info',
        category: 'product',
        link: '/my-account',
      });
      toast({ title: 'Product submitted', description: 'Admin will review shortly.' });
      setForm({ title: '', category: '', customCategory: '', price: '', description: '', image: '' });
      setDeliverable(null);
      setProducts(await sellerService.listProducts({ userId: user.id }));
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  if (checking) {
    return <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center"><div className="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div>
      <Header />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14">
        <Link to="/my-account" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 btn-hover">
          <ArrowLeft size={14} /> Back to My Account
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white">Seller Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Upload and manage your marketplace products.</p>

        {!approved ? (
          <div className="mt-8 card-surface rounded-2xl p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={28} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-white">Not an approved seller yet</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">You need an approved seller application to upload products. Apply now or wait for admin review.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/become-seller" className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-5 py-2.5 btn-hover">Apply to become a seller</Link>
              <Link to="/my-account" className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-5 py-2.5 btn-hover">My Account</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <form onSubmit={submit} className="card-surface rounded-2xl p-5 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-white">Upload product</h2>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
              <F label="Title"><IW Icon={Sparkles}><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Premium ChatGPT Prompts Pack" className="ip" /></IW></F>

              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Category">
                  <label className="iw">
                    <Tag size={15} className="text-slate-400" />
                    <select value={form.category} onChange={(e) => { set('category', e.target.value); set('customCategory', ''); }} className="ip" style={{ colorScheme: 'dark' }}>
                      <option value="" className="bg-[#0f1526]">Choose category</option>
                      {SELLER_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0f1526]">{c}</option>)}
                    </select>
                  </label>
                </F>
                <F label="Or custom category" hint="Only if none above fit">
                  <IW Icon={Tag}><input value={form.customCategory} onChange={(e) => { set('customCategory', e.target.value); if (e.target.value) set('category', ''); }} placeholder="e.g. AI Prompt Packs" className="ip" /></IW>
                </F>
              </div>

              <F label="Price (USD)">
                <IW Icon={DollarSign}><input inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 19.99" className="ip" /></IW>
              </F>

              <F label="Description">
                <div className="iw-textarea">
                  <FileText size={15} className="text-slate-400 mt-0.5" />
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} placeholder="What buyers get, deliverables, format, and any prerequisites..." className="ip resize-y min-h-[120px]" />
                </div>
              </F>

              <F label="Cover image" hint="JPG or PNG, max 2MB">
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 px-3 py-2 text-sm cursor-pointer btn-hover">
                    <ImageIcon size={14} /> Choose file
                    <input type="file" accept="image/*" onChange={onImage} className="hidden" />
                  </label>
                  {form.image && (
                    <div className="relative">
                      <img src={form.image} alt="preview" className="h-16 w-24 object-cover rounded-lg border border-white/10" />
                      <button type="button" onClick={() => set('image', '')} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center"><X size={12} /></button>
                    </div>
                  )}
                </div>
              </F>

              <F label="Product file (deliverable)" hint="Buyers download after payment · max 50MB">
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 px-3 py-2 text-sm cursor-pointer btn-hover">
                    <Upload size={14} /> Choose file
                    <input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 50 * 1024 * 1024) { setError('Product file must be under 50MB.'); return; }
                        setDeliverable({ file: f, name: f.name });
                      }}
                      className="hidden"
                      data-testid="seller-deliverable-input"
                    />
                  </label>
                  {deliverable && (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-300">
                      <FileText size={13} className="text-emerald-400" /> {deliverable.name}
                      <button type="button" onClick={() => setDeliverable(null)} className="text-rose-300 hover:text-rose-200"><X size={12} /></button>
                    </span>
                  )}
                </div>
              </F>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400" /> Products go through admin review before publishing.
                </p>
                <Button disabled={submitting} className="rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 font-semibold px-6 h-11">
                  {submitting ? <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" /> : <><Upload size={15} className="mr-2" /> Submit for review</>}
                </Button>
              </div>
            </form>

            <aside className="space-y-4">
              <div className="card-surface rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white inline-flex items-center gap-2"><Package size={14} /> Recent uploads</h3>
                {products.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">Nothing yet — submit your first product.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/5">
                    {products.slice(0, 8).map((p) => (
                      <li key={p.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-white truncate">{p.title}</p>
                          <StatusChip status={p.status} />
                        </div>
                        <p className="text-[11px] text-slate-500">${p.price} · {p.category}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card-surface rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white">Seller tips</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <T>Use a clear cover image — buyers scan visually.</T>
                  <T>Describe deliverables, not features.</T>
                  <T>Set a fair, competitive starting price.</T>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </section>

      <style>{`
        .iw { display:flex; align-items:center; gap:8px; height:44px; padding:0 12px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10); }
        .iw:focus-within { border-color: rgba(16,185,129,0.6); background: rgba(255,255,255,0.06); }
        .iw-textarea { display:flex; align-items:flex-start; gap:8px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10); }
        .iw-textarea:focus-within { border-color: rgba(16,185,129,0.6); background: rgba(255,255,255,0.06); }
        .ip { width:100%; background:transparent; outline:none; font-size:14px; color:rgb(226 232 240); }
        .ip::placeholder { color:rgb(100 116 139); }
      `}</style>

      <Footer />
    </div>
  );
}

function F({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}
function IW({ Icon, children }) {
  return <label className="iw"><Icon size={15} className="text-slate-400" />{children}</label>;
}
function T({ children }) {
  return <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" /> <span>{children}</span></li>;
}
function StatusChip({ status }) {
  const map = {
    pending: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    approved: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    rejected: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${map[status] || map.pending}`}>{status}</span>;
}
