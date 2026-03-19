interface ErrorStateProps {
  title?: string;
  description: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
}: ErrorStateProps) {
  return (
    <section className="state-card state-card-error" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
