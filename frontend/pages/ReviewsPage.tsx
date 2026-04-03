import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Review } from '../types';
import { fetchReviews } from '../services/api';
import { toMediaUrl } from '../services/media';

// ─── helpers ────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill={star <= rating ? 'var(--adm-accent)' : 'none'}
          stroke={star <= rating ? 'var(--adm-accent)' : 'var(--adm-border-strong)'}
          strokeWidth="1.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-9 h-9 text-xs' : 'w-12 h-12 text-base';
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-black flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, var(--adm-accent) 0%, var(--adm-accent-dark) 100%)', color: '#fff' }}
    >
      {initials}
    </div>
  );
}

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // youtube.com/watch?v=ID or youtu.be/ID or youtube.com/embed/ID
  const m1 = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`;
  return null;
}

function getInstagramEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;
  return `https://www.instagram.com/reel/${match[1]}/embed`;
}

function getTikTokEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (!match) return null;
  return `https://www.tiktok.com/embed/v2/${match[1]}`;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function getEmbeddedVideo(url: string): { url: string; platform: 'youtube' | 'instagram' | 'tiktok' } | null {
  const yt = getYoutubeEmbedUrl(url);
  if (yt) return { url: yt, platform: 'youtube' };

  const ig = getInstagramEmbedUrl(url);
  if (ig) return { url: ig, platform: 'instagram' };

  const tt = getTikTokEmbedUrl(url);
  if (tt) return { url: tt, platform: 'tiktok' };

  return null;
}

// ─── Text Review Card ────────────────────────────────────────────────────────

function TextReviewCard({ review }: { review: Review }) {
  const imgUrl = toMediaUrl(review.image);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="adm-section flex flex-col p-8 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, var(--adm-accent) 40%, var(--adm-accent) 60%, transparent)' }}
      />

      {/* Decorative quote */}
      <div
        className="absolute top-3 right-4 text-8xl font-black leading-none select-none pointer-events-none"
        style={{ color: 'rgba(181,135,42,0.08)', fontFamily: 'Georgia, serif' }}
        aria-hidden="true"
      >
        "
      </div>

      {/* Stars */}
      {imgUrl && !imgFailed && (
        <div className="mb-5 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--adm-border)' }}>
          <div className="aspect-[16/10] bg-[var(--adm-bg-soft)]">
            <img
              src={imgUrl}
              alt={`Проект клиента ${review.authorName}`}
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          </div>
        </div>
      )}

      {/* Stars */}
      <div className="mb-5 relative z-10">
        <StarRating rating={review.rating} />
      </div>

      {/* Review text */}
      <p className="text-sm leading-relaxed flex-grow mb-6 relative z-10" style={{ color: 'var(--adm-ink)', fontStyle: 'italic' }}>
        "{review.text}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-5 border-t" style={{ borderColor: 'var(--adm-border)' }}>
        <InitialsAvatar name={review.authorName} />
        <div>
          <div className="font-black text-sm" style={{ color: 'var(--adm-ink)' }}>{review.authorName}</div>
          {review.authorRole && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--adm-ink-soft)' }}>{review.authorRole}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video Review Card ───────────────────────────────────────────────────────

function VideoReviewCard({ review }: { review: Review }) {
  const imgUrl = toMediaUrl(review.image);
  const [imgFailed, setImgFailed] = useState(false);
  const embedded = getEmbeddedVideo(review.videoUrl);
  const directVideo = isDirectVideo(review.videoUrl);

  return (
    <div className="adm-section overflow-hidden group transition-all duration-300 hover:-translate-y-1">
      {/* Video */}
      <div className="relative bg-zinc-900 overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {embedded ? (
          <iframe
            src={embedded.url}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            title={`Отзыв — ${review.authorName}`}
          />
        ) : directVideo ? (
          <video
            src={review.videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          /* fallback: raw link */
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--adm-bg-soft)' }}>
            <a
              href={review.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2"
              style={{ color: 'var(--adm-accent)' }}
            >
              <i className="fas fa-play-circle text-5xl"></i>
              <span className="text-xs font-bold uppercase tracking-widest">Смотреть видео</span>
            </a>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6">
        {/* Stars */}
        <div className="mb-3">
          <StarRating rating={review.rating} />
        </div>

        {/* Text */}
        {review.text && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--adm-ink)', fontStyle: 'italic' }}>
            "{review.text}"
          </p>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          {imgUrl && !imgFailed ? (
            <img
              src={imgUrl}
              alt={review.authorName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid var(--adm-border-strong)' }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <InitialsAvatar name={review.authorName} size="sm" />
          )}
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--adm-ink)' }}>{review.authorName}</div>
            {review.authorRole && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--adm-ink-soft)' }}>{review.authorRole}</div>
            )}
          </div>
          <div className="ml-auto">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(181,135,42,0.12)', color: 'var(--adm-accent)' }}
            >
              <i className="fas fa-video text-[8px]"></i>
              Видео
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="adm-section p-16 text-center col-span-full">
      <div
        className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl"
        style={{ background: 'rgba(181,135,42,0.1)', color: 'var(--adm-accent)' }}
      >
        <i className="fas fa-comment-slash"></i>
      </div>
      <div className="text-2xl font-black mb-2" style={{ color: 'var(--adm-ink)' }}>Отзывов пока нет</div>
      <p className="text-sm" style={{ color: 'var(--adm-ink-soft)' }}>Скоро здесь появятся отзывы наших клиентов</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'text' | 'video'>('all');

  useEffect(() => {
    fetchReviews()
      .then((data) => setReviews((data.reviews || []) as Review[]))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reviews.filter((r) => {
    if (filter === 'video') return !!r.videoUrl;
    if (filter === 'text') return !r.videoUrl;
    return true;
  });

  const videoCount = reviews.filter((r) => !!r.videoUrl).length;
  const textCount = reviews.filter((r) => !r.videoUrl).length;

  return (
    <div className="animate-fade-up">
      {/* Hero header */}
      <div className="container mx-auto px-6 pb-4">
        <div className="adm-section p-8 md:p-14 mb-8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div
            className="absolute right-0 top-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,164,76,0.12) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,164,76,0.06) 0%, transparent 70%)' }}
          />

          {/* Giant quote */}
          <div
            className="absolute right-8 top-4 text-[10rem] font-black leading-none select-none pointer-events-none hidden md:block"
            style={{ color: 'rgba(181,135,42,0.07)', fontFamily: 'Georgia, serif' }}
            aria-hidden="true"
          >
            "
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-5 text-xs" style={{ color: 'var(--adm-ink-soft)' }}>
                <Link to="/" className="hover:text-[var(--adm-accent)] transition-colors font-semibold">Главная</Link>
                <i className="fas fa-chevron-right text-[8px]"></i>
                <span style={{ color: 'var(--adm-accent)' }} className="font-bold">Отзывы</span>
              </div>

              <div className="adm-eyebrow mb-4">Отзывы клиентов</div>
              <h1 className="text-4xl md:text-6xl font-black leading-[0.95] mb-5" style={{ color: 'var(--adm-ink)' }}>
                Что говорят<br />наши клиенты
              </h1>
              <p className="text-lg leading-relaxed max-w-lg" style={{ color: 'var(--adm-ink-soft)' }}>
                Каждый отзыв — это реальная история о том, как мы создаём мебель, которая живёт в домах наших клиентов годами.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0">
              <div
                className="rounded-2xl p-5 text-center min-w-[90px]"
                style={{ background: 'var(--adm-bg-soft)', border: '1px solid var(--adm-border)' }}
              >
                <div className="text-3xl font-black" style={{ color: 'var(--adm-accent)' }}>{reviews.length}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Отзывов</div>
              </div>
              {videoCount > 0 && (
                <div
                  className="rounded-2xl p-5 text-center min-w-[90px]"
                  style={{ background: 'var(--adm-bg-soft)', border: '1px solid var(--adm-border)' }}
                >
                  <div className="text-3xl font-black" style={{ color: 'var(--adm-accent)' }}>{videoCount}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Видео</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        {reviews.length > 0 && (videoCount > 0 || textCount > 0) && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {([
              { key: 'all', label: 'Все', count: reviews.length },
              { key: 'text', label: 'Текстовые', count: textCount },
              ...(videoCount > 0 ? [{ key: 'video', label: 'Видео', count: videoCount }] : []),
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                style={
                  filter === key
                    ? { background: 'var(--adm-accent)', color: '#0d0b07', boxShadow: '0 4px 14px rgba(181,135,42,0.3)' }
                    : { background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }
                }
              >
                {label}
                <span
                  className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md font-black"
                  style={
                    filter === key
                      ? { background: 'rgba(0,0,0,0.15)', color: '#0d0b07' }
                      : { background: 'var(--adm-bg-soft)', color: 'var(--adm-ink-soft)' }
                  }
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-3xl h-64 animate-pulse"
                style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              filtered.map((review) =>
                review.videoUrl ? (
                  <VideoReviewCard key={review.id} review={review} />
                ) : (
                  <TextReviewCard key={review.id} review={review} />
                )
              )
            )}
          </div>
        )}

        {/* CTA bottom */}
        <div className="adm-section text-center p-10 mt-12">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: 'rgba(181,135,42,0.12)', color: 'var(--adm-accent)' }}
          >
            <i className="fas fa-couch"></i>
          </div>
          <h3 className="text-2xl md:text-3xl font-black mb-3" style={{ color: 'var(--adm-ink)' }}>Хотите стать следующим?</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--adm-ink-soft)' }}>
            Закажите мебель у нас — и поделитесь своим опытом. Уверены, вы будете довольны.
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.03]"
            style={{ background: 'var(--adm-accent)', color: '#0d0b07', boxShadow: '0 4px 20px rgba(181,135,42,0.35)' }}
          >
            Смотреть каталог
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
