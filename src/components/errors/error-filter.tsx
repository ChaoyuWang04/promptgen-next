'use client';

/**
 * Error Filter Component
 * Provides filtering controls for error logs
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorLevel } from '@/lib/errors/types';
import { Search, X } from 'lucide-react';

interface ErrorFilterProps {
  onFilterChange: (filters: {
    level?: ErrorLevel;
    search?: string;
  }) => void;
}

export function ErrorFilter({ onFilterChange }: ErrorFilterProps) {
  const [level, setLevel] = useState<ErrorLevel | undefined>();
  const [search, setSearch] = useState('');

  const handleLevelChange = (value: string) => {
    const newLevel = value === 'all' ? undefined : (value as ErrorLevel);
    setLevel(newLevel);
    onFilterChange({ level: newLevel, search });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ level, search: value });
  };

  const handleClearFilters = () => {
    setLevel(undefined);
    setSearch('');
    onFilterChange({});
  };

  const hasActiveFilters = level !== undefined || search !== '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="error-level">Error Level</Label>
          <Select
            value={level || 'all'}
            onValueChange={handleLevelChange}
          >
            <SelectTrigger id="error-level">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value={ErrorLevel.ERROR}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Error
                </div>
              </SelectItem>
              <SelectItem value={ErrorLevel.WARN}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Warning
                </div>
              </SelectItem>
              <SelectItem value={ErrorLevel.INFO}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Info
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search">Search Message</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search error messages..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
