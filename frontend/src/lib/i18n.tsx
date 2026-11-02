import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  home: ["الرئيسية", "Home"],
  about: ["عن الجمعية", "About"],
  programs: ["البرامج والمشاريع", "Programs & Projects"],
  services: ["الخدمات الإلكترونية", "E-Services"],
  volunteer: ["التطوع", "Volunteering"],
  media: ["المركز الإعلامي", "Media Center"],
  gallery: ["معرض الصور والفيديو", "Gallery"],
  governance: ["الحوكمة والشفافية", "Governance & Transparency"],
  impact: ["الأثر المجتمعي", "Social Impact"],
  partners: ["الشراكات والدعم", "Partnerships & Support"],
  faq: ["الأسئلة الشائعة", "FAQ"],
  contact: ["تواصل معنا", "Contact Us"],
  track: ["تتبع طلب", "Track a Request"],
  more: ["المزيد", "More"],
  // Short header-menu labels (page titles keep the full names above): English runs much wider than Arabic
  navCourses: ["الدورات والفعاليات", "Courses"],
  navPrograms: ["البرامج والمشاريع", "Programs"],
  navServices: ["الخدمات الإلكترونية", "Services"],
  navMedia: ["المركز الإعلامي", "News"],
  menu: ["القائمة", "Menu"],
  close: ["إغلاق", "Close"],
  skipToContent: ["تخطَّ إلى المحتوى", "Skip to content"],
  volunteerNow: ["تطوع معنا", "Volunteer"],
  supportUs: ["ادعمنا", "Support Us"],
  readMore: ["اقرأ المزيد", "Read more"],
  viewAll: ["عرض الكل", "View all"],
  learnMore: ["اعرف المزيد", "Learn more"],
  aboutUs: ["من نحن", "Who We Are"],
  vision: ["الرؤية", "Vision"],
  mission: ["الرسالة", "Mission"],
  goals: ["الأهداف الاستراتيجية", "Strategic Goals"],
  values: ["قيمنا", "Our Values"],
  disciplines: ["تخصصات تتكامل", "Expertise Across Care"],
  whyPartner: ["لماذا التعاون مع الجمعية؟", "Why Partner With Us?"],
  partnerTogether: ["معًا، نرتقي بالممارسة المهنية.", "Together, advancing professional practice."],
  registeredOn: ["تاريخ التسجيل", "Registered on"],
  board: ["الهيئة الإدارية", "Board of Directors"],
  executives: ["الإدارة التنفيذية", "Executive Team"],
  orgStructure: ["الهيكل التنظيمي", "Organizational Structure"],
  licenses: ["التراخيص والشهادات", "Licenses & Certificates"],
  ourImpact: ["أثرنا بالأرقام", "Our Impact in Numbers"],
  ourPrograms: ["برامجنا ومشاريعنا", "Our Programs & Projects"],
  latestNews: ["آخر الأخبار والفعاليات", "Latest News & Events"],
  upcomingEvent: ["الفعالية القادمة", "Upcoming Event"],
  volunteerOpps: ["فرص التطوع", "Volunteer Opportunities"],
  ourPartners: ["شركاؤنا وداعمونا", "Our Partners & Supporters"],
  becomePartner: ["كن شريكًا", "Become a Partner"],
  quickServices: ["خدماتنا الإلكترونية", "Our E-Services"],
  ctaTitle: ["كن جزءًا من الأثر", "Be Part of the Impact"],
  ctaText: [
    "انضم إلينا متطوعًا أو شريكًا، وساهم في صناعة أثر مستدام في مجتمعنا.",
    "Join us as a volunteer or partner and help create lasting impact in our community.",
  ],
  licensed: ["مرخصة برقم", "License No."],
  supervisedBy: ["تحت إشراف", "Supervised by"],
  quickLinks: ["روابط سريعة", "Quick Links"],
  contactInfo: ["معلومات التواصل", "Contact Information"],
  workingHours: ["ساعات العمل", "Working Hours"],
  rights: ["جميع الحقوق محفوظة", "All rights reserved"],
  all: ["الكل", "All"],
  ongoing: ["قائم", "Ongoing"],
  completed: ["مكتمل", "Completed"],
  upcoming: ["قادم", "Upcoming"],
  program: ["برنامج", "Program"],
  training: ["برنامج تدريبي", "Training Program"],
  project: ["مشروع", "Project"],
  initiative: ["مبادرة", "Initiative"],
  beneficiaries: ["مستفيد", "beneficiaries"],
  programGoals: ["أهداف البرنامج", "Program Goals"],
  targetGroups: ["الفئات المستفيدة", "Target Groups"],
  results: ["النتائج المحققة", "Achieved Results"],
  photos: ["صور", "Photos"],
  relatedNews: ["أخبار ذات صلة", "Related News"],
  news: ["الأخبار", "News"],
  event: ["الفعاليات", "Events"],
  announcement: ["الإعلانات", "Announcements"],
  publication: ["المنشورات", "Publications"],
  downloadAttachment: ["تحميل المرفق", "Download attachment"],
  download: ["تحميل", "Download"],
  year: ["السنة", "Year"],
  category: ["التصنيف", "Category"],
  noContent: ["لا يوجد محتوى منشور حاليًا.", "No published content yet."],
  loading: ["جارٍ التحميل…", "Loading…"],
  error: ["تعذر تحميل البيانات. حاول مرة أخرى.", "Could not load data. Please try again."],
  retry: ["إعادة المحاولة", "Retry"],
  notFound: ["الصفحة غير موجودة", "Page not found"],
  backHome: ["العودة للرئيسية", "Back to home"],
  applyService: ["تقديم طلب", "Apply"],
  eligibility: ["شروط الاستحقاق", "Eligibility"],
  requiredDocs: ["المستندات المطلوبة", "Required Documents"],
  submit: ["إرسال", "Submit"],
  sending: ["جارٍ الإرسال…", "Sending…"],
  required: ["مطلوب", "required"],
  fullName: ["الاسم الكامل", "Full name"],
  nationalId: ["الرقم الوطني (أو الرقم الشخصي لغير الأردنيين)", "National number (or personal number for non-Jordanians)"],
  phone: ["رقم الهاتف المحمول", "Mobile number"],
  phoneHint: ["07XXXXXXXX", "07XXXXXXXX"],
  email: ["البريد الإلكتروني", "Email"],
  city: ["المدينة", "City"],
  district: ["الحي", "District"],
  familySize: ["عدد أفراد الأسرة", "Family size"],
  details: ["تفاصيل الطلب", "Request details"],
  attachments: ["المرفقات (PDF أو صورة، حتى 10MB)", "Attachments (PDF or image, up to 10MB)"],
  consent: [
    "أوافق على سياسة الخصوصية وعلى معالجة بياناتي لغرض دراسة الطلب.",
    "I agree to the privacy policy and to processing my data for this request.",
  ],
  privacyPolicy: ["سياسة الخصوصية", "Privacy Policy"],
  successTitle: ["تم استلام طلبك بنجاح", "Your request has been received"],
  successText: [
    "احتفظ برقم الطلب التالي لمتابعة حالته:",
    "Keep the following reference number to track its status:",
  ],
  trackTitle: ["تتبع حالة الطلب", "Track Request Status"],
  trackText: [
    "أدخل رقم الطلب ورقم الجوال المسجل في الطلب.",
    "Enter the reference number and the mobile number used in the request.",
  ],
  trackingCode: ["رقم الطلب", "Reference number"],
  check: ["استعلام", "Check"],
  status: ["الحالة", "Status"],
  lastUpdate: ["آخر تحديث", "Last update"],
  submittedAt: ["تاريخ التقديم", "Submitted on"],
  note: ["ملاحظة", "Note"],
  applyVolunteer: ["التسجيل كمتطوع", "Volunteer Registration"],
  generalVolunteer: ["تطوع عام (بدون فرصة محددة)", "General volunteering"],
  opportunity: ["الفرصة التطوعية", "Opportunity"],
  gender: ["الجنس", "Gender"],
  male: ["ذكر", "Male"],
  female: ["أنثى", "Female"],
  birthDate: ["تاريخ الميلاد", "Date of birth"],
  education: ["المؤهل العلمي", "Education"],
  occupation: ["المهنة", "Occupation"],
  skills: ["المهارات", "Skills"],
  availability: ["أوقات التفرغ", "Availability"],
  motivation: ["لماذا ترغب في التطوع؟", "Why do you want to volunteer?"],
  cv: ["السيرة الذاتية (اختياري)", "CV (optional)"],
  remote: ["عن بعد", "Remote"],
  hours: ["ساعة", "hours"],
  seats: ["مقعد", "seats"],
  apply: ["سجّل الآن", "Apply now"],
  partnershipRequest: ["طلب شراكة أو رعاية", "Partnership / Sponsorship Request"],
  requestType: ["نوع الطلب", "Request type"],
  organization: ["اسم الجهة", "Organization"],
  contactName: ["اسم المسؤول", "Contact person"],
  position: ["المنصب", "Position"],
  message: ["الرسالة", "Message"],
  subject: ["الموضوع", "Subject"],
  attachment: ["مرفق (اختياري)", "Attachment (optional)"],
  donate: ["التبرع", "Donate"],
  donateNow: ["تبرع الآن", "Donate now"],
  bankTransfer: ["التحويل البنكي", "Bank transfer"],
  copy: ["نسخ", "Copy"],
  copied: ["تم النسخ", "Copied"],
  sendMessage: ["أرسل رسالة", "Send a message"],
  location: ["الموقع", "Location"],
  openMap: ["فتح في الخرائط", "Open in maps"],
  search: ["بحث", "Search"],
  searchPlaceholder: ["ابحث في الموقع…", "Search the site…"],
  noResults: ["لا توجد نتائج.", "No results."],
  asOf: ["حتى", "as of"],
  page: ["صفحة", "Page"],
  prev: ["السابق", "Previous"],
  next: ["التالي", "Next"],
  noPrograms: ["لا توجد برامج منشورة حاليًا.", "No programs published yet."],
  noOpps: ["لا توجد فرص تطوعية مفتوحة حاليًا، يمكنك التسجيل في التطوع العام.", "No open opportunities right now — you can still register for general volunteering."],
  noServices: ["لا توجد خدمات متاحة حاليًا.", "No services available right now."],
  noDocs: ["لم تُنشر وثائق في هذا التصنيف بعد.", "No documents in this category yet."],
  impactIntro: [
    "أرقام موثقة تعكس أثر برامج الجمعية ومبادراتها في المجتمع.",
    "Verified figures reflecting the impact of our programs and initiatives.",
  ],
  governanceIntro: [
    "نلتزم بأعلى معايير الحوكمة والشفافية والإفصاح، ونتيح وثائقنا الرسمية للجميع.",
    "We are committed to the highest standards of governance, transparency and disclosure.",
  ],
  date: ["التاريخ", "Date"],
  newRequest: ["تقديم طلب جديد", "Submit another"],
  courses: ["الدورات والفعاليات", "Courses & Events"],
  upcomingCourses: ["الدورات والفعاليات القادمة", "Upcoming Courses & Events"],
  pastCourses: ["الفعاليات السابقة", "Past Events"],
  course: ["دورة تدريبية", "Course"],
  workshop: ["ورشة عمل", "Workshop"],
  conference: ["مؤتمر", "Conference"],
  symposium: ["ندوة / لقاء علمي", "Symposium"],
  webinar: ["محاضرة عن بعد", "Webinar"],
  cmeHours: ["ساعة تطوير مهني مستمر (CPD)", "CPD hours"],
  seatsLeft: ["مقعد متبقٍ", "seats left"],
  full: ["اكتمل العدد — التسجيل في قائمة الانتظار", "Full — waiting list"],
  registrationClosed: ["التسجيل مغلق", "Registration closed"],
  register: ["سجّل الآن", "Register"],
  registerTitle: ["التسجيل في الدورة", "Course Registration"],
  free: ["مجاني", "Free"],
  currency: ["دينار", "JOD"],
  membersFee: ["رسوم الأعضاء", "Members fee"],
  fee: ["الرسوم", "Fee"],
  objectives: ["الأهداف التعليمية", "Learning Objectives"],
  audience: ["الفئة المستهدفة", "Target Audience"],
  speakers: ["المتحدثون والمدربون", "Speakers & Trainers"],
  accreditation: ["الاعتماد", "Accreditation"],
  deadline: ["آخر موعد للتسجيل", "Registration deadline"],
  online: ["عن بعد", "Online"],
  nameOnCertificate: ["الاسم كما يظهر في الشهادة", "Name as it should appear on the certificate"],
  nameEn: ["الاسم بالإنجليزية", "Name in English"],
  profession: ["المهنة", "Profession"],
  specialty: ["التخصص", "Specialty"],
  licenseNumber: ["رقم ترخيص مزاولة المهنة / رقم العضوية في النقابة", "Practice licence / syndicate membership number"],
  licenseCard: ["صورة ترخيص مزاولة المهنة (PDF أو صورة)", "Practice licence copy (PDF or image)"],
  workplace: ["جهة العمل", "Workplace"],
  qualification: ["المؤهل العلمي", "Qualification"],
  experience: ["سنوات الخبرة", "Years of experience"],
  nationality: ["الجنسية", "Nationality"],
  membership: ["العضوية", "Membership"],
  joinMembership: ["انضم عضوًا", "Become a Member"],
  membershipTypes: ["فئات العضوية", "Membership Categories"],
  membershipApply: ["طلب عضوية", "Membership Application"],
  benefits: ["المزايا", "Benefits"],
  joinConditions: ["شروط الانضمام", "Requirements"],
  perYear: ["سنويًا", "per year"],
  months: ["شهرًا", "months"],
  noMembership: ["لم تُفتح العضوية بعد.", "Membership is not open yet."],
  noCourses: ["لا توجد دورات أو فعاليات قادمة حاليًا.", "No upcoming courses or events."],
  certificates: ["التحقق من الشهادات", "Verify Certificates"],
  certificateCode: ["رمز الشهادة", "Certificate code"],
  verify: ["تحقق", "Verify"],
  certificateValid: ["شهادة صحيحة وموثقة", "Valid certificate"],
  certificateInvalid: ["لم يتم العثور على شهادة بهذا الرمز.", "No certificate found with this code."],
  printCertificate: ["طباعة / حفظ PDF", "Print / Save as PDF"],
  viewCertificate: ["عرض الشهادة", "View certificate"],
  attendanceCertificate: ["شهادة حضور", "Certificate of Attendance"],
  certifiesThat: ["تشهد الجمعية بأن", "This is to certify that"],
  attended: ["قد حضر/ت", "has attended"],
  heldOn: ["المنعقد بتاريخ", "held on"],
  issuedOn: ["تاريخ الإصدار", "Issued on"],
  verifyAt: ["للتحقق من صحة الشهادة", "Verify this certificate at"],
  memberNumber: ["رقم العضوية", "Member number"],
  expiryDate: ["تاريخ انتهاء العضوية", "Membership expiry"],
  expired: ["منتهية — يرجى التجديد", "Expired — please renew"],
  registrationStatus: ["حالة التسجيل", "Registration status"],
  physician: ["طبيب", "Physician"],
  dentist: ["طبيب أسنان", "Dentist"],
  nurse: ["تمريض", "Nursing"],
  midwife: ["قبالة قانونية", "Midwifery"],
  pharmacist: ["صيدلي", "Pharmacist"],
  allied: ["تخصصات صحية مساندة", "Allied health"],
  healthAdmin: ["إدارة صحية", "Health administration"],
  student: ["طالب / متدرب", "Student / Trainee"],
  other: ["أخرى", "Other"],
  rateLimited: ["تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقًا.", "Too many requests, please try again later."],
} satisfies Record<string, [string, string]>;

export type DictKey = keyof typeof dict;

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
  /** Returns the English variant of a bilingual field when available, else Arabic. */
  pick: <T extends object>(obj: T | null | undefined, field: keyof T & string) => string;
  formatDate: (value: string | null | undefined, withTime?: boolean) => string;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function readStoredLang(): Lang {
  try {
    return localStorage.getItem("lang") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const locale = lang === "ar" ? "ar-JO-u-nu-latn" : "en-GB";
    return {
      lang,
      dir,
      setLang,
      t: (key) => dict[key][lang === "ar" ? 0 : 1],
      pick: (obj, field) => {
        if (!obj) return "";
        const record = obj as Record<string, unknown>;
        const en = record[`${field}_en`];
        if (lang === "en" && typeof en === "string" && en.trim()) return en;
        return String(record[field] ?? "");
      },
      formatDate: (value, withTime = false) => {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "long",
          ...(withTime ? { timeStyle: "short" } : {}),
        }).format(d);
      },
      formatNumber: (value) => new Intl.NumberFormat(locale).format(value),
    };
  }, [lang, dir, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Splits a "one item per line" admin field into a clean list. */
export const lines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
