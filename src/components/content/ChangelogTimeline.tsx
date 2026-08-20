import {
  changelogReleases,
  changelogTypeStyles,
  formatChangelogDate,
  type ChangelogItem,
  type ChangelogRelease,
} from '../../lib/content/co-nowego';

function ChangelogItemRow({ item }: { item: ChangelogItem }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
      {item.type ? (
        <span
          className={`mt-0.5 inline-flex h-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${changelogTypeStyles[item.type]}`}
        >
          {item.type}
        </span>
      ) : null}
      <span>{item.text}</span>
    </li>
  );
}

function ChangelogReleaseBlock({ release }: { release: ChangelogRelease }) {
  return (
    <article className="relative pl-8">
      <span
        className="absolute left-0 top-1.5 size-3 rounded-full border-2 border-brand-navy bg-background"
        aria-hidden
      />
      <time
        dateTime={release.date}
        className="text-sm font-medium text-muted-foreground"
      >
        {formatChangelogDate(release.date)}
      </time>
      <h2 className="mt-1 text-xl font-semibold text-brand-navy">
        {release.title}
      </h2>
      <ul className="mt-4 space-y-3">
        {release.items.map((item) => (
          <ChangelogItemRow key={`${release.date}-${item.text}`} item={item} />
        ))}
      </ul>
    </article>
  );
}

export function ChangelogTimeline() {
  return (
    <div className="relative space-y-10 border-l border-border pl-0">
      {changelogReleases.map((release) => (
        <ChangelogReleaseBlock key={release.date} release={release} />
      ))}
    </div>
  );
}
