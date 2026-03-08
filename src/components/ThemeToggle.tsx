'use client';

type Props = {
  theme: 'dark' | 'light';
  onToggle: () => void;
};

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button className="btn secondary" onClick={onToggle} type="button">
      {theme === 'dark' ? 'ثيم ذهبي ناعم' : 'ثيم أموليد أسود'}
    </button>
  );
}
