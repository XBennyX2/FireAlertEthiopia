import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, switchLanguage } = useLanguage();

  const S = {
    wrap: {
      display:        'flex',
      alignItems:     'center',
      background:     '#161616',
      border:         '1px solid #2a2a2a',
      borderRadius:   8,
      overflow:       'hidden',
      flexShrink:     0,
    },
    btn: (active) => ({
      padding:        '0.35rem 0.7rem',
      fontSize:       '0.75rem',
      fontWeight:     active ? 700 : 400,
      fontFamily:     "'DM Sans', sans-serif",
      background:     active
        ? 'linear-gradient(135deg, #e63c2f, #f4820a)'
        : 'transparent',
      color:          active ? '#fff' : '#666',
      border:         'none',
      cursor:         'pointer',
      transition:     'background 0.2s, color 0.2s',
      letterSpacing:  active ? '0.01em' : 0,
    }),
  };

  return (
    <div style={S.wrap}>
      <button
        style={S.btn(language === 'en')}
        onClick={() => switchLanguage('en')}
      >
        EN
      </button>
      <button
        style={S.btn(language === 'am')}
        onClick={() => switchLanguage('am')}
      >
        አማ
      </button>
    </div>
  );
}