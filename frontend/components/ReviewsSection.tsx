import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Review } from '../types';
import { toMediaUrl } from '../services/media';

interface ReviewsSectionProps {
  reviews: Review[];
}

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

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, var(--adm-accent) 0%, var(--adm-accent-dark) 100%)', color: '#fff' }}
    >
      {initials}
    </div>
  );
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  const featured = reviews.filter((r) => r.featured).slice(0, 3);
  // fallback: if no featured, show first 3 active
  const displayed = featured.length > 0 ? featured : reviews.slice(0, 3);

  if (displayed.length === 0) return null;

  return (
    <section className="pb-24" id="partners">
      <div className="container mx-auto px-6">
        {/* Header card */}
        <div className="adm-section p-8 md:p-12 mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,164,76,0.18) 0%, transparent 70%)' }} />
          {/* Decorative quote mark */}
          <div
            className="absolute right-10 top-6 text-[9rem] font-black leading-none select-none pointer-events-none"
            style={{ color: 'rgba(181,135,42,0.08)', fontFamily: 'Georgia, serif' }}
            aria-hidden="true"
          >
            "
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="adm-eyebrow mb-4">Наши проекты</div>
              <h2 className="text-4xl md:text-6xl font-black leading-[0.95] text-[var(--adm-ink)] mb-4">
                Отзывы о наших<br />реализованных проектах
              </h2>
              <p className="text-[var(--adm-ink-soft)] text-lg leading-relaxed max-w-lg">
                Реальные отзывы клиентов, которые уже получили и оценили свою мебель от ADM Mebel.
              </p>
            </div>
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs whitespace-nowrap transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'var(--adm-accent)', color: '#0d0b07', boxShadow: '0 4px 20px rgba(181,135,42,0.35)' }}
            >
              Все отзывы
              <i className="fas fa-arrow-right text-xs"></i>
            </Link>
          </div>
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayed.map((review, i) => (
            <ReviewCard key={review.id} review={review} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const imgUrl = toMediaUrl(review.image);
  const delay = index * 80;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="adm-section flex flex-col p-7 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gold accent top line */}
      <div
        className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full transition-all duration-400 group-hover:left-0 group-hover:right-0"
        style={{ background: 'linear-gradient(90deg, transparent, var(--adm-accent), transparent)' }}
      />

      {/* Big quote mark */}
      <div
        className="absolute top-4 right-5 text-7xl font-black leading-none select-none pointer-events-none"
        style={{ color: 'rgba(181,135,42,0.1)', fontFamily: 'Georgia, serif' }}
        aria-hidden="true"
      >
        "
      </div>

      {/* Stars */}
      {imgUrl && !imgFailed && (
        <div className="mb-4 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--adm-border)' }}>
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
      <div className="mb-4">
        <StarRating rating={review.rating} />
      </div>

      {/* Text */}
      <p
        className="text-[var(--adm-ink)] leading-relaxed mb-6 text-sm flex-grow"
        style={{ fontStyle: 'italic' }}
      >
        {review.text}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
        <InitialsAvatar name={review.authorName} />
        <div>
          <div className="font-black text-sm text-[var(--adm-ink)]">{review.authorName}</div>
          {review.authorRole && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--adm-ink-soft)' }}>{review.authorRole}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewsSection;
