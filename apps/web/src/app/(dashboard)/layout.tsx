import { Header } from './components/header';
import { Sidebar } from './components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      <div className="flex">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-border min-h-[calc(100vh-4rem)] sticky top-16">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
