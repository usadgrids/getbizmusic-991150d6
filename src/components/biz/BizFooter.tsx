export function BizFooter() {
  return (
    <footer className="bg-[#0F2A4A] text-white/80 text-xs text-center py-5 px-4 mt-12 border-t border-[#D4A24C]/30 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 min-w-0">
        <div className="break-words">© {new Date().getFullYear()} BizSpot Directory - National City · Nationwide USA Business Advertising</div>
        <div className="text-white/60 break-words">
          All ads reviewed by our team. No adult, illegal, or misleading content.
        </div>
      </div>
    </footer>
  );
}
