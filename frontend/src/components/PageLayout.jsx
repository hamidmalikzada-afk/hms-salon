export default function PageLayout({
  title,
  description,
  actions,
  children,
  compact = false,
}) {
  return (
    <section className={`page${compact ? " page-compact" : ""}`}>
      <header className={`page-header${compact ? " compact" : ""}`}>
        <div className="page-header-copy">
          <p className="eyebrow">Salon operations workspace</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>

        {actions ? <div className="page-actions">{actions}</div> : null}
      </header>

      {children}
    </section>
  );
}
