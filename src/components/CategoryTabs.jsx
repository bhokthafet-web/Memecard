import './CategoryTabs.css';

// A horizontally scrollable tab bar — switching tabs swaps the card grid
// below without leaving the page (no more drill-down/back navigation).
export function CategoryTabs({ categories, activeId, onSelect, canAdd, onAddCategory }) {
  return (
    <div className="category-tabs" role="tablist">
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`category-tab pop-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(category.id)}
          >
            {category.title}
          </button>
        );
      })}

      {canAdd && (
        <button
          type="button"
          className="category-tab category-tab-add pop-btn"
          onClick={onAddCategory}
        >
          + New
        </button>
      )}
    </div>
  );
}
