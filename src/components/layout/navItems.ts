import {
  LayoutDashboard,
  Columns3,
  Users,
  MessageSquareText,
  CalendarDays,
  Wallet,
  Repeat2,
  UserCheck,
  FileText,
  BarChart3,
  FolderOpen,
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
  { href: "/clientes", label: "Clientes", icon: UserCheck },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/arquivos", label: "Arquivos", icon: FolderOpen },
  { href: "/remarketing", label: "Remarketing", icon: Repeat2 },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];
