import { Search } from 'lucide-react';
import AppTile from './AppTile.jsx';

export default function SearchOverlay({ items, query, onQueryChange, onClose, onOpenItem, t }) {
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="spotlight">
        <div className="spotlight__bar">
          <Search size={24} />
          <input
            autoFocus
            className="spotlight__input"
            placeholder={t('app.searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="spotlight__results">
          {query && filtered.length === 0 ? <div className="spotlight__empty">{t('search.noResults')}</div> : null}
          {filtered.map((item) => (
            <div className="spotlight__card" key={item.id}>
              <AppTile
                item={item}
                onOpen={(selected) => {
                  onOpenItem(selected);
                  onClose();
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}