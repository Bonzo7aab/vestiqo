'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';

import { Input } from './input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { cn } from './utils';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (originalRow: TData, index: number) => string;
  initialSorting?: SortingState;
  pageSize?: number;
  showPagination?: boolean;
  showViewOptions?: boolean;
  filterColumnId?: string;
  filterPlaceholder?: string;
  initialColumnVisibility?: VisibilityState;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  rowClassName?: string;
  expandedRowId?: string | null;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  expandedRowColSpan?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  initialSorting = [],
  pageSize = 10,
  showPagination = true,
  showViewOptions = false,
  filterColumnId,
  filterPlaceholder = 'Filtruj…',
  initialColumnVisibility = {},
  emptyMessage = 'Brak wyników.',
  onRowClick,
  rowClassName,
  expandedRowId,
  renderExpandedRow,
  expandedRowColSpan,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const colspan = expandedRowColSpan ?? columns.length;

  return (
    <div className="flex flex-col gap-4">
      {(filterColumnId || showViewOptions) && (
        <div className="flex items-center gap-2 px-1">
          {filterColumnId ? (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ''}
              onChange={(event) => table.getColumn(filterColumnId)?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
          ) : null}
          {showViewOptions ? <DataTableViewOptions table={table} /> : null}
        </div>
      )}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = getRowId?.(row.original, row.index) ?? row.id;
                const isExpanded = expandedRowId === rowId;

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        onRowClick && 'cursor-pointer',
                        isExpanded && 'bg-muted/40',
                        rowClassName,
                      )}
                      data-state={isExpanded ? 'selected' : undefined}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow ? (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={colspan - 1} className="whitespace-normal py-4 align-top">
                          {renderExpandedRow(row.original)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination ? <div className="px-1"><DataTablePagination table={table} /></div> : null}
    </div>
  );
}
