import './CategoryTabs.css';

// A horizontally scrollable tab bar — switching tabs swaps the card grid
// below without leaving the page (no more drill-down/back navigation).
export function CategoryTabs({ categories, activeId, onSelect }) {
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
            <span aria-hidden="true">{category.emoji}</span>
            {category.title}
          </button>
        );
      })}
    </div>
  );
}
