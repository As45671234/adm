
export interface ProductPrice {
  retail?: number;
  perPiece?: number;
  perM2?: number;
  perM3?: number;
  purchase?: number;
  recommended?: number;
  wholesale_5m?: number;
  wholesale_1m?: number;
  client?: number;
  online?: number;
  ozon?: number;
  note?: string;
}

export interface ProductAttrs {
  thickness_mm?: string | number;
  roll_size_mm?: string;
  pack_area_m2?: number | string;
  pack_volume_m3?: number;
  roll_area_m2?: number | string;
  marking?: string;
  pack_qty?: number;
  density?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  brandOrGroup?: string;
  segment: string;
  unit: string;
  sku?: string;
  image?: string;
  description?: string;
  prices: ProductPrice;
  attrs: ProductAttrs;
  category_id: string;
  inStock: boolean;
}

export type PricingMode = 'piece' | 'm2';

export interface CartMetrics {
  source: 'preset' | 'custom';
  unit: 'м²';
  quantity: number;
  widthM: number;
  heightM: number;
  depthM?: number;
  depthM?: number;
}

export interface Category {
  id: string;
  title: string;
  fields: string[];
  items: Product[];
  image?: string;
}

export interface HomeHeroSlide {
  title: string;
  subtitle: string;
  desc: string;
  img: string;
  color: string;
  badge: string;
}

export interface HomeAboutSlide {
  title: string;
  text: string;
  imageUrl: string;
  bullets: string[];
}

export interface HomeProjectCard {
  title: string;
  area: string;
  text: string;
  image: string;
}

export interface HomeContent {
  heroSlides: HomeHeroSlide[];
  heroButtons: {
    primaryText: string;
    secondaryText: string;
  };
  about: {
    sectionLabel: string;
    title: string;
    slides: HomeAboutSlide[];
  };
  projects: {
    sectionLabel: string;
    title: string;
    description: string;
    cards: HomeProjectCard[];
  };
  contacts: {
    sectionLabel: string;
    title: string;
    description: string;
    phoneLabel: string;
    phoneValue: string;
    workingHours: string;
    addressLabel: string;
    addressValue: string;
    mapTitle: string;
    quickFormTitle: string;
    whatsappTitle: string;
    whatsappText: string;
    whatsappButtonText: string;
    whatsappPhone: string;
    whatsappMessage: string;
    instagramUrl: string;
    instagramLabel: string;
  };
}

export interface CartItem extends Product {
  cartKey: string;
  pricingMode: PricingMode;
  unitPrice: number;
  quantity: number;
  metrics?: CartMetrics;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  comment?: string;
  items: CartItem[];
  total: number;
  createdAt?: string;
  status: 'new' | 'processing' | 'completed' | 'cancelled';
}

export interface AppState {
  categories: Category[];
  cart: CartItem[];
  orders: Order[];
}
