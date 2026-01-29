
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, ChevronRight, Building } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Organization } from '@/types/organization';
import { Separator } from '@/components/ui/separator';

type OrganizationWithChildren = Organization & { children: OrganizationWithChildren[] };

interface OrganizationPickerProps {
  organizations: Organization[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyResultText?: string;
  className?: string;
  disabled?: boolean | ((org: Organization) => boolean);
  clearButtonText?: string;
}

const OrganizationNode = ({
  node,
  onSelect,
  selectedValue,
  level = 0,
  disabled,
}: {
  node: OrganizationWithChildren;
  onSelect: (value: string) => void;
  selectedValue: string;
  level?: number;
  disabled?: (org: Organization) => boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isNodeDisabled = disabled ? disabled(node) : false;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div
        className={cn(
          'flex items-center gap-1 rounded-md',
          selectedValue === node.id && 'bg-accent'
        )}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
            </Button>
          </CollapsibleTrigger>
        ) : (
          <div className="w-6 shrink-0" />
        )}
        <Button
          variant="ghost"
          className={cn(
              "flex-1 justify-start h-8 px-2",
              isNodeDisabled && "text-muted-foreground cursor-not-allowed opacity-50"
            )}
          onClick={() => !isNodeDisabled && onSelect(node.id)}
          disabled={isNodeDisabled}
        >
          {node.name}
        </Button>
        <Check
          className={cn(
            'mr-2 h-4 w-4',
            selectedValue === node.id ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
      <CollapsibleContent>
        {hasChildren && (
          <div className="pl-2">
            {node.children.map((child) => (
              <OrganizationNode
                key={child.id}
                node={child}
                onSelect={onSelect}
                selectedValue={selectedValue}
                level={level + 1}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};


export function OrganizationPicker({
  organizations,
  value,
  onChange,
  placeholder = '組織を選択...',
  searchPlaceholder = '組織を検索...',
  emptyResultText = '組織が見つかりません。',
  className,
  disabled = false,
  clearButtonText,
}: OrganizationPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const { organizationTree, selectedOrganization } = React.useMemo(() => {
    const orgsById = new Map(organizations.map(org => [org.id, { ...org, children: [] as OrganizationWithChildren[] }]));
    let tree: OrganizationWithChildren[] = [];

    if (search) {
       const lowercasedSearch = search.toLowerCase();
       const filteredOrgs = organizations.filter(org => org.name.toLowerCase().includes(lowercasedSearch));
       // For simplicity, search results are shown as a flat list
       tree = filteredOrgs.map(org => ({ ...org, children: []}));
    } else {
        organizations.forEach(org => {
            if (org.parentId && orgsById.has(org.parentId)) {
                orgsById.get(org.parentId)?.children.push(orgsById.get(org.id)!);
            } else {
                tree.push(orgsById.get(org.id)!);
            }
        });
        const sortChildrenRecursive = (nodes: OrganizationWithChildren[]) => {
            nodes.sort((a,b) => a.order - b.order);
            nodes.forEach(node => {
                if(node.children.length > 0) {
                sortChildrenRecursive(node.children);
                }
            });
        }
        sortChildrenRecursive(tree);
    }
    
    const selectedOrg = organizations.find(o => o.id === value);

    return { organizationTree: tree, selectedOrganization: selectedOrg };

  }, [organizations, search, value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };
  
  const isNodeDisabled = (node: Organization): boolean => {
    if (typeof disabled === 'function') {
        return disabled(node);
    }
    return disabled;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={typeof disabled === 'boolean' ? disabled : false}
        >
          <span className="truncate">
            {selectedOrganization ? selectedOrganization.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" >
        <div className="p-2 border-b">
            <Input 
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
        <ScrollArea className="h-72">
            <div className="p-2">
              {clearButtonText && !search && (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-8 px-2 font-normal',
                      (!value || value === 'all') && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => handleSelect('')}
                  >
                    {clearButtonText}
                  </Button>
                  <Separator className="my-1" />
                </>
              )}
              {organizationTree.length > 0 ? (
                  organizationTree.map(node => (
                      <OrganizationNode 
                          key={node.id} 
                          node={node} 
                          onSelect={handleSelect} 
                          selectedValue={value} 
                          disabled={disabled instanceof Function ? disabled : undefined}
                      />
                  ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">{emptyResultText}</p>
              )}
            </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
