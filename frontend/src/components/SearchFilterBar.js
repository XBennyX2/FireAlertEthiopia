export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  filters = [],
  sortOptions = [],
  sortValue,
  onSortChange,
  placeholder = 'Search…',
}) {
  return (
    <div style={{
      display:   'flex',
      gap:       '0.6rem',
      flexWrap:  'wrap',
      marginBottom: '1.25rem',
      alignItems: 'center',
    }}>

      {/* Search input */}
      <div style={{ position:'relative', flex:'1', minWidth:180 }}>
        <span style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', fontSize:'0.85rem', color:'var(--text-dim)', pointerEvents:'none' }}>
          🔍
        </span>
        <input
          className="form-input"
          style={{ paddingLeft:'2.2rem', marginBottom:0 }}
          placeholder={placeholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter selects */}
      {filters.map(filter => (
        <select
          key={filter.key}
          className="form-select"
          value={filter.value}
          onChange={e => filter.onChange(e.target.value)}
          style={{ width:'auto', minWidth:130, marginBottom:0 }}
        >
          <option value="">{filter.placeholder}</option>
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Sort select */}
      {sortOptions.length > 0 && (
        <select
          className="form-select"
          value={sortValue}
          onChange={e => onSortChange(e.target.value)}
          style={{ width:'auto', minWidth:140, marginBottom:0 }}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

    </div>
  );
}