import { Building2, Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function BizNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0F2A4A] text-white shadow-lg border-b border-[#D4A24C]/30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-serif text-lg">
          <Building2 size={22} className="text-[#D4A24C]" />
          <span>BizSpot Directory</span>
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <Link to="/" className="hover:text-[#D4A24C] transition-colors">Home</Link>
          <a href="#featured" className="hover:text-[#D4A24C] transition-colors">Featured</a>
          <a href="#pricing" className="hover:text-[#D4A24C] transition-colors">Pricing</a>
          <Link
            to="/submit"
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-4 py-1.5 rounded-md hover:bg-[#e0b266] transition-colors"
          >
            Submit Ad
          </Link>
        </div>
        <button className="sm:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="sm:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-sm">
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <a href="#featured" onClick={() => setOpen(false)}>Featured</a>
          <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
          <Link
            to="/submit"
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
