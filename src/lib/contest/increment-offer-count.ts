import type { Job } from '../types/job';

/** Increment displayed offer count after a successful contest offer submit. */
export function withIncrementedOfferCount(job: Job, tenderId: string): Job {
  if (job.id !== tenderId) return job;

  const current = job.applications ?? job.metrics?.applications ?? 0;
  const next = current + 1;

  return {
    ...job,
    applications: next,
    metrics: {
      applications: next,
      visits: job.metrics?.visits ?? job.visits_count ?? 0,
      bookmarks: job.metrics?.bookmarks ?? job.bookmarks_count ?? 0,
    },
  };
}

export function mapJobsWithIncrementedOfferCount(jobs: Job[], tenderId: string): Job[] {
  return jobs.map((job) => withIncrementedOfferCount(job, tenderId));
}
