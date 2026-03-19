interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Loading",
  description = "Please wait while data is being prepared.",
}: LoadingStateProps) {
  return (
    <section className="state-card" aria-busy="true" aria-live="polite">
      <div className="state-spinner" />
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
