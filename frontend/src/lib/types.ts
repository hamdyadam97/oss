export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export interface SiteSettings {
  name: string;
  name_en: string;
  tagline: string;
  tagline_en: string;
  logo: string | null;
  logo_light: string | null;
  primary_color: string;
  secondary_color: string;
  license_number: string;
  supervisor: string;
  supervisor_en: string;
  founded_year: number | null;
  about_short: string;
  about_short_en: string;
  about_full: string;
  about_full_en: string;
  vision: string;
  vision_en: string;
  mission: string;
  mission_en: string;
  about_image: string | null;
  org_structure_image: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  address_en: string;
  working_hours: string;
  working_hours_en: string;
  map_url: string;
  map_embed_url: string;
  x_url: string;
  instagram_url: string;
  snapchat_url: string;
  linkedin_url: string;
  youtube_url: string;
  tiktok_url: string;
  facebook_url: string;
  donations_enabled: boolean;
  donation_url?: string;
  donation_note?: string;
  donation_note_en?: string;
  bank_name?: string;
  bank_account_name?: string;
  iban?: string;
  english_enabled: boolean;
  seo_description: string;
  seo_description_en: string;
  seo_keywords: string;
  footer_pages: { slug: string; title: string; title_en: string }[];
  has_services: boolean;
  has_volunteering: boolean;
  has_membership: boolean;
  has_courses: boolean;
}

export type CourseKind = "course" | "workshop" | "conference" | "symposium" | "webinar";

export interface CourseSummary {
  id: number;
  kind: CourseKind;
  title: string;
  title_en: string;
  slug: string;
  summary: string;
  summary_en: string;
  cover: string | null;
  start_datetime: string;
  end_datetime: string;
  location: string;
  is_online: boolean;
  seats: number | null;
  seats_remaining: number | null;
  is_registration_open: boolean;
  cme_hours: string | null;
  fee: string | null;
}

export interface Course extends CourseSummary {
  description: string;
  description_en: string;
  objectives: string;
  objectives_en: string;
  target_audience: string;
  target_audience_en: string;
  speakers: string;
  registration_deadline: string | null;
  requires_approval: boolean;
  accreditation: string;
  members_fee: string | null;
  certificate_enabled: boolean;
}

export interface MembershipType {
  id: number;
  title: string;
  title_en: string;
  slug: string;
  description: string;
  description_en: string;
  eligibility: string;
  eligibility_en: string;
  benefits: string;
  benefits_en: string;
  fee: string | null;
  duration_months: number;
  requires_license: boolean;
  icon: string;
}

export interface Certificate {
  code: string;
  full_name: string;
  full_name_en: string;
  course_title: string;
  course_title_en: string;
  course_kind: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  is_online: boolean;
  cme_hours: string | null;
  accreditation: string;
  issued_at: string;
}

export interface Banner {
  id: number;
  layout: "image" | "brand" | "artwork";
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  image: string | null;
  image_mobile: string | null;
  fit: "cover" | "contain";
  button_text: string;
  button_text_en: string;
  button_link: string;
}

export interface Statistic {
  id: number;
  label: string;
  label_en: string;
  value: number;
  prefix: string;
  suffix: string;
  suffix_en: string;
  icon: string;
  description: string;
  description_en: string;
  as_of: string | null;
}

export interface Partner {
  id: number;
  name: string;
  name_en: string;
  kind: "strategic" | "partner" | "supporter" | "sponsor";
  logo: string;
  url: string;
  description: string;
}

export type ProgramStatus = "ongoing" | "completed" | "upcoming";

export interface ProgramSummary {
  id: number;
  kind: "program" | "training" | "project" | "initiative";
  title: string;
  title_en: string;
  slug: string;
  summary: string;
  summary_en: string;
  cover: string | null;
  icon: string;
  status: ProgramStatus;
  start_date: string | null;
  end_date: string | null;
  beneficiaries_count: number | null;
  is_featured: boolean;
}

export interface Program extends ProgramSummary {
  description: string;
  description_en: string;
  goals: string;
  goals_en: string;
  target_groups: string;
  target_groups_en: string;
  results: string;
  results_en: string;
  images: { id: number; image: string; caption: string }[];
  partners: Partner[];
}

export type PostKind = "news" | "event" | "announcement" | "publication";

export interface PostSummary {
  id: number;
  kind: PostKind;
  title: string;
  title_en: string;
  slug: string;
  excerpt: string;
  excerpt_en: string;
  cover: string | null;
  event_date: string | null;
  event_location: string;
  published_at: string;
  is_featured: boolean;
}

export interface Post extends PostSummary {
  body: string;
  body_en: string;
  attachment: string | null;
  program: ProgramSummary | null;
}

export interface Album {
  id: number;
  title: string;
  title_en: string;
  slug: string;
  description: string;
  cover: string | null;
  date: string;
  items_count: number;
  items?: { id: number; kind: "image" | "video"; image: string | null; video_url: string; caption: string }[];
}

export interface DocumentItem {
  id: number;
  category: string;
  title: string;
  title_en: string;
  description: string;
  year: number | null;
  file: string;
  published_at: string;
}

export interface AboutItem {
  id: number;
  kind: "goal" | "value";
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  icon: string;
}

export interface BoardMember {
  id: number;
  kind: "board" | "executive";
  name: string;
  name_en: string;
  position: string;
  position_en: string;
  photo: string | null;
  bio: string;
  bio_en: string;
}

export interface Faq {
  id: number;
  question: string;
  question_en: string;
  answer: string;
  answer_en: string;
}

export interface ExtraField {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "boolean";
  required?: boolean;
  options?: string[];
}

export interface Service {
  id: number;
  title: string;
  title_en: string;
  slug: string;
  summary: string;
  summary_en: string;
  description: string;
  description_en: string;
  eligibility: string;
  eligibility_en: string;
  required_documents: string;
  required_documents_en: string;
  icon: string;
  requires_attachment: boolean;
  extra_fields: ExtraField[];
}

export interface Opportunity {
  id: number;
  title: string;
  title_en: string;
  slug: string;
  description: string;
  description_en: string;
  requirements: string;
  requirements_en: string;
  location: string;
  is_remote: boolean;
  start_date: string | null;
  end_date: string | null;
  hours: number | null;
  seats: number | null;
}

export interface HomeData {
  banners: Banner[];
  statistics: Statistic[];
  programs: ProgramSummary[];
  posts: PostSummary[];
  upcoming_event: PostSummary | null;
  courses: CourseSummary[];
  opportunities: Opportunity[];
  services: Service[];
  partners: Partner[];
}
