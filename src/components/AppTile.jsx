export default function AppTile({ item, onOpen }) {
  const iconValue = item.icon || '?';
  const isImage = typeof iconValue === 'string' && /^(https?:\/\/|\/uploads\/|data:)/.test(iconValue);
  const isFavicon =
    item.iconSource === 'favicon' ||
    (typeof iconValue === 'string' && /google\.com\/s2\/favicons|favicon\.ico|icon\?/i.test(iconValue));

  return (
    <button className="app-tile" onClick={(event) => onOpen(item, event)} onDragStart={(event) => event.preventDefault()} type="button">
      <div
        className={`app-tile__icon ${isFavicon ? 'app-tile__icon--favicon' : ''}`}
        style={{ background: item.color === 'transparent' ? 'transparent' : item.color || '#334155' }}
      >
        {isImage ? <img className={isFavicon ? 'app-tile__image app-tile__image--favicon' : 'app-tile__image'} src={iconValue} alt={item.name} draggable={false} /> : <span>{iconValue}</span>}
      </div>
      <span className="app-tile__label">{item.name}</span>
    </button>
  );
}