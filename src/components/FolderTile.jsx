export default function FolderTile({ item, onOpen }) {
  const previewItems = (item.items || []).slice(0, 4);

  return (
    <button className="folder-tile" onClick={(event) => onOpen(item, event)} onDragStart={(event) => event.preventDefault()} type="button">
      <div className="folder-tile__icon">
        {previewItems.map((entry) => {
          const iconValue = entry.icon || '?';
          const isImage = typeof iconValue === 'string' && /^(https?:\/\/|\/uploads\/|data:)/.test(iconValue);
          const isFavicon =
            entry.iconSource === 'favicon' ||
            (typeof iconValue === 'string' && /google\.com\/s2\/favicons|favicon\.ico|icon\?/i.test(iconValue));
          return (
            <span
              className={`folder-tile__preview ${isFavicon ? 'folder-tile__preview--favicon' : ''}`}
              key={entry.id}
              style={{ background: entry.color === 'transparent' ? 'rgba(255, 255, 255, 0.16)' : entry.color || 'rgba(255, 255, 255, 0.16)' }}
            >
              {isImage ? (
                <img
                  alt={entry.name}
                  className={`folder-tile__image ${isFavicon ? 'folder-tile__image--favicon' : ''}`}
                  src={iconValue}
                  draggable={false}
                />
              ) : (
                <span className="folder-tile__glyph">{iconValue}</span>
              )}
            </span>
          );
        })}
      </div>
      <span className="app-tile__label">{item.name}</span>
    </button>
  );
}