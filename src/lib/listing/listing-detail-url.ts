import type { Job } from '../../types/job';
import { routes } from '../routes';

/** Public listing detail page for map markers and cards (OPD-162 slug when title is present). */
export function getListingDetailHref(job: Pick<Job, 'id'> & { title?: string | null }): string {
  return routes.konkurs(job.id, job.title);
}
