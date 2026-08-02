const LoadingSpinner = ({ label = 'Loading workspace…' }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative grid size-12 place-items-center">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-caption font-bold text-primary-foreground shadow-raised">
          CD
        </span>
        <div className="absolute inset-0 animate-spin rounded-2xl border-2 border-primary/15 border-t-primary" />
      </div>
      <p className="text-body font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
