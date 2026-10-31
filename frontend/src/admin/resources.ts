/**
 * Declarative description of every dashboard resource. The generic list/form
 * screens render from these definitions, so adding a model to the dashboard
 * is a matter of adding an entry here.
 */
import { ICON_NAMES } from "@/components/Icon";
import { DOC_CATEGORIES } from "@/pages/Governance";

export type Option = { value: string; label: string };

export type FieldType =
  | "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "image" | "file"
  | "select" | "fk" | "m2m" | "json" | "color" | "icon" | "url" | "email" | "slug" | "password" | "roles";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  /** For fk/m2m: admin endpoint key of the related resource. */
  resource?: string;
  optionLabel?: string;
  help?: string;
  /** Has an `<name>_en` English twin. */
  en?: boolean;
  full?: boolean;
  default?: unknown;
  section?: string;
}

export interface ColumnDef {
  name: string;
  label: string;
  type?: "image" | "boolean" | "date" | "datetime" | "choice" | "text";
  options?: Option[];
}

export interface ResourceDef {
  key: string;
  title: string;
  singular: string;
  model: string;
  group: string;
  icon: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  /** `resource` loads the options from another admin endpoint (e.g. courses). */
  filters?: { name: string; label: string; options: Option[]; resource?: string; optionLabel?: string }[];
  children?: { resource: string; fk: string; title: string }[];
  /** Public submissions: read-only data + workflow fields. */
  submission?: boolean;
  /** Endpoint without an id (single object). */
  singleton?: boolean;
  canCreate?: boolean;
  /** Statuses that can be applied to several selected rows at once. */
  bulkStatuses?: Option[];
  /** Offers a CSV export of the filtered list. */
  exportable?: boolean;
  /** Extra POST actions on a single record, e.g. renew. */
  detailActions?: { action: string; label: string; confirm: string }[];
}

const opts = (pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

export const ICON_OPTIONS = ICON_NAMES.map((n) => ({ value: n, label: n }));
const PUBLISHED: FieldDef = { name: "is_published", label: "منشور", type: "boolean", default: true };
const ORDER: FieldDef = { name: "order", label: "الترتيب", type: "number", default: 0 };
const PUBLISHED_COL: ColumnDef = { name: "is_published", label: "منشور", type: "boolean" };
const PUBLISHED_FILTER = { name: "is_published", label: "النشر", options: opts([["true", "منشور"], ["false", "غير منشور"]]) };

export const PROGRAM_STATUS = opts([["ongoing", "قائم"], ["completed", "مكتمل"], ["upcoming", "قادم"]]);
export const PROGRAM_KIND = opts([["program", "برنامج"], ["training", "برنامج تدريبي"], ["project", "مشروع"], ["initiative", "مبادرة"]]);
export const POST_KIND = opts([["news", "خبر"], ["event", "فعالية"], ["announcement", "إعلان"], ["publication", "منشور/إصدار"]]);
export const PARTNER_KIND = opts([["strategic", "شريك استراتيجي"], ["partner", "شريك"], ["supporter", "داعم"], ["sponsor", "راعٍ"]]);
export const DOC_CATEGORY = DOC_CATEGORIES.map((c) => ({ value: c.value, label: c.ar }));

export const SERVICE_STATUS = opts([
  ["new", "جديد"], ["under_review", "قيد الدراسة"], ["needs_info", "بحاجة لاستكمال بيانات"],
  ["approved", "مقبول"], ["rejected", "مرفوض"], ["completed", "مكتمل"],
]);
export const VOLUNTEER_STATUS = opts([
  ["new", "جديد"], ["under_review", "قيد المراجعة"], ["interview", "مقابلة"],
  ["accepted", "مقبول"], ["rejected", "غير مقبول"], ["completed", "أنهى التطوع"],
]);
export const PARTNERSHIP_STATUS = opts([["new", "جديد"], ["under_review", "قيد الدراسة"], ["accepted", "مقبول"], ["declined", "معتذر عنه"]]);
export const PARTNERSHIP_KIND = opts([["partnership", "شراكة"], ["sponsorship", "رعاية"], ["in_kind", "دعم عيني"], ["csr", "مسؤولية اجتماعية"], ["other", "أخرى"]]);
export const MESSAGE_STATUS = opts([["new", "جديدة"], ["in_progress", "قيد المتابعة"], ["closed", "مغلقة"]]);
export const COURSE_KIND = opts([
  ["course", "دورة تدريبية"], ["workshop", "ورشة عمل"], ["conference", "مؤتمر"], ["symposium", "ندوة / لقاء علمي"], ["webinar", "محاضرة عن بعد"],
]);
export const REGISTRATION_STATUS = opts([
  ["pending", "بانتظار التأكيد"], ["confirmed", "مؤكد"], ["waitlisted", "قائمة الانتظار"],
  ["cancelled", "ملغى"], ["attended", "حضر"], ["absent", "لم يحضر"],
]);
export const MEMBERSHIP_STATUS = opts([
  ["pending", "طلب جديد"], ["under_review", "قيد الدراسة"], ["needs_info", "بحاجة لاستكمال بيانات"],
  ["active", "عضوية سارية"], ["rejected", "مرفوض"], ["suspended", "موقوفة"], ["cancelled", "ملغاة"],
]);
export const PROFESSION = opts([
  ["physician", "طبيب"], ["dentist", "طبيب أسنان"], ["nurse", "تمريض"], ["midwife", "قبالة قانونية"], ["pharmacist", "صيدلي"],
  ["allied", "تخصصات صحية مساندة"], ["admin", "إدارة صحية"], ["student", "طالب / متدرب"], ["other", "أخرى"],
]);

export const RESOURCES: ResourceDef[] = [
  // ------------------------------------------------------------ settings
  {
    key: "settings", title: "إعدادات الموقع", singular: "الإعدادات", model: "cms.sitesettings", group: "الإعدادات",
    icon: "settings", singleton: true, columns: [],
    fields: [
      { name: "name", label: "اسم الجمعية", type: "text", required: true, en: true, section: "الهوية" },
      { name: "tagline", label: "الشعار النصي", type: "text", en: true, section: "الهوية" },
      { name: "logo", label: "الشعار", type: "image", section: "الهوية" },
      { name: "logo_light", label: "شعار للخلفيات الداكنة", type: "image", section: "الهوية" },
      { name: "primary_color", label: "اللون الأساسي", type: "color", section: "الهوية" },
      { name: "secondary_color", label: "اللون الثانوي", type: "color", section: "الهوية" },
      { name: "license_number", label: "رقم الترخيص", type: "text", section: "الترخيص" },
      { name: "supervisor", label: "جهة الإشراف", type: "text", en: true, section: "الترخيص" },
      { name: "founded_year", label: "سنة التأسيس", type: "number", section: "الترخيص" },
      { name: "about_short", label: "نبذة مختصرة", type: "textarea", en: true, full: true, section: "عن الجمعية" },
      { name: "about_full", label: "من نحن", type: "textarea", en: true, full: true, section: "عن الجمعية" },
      { name: "vision", label: "الرؤية", type: "textarea", en: true, section: "عن الجمعية" },
      { name: "mission", label: "الرسالة", type: "textarea", en: true, section: "عن الجمعية" },
      { name: "about_image", label: "صورة تعريفية", type: "image", section: "عن الجمعية" },
      { name: "org_structure_image", label: "الهيكل التنظيمي", type: "image", section: "عن الجمعية" },
      { name: "phone", label: "الهاتف", type: "text", section: "التواصل" },
      { name: "whatsapp", label: "واتساب", type: "text", section: "التواصل" },
      { name: "email", label: "البريد الإلكتروني", type: "email", section: "التواصل" },
      { name: "address", label: "العنوان", type: "text", en: true, section: "التواصل" },
      { name: "working_hours", label: "ساعات العمل", type: "text", en: true, section: "التواصل" },
      { name: "map_url", label: "رابط الخريطة", type: "url", section: "التواصل" },
      { name: "map_embed_url", label: "رابط تضمين الخريطة (Google Maps embed)", type: "url", section: "التواصل" },
      { name: "x_url", label: "X (تويتر)", type: "url", section: "التواصل الاجتماعي" },
      { name: "instagram_url", label: "إنستغرام", type: "url", section: "التواصل الاجتماعي" },
      { name: "snapchat_url", label: "سناب شات", type: "url", section: "التواصل الاجتماعي" },
      { name: "tiktok_url", label: "تيك توك", type: "url", section: "التواصل الاجتماعي" },
      { name: "youtube_url", label: "يوتيوب", type: "url", section: "التواصل الاجتماعي" },
      { name: "linkedin_url", label: "لينكدإن", type: "url", section: "التواصل الاجتماعي" },
      { name: "facebook_url", label: "فيسبوك", type: "url", section: "التواصل الاجتماعي" },
      { name: "donations_enabled", label: "تفعيل التبرعات (بعد استكمال التصاريح)", type: "boolean", section: "التبرعات" },
      { name: "donation_url", label: "رابط منصة التبرع المرخصة", type: "url", section: "التبرعات" },
      { name: "donation_note", label: "ملاحظة التبرع", type: "textarea", en: true, section: "التبرعات" },
      { name: "bank_name", label: "اسم البنك", type: "text", section: "التبرعات" },
      { name: "bank_account_name", label: "اسم الحساب", type: "text", section: "التبرعات" },
      { name: "iban", label: "الآيبان", type: "text", section: "التبرعات" },
      { name: "english_enabled", label: "تفعيل اللغة الإنجليزية", type: "boolean", section: "SEO والخيارات" },
      { name: "seo_description", label: "وصف الموقع لمحركات البحث", type: "textarea", en: true, section: "SEO والخيارات" },
      { name: "seo_keywords", label: "الكلمات المفتاحية", type: "text", section: "SEO والخيارات" },
      { name: "privacy_contact_email", label: "بريد مسؤول حماية البيانات", type: "email", section: "SEO والخيارات" },
    ],
  },
  {
    key: "banners", title: "البنرات", singular: "بانر", model: "cms.banner", group: "الصفحات والمحتوى", icon: "image",
    columns: [{ name: "image", label: "", type: "image" }, { name: "title", label: "العنوان" }, { name: "order", label: "الترتيب" }, PUBLISHED_COL],
    fields: [
      {
        name: "layout", label: "التصميم", type: "select", default: "image",
        options: opts([
          ["image", "صورة خلفية مع نص"],
          ["brand", "هوية الجمعية (الشعار + العنوان)"],
          ["artwork", "تصميم جاهز (الصورة كاملة كما هي)"],
        ]),
        help: "هوية الجمعية: الكلمة الأخيرة من العنوان بالذهبي. التصميم الجاهز: الصورة تحتوي النص، ويُستخدم العنوان والوصف نصًا بديلًا ويظهران تحت الصورة على الجوال، والبانر كله رابط.",
      },
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "subtitle", label: "الوصف", type: "textarea", en: true },
      { name: "image", label: "الصورة (للتصميم الجاهز يُفضَّل مقاس عريض نحو 1920×700، والشعار والنص والزر في المنتصف)", type: "image" },
      { name: "image_mobile", label: "صورة للجوال والأجهزة اللوحية (اختياري)", type: "image" },
      {
        name: "fit", label: "طريقة عرض التصميم الجاهز", type: "select", default: "cover",
        options: opts([
          ["cover", "ملء عرض الشاشة (يُقص جزء من الأعلى والأسفل)"],
          ["contain", "التصميم كاملًا دون قص"],
        ]),
        help: "البانر أقصر من التصميم الأصلي. اختر «كاملًا» إن كان في أعلى التصميم أو أسفله شعار أو زر لا يجوز قصه.",
      },
      { name: "button_text", label: "نص الزر", type: "text", en: true },
      { name: "button_link", label: "رابط الزر", type: "text", help: "رابط داخلي مثل /volunteer أو رابط خارجي" },
      ORDER, PUBLISHED,
    ],
  },
  {
    key: "pages", title: "الصفحات", singular: "صفحة", model: "cms.page", group: "الصفحات والمحتوى", icon: "file",
    columns: [{ name: "title", label: "العنوان" }, { name: "slug", label: "الرابط" }, { name: "show_in_footer", label: "في التذييل", type: "boolean" }, PUBLISHED_COL],
    fields: [
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug", help: "يُولّد تلقائيًا من العنوان إن تُرك فارغًا" },
      { name: "body", label: "المحتوى", type: "textarea", required: true, en: true, full: true },
      { name: "seo_description", label: "وصف SEO", type: "text" },
      { name: "show_in_footer", label: "إظهار في التذييل", type: "boolean" },
      PUBLISHED,
    ],
  },
  {
    key: "about-items", title: "الأهداف والقيم", singular: "عنصر", model: "cms.aboutitem", group: "الصفحات والمحتوى", icon: "target",
    columns: [{ name: "kind", label: "النوع", type: "choice", options: opts([["goal", "هدف"], ["value", "قيمة"]]) }, { name: "title", label: "العنوان" }, { name: "order", label: "الترتيب" }, PUBLISHED_COL],
    filters: [{ name: "kind", label: "النوع", options: opts([["goal", "أهداف"], ["value", "قيم"]]) }],
    fields: [
      { name: "kind", label: "النوع", type: "select", required: true, options: opts([["goal", "هدف استراتيجي"], ["value", "قيمة"]]) },
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "description", label: "الوصف", type: "textarea", en: true },
      { name: "icon", label: "الأيقونة", type: "icon" },
      ORDER, PUBLISHED,
    ],
  },
  {
    key: "board-members", title: "الهيئة الإدارية", singular: "عضو", model: "cms.boardmember", group: "الصفحات والمحتوى", icon: "users",
    columns: [{ name: "photo", label: "", type: "image" }, { name: "name", label: "الاسم" }, { name: "position", label: "المنصب" }, { name: "kind", label: "الفئة", type: "choice", options: opts([["board", "الهيئة الإدارية"], ["executive", "الإدارة التنفيذية"]]) }],
    filters: [{ name: "kind", label: "الفئة", options: opts([["board", "الهيئة الإدارية"], ["executive", "الإدارة التنفيذية"]]) }],
    fields: [
      { name: "kind", label: "الفئة", type: "select", required: true, default: "board", options: opts([["board", "الهيئة الإدارية"], ["executive", "الإدارة التنفيذية"]]) },
      { name: "name", label: "الاسم", type: "text", required: true, en: true },
      { name: "position", label: "المنصب", type: "text", required: true, en: true },
      { name: "photo", label: "الصورة", type: "image" },
      { name: "bio", label: "نبذة", type: "textarea", en: true },
      ORDER, PUBLISHED,
    ],
  },
  {
    key: "faqs", title: "الأسئلة الشائعة", singular: "سؤال", model: "cms.faq", group: "الصفحات والمحتوى", icon: "help",
    columns: [{ name: "question", label: "السؤال" }, { name: "order", label: "الترتيب" }, PUBLISHED_COL],
    fields: [
      { name: "question", label: "السؤال", type: "text", required: true, en: true, full: true },
      { name: "answer", label: "الإجابة", type: "textarea", required: true, en: true, full: true },
      ORDER, PUBLISHED,
    ],
  },
  // ------------------------------------------------------------ training & membership
  {
    key: "courses", title: "الدورات والفعاليات", singular: "دورة/فعالية", model: "professional.course", group: "التدريب والعضوية", icon: "graduation",
    columns: [
      { name: "cover", label: "", type: "image" }, { name: "title", label: "العنوان" }, { name: "kind", label: "النوع", type: "choice", options: COURSE_KIND },
      { name: "start_datetime", label: "البداية", type: "datetime" }, { name: "seats_taken", label: "المسجلون" }, { name: "seats", label: "المقاعد" },
      { name: "registration_open", label: "التسجيل", type: "boolean" }, PUBLISHED_COL,
    ],
    filters: [{ name: "kind", label: "النوع", options: COURSE_KIND }, PUBLISHED_FILTER],
    fields: [
      { name: "kind", label: "النوع", type: "select", options: COURSE_KIND, default: "course", section: "البيانات الأساسية" },
      { name: "title", label: "العنوان", type: "text", required: true, en: true, section: "البيانات الأساسية" },
      { name: "slug", label: "المعرف في الرابط", type: "slug", section: "البيانات الأساسية" },
      { name: "summary", label: "ملخص", type: "textarea", required: true, en: true, full: true, section: "البيانات الأساسية" },
      { name: "description", label: "الوصف", type: "textarea", en: true, full: true, section: "البيانات الأساسية" },
      { name: "objectives", label: "الأهداف التعليمية (هدف في كل سطر)", type: "textarea", en: true, section: "البيانات الأساسية" },
      { name: "target_audience", label: "الفئة المستهدفة (فئة في كل سطر)", type: "textarea", en: true, section: "البيانات الأساسية" },
      { name: "speakers", label: "المتحدثون (كل سطر: الاسم — الصفة)", type: "textarea", full: true, section: "البيانات الأساسية" },
      { name: "cover", label: "الغلاف", type: "image", section: "البيانات الأساسية" },
      { name: "program", label: "البرنامج المرتبط", type: "fk", resource: "programs", optionLabel: "title", section: "البيانات الأساسية" },
      { name: "start_datetime", label: "البداية", type: "datetime", required: true, section: "الموعد والمكان" },
      { name: "end_datetime", label: "النهاية", type: "datetime", required: true, section: "الموعد والمكان" },
      { name: "location", label: "المكان", type: "text", section: "الموعد والمكان" },
      { name: "is_online", label: "عن بعد", type: "boolean", section: "الموعد والمكان" },
      { name: "seats", label: "عدد المقاعد (فارغ = غير محدود)", type: "number", section: "التسجيل" },
      { name: "registration_deadline", label: "آخر موعد للتسجيل", type: "datetime", section: "التسجيل" },
      { name: "registration_open", label: "التسجيل مفتوح", type: "boolean", default: true, section: "التسجيل" },
      { name: "requires_approval", label: "التسجيل يتطلب موافقة المسؤول", type: "boolean", section: "التسجيل" },
      { name: "fee", label: "الرسوم (دينار، فارغ = مجاني)", type: "number", section: "التسجيل" },
      { name: "members_fee", label: "رسوم الأعضاء (دينار)", type: "number", section: "التسجيل" },
      { name: "cme_hours", label: "ساعات التطوير المهني المستمر (CPD)", type: "number", section: "الاعتماد والشهادات" },
      { name: "accreditation", label: "رقم/جهة الاعتماد", type: "text", section: "الاعتماد والشهادات" },
      { name: "certificate_enabled", label: "إصدار شهادات حضور تلقائيًا للحاضرين", type: "boolean", default: true, section: "الاعتماد والشهادات" },
      { ...PUBLISHED, section: "الاعتماد والشهادات" },
    ],
  },
  {
    key: "course-registrations", title: "المسجلون في الدورات", singular: "تسجيل", model: "professional.courseregistration", group: "التدريب والعضوية", icon: "inbox",
    submission: true, canCreate: false, exportable: true,
    bulkStatuses: REGISTRATION_STATUS.filter((o) => ["confirmed", "attended", "absent", "cancelled"].includes(o.value)),
    columns: [
      { name: "tracking_code", label: "رقم التسجيل" }, { name: "full_name", label: "الاسم" }, { name: "course_title", label: "الدورة" },
      { name: "profession", label: "المهنة", type: "choice", options: PROFESSION }, { name: "status", label: "الحالة", type: "choice", options: REGISTRATION_STATUS },
      { name: "certificate_code", label: "الشهادة" }, { name: "created_at", label: "التاريخ", type: "date" },
    ],
    filters: [
      { name: "course", label: "الدورة", options: [], resource: "courses", optionLabel: "title" },
      { name: "status", label: "الحالة", options: REGISTRATION_STATUS },
      { name: "profession", label: "المهنة", options: PROFESSION },
    ],
    fields: [{ name: "status", label: "الحالة", type: "select", options: REGISTRATION_STATUS }],
  },
  {
    key: "membership-types", title: "فئات العضوية", singular: "فئة عضوية", model: "professional.membershiptype", group: "التدريب والعضوية", icon: "idcard",
    columns: [{ name: "title", label: "الفئة" }, { name: "fee", label: "الرسوم" }, { name: "duration_months", label: "المدة (شهر)" }, { name: "members_count", label: "الأعضاء الساريون" }, { name: "is_active", label: "متاحة", type: "boolean" }],
    fields: [
      { name: "title", label: "اسم الفئة", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "description", label: "الوصف", type: "textarea", en: true, full: true },
      { name: "benefits", label: "المزايا (ميزة في كل سطر)", type: "textarea", en: true },
      { name: "eligibility", label: "شروط الانضمام (شرط في كل سطر)", type: "textarea", en: true },
      { name: "fee", label: "الرسوم السنوية (دينار، فارغ = مجانية)", type: "number" },
      { name: "duration_months", label: "مدة العضوية بالأشهر", type: "number", default: 12 },
      { name: "requires_license", label: "يتطلب رقم وصورة ترخيص مزاولة المهنة", type: "boolean", default: true },
      { name: "icon", label: "الأيقونة", type: "icon" },
      ORDER,
      { name: "is_active", label: "متاحة للتقديم", type: "boolean", default: true },
    ],
  },
  {
    key: "memberships", title: "العضويات", singular: "عضوية", model: "professional.membership", group: "التدريب والعضوية", icon: "users",
    submission: true, canCreate: false, exportable: true,
    bulkStatuses: MEMBERSHIP_STATUS.filter((o) => ["under_review", "active", "rejected", "suspended"].includes(o.value)),
    detailActions: [{ action: "renew", label: "تجديد العضوية لمدة إضافية", confirm: "تمديد العضوية لفترة جديدة؟" }],
    columns: [
      { name: "member_number", label: "رقم العضوية" }, { name: "full_name", label: "الاسم" }, { name: "membership_type_title", label: "الفئة" },
      { name: "profession", label: "المهنة", type: "choice", options: PROFESSION }, { name: "status", label: "الحالة", type: "choice", options: MEMBERSHIP_STATUS },
      { name: "expiry_date", label: "الانتهاء", type: "date" }, { name: "created_at", label: "تاريخ الطلب", type: "date" },
    ],
    filters: [
      { name: "status", label: "الحالة", options: MEMBERSHIP_STATUS },
      { name: "expiring", label: "الانتهاء", options: opts([["30", "تنتهي خلال 30 يومًا أو منتهية"], ["90", "خلال 90 يومًا"]]) },
      { name: "profession", label: "المهنة", options: PROFESSION },
    ],
    fields: [
      { name: "status", label: "الحالة", type: "select", options: MEMBERSHIP_STATUS },
      { name: "expiry_date", label: "تاريخ انتهاء العضوية", type: "date" },
    ],
  },
  // ------------------------------------------------------------ programs & impact
  {
    key: "programs", title: "البرامج والمشاريع", singular: "برنامج", model: "cms.program", group: "البرامج والأثر", icon: "layers",
    columns: [{ name: "cover", label: "", type: "image" }, { name: "title", label: "العنوان" }, { name: "kind", label: "النوع", type: "choice", options: PROGRAM_KIND }, { name: "status", label: "الحالة", type: "choice", options: PROGRAM_STATUS }, { name: "is_featured", label: "مميز", type: "boolean" }, PUBLISHED_COL],
    filters: [{ name: "status", label: "الحالة", options: PROGRAM_STATUS }, { name: "kind", label: "النوع", options: PROGRAM_KIND }, PUBLISHED_FILTER],
    children: [{ resource: "program-images", fk: "program", title: "صور البرنامج" }],
    fields: [
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "kind", label: "النوع", type: "select", options: PROGRAM_KIND, default: "program" },
      { name: "status", label: "الحالة", type: "select", options: PROGRAM_STATUS, default: "ongoing" },
      { name: "summary", label: "ملخص", type: "textarea", required: true, en: true, full: true },
      { name: "description", label: "الوصف التفصيلي", type: "textarea", en: true, full: true },
      { name: "goals", label: "الأهداف (هدف في كل سطر)", type: "textarea", en: true },
      { name: "target_groups", label: "الفئات المستفيدة (فئة في كل سطر)", type: "textarea", en: true },
      { name: "results", label: "النتائج المحققة (نتيجة في كل سطر)", type: "textarea", en: true },
      { name: "beneficiaries_count", label: "عدد المستفيدين الفعلي", type: "number" },
      { name: "cover", label: "صورة الغلاف", type: "image" },
      { name: "icon", label: "الأيقونة", type: "icon" },
      { name: "start_date", label: "تاريخ البداية", type: "date" },
      { name: "end_date", label: "تاريخ النهاية", type: "date" },
      { name: "partners", label: "الشركاء", type: "m2m", resource: "partners", optionLabel: "name" },
      { name: "is_featured", label: "مميز في الرئيسية", type: "boolean" },
      ORDER, PUBLISHED,
    ],
  },
  {
    key: "program-images", title: "صور البرامج", singular: "صورة", model: "cms.programimage", group: "", icon: "image",
    columns: [{ name: "image", label: "", type: "image" }, { name: "caption", label: "الوصف" }],
    fields: [
      { name: "image", label: "الصورة", type: "image", required: true },
      { name: "caption", label: "وصف الصورة", type: "text" },
      ORDER,
    ],
  },
  {
    key: "statistics", title: "الإحصائيات", singular: "إحصائية", model: "cms.statistic", group: "البرامج والأثر", icon: "chart",
    columns: [{ name: "label", label: "العنوان" }, { name: "value", label: "القيمة" }, { name: "show_on_home", label: "في الرئيسية", type: "boolean" }, PUBLISHED_COL],
    fields: [
      { name: "label", label: "العنوان", type: "text", required: true, en: true },
      { name: "value", label: "القيمة (رقم حقيقي موثق)", type: "number", required: true },
      { name: "prefix", label: "بادئة", type: "text" },
      { name: "suffix", label: "لاحقة (مثال: + أو ساعة)", type: "text", en: true },
      { name: "icon", label: "الأيقونة", type: "icon" },
      { name: "description", label: "وصف", type: "text", en: true },
      { name: "as_of", label: "حتى تاريخ", type: "date" },
      { name: "show_on_home", label: "إظهار في الرئيسية", type: "boolean", default: true },
      ORDER, PUBLISHED,
    ],
  },
  {
    key: "partners", title: "الشركاء والداعمون", singular: "شريك", model: "cms.partner", group: "البرامج والأثر", icon: "handshake",
    columns: [{ name: "logo", label: "", type: "image" }, { name: "name", label: "الاسم" }, { name: "kind", label: "النوع", type: "choice", options: PARTNER_KIND }, PUBLISHED_COL],
    filters: [{ name: "kind", label: "النوع", options: PARTNER_KIND }],
    fields: [
      { name: "name", label: "الاسم", type: "text", required: true, en: true },
      { name: "kind", label: "النوع", type: "select", options: PARTNER_KIND, default: "partner" },
      { name: "logo", label: "الشعار", type: "image", required: true },
      { name: "url", label: "الموقع الإلكتروني", type: "url" },
      { name: "description", label: "نبذة", type: "textarea" },
      ORDER, PUBLISHED,
    ],
  },
  // ------------------------------------------------------------ media
  {
    key: "posts", title: "الأخبار والفعاليات", singular: "مادة", model: "cms.post", group: "المركز الإعلامي", icon: "newspaper",
    columns: [{ name: "cover", label: "", type: "image" }, { name: "title", label: "العنوان" }, { name: "kind", label: "النوع", type: "choice", options: POST_KIND }, { name: "published_at", label: "تاريخ النشر", type: "date" }, PUBLISHED_COL],
    filters: [{ name: "kind", label: "النوع", options: POST_KIND }, PUBLISHED_FILTER],
    fields: [
      { name: "kind", label: "النوع", type: "select", options: POST_KIND, default: "news" },
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "excerpt", label: "مقتطف", type: "textarea", en: true, full: true },
      { name: "body", label: "المحتوى", type: "textarea", required: true, en: true, full: true },
      { name: "cover", label: "صورة الغلاف", type: "image" },
      { name: "attachment", label: "مرفق عام (PDF/Office)", type: "file" },
      { name: "program", label: "البرنامج المرتبط", type: "fk", resource: "programs", optionLabel: "title" },
      { name: "event_date", label: "موعد الفعالية", type: "datetime" },
      { name: "event_location", label: "مكان الفعالية", type: "text" },
      { name: "published_at", label: "تاريخ النشر", type: "datetime" },
      { name: "is_featured", label: "مميز", type: "boolean" },
      PUBLISHED,
    ],
  },
  {
    key: "albums", title: "معرض الصور والفيديو", singular: "ألبوم", model: "cms.album", group: "المركز الإعلامي", icon: "images",
    columns: [{ name: "cover", label: "", type: "image" }, { name: "title", label: "العنوان" }, { name: "date", label: "التاريخ", type: "date" }, PUBLISHED_COL],
    children: [{ resource: "media-items", fk: "album", title: "عناصر الألبوم" }],
    fields: [
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "description", label: "الوصف", type: "textarea", full: true },
      { name: "cover", label: "الغلاف", type: "image" },
      { name: "date", label: "التاريخ", type: "date" },
      { name: "program", label: "البرنامج المرتبط", type: "fk", resource: "programs", optionLabel: "title" },
      PUBLISHED,
    ],
  },
  {
    key: "media-items", title: "عناصر الوسائط", singular: "عنصر", model: "cms.mediaitem", group: "", icon: "image",
    columns: [{ name: "image", label: "", type: "image" }, { name: "kind", label: "النوع", type: "choice", options: opts([["image", "صورة"], ["video", "فيديو"]]) }, { name: "caption", label: "الوصف" }],
    fields: [
      { name: "kind", label: "النوع", type: "select", options: opts([["image", "صورة"], ["video", "فيديو"]]), default: "image" },
      { name: "image", label: "الصورة", type: "image" },
      { name: "video_url", label: "رابط الفيديو (يوتيوب)", type: "url" },
      { name: "caption", label: "الوصف", type: "text" },
      ORDER,
    ],
  },
  // ------------------------------------------------------------ governance
  {
    key: "documents", title: "الحوكمة والوثائق", singular: "وثيقة", model: "cms.document", group: "الحوكمة", icon: "file",
    columns: [{ name: "title", label: "العنوان" }, { name: "category", label: "التصنيف", type: "choice", options: DOC_CATEGORY }, { name: "year", label: "السنة" }, PUBLISHED_COL],
    filters: [{ name: "category", label: "التصنيف", options: DOC_CATEGORY }, PUBLISHED_FILTER],
    fields: [
      { name: "category", label: "التصنيف", type: "select", required: true, options: DOC_CATEGORY },
      { name: "title", label: "العنوان", type: "text", required: true, en: true },
      { name: "description", label: "الوصف", type: "textarea", full: true },
      { name: "year", label: "السنة", type: "number" },
      { name: "file", label: "الملف (PDF/Office حتى 25MB)", type: "file", required: true },
      { name: "published_at", label: "تاريخ النشر", type: "date" },
      ORDER, PUBLISHED,
    ],
  },
  // ------------------------------------------------------------ services
  {
    key: "services", title: "تعريف الخدمات", singular: "خدمة", model: "engagement.service", group: "الخدمات والطلبات", icon: "clipboard",
    columns: [{ name: "title", label: "الخدمة" }, { name: "requires_attachment", label: "مرفق إلزامي", type: "boolean" }, { name: "is_active", label: "متاحة", type: "boolean" }],
    fields: [
      { name: "title", label: "اسم الخدمة", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "summary", label: "وصف مختصر", type: "textarea", required: true, en: true, full: true },
      { name: "description", label: "تفاصيل الخدمة", type: "textarea", en: true, full: true },
      { name: "eligibility", label: "شروط الاستحقاق (شرط في كل سطر)", type: "textarea", en: true },
      { name: "required_documents", label: "المستندات المطلوبة (مستند في كل سطر)", type: "textarea", en: true },
      { name: "icon", label: "الأيقونة", type: "icon" },
      { name: "requires_attachment", label: "المرفقات إلزامية", type: "boolean" },
      {
        name: "extra_fields", label: "حقول إضافية في نموذج الطلب (JSON)", type: "json", full: true, default: [],
        help: 'مثال: [{"name":"income","label":"الدخل الشهري","type":"number","required":true}] — الأنواع: text, textarea, number, date, select (مع options), boolean',
      },
      ORDER,
      { name: "is_active", label: "متاحة", type: "boolean", default: true },
    ],
  },
  {
    key: "service-requests", title: "طلبات المستفيدين", singular: "طلب", model: "engagement.servicerequest", group: "الخدمات والطلبات", icon: "inbox",
    submission: true, canCreate: false,
    columns: [{ name: "tracking_code", label: "رقم الطلب" }, { name: "full_name", label: "الاسم" }, { name: "service_title", label: "الخدمة" }, { name: "city", label: "المدينة" }, { name: "status", label: "الحالة", type: "choice", options: SERVICE_STATUS }, { name: "created_at", label: "التاريخ", type: "date" }],
    filters: [{ name: "status", label: "الحالة", options: SERVICE_STATUS }],
    fields: [{ name: "status", label: "الحالة", type: "select", options: SERVICE_STATUS }],
  },
  // ------------------------------------------------------------ volunteering
  {
    key: "opportunities", title: "الفرص التطوعية", singular: "فرصة", model: "engagement.volunteeropportunity", group: "التطوع", icon: "heart",
    columns: [{ name: "title", label: "الفرصة" }, { name: "start_date", label: "البداية", type: "date" }, { name: "applications_count", label: "الطلبات" }, { name: "is_open", label: "مفتوحة", type: "boolean" }],
    fields: [
      { name: "title", label: "عنوان الفرصة", type: "text", required: true, en: true },
      { name: "slug", label: "المعرف في الرابط", type: "slug" },
      { name: "description", label: "الوصف", type: "textarea", required: true, en: true, full: true },
      { name: "requirements", label: "المتطلبات والمهارات", type: "textarea", en: true, full: true },
      { name: "location", label: "المكان", type: "text" },
      { name: "is_remote", label: "عن بعد", type: "boolean" },
      { name: "start_date", label: "تاريخ البداية", type: "date" },
      { name: "end_date", label: "تاريخ النهاية", type: "date" },
      { name: "hours", label: "عدد الساعات", type: "number" },
      { name: "seats", label: "عدد المقاعد", type: "number" },
      { name: "program", label: "البرنامج المرتبط", type: "fk", resource: "programs", optionLabel: "title" },
      { name: "is_open", label: "التسجيل مفتوح", type: "boolean", default: true },
      ORDER,
    ],
  },
  {
    key: "volunteer-applications", title: "طلبات التطوع", singular: "طلب تطوع", model: "engagement.volunteerapplication", group: "التطوع", icon: "inbox",
    submission: true, canCreate: false,
    columns: [{ name: "tracking_code", label: "رقم الطلب" }, { name: "full_name", label: "الاسم" }, { name: "opportunity_title", label: "الفرصة" }, { name: "city", label: "المدينة" }, { name: "status", label: "الحالة", type: "choice", options: VOLUNTEER_STATUS }, { name: "hours_completed", label: "الساعات" }, { name: "created_at", label: "التاريخ", type: "date" }],
    filters: [{ name: "status", label: "الحالة", options: VOLUNTEER_STATUS }, { name: "gender", label: "الجنس", options: opts([["male", "ذكر"], ["female", "أنثى"]]) }],
    fields: [
      { name: "status", label: "الحالة", type: "select", options: VOLUNTEER_STATUS },
      { name: "hours_completed", label: "ساعات التطوع المنجزة", type: "number" },
    ],
  },
  // ------------------------------------------------------------ partnerships & messages
  {
    key: "partnership-requests", title: "طلبات الشراكة", singular: "طلب شراكة", model: "engagement.partnershiprequest", group: "الشراكات والتواصل", icon: "handshake",
    submission: true, canCreate: false,
    columns: [{ name: "organization", label: "الجهة" }, { name: "contact_name", label: "المسؤول" }, { name: "kind", label: "النوع", type: "choice", options: PARTNERSHIP_KIND }, { name: "status", label: "الحالة", type: "choice", options: PARTNERSHIP_STATUS }, { name: "created_at", label: "التاريخ", type: "date" }],
    filters: [{ name: "status", label: "الحالة", options: PARTNERSHIP_STATUS }, { name: "kind", label: "النوع", options: PARTNERSHIP_KIND }],
    fields: [{ name: "status", label: "الحالة", type: "select", options: PARTNERSHIP_STATUS }],
  },
  {
    key: "contact-messages", title: "رسائل التواصل", singular: "رسالة", model: "engagement.contactmessage", group: "الشراكات والتواصل", icon: "mail",
    submission: true, canCreate: false,
    columns: [{ name: "name", label: "الاسم" }, { name: "subject", label: "الموضوع" }, { name: "email", label: "البريد" }, { name: "status", label: "الحالة", type: "choice", options: MESSAGE_STATUS }, { name: "created_at", label: "التاريخ", type: "date" }],
    filters: [{ name: "status", label: "الحالة", options: MESSAGE_STATUS }],
    fields: [{ name: "status", label: "الحالة", type: "select", options: MESSAGE_STATUS }],
  },
  // ------------------------------------------------------------ system
  {
    key: "users", title: "المستخدمون والصلاحيات", singular: "مستخدم", model: "accounts.user", group: "النظام", icon: "shield",
    columns: [{ name: "username", label: "اسم المستخدم" }, { name: "full_name", label: "الاسم" }, { name: "roles", label: "الأدوار" }, { name: "is_active", label: "نشط", type: "boolean" }, { name: "last_login", label: "آخر دخول", type: "datetime" }],
    fields: [
      { name: "username", label: "اسم المستخدم", type: "text", required: true },
      { name: "full_name", label: "الاسم الكامل", type: "text" },
      { name: "email", label: "البريد الإلكتروني", type: "email" },
      { name: "job_title", label: "المسمى الوظيفي", type: "text" },
      { name: "roles", label: "الأدوار", type: "roles", full: true, default: [] },
      { name: "password", label: "كلمة المرور", type: "password", help: "10 أحرف على الأقل. اتركها فارغة للإبقاء على الحالية." },
      { name: "is_active", label: "نشط", type: "boolean", default: true },
    ],
  },
];

export const resourceByKey = (key: string) => RESOURCES.find((r) => r.key === key);

export const perm = (r: ResourceDef, action: "view" | "add" | "change" | "delete") => {
  const [app, model] = r.model.split(".");
  return `${app}.${action}_${model}`;
};
