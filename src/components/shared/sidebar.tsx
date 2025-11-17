'use client';

/**
 * Sidebar Navigation Component
 * Main navigation sidebar with links to all major pages
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Database,
  Sparkles,
  Image,
  FileCode2,
  Settings,
  Activity,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: '仪表板',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '库管理',
    href: '/libraries',
    icon: Database,
  },
  {
    title: 'Prompt生成',
    href: '/prompts',
    icon: Sparkles,
  },
  {
    title: '图片管理',
    href: '/images',
    icon: Image,
  },
  {
    title: '模板编辑器',
    href: '/templates',
    icon: FileCode2,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: '系统状态',
    href: '/status',
    icon: Activity,
  },
  {
    title: '设置',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold">PromptGen</span>
          <span className="text-xs text-muted-foreground">AI素材生成系统</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 relative',
                    isActive && 'bg-secondary font-semibold border-l-4 border-primary pl-2.5'
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4",
                    isActive && "text-primary"
                  )} />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="flex flex-col gap-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 relative',
                    isActive && 'bg-secondary font-semibold border-l-4 border-primary pl-2.5'
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4",
                    isActive && "text-primary"
                  )} />
                  <span>{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            V2
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-medium">Next.js Version</span>
            <span className="text-muted-foreground">v2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
