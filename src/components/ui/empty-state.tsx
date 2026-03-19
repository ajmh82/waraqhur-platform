interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="state-card">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
