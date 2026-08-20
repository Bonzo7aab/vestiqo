'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublicEntityContest } from '../../lib/database/public-entity-contests';
import {
  CONTEST_STATUS_FILTER_OPTIONS,
  getContestWorkflowStatusLabel,
} from '../../lib/tender-workflow-status';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

/** Public profile: all statuses except draft (OPD-152). */
const PUBLIC_ENTITY_STATUS_FILTER_OPTIONS = CONTEST_STATUS_FILTER_OPTIONS.filter(
  (option) => option.value !== 'draft',
);

interface HousingEntityContestsTableProps {
  contests: PublicEntityContest[];
}

function formatDatePl(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('pl-PL');
}

export function HousingEntityContestsTable({
  contests,
}: HousingEntityContestsTableProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contests.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (query && !row.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [contests, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po tytule…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-[280px]">
            <SelectValue placeholder="Wszystkie statusy" />
          </SelectTrigger>
          <SelectContent>
            {PUBLIC_ENTITY_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {contests.length === 0
            ? 'Brak konkursów do wyświetlenia.'
            : 'Brak konkursów pasujących do filtrów.'}
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł konkursu</TableHead>
                <TableHead>Wybrana oferta</TableHead>
                <TableHead className="text-right">Liczba złożonych ofert</TableHead>
                <TableHead>Termin rozpoczęcia</TableHead>
                <TableHead>Czas realizacji</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="hover:bg-transparent">
                  <TableCell className="font-medium max-w-[280px]">
                    <span className="line-clamp-2" title={row.title}>
                      {row.title}
                    </span>
                  </TableCell>
                  <TableCell>{row.selectedOfferCompanyName || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.offersCount}
                  </TableCell>
                  <TableCell>{formatDatePl(row.completionDate)}</TableCell>
                  <TableCell>{row.projectDuration || '—'}</TableCell>
                  <TableCell>{getContestWorkflowStatusLabel(row.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
