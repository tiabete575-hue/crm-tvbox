'use client';

import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Kanban,
  MessageSquare,
  BellRing,
  Wallet,
  Tags,
  ArrowLeftRight,
  Menu,
  X,
  Tv,
  LogOut,
  Plus,
} from 'lucide-react';
import { ToastProvider } from '@/components/Toast';
import { createAuthClient } from '@neondatabase/auth/next';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Visão Geral Executiva',
  '/clientes': 'Carteira de Clientes',
  '/renovacoes': 'Central de Renovações',
  '/kanban': 'Funil Kanban de Atendimento',
  '/mensagens': 'Estúdio de Mensagens WhatsApp',
  '/automacoes': 'Régua de Lembretes Automáticos',
  '/lembretes': 'Radar de Vencimentos',
  '/financeiro': 'Gestão Financeira & Caixa',
  '/etiquetas': 'Etiquetas & Categorias',
  '/importar': 'Importação & Backup de Dados',
  '/login': 'Acesso Administrativo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Renovações', href: '/renovacoes', icon: CalendarClock },
    { name: 'Kanban', href: '/kanban', icon: Kanban },
    { name: 'WhatsApp', href: '/mensagens', icon: MessageSquare },
    { name: 'Lembretes do Dia', href: '/automacoes', icon: BellRing },
    { name: 'Financeiro', href: '/financeiro', icon: Wallet },
    { name: 'Etiquetas', href: '/etiquetas', icon: Tags },
    { name: 'Importar / Exportar', href: '/importar', icon: ArrowLeftRight },
  ];

  const isAuthRoute = pathname?.startsWith('/login');
  const currentBreadcrumb = ROUTE_TITLES[pathname || '/'] || 'Operação CRM';

  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
        <title>TV Box CRM — Gestão de Assinantes, Renovações e Financeiro</title>
        <meta
          name="description"
          content="Plataforma executiva de gestão de clientes de TV Box, controle de renovações, funil Kanban, automação de lembretes WhatsApp e fluxo de caixa."
        />
      </head>
      <body className={`${plusJakarta.className} bg-slate-50 text-slate-900 overflow-x-hidden antialiased`}>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-out flex flex-col border-r border-slate-800 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800 shrink-0">
                <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <Tv className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-bold text-white tracking-tight">TV Box CRM</span>
                </Link>
                <button
                  className="lg:hidden text-slate-400 hover:text-white p-1"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname?.startsWith(item.href)) ||
                    (item.href === '/automacoes' && pathname === '/lembretes');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors group whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800 text-xs text-slate-500 space-y-3">
                {!isAuthRoute && (
                  <button
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                    onClick={async () => {
                      await createAuthClient().signOut();
                      window.location.assign('/login');
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair da conta
                  </button>
                )}
                <div className="text-center">&copy; {new Date().getFullYear()} TV Box CRM</div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Top Workspace Header */}
              <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 text-sm truncate">
                    <span className="text-slate-400 hidden sm:inline">TV Box CRM</span>
                    <span className="text-slate-300 hidden sm:inline">/</span>
                    <span className="font-semibold text-slate-800 truncate">{currentBreadcrumb}</span>
                  </div>
                </div>

                {!isAuthRoute && (
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      href="/renovacoes"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                      Fila de Renovações
                    </Link>
                    <Link
                      href="/clientes"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Gerenciar Clientes
                    </Link>
                  </div>
                )}
              </header>

              {/* Page Content */}
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50 relative">
                {children}
              </main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
