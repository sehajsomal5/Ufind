
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  ArrowRight,
  Laptop,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Key,
  Watch,
  Package,
} from 'lucide-react';

import { getCategoryMeta } from '../utils/categoryIcons.js';
import './ItemCard.css';

const ICON_MAP = {
  Laptop,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Key,
  Watch,
  Package,
};

function CategoryPlaceholder({ category }) {
  const meta = getCategoryMeta(category);
  const IconComp = ICON_MAP[meta.icon] ?? Package;

  return (
    <div className="item-card-placeholder" aria-hidden="true">
      <span className="item-card-placeholder-icon">
        <IconComp size={36} color={meta.color} strokeWidth={1.5} />
      </span>
      <span className="item-card-placeholder-label">{category}</span>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';

  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ItemCard({ item }) {
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);

  function handleClick() {
    navigate(`/item/${item.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  const statusLabel =
    item.status === 'lost'
      ? 'Lost'
      : item.status === 'found'
        ? 'Found'
        : 'Recovered';

  return (
    <article
      className="item-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${statusLabel}: ${item.title} at ${item.location}`}
    >
      {item.imageUrl && !imageFailed ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="item-card-image"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <CategoryPlaceholder category={item.category} />
      )}

      <div className="item-card-body">
        <div className="item-card-header">
          <h3 className="item-card-title">{item.title}</h3>
          <span className={`badge badge-${item.status}`}>
            {statusLabel}
          </span>
        </div>

        <p className="item-card-description">{item.description}</p>

        <div className="item-card-meta">
          <span className="item-card-meta-row">
            <MapPin size={15} aria-hidden="true" />
            {item.location}
          </span>

          <span className="item-card-meta-row">
            <Calendar size={15} aria-hidden="true" />
            {formatDate(item.date)}
          </span>
        </div>

        <div className="item-card-footer">
          {item.isSample ? (
            <span className="sample-chip">Sample</span>
          ) : (
            <span />
          )}

          <span className="item-card-view">
            View details <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
