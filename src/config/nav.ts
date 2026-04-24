import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Exam Management",
    items: [
      { title: "All Exams", href: "/admin/exams", icon: FileText },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Results & Reports", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Participants", href: "/admin/participants", icon: Users },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Question Bank", href: "/admin/questions", icon: BookOpen },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];
