interface OptionSelectorProps {
  options: string[];
  onSelect: (option: string) => void;
}

export default function OptionSelector({ options, onSelect }: OptionSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px 0',
        alignSelf: 'flex-start',
        maxWidth: '85%',
      }}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #0d9488',
            backgroundColor: '#ffffff',
            color: '#0d9488',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0d9488';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#0d9488';
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
