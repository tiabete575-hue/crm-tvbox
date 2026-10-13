'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, Users, Tags, Bell, Upload, Menu, X, Tv
} from 'lucide-react';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({ subsets: ['latin'] });

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
    { name: 'Etiquetas', href: '/etiquetas', icon: Tags },
    { name: 'Lembretes', href: '/lembretes', icon: Bell },
    { name: 'Importar/Exportar', href: '/importar', icon: Upload },
  ];

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50 text-slate-900 overflow-x-hidden`}>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <aside 
              className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
            >
              <div className="flex items-center justify-between p-6 h-20 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <Tv className="w-8 h-8 text-blue-500" />
                  <span className="text-xl font-bold text-white tracking-tight">TV Box CRM</span>
                </div>
                <button 
                  className="lg:hidden text-slate-400 hover:text-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-blue-600/10 text-blue-400 font-medium' 
                          : 'hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white transition-colors'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="p-4 border-t border-slate-700/50 text-xs text-center text-slate-500">
                &copy; {new Date().getFullYear()} TV Box CRM
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Mobile Header */}
              <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 shrink-0">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <span className="ml-2 font-semibold text-slate-800">TV Box CRM</span>
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
