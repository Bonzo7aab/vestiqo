'use client';

import Link from 'next/link';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { CommunityAccountClaimQueueItem } from '../../lib/database/community-account-claims';
import { claimSlaLabel } from '../../lib/database/community-account-claims';

interface CommunityClaimsTableProps {
  items: CommunityAccountClaimQueueItem[];
  emptyLabel: string;
}

export function CommunityClaimsTable({ items, emptyLabel }: CommunityClaimsTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Wspólnota</TableHead>
            <TableHead>NIP</TableHead>
            <TableHead>Zarządca</TableHead>
            <TableHead>Wnioskodawca</TableHead>
            <TableHead>Czas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/administracja/odzyskanie-wspolnoty/${item.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {item.entityName}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{item.nip}</TableCell>
              <TableCell>{item.managerCompanyName ?? '—'}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {item.first_name} {item.last_name}
                </div>
                <div className="text-xs text-muted-foreground">{item.email}</div>
              </TableCell>
              <TableCell>
                {item.status === 'pending' && item.isOverdue ? (
                  <Badge variant="destructive">{claimSlaLabel(item)}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">{claimSlaLabel(item)}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
