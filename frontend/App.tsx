import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartItem, CartMetrics, Category, HomeContent, PricingMode, Product, Review } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ReviewsPage from './pages/ReviewsPage';
import { fetchCatalog, fetchSiteHomeContent, getAdminToken, clearAdminToken } from './services/api';
import { fetchReviews } from './services/api';
import { getUnitPriceForMode } from './services/pricing';

type ToastState = { msg: string; id: number; open: boolean } | null;

const SITE_URL = 'https://adm-mebel.kz';
const DEFAULT_OG_IMAGE = 'https://adm-mebel.kz/logos/logoadm.jpg';

type RouteSeo = {
  title: string;
  description: string;
  robots?: string;
  ogType?: 'website' | 'article';
  image?: string;
  keywords?: string;
};

const SEO_BY_ROUTE: Record<string, RouteSeo> = {
  '/': {
    title: 'ADM Mebel Astana - Корпусная мебель на заказ в Астане',
    description: 'Корпусная мебель на заказ в Астане: кухни, шкафы, гардеробные и ТВ-зоны. Собственное производство, индивидуальный проект и точные сроки.',
    robots: 'index,follow,max-image-preview:large',
    ogType: 'website',
    image: DEFAULT_OG_IMAGE,
    keywords: 'мебель в Астане, мебель на заказ Астана, корпусная мебель Астана, кухни на заказ Астана, шкафы на заказ Астана, гардеробные Астана, прихожие на заказ Астана, ТВ зоны на заказ, мебельное производство Астана, ADM Mebel Astana',
  },
  '/catalog': {
    title: 'Каталог мебели на заказ - ADM Mebel Astana',
    description: 'Каталог корпусной мебели ADM Mebel: кухни, шкафы, гардеробные, прихожие и ТВ-зоны. Рассчитайте стоимость и отправьте заявку онлайн.',
    robots: 'index,follow,max-image-preview:large',
    ogType: 'website',
    image: DEFAULT_OG_IMAGE,
    keywords: 'каталог мебели Астана, мебель в Астане, заказать мебель в Астане, цены на мебель Астана, кухни Астана, шкафы Астана, гардеробные Астана, корпусная мебель на заказ',
  },
  '/cart': {
    title: 'Оформление заявки - ADM Mebel Astana',
    description: 'Оформите заявку на мебель по вашим параметрам. Укажите контактные данные и получите обратную связь от менеджера ADM Mebel.',
    robots: 'noindex,follow',
    ogType: 'website',
    image: DEFAULT_OG_IMAGE,
    keywords: 'заказать мебель в Астане, заявка на мебель Астана, расчет мебели Астана',
  },
  '/reviews': {
    title: 'Отзывы клиентов - ADM Mebel Astana',
    description: 'Реальные отзывы клиентов ADM Mebel: текстовые и видео-отзывы о корпусной мебели на заказ в Астане.',
    robots: 'index,follow,max-image-preview:large',
    ogType: 'article',
    image: DEFAULT_OG_IMAGE,
    keywords: 'отзывы мебель Астана, отзывы о мебели на заказ, ADM Mebel отзывы, мебель в Астане отзывы',
  },
  '/admin': {
    title: 'Вход в админ-панель - ADM Mebel',
    description: 'Административный раздел сайта ADM Mebel.',
    robots: 'noindex,nofollow',
    ogType: 'website',
    image: DEFAULT_OG_IMAGE,
    keywords: 'admin',
  },
};

const SeoManager: React.FC<{
  categories: Category[];
  reviews: Review[];
  homeContent: HomeContent | null;
  whatsappUrl: string;
}> = ({ categories, reviews, homeContent, whatsappUrl }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = SEO_BY_ROUTE[pathname] || SEO_BY_ROUTE['/'];
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
    const contacts = homeContent?.contacts;
    const phone = String(contacts?.phoneValue || '+77074064499');
    const address = String(contacts?.addressValue || 'Жетиген 37, Astana, Kazakhstan');
    const instagram = String(contacts?.instagramUrl || 'https://www.instagram.com/adm_mebel_astana/');
    const tiktok = String(contacts?.tiktokUrl || 'https://www.tiktok.com/');
    const [streetAddress = address, addressLocality = 'Астана', addressCountry = 'KZ'] = address.split(',').map((item) => item.trim());
    const image = seo.image || DEFAULT_OG_IMAGE;

    document.title = seo.title;

    const ensureMeta = (name: string, content: string) => {
      let meta = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const ensureOgMeta = (property: string, content: string) => {
      let meta = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    ensureMeta('description', seo.description);
    ensureMeta('keywords', seo.keywords || SEO_BY_ROUTE['/'].keywords || 'мебель в Астане, мебель на заказ Астана, корпусная мебель Астана');
    ensureMeta('robots', seo.robots || 'index,follow,max-image-preview:large');
    ensureMeta('googlebot', seo.robots || 'index,follow,max-image-preview:large');
    ensureMeta('twitter:title', seo.title);
    ensureMeta('twitter:description', seo.description);
    ensureMeta('twitter:image', image);
    ensureOgMeta('og:title', seo.title);
    ensureOgMeta('og:description', seo.description);
    ensureOgMeta('og:url', canonicalUrl);
    ensureOgMeta('og:type', seo.ogType || 'website');
    ensureOgMeta('og:image', image);

    let localBusinessScript = document.getElementById('adm-local-business-jsonld') as HTMLScriptElement | null;
    if (!localBusinessScript) {
      localBusinessScript = document.createElement('script');
      localBusinessScript.id = 'adm-local-business-jsonld';
      localBusinessScript.type = 'application/ld+json';
      document.head.appendChild(localBusinessScript);
    }

    localBusinessScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['FurnitureStore', 'LocalBusiness'],
      name: 'ADM Mebel Astana',
      description: 'Корпусная мебель на заказ в Астане',
      url: SITE_URL,
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
      logo: DEFAULT_OG_IMAGE,
      image: DEFAULT_OG_IMAGE,
      sameAs: [whatsappUrl.split('?')[0], instagram, tiktok].filter(Boolean),
    });

    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ADM Mebel Astana',
      url: SITE_URL,
      inLanguage: 'ru-KZ',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/catalog?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    let pageSchema: Record<string, any> | null = null;

    if (pathname === '/catalog') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Каталог мебели на заказ',
        url: canonicalUrl,
        description: seo.description,
        inLanguage: 'ru-KZ',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: categories.slice(0, 30).map((category, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: category.title,
            url: `${SITE_URL}/catalog?cat=${encodeURIComponent(category.id)}`,
          })),
        },
      };
    }

    if (pathname === '/reviews') {
      const publishedReviews = reviews.filter((review) => review.rating > 0);
      const avgRating = publishedReviews.length > 0
        ? Math.round((publishedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / publishedReviews.length) * 10) / 10
        : null;

      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Отзывы клиентов ADM Mebel',
        url: canonicalUrl,
        description: seo.description,
        inLanguage: 'ru-KZ',
        ...(avgRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating,
                bestRating: 5,
                worstRating: 1,
                ratingCount: publishedReviews.length,
              },
            }
          : {}),
        mainEntity: publishedReviews.slice(0, 20).map((review) => ({
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
          author: {
            '@type': 'Person',
            name: review.authorName,
          },
          reviewBody: review.text,
        })),
      };
    }

    if (pathname === '/') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Корпусная мебель на заказ в Астане',
        url: canonicalUrl,
        description: seo.description,
        inLanguage: 'ru-KZ',
      };
    }

    let pageSchemaScript = document.getElementById('adm-page-jsonld') as HTMLScriptElement | null;
    if (!pageSchemaScript) {
      pageSchemaScript = document.createElement('script');
      pageSchemaScript.id = 'adm-page-jsonld';
      pageSchemaScript.type = 'application/ld+json';
      document.head.appendChild(pageSchemaScript);
    }

    const schemas = [websiteSchema];
    if (pageSchema) schemas.push(pageSchema);
    pageSchemaScript.textContent = JSON.stringify(schemas);

    const breadcrumbs: Record<string, { name: string; path: string }[]> = {
      '/catalog': [
        { name: 'Главная', path: '/' },
        { name: 'Каталог', path: '/catalog' },
      ],
      '/reviews': [
        { name: 'Главная', path: '/' },
        { name: 'Отзывы', path: '/reviews' },
      ],
      '/cart': [
        { name: 'Главная', path: '/' },
        { name: 'Заявка', path: '/cart' },
      ],
    };

    let breadcrumbScript = document.getElementById('adm-breadcrumb-jsonld') as HTMLScriptElement | null;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'adm-breadcrumb-jsonld';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    if (breadcrumbs[pathname]) {
      breadcrumbScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs[pathname].map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
      });
    } else {
      breadcrumbScript.textContent = '';
    }

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [pathname, categories, reviews, homeContent, whatsappUrl]);

  return null;
};

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
  const [reviews, setReviews] = useState<Review[]>([]);

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
  const instagramUrl = useMemo(
    () => String(homeContent?.contacts?.instagramUrl || import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/adm_mebel_astana/').trim(),
    [homeContent]
  );
  const tiktokUrl = useMemo(
    () => String(homeContent?.contacts?.tiktokUrl || import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/').trim(),
    [homeContent]
  );

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

  useEffect(() => {
    fetchReviews()
      .then((data) => setReviews((data.reviews || []) as Review[]))
      .catch(() => setReviews([]));
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
      <SeoManager categories={categories} reviews={reviews} homeContent={homeContent} whatsappUrl={whatsappUrl} />
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
            <Route path="/" element={<HomePage categories={categories} onAddToCart={addToCart} content={homeContent} reviews={reviews} />} />
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
            <Route path="/reviews" element={<ReviewsPage />} />
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
      <div className="fixed right-5 bottom-5 z-[9999] flex flex-col gap-3">
        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
            aria-label="Instagram"
          >
            <i className="fab fa-instagram text-2xl"></i>
          </a>
        ) : null}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full bg-green-500 text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105 hover:bg-green-600"
            aria-label="WhatsApp"
          >
            <i className="fab fa-whatsapp text-2xl"></i>
          </a>
        ) : null}
        {tiktokUrl ? (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: '#111111' }}
            aria-label="TikTok"
          >
            <i className="fab fa-tiktok text-2xl"></i>
          </a>
        ) : null}
      </div>
</Router>
  );
};

export default App;
