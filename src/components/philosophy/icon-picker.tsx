'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { iconCategories, type IconData } from '@/lib/lucide-icons-list';
import { DynamicIcon } from './dynamic-icon';

interface IconPickerProps {
  currentIcon: string;
  onIconChange: (iconName: string) => void;
}

export function IconPicker({ currentIcon, onIconChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search) {
      return iconCategories;
    }
    const lowercasedSearch = search.toLowerCase();
    const filtered = iconCategories
      .map(category => ({
        ...category,
        icons: category.icons.filter(icon => 
          icon.name.toLowerCase().includes(lowercasedSearch) || 
          icon.tags.some(tag => tag.toLowerCase().includes(lowercasedSearch))
        ),
      }))
      .filter(category => category.icons.length > 0);
    
    // If search returns results, create a new "Search Results" category
    if (filtered.length > 0) {
      const allMatchingIcons = filtered.flatMap(c => c.icons).reduce((acc, current) => {
        if (!acc.find(item => item.name === current.name)) {
            acc.push(current);
        }
        return acc;
      }, [] as IconData[]);
      
      return [{ name: '検索結果', icons: allMatchingIcons }];
    }

    return [];
  }, [search]);

  const handleIconSelect = (iconName: string) => {
    onIconChange(iconName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <DynamicIcon name={currentIcon} className="h-5 w-5 text-muted-foreground" />
          <span className="font-normal">{currentIcon}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-2 border-b">
          <Input
            placeholder="アイコンを検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs defaultValue={filteredCategories[0]?.name || ''} className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start p-1">
            {filteredCategories.map(category => (
              <TabsTrigger key={category.name} value={category.name} className="text-xs px-2 py-1 h-auto">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollArea className="h-64">
            {filteredCategories.map(category => (
              <TabsContent key={category.name} value={category.name} className="p-2">
                <div className="grid grid-cols-6 gap-2">
                  {category.icons.map(icon => (
                    <Button
                      key={icon.name}
                      variant="outline"
                      size="icon"
                      onClick={() => handleIconSelect(icon.name)}
                      title={icon.name}
                    >
                      <DynamicIcon name={icon.name} className="h-5 w-5" />
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}