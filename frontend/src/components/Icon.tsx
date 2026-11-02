import {
  Award, BookOpen, Briefcase, Building2, Calendar, CircleHelp, ClipboardList, Clock, Droplets, FileText,
  GraduationCap, HandCoins, HandHeart, Handshake, Heart, HeartPulse, Home, Leaf, Lightbulb, MapPin, Medal,
  Package, Scale, Shield, ShieldCheck, Smile, Sparkles, Sprout, Star, Target, TreePine, Trophy, Users,
  UserRound, Utensils, Baby, Accessibility, Gift, Stethoscope, Activity, Microscope, Syringe, Pill, Hospital,
  Ambulance, Brain, Presentation, BadgeCheck, ScrollText, School, ScanLine, type LucideIcon,
} from "lucide-react";

/** Curated icon set selectable from the dashboard (stored by name). */
export const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  activity: Activity,
  "heart-pulse": HeartPulse,
  microscope: Microscope,
  syringe: Syringe,
  pill: Pill,
  hospital: Hospital,
  ambulance: Ambulance,
  scan: ScanLine,
  brain: Brain,
  presentation: Presentation,
  certificate: ScrollText,
  "badge-check": BadgeCheck,
  school: School,
  heart: Heart,
  "hand-heart": HandHeart,
  handshake: Handshake,
  users: Users,
  user: UserRound,
  home: Home,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  utensils: Utensils,
  droplets: Droplets,
  package: Package,
  gift: Gift,
  "hand-coins": HandCoins,
  baby: Baby,
  accessibility: Accessibility,
  sprout: Sprout,
  leaf: Leaf,
  tree: TreePine,
  lightbulb: Lightbulb,
  target: Target,
  trophy: Trophy,
  award: Award,
  medal: Medal,
  star: Star,
  sparkles: Sparkles,
  shield: Shield,
  "shield-check": ShieldCheck,
  scale: Scale,
  briefcase: Briefcase,
  building: Building2,
  calendar: Calendar,
  clock: Clock,
  "map-pin": MapPin,
  "file-text": FileText,
  clipboard: ClipboardList,
  smile: Smile,
  help: CircleHelp,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, fallback = "sparkles", className = "size-6" }: { name?: string; fallback?: string; className?: string }) {
  const Cmp = ICONS[name ?? ""] ?? ICONS[fallback];
  return <Cmp className={className} aria-hidden="true" />;
}
