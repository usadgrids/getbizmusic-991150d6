import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Home } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import { FloatingHomeButton, FloatingBackButton } from "@/components/biz/FloatingHomeButton";

export const Route = createFileRoute("/placeholder")({
  head: () => ({
    meta: [
      { title: "Sample Ad Placement — Get Biz Music" },
      {
        name: "description",
        content:
          "This is a sample ad placement showing how your business ad appears in the Get Biz Music streaming rotation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlaceholderPage,
});

function PlaceholderPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0F2A4A] mb-6">
            <Sparkles size={14} />
            Sample Ad Placement
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F2A4A] mb-3">
            This is a Sample Ad Placement
          </h1>
          <p className="text-gray-600 mb-8">
            What you just clicked is a mockup placeholder showing how a real
            business ad appears in the Get Biz Music streaming rotation. Your
            ad could be right here — seen by local listeners every day.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#0F2A4A] text-[#D4A24C] px-6 py-3 text-sm font-bold hover:bg-[#0F2A4A]/90 transition-transform hover:scale-105 shadow-md"
          >
            <Home size={16} />
            Continue Browsing Ads
          </Link>
        </div>
      </main>
      <BizFooter />
      <FloatingHomeButton />
      <FloatingBackButton />
    </div>
  );
}
