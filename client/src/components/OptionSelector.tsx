interface OptionSelectorProps {
  options: string[];
  onSelect: (option: string) => void;
}

export default function OptionSelector({ options, onSelect }: OptionSelectorProps) {
  return (
    <div className="option-selector">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="option-chip"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
