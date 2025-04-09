function FileTypeFilter({ selectedType, onSelect }) {
    const types = ['all', 'docs', 'images', 'videos', 'others'];
  
    return (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            {types.map(type => (
                <button
                    key={type}
                    onClick={() => onSelect(type)}
                    style={{
                        backgroundColor: selectedType === type ? '#007bff' : '#e0e0e0',
                        color: selectedType === type ? 'white' : 'black',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }} >
                    {type}
                </button>
            ))}
        </div>
    );
}

export default FileTypeFilter;