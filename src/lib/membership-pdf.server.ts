// Generates the personalized Membership Terms & Conditions PDF attached to
// final receipt emails. The terms text is pulled from src/lib/membership-terms.ts —
// the same source the checkout page and /terms/membership render — so future
// edits to the terms flow into future PDFs automatically.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  MEMBERSHIP_TERMS,
  MEMBERSHIP_TERMS_TITLE,
  MEMBERSHIP_TERMS_VERSION,
} from "@/lib/membership-terms";

const NAVY = rgb(0.059, 0.165, 0.29);
const GOLD = rgb(0.831, 0.635, 0.298);
const BODY = rgb(0.13, 0.13, 0.13);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const MAX_W = PAGE_W - MARGIN * 2;

export interface MembershipTermsPdfInput {
  businessName?: string | null;
  receiptNumber: string;
  paymentDate: string;
  ownerName?: string | null;
  amountFormatted?: string | null;
  paymentMethodLabel?: string | null;
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Returns the personalized terms PDF as a base64 string (for Resend attachments). */
export async function buildMembershipTermsPdfBase64(
  input: MembershipTermsPdfInput,
): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(MEMBERSHIP_TERMS_TITLE);
  pdf.setAuthor("GetBizMusic");
  pdf.setSubject(`Membership terms accepted — receipt ${input.receiptNumber}`);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const draw = (
    text: string,
    opts: { font?: any; size?: number; color?: any; gap?: number; indent?: number } = {},
  ) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    const lines = wrap(text, font, size, MAX_W - indent);
    for (const line of lines) {
      if (y < MARGIN + 40) newPage();
      page.drawText(line, {
        x: MARGIN + indent,
        y,
        size,
        font,
        color: opts.color ?? BODY,
      });
      y -= size * 1.35;
    }
    y -= opts.gap ?? 0;
  };

  // Header band
  page.drawRectangle({ x: 0, y: PAGE_H - 96, width: PAGE_W, height: 96, color: NAVY });
  page.drawText("GetBizMusic", {
    x: MARGIN,
    y: PAGE_H - 46,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("AI Business Alliance Membership", {
    x: MARGIN,
    y: PAGE_H - 68,
    size: 11,
    font: regular,
    color: GOLD,
  });
  y = PAGE_H - 130;

  // Personalized record block
  draw(MEMBERSHIP_TERMS_TITLE, { font: bold, size: 14, color: NAVY, gap: 8 });

  const rows: Array<[string, string | null | undefined]> = [
    ["Business", input.businessName || input.ownerName || "—"],
    ["Receipt / Order #", input.receiptNumber],
    ["Payment date", input.paymentDate],
    ["Amount paid", input.amountFormatted ?? null],
    ["Payment method", input.paymentMethodLabel ?? null],
    ["Membership term", "1 year from payment date (does not auto-renew)"],
    ["Terms version", MEMBERSHIP_TERMS_VERSION],
  ];
  for (const [label, value] of rows) {
    if (!value) continue;
    if (y < MARGIN + 40) newPage();
    page.drawText(`${label}:`, { x: MARGIN, y, size: 10, font: bold, color: NAVY });
    const valueLines = wrap(String(value), regular, 10, MAX_W - 130);
    valueLines.forEach((line, i) => {
      page.drawText(line, { x: MARGIN + 130, y: y - i * 13, size: 10, font: regular, color: BODY });
    });
    y -= 13 * Math.max(1, valueLines.length) + 3;
  }

  y -= 10;
  if (y < MARGIN + 40) newPage();
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: GOLD,
  });
  y -= 22;

  draw(
    "These are the exact terms this member agreed to at the time of purchase.",
    { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 12 },
  );

  MEMBERSHIP_TERMS.forEach((section, i) => {
    draw(`${i + 1}. ${section.heading}`, { font: bold, size: 11, color: NAVY, gap: 2 });
    draw(section.body, { size: 10, gap: 10, indent: 12 });
  });

  y -= 6;
  draw(
    "GetBizMusic.com · PO Box 254, National City, CA 91951 · ralph@getbizmusic.com",
    { size: 8, color: rgb(0.45, 0.45, 0.45) },
  );

  const bytes = await pdf.save();
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function membershipTermsPdfFilename(receiptNumber: string) {
  return `GetBizMusic-AI-Business-Alliance-Terms-${receiptNumber}.pdf`;
}
