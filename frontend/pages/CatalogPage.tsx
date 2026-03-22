import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CartMetrics, Category, PricingMode, Product } from '../types';
import noPhotoImage from '../components/img/no photo/no-photo.svg';
import { getAvailablePricingModes, getBestDisplayPrice, getUnitLabel, getUnitPriceForMode } from '../services/pricing';

interface CatalogPageProps {
  categories: Category[];
  onAddToCart: (p: Product, options?: { pricingMode?: PricingMode; quantity?: number; metrics?: CartMetrics }) => void;
  hasWhatsapp?: boolean;
}

// ── reusable dimension-input widget ───────────────────────────────────────────
interface DimInputsProps {
  mode: 'm2' | 'piece';
  calcW: string; calcH: string; calcD: string;
  setCalcW: (v: string) => void;
  setCalcH: (v: string) => void;
  setCalcD: (v: string) => void;
  calcQty: number | null;
  unitPrice?: number;
}

const DimInputs: React.FC<DimInputsProps> = ({ mode, calcW, calcH, calcD, setCalcW, setCalcH, setCalcD, calcQty, unitPrice }) => {
  const fields = [
    { label: 'Ширина', placeholder: 'напр. 1.5', val: calcW, set: setCalcW },
    { label: 'Высота', placeholder: 'напр. 2.4', val: calcH, set: setCalcH },
  ];
  const total = calcQty !== null && unitPrice ? unitPrice * calcQty : null;
  const unit = 'м²';
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--adm-accent)' }}>
        <i className="fas fa-ruler-combined"></i> Введите размеры (м)
      </div>
      <div className="grid gap-2.5 grid-cols-2">
        {fields.map(({ label, placeholder, val, set }) => (
          <div key={label}>
            <label className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--adm-ink-soft)' }}>{label}, м</label>
            <input
              type="number" value={val} placeholder={placeholder} min="0" step="0.01"
              onChange={(e) => set(e.target.value)}
              className="w-full text-center font-bold text-sm rounded-lg outline-none py-2"
              style={{ border: '1.5px solid var(--adm-border)', background: 'var(--adm-paper)', color: 'var(--adm-ink)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--adm-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--adm-border)')}
            />
          </div>
        ))}
      </div>
      {calcQty !== null ? (
        <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--adm-ink-soft)' }}>Площадь: <strong style={{ color: 'var(--adm-ink)' }}>{calcQty} {unit}</strong></span>
            {total !== null && (
              <span className="text-base font-black" style={{ color: 'var(--adm-ink)', fontFamily: 'Montserrat, sans-serif' }}>
                {total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸
              </span>
            )}
          </div>
          {total !== null && unitPrice && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--adm-ink-soft)' }}>
              {unitPrice.toLocaleString()} ₸ × {calcQty} {unit}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2.5 text-[11px] text-center" style={{ color: 'var(--adm-ink-soft)', opacity: 0.7 }}>
          Введите размеры — цена пересчитается автоматически
        </div>
      )}
    </div>
  );
};

const CatalogPage: React.FC<CatalogPageProps> = ({ categories, onAddToCart, hasWhatsapp = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedPricingMode, setSelectedPricingMode] = useState<PricingMode>('piece');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  // dimension calculator (cm)
  const [calcW, setCalcW] = useState<string>('');
  const [calcH, setCalcH] = useState<string>('');
  const [calcD, setCalcD] = useState<string>('');
  const [calcMode, setCalcMode] = useState<'preset' | 'custom'>('preset');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [cardImageIndexById, setCardImageIndexById] = useState<Record<string, number>>({});

  useEffect(() => {
    const cat = searchParams.get('cat');
    const sub = searchParams.get('sub') || '';

    if (cat) setSelectedCatId(cat);
    else if (categories.length > 0) setSelectedCatId(categories[0].id);

    setSelectedSub(sub);
  }, [searchParams, categories]);

  useEffect(() => {
    if (!selectedProduct) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProduct(null);
        setQuantity(1);
        setSelectedPricingMode('piece');
        setIsZoomed(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    const modes = getAvailablePricingModes(selectedProduct);
    const first = modes[0] || 'piece';
    setSelectedPricingMode(first);
    setQuantity(1);
    setCalcW('');
    setCalcH('');
    setCalcD('');
    setCalcMode('preset');
    setActiveImageIndex(0);
    setIsZoomed(false);
  }, [selectedProduct]);

  const activeCategory = categories.find((c) => c.id === selectedCatId);

  const subcategories: string[] = Array.from(
    new Set(
      (activeCategory?.items || [])
        .map((p): string => String(p.segment || p.brandOrGroup || '').trim())
        .filter(
          (s) =>
            !!s &&
            s.length <= 40 &&
            !/для оформления заказа/i.test(s) &&
            !/достаточно отправить запрос/i.test(s)
        )
    )
  ) as string[];
  subcategories.sort((a, b) => a.localeCompare(b, 'ru'));

  const filteredProducts =
    activeCategory?.items
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.segment || p.brandOrGroup || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((p) => !selectedSub || String(p.segment || p.brandOrGroup || '').trim() === selectedSub) || [];

  const getProductImage = (product: Product) => {
    const image = product.image?.trim();
    return image ? image : noPhotoImage;
  };

  const getProductImages = (product: Product): string[] => {
    const attrs = product.attrs || {};
    const fromAttrs = Array.isArray(attrs.gallery_images)
      ? attrs.gallery_images
      : String(attrs.gallery_images || '').split(/[,;\n]/);

    const images = [
      product.image,
      attrs.image2,
      attrs.image3,
      ...fromAttrs,
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .filter((x, i, arr) => arr.indexOf(x) === i)
      .slice(0, 5);

    return images.length > 0 ? images : [noPhotoImage];
  };

  const getVisibleAttrs = (product: Product): Array<[string, any]> => {
    const hiddenKeys = new Set(['image', 'image2', 'image3', 'gallery_images']);
    return Object.entries(product.attrs || {})
      .filter(([key, val]) => {
        const k = String(key || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_');
        const v = String(val || '').trim();
        if (!v) return false;
        return !hiddenKeys.has(k);
      });
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.src.includes('no-photo.svg')) return;
    target.src = noPhotoImage;
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setSelectedPricingMode('piece');
    setIsZoomed(false);
    setCalcW('');
    setCalcH('');
    setCalcD('');
    setCalcMode('preset');
  };

  const selectedPrice = selectedProduct ? getUnitPriceForMode(selectedProduct, selectedPricingMode) : undefined;
  const isMetric = selectedPricingMode === 'm2';
  const selectedImages = selectedProduct ? getProductImages(selectedProduct) : [noPhotoImage];
  const activeImage = selectedImages[Math.min(activeImageIndex, selectedImages.length - 1)] || noPhotoImage;

  // Stored dimensions from attrs (mm)
  const storedW = parseFloat(String(selectedProduct?.attrs?.width_mm || ''));
  const storedH = parseFloat(String(selectedProduct?.attrs?.height_mm || ''));
  const hasStoredDims = isMetric && storedW > 0 && storedH > 0;

  // Preset qty: mm → m²
  const presetQty: number | null = hasStoredDims
    ? Math.round(storedW * storedH / 1e6 * 100) / 100
    : null;

  // Custom calc qty from user inputs (m → m²)
  const calcQty: number | null = (() => {
    if (selectedPricingMode === 'm2') {
      const w = parseFloat(calcW), h = parseFloat(calcH);
      if (w > 0 && h > 0) return Math.round(w * h * 100) / 100;
    }
    return null;
  })();

  // Active qty: preset dims OR custom calc OR plain stepper
  const usePresetMetricQty = isMetric && hasStoredDims && calcMode === 'preset';
  const displayQty: number | null = isMetric
    ? (usePresetMetricQty ? presetQty : calcQty)
    : null;
  const effectiveQty = displayQty ?? quantity;

  const selectedMetrics: CartMetrics | undefined = (() => {
    if (!isMetric || displayQty === null || displayQty <= 0) return undefined;
    if (usePresetMetricQty) {
      return {
        source: 'preset',
        unit: 'м²',
        quantity: displayQty,
        widthM: Math.round((storedW / 1000) * 1000) / 1000,
        heightM: Math.round((storedH / 1000) * 1000) / 1000,
      };
    }

    const widthM = parseFloat(calcW);
    const heightM = parseFloat(calcH);
    if (!(widthM > 0) || !(heightM > 0)) return undefined;

    return {
      source: 'custom',
      unit: 'м²',
      quantity: displayQty,
      widthM: Math.round(widthM * 1000) / 1000,
      heightM: Math.round(heightM * 1000) / 1000,
    };
  })();

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-32 space-y-6">
            <div className="adm-section p-5">
              <h2 className="text-3xl font-black text-[var(--adm-ink)] mb-5">Категории</h2>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      setSelectedSub('');
                      setSearchParams({ cat: cat.id });
                    }}
                    className={[
                      'w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-between',
                      selectedCatId === cat.id
                        ? 'bg-[var(--adm-accent)] text-black shadow-lg'
                        : 'bg-[var(--adm-paper)] text-[var(--adm-ink)] hover:bg-[var(--adm-bg-soft)] border border-[var(--adm-border)]',
                    ].join(' ')}
                  >
                    <span>{cat.title}</span>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[var(--adm-bg-soft)] text-[var(--adm-ink-soft)]">{cat.items.length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-3xl p-7 text-white">
              <h4 className="text-2xl font-black mb-2">Нужна помощь?</h4>
              <p className="text-stone-300 text-sm mb-5 leading-relaxed">
                Подскажем конфигурацию мебели под ваши размеры и бюджет.
              </p>
              <button
                className={[
                  'w-full py-3 font-bold rounded-xl text-sm transition-colors',
                  hasWhatsapp ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400' : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                ].join(' ')}
                onClick={() => hasWhatsapp && window.dispatchEvent(new CustomEvent('adm:open-whatsapp'))}
                disabled={!hasWhatsapp}
              >
                WhatsApp консультация
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-grow">
          <div className="adm-section p-6 md:p-8 mb-7">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="adm-eyebrow mb-2">Каталог ADM</div>
                <h1 className="text-4xl font-black text-[var(--adm-ink)] leading-tight">{activeCategory?.title || 'Все товары'}</h1>
                <p className="text-[var(--adm-ink-soft)] mt-2">Найдено {filteredProducts.length} наименований</p>
              </div>
              <div className="relative w-full md:w-96">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Поиск по названию или группе..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-2xl pl-12 pr-4 py-3 text-[var(--adm-ink)] placeholder-[var(--adm-ink-soft)] focus:border-[var(--adm-accent)] outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {subcategories.length > 0 ? (
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  setSelectedSub('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('sub');
                  setSearchParams(next);
                }}
                className={[
                  'flex-shrink-0 px-4 py-2 rounded-2xl font-bold text-sm transition-all border',
                  !selectedSub
                    ? 'bg-[var(--adm-accent)] text-black border-[var(--adm-accent)]'
                    : 'bg-[var(--adm-paper)] text-[var(--adm-ink)] border-[var(--adm-border)] hover:bg-[var(--adm-bg-soft)]',
                ].join(' ')}
              >
                Все
              </button>
              {subcategories.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedSub(s);
                    const next = new URLSearchParams(searchParams);
                    next.set('sub', s);
                    setSearchParams(next);
                  }}
                  className={[
                    'flex-shrink-0 px-4 py-2 rounded-2xl font-bold text-sm transition-all border',
                    selectedSub === s
                      ? 'bg-[var(--adm-accent)] text-black border-[var(--adm-accent)]'
                      : 'bg-[var(--adm-paper)] text-[var(--adm-ink)] border-[var(--adm-border)] hover:bg-[var(--adm-bg-soft)]',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
              {filteredProducts.map((product) => {
                const display = getBestDisplayPrice(product);
                const productImages = getProductImages(product);
                const cardImageIndex = cardImageIndexById[product.id] || 0;
                const cardImage = productImages[Math.min(cardImageIndex, productImages.length - 1)] || noPhotoImage;
                const visibleAttrs = getVisibleAttrs(product).slice(0, 3);
                const cardHasGallery = productImages.length > 1;
                return (
                  <article
                    key={product.id}
                    className="adm-section p-0 overflow-hidden cursor-pointer hover:-translate-y-1 transition-all"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="h-56 bg-[var(--adm-bg-soft)] relative overflow-hidden">
                      <img
                        src={cardImage}
                        alt={product.name}
                        onError={(event) => {
                          // If one gallery image is broken, try the next one instead of showing placeholder immediately.
                          if (cardHasGallery) {
                            setCardImageIndexById((prev) => ({
                              ...prev,
                              [product.id]: ((prev[product.id] || 0) + 1) % productImages.length,
                            }));
                            return;
                          }
                          handleImageError(event);
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {cardHasGallery ? (
                        <>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCardImageIndexById((prev) => ({
                                ...prev,
                                [product.id]: ((prev[product.id] || 0) - 1 + productImages.length) % productImages.length,
                              }));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(13,11,7,0.82)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                            aria-label="Предыдущее фото"
                          >
                            <i className="fas fa-chevron-left text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCardImageIndexById((prev) => ({
                                ...prev,
                                [product.id]: ((prev[product.id] || 0) + 1) % productImages.length,
                              }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(13,11,7,0.82)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                            aria-label="Следующее фото"
                          >
                            <i className="fas fa-chevron-right text-xs"></i>
                          </button>
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {productImages.map((img, idx) => (
                              <button
                                key={`${product.id}-${img}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setCardImageIndexById((prev) => ({ ...prev, [product.id]: idx }));
                                }}
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  background: idx === cardImageIndex ? 'var(--adm-accent)' : 'rgba(255,253,248,0.72)',
                                  border: idx === cardImageIndex ? '1px solid var(--adm-accent-dark)' : '1px solid rgba(35,34,33,0.25)',
                                }}
                                aria-label={`Фото ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {(product.segment || product.brandOrGroup) && (product.segment || product.brandOrGroup).trim() ? (
                        <div className="absolute top-4 left-4 text-[10px] font-bold px-3 py-1.5 rounded-2xl uppercase tracking-widest" style={{ background: 'rgba(13,11,7,0.82)', color: 'var(--adm-accent)', border: '1px solid rgba(201,164,76,0.3)' }}>
                          {product.segment || product.brandOrGroup}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-black text-[var(--adm-ink)] mb-3 line-clamp-2 min-h-[56px]">{product.name}</h3>
                      <div className="space-y-2 mb-5">
                        {visibleAttrs
                          .map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between text-xs">
                              <span className="text-[var(--adm-ink-soft)] capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-bold text-[var(--adm-ink)]">{val}</span>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center justify-between pt-5 border-t border-[var(--adm-border)]">
                        <div>
                          <div className="text-[10px] text-[var(--adm-ink-soft)] uppercase font-bold tracking-wider">Цена от</div>
                          <div className="text-2xl font-black" style={{ color: 'var(--adm-accent)' }}>
                            {display.price
                              ? `${Number(display.price).toLocaleString()} ₸ / ${getUnitLabel(display.mode)}`
                              : product.prices.note || 'По запросу'}
                          </div>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const mode = getAvailablePricingModes(product)[0];
                            if (mode !== 'piece') {
                              setSelectedProduct(product);
                              return;
                            }
                            onAddToCart(product, { pricingMode: mode, quantity: 1 });
                          }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg" style={{ background: 'var(--adm-accent)', color: '#0d0b07' }}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="adm-section p-16 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl" style={{ background: 'var(--adm-bg-soft)', color: 'var(--adm-accent)' }}>
                <i className="fas fa-box-open"></i>
              </div>
              <h3 className="text-3xl font-black text-[var(--adm-ink)]">Товары не найдены</h3>
              <p className="text-[var(--adm-ink-soft)] mt-2">Попробуйте изменить параметры поиска или категорию.</p>
            </div>
          )}
        </div>
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={closeModal}>
          <div
            className="w-full max-w-5xl bg-[var(--adm-paper)] rounded-2xl overflow-hidden max-h-[94vh] overflow-y-auto"
            style={{ boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[46%_54%]">

              {/* ─── Image panel ─── */}
              <div className="relative lg:sticky lg:top-0 lg:self-start" style={{ background: 'var(--adm-bg)' }}>
                <div
                  className="relative h-64 sm:h-80 lg:h-[540px] flex items-center justify-center overflow-hidden cursor-zoom-in"
                  onClick={() => setIsZoomed(!isZoomed)}
                  style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
                >
                  <img
                    src={activeImage}
                    alt={selectedProduct.name}
                    onError={handleImageError}
                    className="transition-transform duration-500 max-w-full max-h-full"
                    style={{
                      objectFit: 'contain',
                      width: '100%',
                      height: '100%',
                      padding: isZoomed ? '0' : '12px',
                      transform: isZoomed ? 'scale(1.45)' : 'scale(1)',
                    }}
                  />
                  {/* zoom hint */}
                  <div className="absolute bottom-3 right-3 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg pointer-events-none" style={{ background: 'rgba(35,34,33,0.65)', color: 'var(--adm-paper)' }}>
                    <i className={`fas ${isZoomed ? 'fa-search-minus' : 'fa-search-plus'} mr-1`}></i>
                    {isZoomed ? 'Свернуть' : 'Увеличить'}
                  </div>
                  {selectedImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomed(false);
                          setActiveImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(13,11,7,0.85)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                        aria-label="Предыдущее фото"
                      >
                        <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomed(false);
                          setActiveImageIndex((prev) => (prev + 1) % selectedImages.length);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(13,11,7,0.85)', color: 'var(--adm-accent)', border: '1px solid var(--adm-border)' }}
                        aria-label="Следующее фото"
                      >
                        <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {selectedImages.map((img, idx) => (
                          <button
                            key={img + idx}
                            type="button"
                            onClick={() => {
                              setIsZoomed(false);
                              setActiveImageIndex(idx);
                            }}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: idx === activeImageIndex ? 'var(--adm-accent)' : 'rgba(255,255,255,0.25)',
                              border: idx === activeImageIndex ? '1px solid var(--adm-accent-dark)' : '1px solid rgba(255,255,255,0.15)',
                            }}
                            aria-label={`Фото ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                  {/* mobile close */}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeModal(); }}
                    className="lg:hidden absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow"
                    style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)' }}
                    aria-label="Закрыть"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              </div>

              {/* ─── Info panel ─── */}
              <div className="p-6 lg:p-8 flex flex-col gap-5 relative">

                {/* desktop close */}
                <button
                  onClick={closeModal}
                  className="hidden lg:flex absolute top-5 right-5 w-9 h-9 items-center justify-center rounded-full text-[var(--adm-ink-soft)] hover:text-[var(--adm-ink)] transition-colors"
                  style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}
                  aria-label="Закрыть"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>

                {/* header */}
                <div>
                  {(selectedProduct.segment || selectedProduct.brandOrGroup)?.trim() ? (
                    <div className="adm-eyebrow mb-2">{selectedProduct.segment || selectedProduct.brandOrGroup}</div>
                  ) : null}
                  <h2 className="text-2xl lg:text-3xl font-black leading-snug pr-8" style={{ color: 'var(--adm-ink)', fontFamily: 'Montserrat, sans-serif' }}>
                    {selectedProduct.name}
                  </h2>
                </div>

                {/* sku + stock */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedProduct.sku ? (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}>
                      SKU: <strong style={{ color: 'var(--adm-ink)' }}>{selectedProduct.sku}</strong>
                    </span>
                  ) : null}
                  <span className={[
                    'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md',
                    selectedProduct.inStock ? 'text-emerald-400' : 'text-amber-400',
                  ].join(' ')} style={{ background: selectedProduct.inStock ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.1)', border: `1px solid ${selectedProduct.inStock ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}` }}>
                    <span className={['w-1.5 h-1.5 rounded-full', selectedProduct.inStock ? 'bg-emerald-500' : 'bg-amber-500'].join(' ')}></span>
                    {selectedProduct.inStock ? 'В наличии' : 'Под заказ'}
                  </span>
                </div>

                {/* description */}
                {selectedProduct.description ? (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--adm-ink-soft)' }}>{selectedProduct.description}</p>
                ) : null}

                {/* price card */}
                <div className="rounded-xl px-5 py-4" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--adm-accent)' }}>
                    {selectedPrice && displayQty !== null ? 'Итоговая стоимость' : selectedPrice ? `Цена за ${getUnitLabel(selectedPricingMode)}` : 'Стоимость'}
                  </div>
                  <div className="text-3xl lg:text-4xl font-black" style={{ color: 'var(--adm-ink)', fontFamily: 'Montserrat, sans-serif' }}>
                    {selectedPrice
                      ? displayQty !== null
                        ? `${(selectedPrice * displayQty).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸`
                        : `${selectedPrice.toLocaleString()} ₸`
                      : selectedProduct.prices.note || 'По запросу'}
                  </div>
                  {selectedPrice && displayQty !== null ? (
                    <div className="text-xs mt-1" style={{ color: 'var(--adm-ink-soft)' }}>
                      {selectedPrice.toLocaleString()} ₸ × {displayQty} {getUnitLabel(selectedPricingMode)}
                    </div>
                  ) : selectedPrice && isMetric ? (
                    <div className="text-xs mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Введите размеры, чтобы узнать итоговую стоимость</div>
                  ) : !selectedProduct.prices.retail && selectedProduct.prices.note ? (
                    <div className="text-xs mt-1" style={{ color: 'var(--adm-ink-soft)' }}>{selectedProduct.prices.note}</div>
                  ) : null}
                </div>

                {/* pricing mode */}
                {getAvailablePricingModes(selectedProduct).length > 1 ? (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Способ расчёта</div>
                    <div className="flex gap-2 flex-wrap">
                      {getAvailablePricingModes(selectedProduct).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setSelectedPricingMode(mode);
                            setQuantity(1);
                            setCalcW(''); setCalcH(''); setCalcD('');
                            setCalcMode('preset');
                          }}
                          className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                          style={selectedPricingMode === mode
                            ? { background: 'var(--adm-ink)', color: 'var(--adm-paper)', border: '1px solid var(--adm-ink)' }
                            : { background: 'var(--adm-paper)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}
                        >
                          {getUnitLabel(mode)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* attrs */}
                {Object.keys(selectedProduct.attrs).length > 0 ? (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--adm-ink-soft)' }}>Характеристики</div>
                    <div className="grid grid-cols-2 gap-2">
                      {getVisibleAttrs(selectedProduct).slice(0, 6).map(([key, val]) => (
                        <div key={key} className="rounded-lg p-2.5 transition-colors" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                          <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--adm-ink-soft)' }}>{key.replace(/_/g, ' ')}</div>
                          <div className="text-sm font-bold" style={{ color: 'var(--adm-ink)' }}>{String(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* ── quantity / calculator ── */}
                <div className="flex flex-col gap-3 pt-1">

                  {/* Scenario D: metric, no price → По запросу */}
                  {isMetric && !selectedPrice ? (
                    <div className="rounded-xl p-4 text-center" style={{ background: 'var(--adm-bg-soft)', border: '1px solid var(--adm-border)' }}>
                      <i className="fas fa-exclamation-circle mb-2 text-lg" style={{ color: 'var(--adm-accent)' }}></i>
                      <p className="text-sm font-semibold" style={{ color: 'var(--adm-ink)' }}>Цена уточняется индивидуально</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Свяжитесь с нами для расчёта стоимости</p>
                    </div>
                  ) : isMetric && selectedPrice && hasStoredDims ? (
                    /* Scenario C: metric + price + stored dims → preset toggle + custom */
                    <div className="flex flex-col gap-3">
                      {/* mode toggle */}
                      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--adm-border)' }}>
                        {(['preset', 'custom'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => { setCalcMode(m); setCalcW(''); setCalcH(''); setCalcD(''); }}
                            className="flex-1 py-2 text-xs font-bold transition-all"
                            style={calcMode === m
                              ? { background: 'var(--adm-ink)', color: 'var(--adm-paper)' }
                              : { background: 'var(--adm-paper)', color: 'var(--adm-ink-soft)' }}
                          >
                            {m === 'preset' ? 'По шаблону' : 'Свой размер'}
                          </button>
                        ))}
                      </div>

                      {calcMode === 'preset' ? (
                        /* preset: show stored dims */
                        <div className="rounded-xl p-4" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                          <div className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--adm-ink-soft)' }}>Размеры из шаблона</div>
                          <div className="grid gap-2 grid-cols-2">
                            {[
                              { label: 'Ширина', val: storedW },
                              { label: 'Высота', val: storedH },
                            ].map(({ label, val }) => (
                              <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)' }}>
                                <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--adm-ink-soft)' }}>{label}</div>
                                <div className="text-sm font-black" style={{ color: 'var(--adm-ink)' }}>{val} мм</div>
                              </div>
                            ))}
                          </div>
                          {presetQty !== null && (
                            <div className="mt-2.5 text-xs font-semibold text-center" style={{ color: 'var(--adm-ink-soft)' }}>
                              Площадь: <strong style={{ color: 'var(--adm-ink)' }}>{presetQty} {getUnitLabel(selectedPricingMode)}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* custom calc */
                        <DimInputs mode={selectedPricingMode} calcW={calcW} calcH={calcH} calcD={calcD}
                      setCalcW={setCalcW} setCalcH={setCalcH} setCalcD={setCalcD} calcQty={calcQty} unitPrice={selectedPrice ?? undefined} />
                      )}
                    </div>
                  ) : isMetric && selectedPrice && !hasStoredDims ? (
                    /* Scenario B: metric + price, no stored dims → calc only */
                    <DimInputs mode={selectedPricingMode} calcW={calcW} calcH={calcH} calcD={calcD}
                      setCalcW={setCalcW} setCalcH={setCalcH} setCalcD={setCalcD} calcQty={calcQty} unitPrice={selectedPrice ?? undefined} />
                  ) : (
                    /* Scenario A: шт → classic stepper */
                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1.5px solid var(--adm-border)', background: 'var(--adm-paper)' }}>
                        <button
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="w-9 h-9 flex items-center justify-center transition-colors"
                          style={{ color: 'var(--adm-ink-soft)' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--adm-bg)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <i className="fas fa-minus text-xs"></i>
                        </button>
                        <input
                          type="number" value={quantity}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            setQuantity(Math.max(1, Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 1));
                          }}
                          className="w-12 text-center font-bold text-sm outline-none"
                          style={{ borderLeft: '1px solid var(--adm-border)', borderRight: '1px solid var(--adm-border)', color: 'var(--adm-ink)', background: 'var(--adm-paper)' }}
                          min="1" step="1"
                        />
                        <button
                          onClick={() => setQuantity((prev) => prev + 1)}
                          className="w-9 h-9 flex items-center justify-center transition-colors"
                          style={{ color: 'var(--adm-ink-soft)' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--adm-bg)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <i className="fas fa-plus text-xs"></i>
                        </button>
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--adm-ink-soft)' }}>шт</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onAddToCart(selectedProduct, {
                        pricingMode: selectedPricingMode,
                        quantity: effectiveQty,
                        metrics: selectedMetrics,
                      });
                      closeModal();
                    }}
                    disabled={isMetric && (!selectedPrice || !selectedMetrics)}
                    className="w-full font-bold px-5 py-3.5 rounded-xl text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--adm-ink)', color: 'var(--adm-paper)', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <i className="fas fa-shopping-cart text-xs"></i>
                    {isMetric && displayQty !== null
                      ? `В корзину — ${displayQty} ${getUnitLabel(selectedPricingMode)}`
                      : 'Добавить в корзину'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CatalogPage;
