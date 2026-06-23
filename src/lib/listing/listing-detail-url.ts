import type { Job } from '../../types/job';
import { routes } from '../routes';

/** Public listing detail page for map markers and cards. */
export function getListingDetailHref(job: Pick<Job, 'id'>): string {
  return routes.konkurs(job.id);
}
