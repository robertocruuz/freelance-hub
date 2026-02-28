import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="brand-card p-16 text-center bg-brand-offwhite max-w-lg w-full">
        <h1 className="mb-4 text-8xl font-black italic tracking-tighter uppercase">404</h1>
        <p className="mb-10 text-xl font-bold uppercase tracking-widest text-foreground/60">Oops! Page not found</p>
        <a href="/" className="btn-brand bg-brand-neon inline-block uppercase font-black italic">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
