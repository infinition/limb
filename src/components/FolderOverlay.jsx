import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import AppTile from './AppTile.jsx';
import { useState } from 'react';

export default function FolderOverlay({
  availableApps,
  folder,
  folderPage,
  isEditing,
  onAddItem,
  onClose,
  onRemoveItem,
  onRename,
  onReorder,
  onPageChange,
  onOpenItem,
  t
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const items = folder?.items || [];
  const pageCount = Math.max(1, Math.ceil(items.length / 9));
  const start = folderPage * 9;
  const visibleItems = items.slice(start, start + 9);

  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDrop(targetIndex) {
    if (draggedIndex == null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    onReorder(start + draggedIndex, start + targetIndex);
    setDraggedIndex(null);
  }

  return (
    <div className="folder-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="folder-overlay__panel">
        <div className="folder-overlay__header">
          {isEditing ? (
            <input className="folder-overlay__title-input" onChange={(event) => onRename(event.target.value)} value={folder.name} />
          ) : (
            <div className="folder-overlay__title">{folder.name}</div>
          )}
          <button className="icon-button" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="folder-overlay__body">
          {pageCount > 1 ? (
            <button className="folder-overlay__nav" disabled={folderPage === 0} onClick={() => onPageChange(folderPage - 1)} type="button">
              <ChevronLeft size={18} />
            </button>
          ) : <span className="folder-overlay__nav-spacer" />}

          <div className="folder-overlay__grid">
            {visibleItems.map((item, index) => (
              <div
                className={`folder-overlay__cell ${draggedIndex === index ? 'folder-overlay__cell--dragging' : ''}`}
                draggable={isEditing}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => {
                  if (isEditing) {
                    event.preventDefault();
                  }
                }}
                onDragStart={() => handleDragStart(index)}
                onDrop={() => handleDrop(index)}
                key={item.id}
              >
                {isEditing ? (
                  <button className="folder-overlay__remove" onClick={() => onRemoveItem(item.id)} type="button">
                    <Trash2 size={13} />
                  </button>
                ) : null}
                <AppTile item={item} onOpen={onOpenItem} />
              </div>
            ))}
            {!visibleItems.length ? <div className="folder-overlay__empty">{t('folder.empty')}</div> : null}
          </div>

          {pageCount > 1 ? (
            <button className="folder-overlay__nav" disabled={folderPage >= pageCount - 1} onClick={() => onPageChange(folderPage + 1)} type="button">
              <ChevronRight size={18} />
            </button>
          ) : <span className="folder-overlay__nav-spacer" />}
        </div>

        {pageCount > 1 ? (
          <div className="folder-overlay__pagination">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                className={`folder-overlay__dot ${index === folderPage ? 'is-active' : ''}`}
                key={`folder-dot-${index}`}
                onClick={() => onPageChange(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}

        {isEditing ? (
          <div className="folder-overlay__library">
            <div className="folder-overlay__library-title">{t('folder.desktopApps')}</div>
            <div className="folder-overlay__library-grid">
              {availableApps.length ? (
                availableApps.map((app) => (
                  <button className="folder-overlay__library-item" key={app.id} onClick={() => onAddItem(app.id)} type="button">
                    <span className="folder-overlay__library-add">
                      <Plus size={12} />
                    </span>
                    <AppTile item={app} onOpen={() => {}} />
                  </button>
                ))
              ) : (
                <div className="folder-overlay__empty">{t('folder.noDesktopApps')}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}