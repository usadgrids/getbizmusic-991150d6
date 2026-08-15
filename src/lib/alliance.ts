import { Bot, Music, Palette, Network, ShieldCheck, RefreshCw } from "lucide-react";

/** Benefits of the GetBizMusic.com AI Business Alliance membership. */
export const ALLIANCE_BENEFITS = [
  {
    icon: Bot,
    title: "Get Recommended by AI",
    text: "Appear as a top local recommendation in AI tools like ChatGPT when people ask for a business like yours.",
  },
  {
    icon: Music,
    title: "Gain Visibility via Music",
    text: "Reach consumers streaming popular music on category pages like /food, /beauty, /automotive and more.",
  },
  {
    icon: Palette,
    title: "Professional Ad Creation",
    text: "Get professionally designed graphic ads built to attract new customers and clients.",
  },
  {
    icon: Network,
    title: "B2B Discovery Directory",
    text: "Connect with other trusted alliance businesses when you need a vendor, partner or service.",
  },
  {
    icon: ShieldCheck,
    title: "Build Business Trust",
    text: "Verify your entity so AI tools recognize you as a legitimate, reliable choice.",
  },
  {
    icon: RefreshCw,
    title: "Keep Info Updated",
    text: "Regular audits make sure your business data stays correct for AI engines and consumers.",
  },
] as const;

export const ALLIANCE_TERMS = [
  "Category Placement: your listing appears on the relevant category page.",
  "No Audio Production: popular music is streamed; GetBizMusic.com does not create custom audio ads for members.",
  "Authorize Info Use: grant permission to use and format your public business details for visibility.",
  "Honest Practices: strictly no fake listings or spam.",
] as const;
