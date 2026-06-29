import { Check, Image as ImageIcon, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PricingBanner() {
  return (
    <section id="pricing" className="my-10">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F2A4A]">
          Simple, One-Time Annual Pricing
        </h2>
        <p className="text-sm text-gray-700 mt-2 max-w-2xl mx-auto">
          <strong>Really Special Introductory Limited Time Offer.</strong>
          <em> (Prices may change.)</em>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-[#0F2A4A]">
            <ImageIcon size={20} />
            <h3 className="font-semibold">Standard Image Ad</h3>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[#0F2A4A]">$12</span>
            <span className="text-gray-500 text-sm">/ year</span>
          </div>
          <p className="text-xs text-[#D4A24C] font-semibold mt-1">Intro offer</p>
          <p className="text-xs text-gray-500 mt-1">7 seconds per rotation</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" /> Appears in main image carousel</li>
            <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" /> Clickable to your website</li>
            <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" /> 1 full year of exposure</li>
          </ul>
          <Link
            to="/submit"
            search={{ plan: "image_5" }}
            className="mt-5 inline-block w-full text-center bg-[#0F2A4A] text-white font-semibold py-2.5 rounded-md hover:bg-[#163864] transition-colors"
          >
            Get Started — $12
          </Link>
        </div>
        <div className="bg-[#0F2A4A] border-2 border-[#D4A24C] rounded-2xl p-6 shadow-lg text-white relative">
          <div className="absolute -top-3 right-4 bg-[#D4A24C] text-[#0F2A4A] text-[10px] font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </div>
          <div className="flex items-center gap-2 text-[#D4A24C]">
            <Sparkles size={20} />
            <h3 className="font-semibold">Featured Slider Ad</h3>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">$12</span>
            <span className="text-white/70 text-sm">/ year</span>
          </div>
          <p className="text-xs text-[#D4A24C] font-semibold mt-1">$1/month — intro offer</p>
          <p className="text-xs text-white/70 mt-1">10 seconds per rotation</p>
          <ul className="mt-4 space-y-2 text-sm text-white/90">
            <li className="flex gap-2"><Check size={16} className="text-[#D4A24C] shrink-0 mt-0.5" /> Twice the display time</li>
            <li className="flex gap-2"><Check size={16} className="text-[#D4A24C] shrink-0 mt-0.5" /> Featured slider placement</li>
            <li className="flex gap-2"><Check size={16} className="text-[#D4A24C] shrink-0 mt-0.5" /> Highlighted with gold border</li>
            <li className="flex gap-2"><Check size={16} className="text-[#D4A24C] shrink-0 mt-0.5" /> 1 full year of exposure</li>
          </ul>
          <Link
            to="/submit"
            search={{ plan: "slider_10" }}
            className="mt-5 inline-block w-full text-center bg-[#D4A24C] text-[#0F2A4A] font-semibold py-2.5 rounded-md hover:bg-[#e0b266] transition-colors"
          >
            Get Featured — $12
          </Link>
        </div>
      </div>
    </section>
  );
}
