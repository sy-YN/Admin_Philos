
'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps {
  count: number;
  rowsPerPage: number;
  page: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
}

export function DataTablePagination({
  count,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
}: DataTablePaginationProps) {
  const pageCount = Math.ceil(count / rowsPerPage);

  const handleSetPage = (newPage: number) => {
    onPageChange(Math.max(0, Math.min(pageCount - 1, newPage)));
  };

  if (pageCount <= 1 && !onRowsPerPageChange) {
    return (
       <div className="flex w-full items-center justify-between px-2">
            <div className="flex-1 text-sm text-muted-foreground">
                全 {count} 件
            </div>
       </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {count} 件中 {Math.min(page * rowsPerPage + 1, count)} - {Math.min((page + 1) * rowsPerPage, count)} 件を表示
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {onRowsPerPageChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">表示件数</p>
            <Select
              value={`${rowsPerPage}`}
              onValueChange={(value) => {
                onRowsPerPageChange(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {page + 1} / {pageCount > 0 ? pageCount : 1} ページ
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handleSetPage(0)}
            disabled={page === 0}
          >
            <span className="sr-only">最初のページへ</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handleSetPage(page - 1)}
            disabled={page === 0}
          >
            <span className="sr-only">前のページへ</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handleSetPage(page + 1)}
            disabled={page >= pageCount - 1}
          >
            <span className="sr-only">次のページへ</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handleSetPage(pageCount - 1)}
            disabled={page >= pageCount - 1}
          >
            <span className="sr-only">最後のページへ</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
