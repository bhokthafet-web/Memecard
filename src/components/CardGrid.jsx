import { MemeCard } from './MemeCard';
import { BluetoothHelp } from './BluetoothHelp';
import './CardGrid.css';

export function CardGrid({ category, isAdmin, onAddCard, onEditCard, onCopyToWall, onDeleteCard }) {
  return (
    <div>
      <div className="card-grid">
        {category.cards.map((card) => (
          <MemeCard
            key={card.id}
            card={card}
            canEdit={isAdmin || Boolean(card.custom)}
            canAddToWall={!isAdmin && !card.custom}
            canDelete={Boolean(card.custom) || isAdmin}
            onEdit={onEditCard}
            onAddToWall={onCopyToWall}
            onDelete={onDeleteCard}
          />
        ))}

        <button type="button" className="card-tile-add pop-btn" onClick={onAddCard}>
          <span className="card-tile-add-icon" aria-hidden="true">+</span>
          <span className="card-tile-add-label">Add Card</span>
        </button>
      </div>

      <div className="card-grid-help">
        <BluetoothHelp />
      </div>
    </div>
  );
}
