'use client';

/**
 * Header Component
 * Top header with breadcrumbs, search, and user actions
 */

import { usePathname } from 'next/navigation';
import { Search, Command } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/shared/kbd';

interface HeaderProps {
  onCommandPaletteOpen?: () => void;
}

const routeNames: Record<string, string> = {
  '/': '仪表板',
  '/libraries': '库管理',
  '/prompts': 'Prompt生成',
  '/images': '图片管理',
  '/templates': '模板编辑器',
  '/status': '系统状态',
  '/settings': '设置',
};

function getBreadcrumbs(pathname: string): Array<{ label: string; href?: string }> {
  if (pathname === '/') {
    return [{ label: '仪表板' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; href?: string }> = [
    { label: '首页', href: '/' },
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    breadcrumbs.push({
      label: routeNames[currentPath] || segment,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

export function Header({ onCommandPaletteOpen }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Command Palette Trigger */}
        <Button
          variant="outline"
          className="relative h-9 w-64 justify-start text-sm text-muted-foreground"
          onClick={onCommandPaletteOpen}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>搜索...</span>
          <div className="ml-auto flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </Button>
      </div>
    </header>
  );
}
