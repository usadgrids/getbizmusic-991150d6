import { Building2, Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

type Props = {
  citySlug?: string;
  cityName?: string;
  state?: string;
};

export function BizNavbar({ citySlug, cityName, state }: Props) {
  const [open, setOpen] = useState(false);
  const label = cityName
    ? `Get Biz Music - ${cityName}${state ? `, ${state}` : ""}`
    : "Get Biz Music";
  const submitSearch = citySlug ? { city: citySlug } : undefined;
  const pricingSearch = citySlug ? { city: citySlug } : undefined;

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0F2A4A] text-white shadow-lg border-b border-[#D4A24C]/30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        {citySlug ? (
          <Link
            to="/$city"
            params={{ city: citySlug }}
            className="flex min-w-0 items-center gap-2 font-serif text-base sm:text-lg"
          >
            <Building2 size={22} className="text-[#D4A24C] shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ) : (
          <Link to="/" className="flex min-w-0 items-center gap-2 font-serif text-base sm:text-lg">
            <Building2 size={22} className="text-[#D4A24C] shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        )}
        <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
          {citySlug ? (
            <Link to="/$city" params={{ city: citySlug }} className="hover:text-[#D4A24C] transition-colors">
              Home
            </Link>
          ) : (
            <Link to="/" className="hover:text-[#D4A24C] transition-colors">All Cities</Link>
          )}
          <Link
            to="/pricing"
            search={pricingSearch as never}
            className="hover:text-[#D4A24C] transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/submit"
            search={submitSearch as never}
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-4 py-1.5 rounded-md hover:bg-[#e0b266] transition-colors"
          >
            Submit Ad
          </Link>
        </div>
        <button className="sm:hidden shrink-0" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="sm:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-sm">
          {citySlug ? (
            <Link to="/$city" params={{ city: citySlug }} onClick={() => setOpen(false)}>Home</Link>
          ) : (
            <Link to="/" onClick={() => setOpen(false)}>All Cities</Link>
          )}
          <Link
            to="/pricing"
            search={pricingSearch as never}
            onClick={() => setOpen(false)}
          >
            Pricing
          </Link>
          <Link
            to="/submit"
            search={submitSearch as never}
            onClick={() => setOpen(false)}
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-4 py-2 rounded-md text-center"
          >
            Submit Ad
          </Link>
        </div>
      )}
    </nav>
  );
}
