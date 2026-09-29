export function PortalPageHeader({
  code,
  title,
  lead,
  action,
}: {
  code: string;
  title: string;
  lead: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="portalPageHeader">
      <div>
        <span>{code}</span>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
      {action ? <div className="portalPageAction">{action}</div> : null}
    </section>
  );
}

export function PortalEmpty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="portalEmpty">
      <span>KAYIT YOK</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
