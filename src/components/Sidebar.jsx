const Sidebar = ({ items, active, onChange }) => {
  return (
    <aside className="sidebar">
      <div>
        <p className="sidebar-logo">AI Learning</p>
        <p className="sidebar-subtitle">Documents into understanding</p>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "nav-item active" : "nav-item"}
            onClick={() => onChange(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.meta}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
