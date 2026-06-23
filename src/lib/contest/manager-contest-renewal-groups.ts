import type { ManagerContest } from '../database/manager-contests';

export interface ManagerContestRenewalGroup {
  head: ManagerContest;
  predecessors: ManagerContest[];
}

/**
 * Groups manager contests so renewed editions appear as the main row and
 * earlier editions (linked via renewed_from_contest_id) nest in an accordion.
 */
export function groupManagerContestsByRenewal(
  contests: ManagerContest[],
): ManagerContestRenewalGroup[] {
  const byId = new Map(contests.map((contest) => [contest.id, contest]));
  const hasRenewalChild = new Set<string>();

  for (const contest of contests) {
    if (contest.renewedFromContestId) {
      hasRenewalChild.add(contest.renewedFromContestId);
    }
  }

  const collectPredecessors = (head: ManagerContest): ManagerContest[] => {
    const predecessors: ManagerContest[] = [];
    let parentId = head.renewedFromContestId;

    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      predecessors.push(parent);
      parentId = parent.renewedFromContestId;
    }

    return predecessors;
  };

  return contests
    .filter((contest) => !hasRenewalChild.has(contest.id))
    .map((head) => ({
      head,
      predecessors: collectPredecessors(head),
    }));
}
