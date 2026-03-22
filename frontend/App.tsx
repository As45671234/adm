import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartItem, CartMetrics, Category, HomeContent, PricingMode, Product } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { fetchCatalog, fetchSiteHomeContent, getAdminToken, clearAdminToken } from './services/api';
import { getUnitPriceForMode } from './services/pricing';

type ToastState = { msg: string; id: number; open: boolean } | null;

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);

  const [toast, setToast] = useState<ToastState>(null);
  const [toastTimer, setToastTimer] = useState<number | null>(null);
  const whatsappPhone = useMemo(
    () => String(homeContent?.contacts?.whatsappPhone || import.meta.env.VITE_WHATSAPP_PHONE || '77074064499').replace(/[^\d]/g, ''),
    [homeContent]
  );
  const whatsappText = useMemo(
    () => encodeURIComponent(String(homeContent?.contacts?.whatsappMessage || 'Здравствуйте! Хочу заказать консультацию.')),
    [homeContent]
  );
  const whatsappUrl = useMemo(
    () => (whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${whatsappText}` : ''),
    [whatsappPhone, whatsappText]
  );

  useEffect(() => {
    const script = document.getElementById('adm-local-business-jsonld');
    if (!script) return;

    const contacts = homeContent?.contacts;
    const phone = String(contacts?.phoneValue || '+77074064499');
    const address = String(contacts?.addressValue || 'Жетиген 37, Astana, Kazakhstan');
    const instagram = String(contacts?.instagramUrl || 'https://www.instagram.com/adm_mebel_astana/');
    const [streetAddress = address, addressLocality = 'Астана', addressCountry = 'KZ'] = address.split(',').map((item) => item.trim());

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'ADM Mebel Astana',
      description: 'Корпусная мебель на заказ в Астане',
      url: 'https://adm-mebel-astana.kz',
      telephone: phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress,
        addressLocality,
        addressCountry,
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '20:00',
      },
      logo: 'https://adm-mebel-astana.kz/logos/logoadm.jpg',
      sameAs: [whatsappUrl.split('?')[0], instagram].filter(Boolean),
    }, null, 2);
  }, [homeContent, whatsappUrl]);

  useEffect(() => {
    const handler = () => {
      if (!whatsappUrl) return;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };
    window.addEventListener('adm:open-whatsapp', handler as any);
    return () => window.removeEventListener('adm:open-whatsapp', handler as any);
  }, [whatsappUrl]);
  // Cart persistence
  useEffect(() => {
    const savedCart = localStorage.getItem('adm_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (!Array.isArray(parsed)) {
          setCart([]);
          return;
        }

        const normalized = parsed
          .map((item: any) => {
            const mode: PricingMode = ['piece', 'm2'].includes(String(item.pricingMode))
              ? item.pricingMode
              : 'piece';
            const fallbackPrice = getUnitPriceForMode(item as Product, mode);
            const unitPrice = Number(item.unitPrice ?? fallbackPrice ?? 0);
            const quantity = Math.max(0.1, Number(item.quantity || 1));
            const cartKey = String(item.cartKey || `${item.id}:${mode}`);
            const metrics = item.metrics && typeof item.metrics === 'object'
              ? {
                  ...item.metrics,
                  quantity,
                }
              : undefined;
            return { ...item, pricingMode: mode, unitPrice, quantity, cartKey, metrics } as CartItem;
          })
          .filter((item: CartItem) => item.id && item.cartKey);

        setCart(normalized);
      } catch {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adm_cart', JSON.stringify(cart));
  }, [cart]);

  // Catalog from backend
  useEffect(() => {
    fetchCatalog()
      .then((data) => setCategories((data.categories || []) as any))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetchSiteHomeContent()
      .then((data) => setHomeContent((data.content || null) as HomeContent | null))
      .catch(() => setHomeContent(null));
  }, []);

  // Admin session (token)
  useEffect(() => {
    const t = getAdminToken();
    if (t) setIsAdminAuthenticated(true);
  }, []);

  const showToast = (msg: string) => {
    if (toastTimer) window.clearTimeout(toastTimer);

    const id = Date.now();
    setToast({ msg, id, open: true });

    const t = window.setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, open: false } : prev));
      window.setTimeout(() => setToast(null), 320);
    }, 2200);

    setToastTimer(t);
  };

  const addToCart = (product: Product, options?: { pricingMode?: PricingMode; quantity?: number; metrics?: CartMetrics }) => {
    const pricingMode: PricingMode = options?.pricingMode || 'piece';
    const unitPrice = getUnitPriceForMode(product, pricingMode) ?? 0;
    const quantity = Math.max(0.1, Number(options?.quantity || 1));
    const metrics = options?.metrics;
    const metricKey = metrics
      ? [
          metrics.source,
          metrics.quantity,
          metrics.widthM,
          metrics.heightM,
          metrics.depthM ?? '',
        ].join(':')
      : '';
    const cartKey = `${product.id}:${pricingMode}${metricKey ? `:${metricKey}` : ''}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                quantity: item.quantity + quantity,
                metrics: item.metrics ? { ...item.metrics, quantity: item.quantity + quantity } : item.metrics,
              }
            : item
        );
      }
      return [...prev, { ...product, cartKey, pricingMode, unitPrice, quantity, metrics }];
    });

    showToast('Товар добавлен в корзину');
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey === cartKey) {
          const min = item.pricingMode === 'piece' ? 1 : 0.1;
          const nextQuantity = Math.max(min, quantity);
          return {
            ...item,
            quantity: nextQuantity,
            metrics: item.metrics ? { ...item.metrics, quantity: nextQuantity } : item.metrics,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen relative overflow-x-hidden">
        <Header
          cartCount={cart.length}
          categories={categories}
        />

        {toast && (
          <div className="fixed right-4 top-[76px] z-[9999] pointer-events-none">
            <div
              className={[
                'bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold',
                'transition-all duration-300 ease-out',
                toast.open ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0',
              ].join(' ')}
            >
              {toast.msg}
            </div>
          </div>
        )}

        <main className="flex-grow pt-24 md:pt-32">
          <Routes>
            <Route path="/" element={<HomePage categories={categories} onAddToCart={addToCart} content={homeContent} />} />
            <Route
              path="/catalog"
              element={<CatalogPage categories={categories} onAddToCart={addToCart} hasWhatsapp={Boolean(whatsappPhone)} />}
            />
            <Route
              path="/cart"
              element={
                <CartPage
                  cart={cart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  clearCart={clearCart}
                />
              }
            />
            <Route
              path="/admin"
              element={
                isAdminAuthenticated ? (
                  <AdminDashboard
                    categories={categories}
                    setCategories={setCategories}
                    setHomeContent={setHomeContent}
                    onLogout={() => {
                      clearAdminToken();
                      setIsAdminAuthenticated(false);
                    }}
                  />
                ) : (
                  <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
                )
              }
            />
          </Routes>
        </main>

        <Footer content={homeContent} />
      </div>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-5 bottom-5 z-[9999] w-14 h-14 rounded-full bg-green-500 text-white shadow-2xl flex items-center justify-center hover:bg-green-600"
          aria-label="WhatsApp"
        >
          <i className="fab fa-whatsapp text-2xl"></i>
        </a>
      ) : null}
</Router>
  );
};

export default App;
