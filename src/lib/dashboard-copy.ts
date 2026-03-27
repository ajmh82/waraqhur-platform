export type DashboardLocale = "ar" | "en";

export const dashboardCopy = {
  ar: {
    dashboard: "لوحة المستخدم",
    profile: "الملف الشخصي",
    account: "الحساب",
    security: "الأمان",
    notifications: "الإشعارات",
    activity: "النشاط",
    settings: "الإعدادات",
    invites: "الدعوات",
    overview: "نظرة عامة",
    manageProfile: "إدارة ملفك الشخصي وإعدادات حسابك.",
    quickLinks: "روابط سريعة",
    open: "فتح",
  },
  en: {
    dashboard: "Dashboard",
    profile: "Profile",
    account: "Account",
    security: "Security",
    notifications: "Notifications",
    activity: "Activity",
    settings: "Settings",
    invites: "Invites",
    overview: "Overview",
    manageProfile: "Manage your profile and account settings.",
    quickLinks: "Quick Links",
    open: "Open",
  },
} as const;
