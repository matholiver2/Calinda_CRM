import {
  LayoutDashboard,
  Columns3,
  Users,
  MessageSquareText,
  CalendarDays,
  Wallet,
  UserCheck,
  FileText,
  BarChart3,
  FolderOpen,
  Sparkles,
  Target,
  Megaphone,
  CalendarClock,
} from "lucide-react";

export const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/funil", label: "Funil", icon: Columns3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/conversas", label: "Conversas", icon: MessageSquareText },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: Wallet },
];

export const GROUP_B = [
  { href: "/assistente", label: "Assistente", icon: Sparkles },
  { href: "/prospeccao", label: "Prospecção", icon: Target },
  { href: "/clientes", label: "Clientes", icon: UserCheck },
  { href: "/follow-up", label: "Follow-up", icon: CalendarClock },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/arquivos", label: "Arquivos", icon: FolderOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/novidades", label: "Novidades", icon: Megaphone },
];
