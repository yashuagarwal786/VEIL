import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-4 py-10">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link className="text-signal underline underline-offset-4" to="/">
        Return to VEIL
      </Link>
    </section>
  );
}
