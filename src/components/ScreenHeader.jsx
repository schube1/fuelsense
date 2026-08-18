import { useNavigate } from 'react-router-dom';

/** Title + subtitle, with an optional back chevron and a right-hand slot. */
export default function ScreenHeader({ title, subtitle, back, right }) {
  const navigate = useNavigate();

  return (
    <div className="topbar">
      {back && (
        <button className="back" onClick={() => navigate(back)} aria-label="Back">
          ‹
        </button>
      )}
      <div className="topbar-main">
        <h1 className="title">{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
