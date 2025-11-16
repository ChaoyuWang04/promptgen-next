'use client';

/**
 * Dashboard Layout
 * Main layout for the dashboard with sidebar and header
 */

import { useState } from 'react';
import { Sidebar } from '@/components/shared/sidebar';
import { Header } from '@/components/shared/header';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onCommandPaletteOpen={() => setCommandPaletteOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Command Palette - will be implemented later */}
      {/* <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} /> */}
    </div>
  );
}
