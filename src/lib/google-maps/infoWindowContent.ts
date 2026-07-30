import type { Job } from "../../types";
import {
  formatContestCategoryLine,
  getCategoryColor,
  getCategoryDisplayName,
  resolveCategorySlugFromJob,
} from "../config/categoryConfig";
import {
  formatContestLocation,
  formatContestSubmissionDeadline,
  getContestSubmissionDeadline,
} from "../contest-display";
import { getListingDetailHref } from "../listing/listing-detail-url";
import { escapeHtml, escapeHtmlAttribute } from "../security/escape-html";
import { getContestMarkerIconSvg } from "./config";
import { readThemeColors } from "../theme/read-theme-colors";

const INFO_WINDOW_CACHE_VERSION = "v11";

/** Darkened category tint for header/border — keeps hue, readable with white text. */
function categoryHeaderTint(categoryColor: string, brandNavy: string): string {
  return `color-mix(in srgb, ${categoryColor} 74%, ${brandNavy})`;
}
const infoWindowContentCache = new Map<string, string>();
const CACHE_MAX_SIZE = 100;

export function clearInfoWindowCache(): void {
  infoWindowContentCache.clear();
}

function getCachedContent(jobId: string, isSmallMap: boolean, generator: () => string): string {
  const cacheKey = `${INFO_WINDOW_CACHE_VERSION}-${jobId}-${isSmallMap ? "small" : "large"}`;

  const cached = infoWindowContentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const content = generator();

  if (infoWindowContentCache.size >= CACHE_MAX_SIZE) {
    const firstKey = infoWindowContentCache.keys().next().value;
    if (firstKey) {
      infoWindowContentCache.delete(firstKey);
    }
  }
  infoWindowContentCache.set(cacheKey, content);

  return content;
}

interface ListingPreviewMeta {
  id: string;
  title: string;
  company: string;
  location: string;
  categoryLabel: string;
  categoryColor: string;
  deadlineLabel: string | null;
  offerCount: number;
  detailHref: string;
  urgent: boolean;
  verified: boolean;
}

function buildListingPreviewMeta(job: Job): ListingPreviewMeta {
  const categorySlug = resolveCategorySlugFromJob({ category: job.category });
  const categoryColor = categorySlug ? getCategoryColor(categorySlug) : "hsl(221 83% 40%)";
  const categoryLabel =
    formatContestCategoryLine({
      category: job.category,
      subcategory: job.subcategory,
    }) ||
    getCategoryDisplayName({
      slug: categorySlug,
      name: typeof job.category === "string" ? job.category : job.category?.name,
    }) ||
    "Inne";

  const submissionDeadline = getContestSubmissionDeadline(job);
  const deadlineLabel = submissionDeadline
    ? formatContestSubmissionDeadline(submissionDeadline)
    : null;

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: formatContestLocation(job.location),
    categoryLabel,
    categoryColor,
    deadlineLabel,
    offerCount: job.applications ?? job.metrics?.applications ?? 0,
    detailHref: getListingDetailHref(job),
    urgent: Boolean(job.urgent),
    verified: Boolean(job.verified),
  };
}

function renderMetaCell(label: string, value: string): string {
  const theme = readThemeColors();
  return `
    <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
      <span style="font-size:10px;font-weight:500;color:${theme.mutedForeground};">${label}</span>
      <span style="font-size:12px;font-weight:600;color:${theme.brandNavy};line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${value}</span>
    </div>
  `;
}

function renderDetailsButton(meta: ListingPreviewMeta): string {
  return `
    <button
      type="button"
      data-map-details-btn
      data-listing-href="${escapeHtmlAttribute(meta.detailHref)}"
      style="
        display:block;
        width:100%;
        margin-top:10px;
        padding:9px 12px;
        border:none;
        border-radius:8px;
        background:${meta.categoryColor};
        color:${readThemeColors().white};
        font-size:13px;
        font-weight:600;
        cursor:pointer;
        font-family:inherit;
      "
    >Szczegóły</button>
  `;
}

function renderListingPreviewCard(meta: ListingPreviewMeta, compact = false, includeDetailsButton = true): string {
  const theme = readThemeColors();
  const safeTitle = escapeHtml(meta.title);
  const safeCompany = escapeHtml(meta.company);
  const safeLocation = escapeHtml(meta.location);
  const safeCategory = escapeHtml(meta.categoryLabel);
  const cardWidth = compact ? "248px" : "272px";
  const bodyPadding = compact ? "11px" : "12px";
  const headerTint = categoryHeaderTint(meta.categoryColor, theme.brandNavy);

  return `
    <div
      class="info-window-content map-info-window"
      data-listing-id="${escapeHtmlAttribute(meta.id)}"
      style="width:${cardWidth};max-width:${cardWidth};position:relative;padding-bottom:9px;"
    >
      <div style="
        box-sizing:border-box;
        width:${cardWidth};
        border-radius:10px;
        overflow:hidden;
        border:1px solid ${headerTint};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        box-shadow:0 5px 16px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.1);
      ">
        <div style="
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px 10px;
          background:${headerTint};
          color:${theme.white};
          border-bottom:1px solid color-mix(in srgb, ${headerTint} 82%, ${theme.brandNavy});
        ">
          <span style="display:inline-flex;flex-shrink:0;">${getContestMarkerIconSvg(theme.white, 14)}</span>
          <span style="
            flex:1;
            min-width:0;
            font-size:11px;
            font-weight:600;
            line-height:1.25;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            color:${theme.white};
          ">${safeCategory}</span>
          ${meta.urgent ? `
            <span style="
              flex-shrink:0;
              padding:2px 6px;
              font-size:9px;
              font-weight:700;
              border-radius:999px;
              background:${theme.destructive};
              color:${theme.white};
              text-transform:uppercase;
            ">Pilne</span>
          ` : ""}
          <div style="flex-shrink:0;margin-left:4px;text-align:right;line-height:1.1;color:${theme.white};">
            <div style="font-size:9px;font-weight:500;opacity:0.88;">Oferty</div>
            <div style="font-size:15px;font-weight:700;">${meta.offerCount}</div>
          </div>
          ${meta.verified ? `
            <span style="display:inline-flex;flex-shrink:0;color:${theme.white};opacity:0.95;" aria-hidden="true" title="Zweryfikowany">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          ` : ""}
        </div>

        <div style="padding:${bodyPadding};background:${theme.background};">
          <h3 style="
            margin:0 0 4px;
            font-size:14px;
            font-weight:700;
            line-height:1.35;
            color:${theme.brandNavy};
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
            overflow:hidden;
          ">${safeTitle}</h3>

          <p style="
            margin:0 0 10px;
            font-size:12px;
            color:${theme.mutedForeground};
            line-height:1.35;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          ">${safeCompany}</p>

          <div style="
            display:flex;
            flex-direction:column;
            gap:8px;
            padding:9px 10px;
            background:${theme.card};
            border-radius:8px;
          ">
            ${renderMetaCell("Lokalizacja", safeLocation)}
            ${meta.deadlineLabel ? renderMetaCell("Termin składania", escapeHtml(meta.deadlineLabel)) : ""}
          </div>

          ${includeDetailsButton ? renderDetailsButton(meta) : ""}
        </div>
      </div>

      <div style="
        position:absolute;
        left:50%;
        bottom:1px;
        transform:translateX(-50%);
        width:0;
        height:0;
        border-left:7px solid transparent;
        border-right:7px solid transparent;
        border-top:8px solid ${headerTint};
        filter:drop-shadow(0 1.5px 2px rgba(15,23,42,0.1));
      " aria-hidden="true"></div>
    </div>
  `;
}

export function generateInfoWindowContent(jobData?: Job, isSmallMap = false): string {
  if (!jobData) {
    return '<div class="p-3 text-sm text-gray-600">Brak danych</div>';
  }

  return getCachedContent(jobData.id, isSmallMap, () => {
    const meta = buildListingPreviewMeta(jobData);
    return renderListingPreviewCard(meta, isSmallMap);
  });
}

export function generateMobileDrawerContent(jobData: Job): string {
  if (!jobData) {
    return '<div class="p-6 text-base text-gray-600">Brak danych</div>';
  }

  const meta = buildListingPreviewMeta(jobData);
  return renderListingPreviewCard(meta, false, false);
}

/** Binds Szczegóły button inside the open Google Maps info window. */
export function bindMapInfoWindowDetailsButton(
  listingId: string,
  onOpenDetails: (listingId: string, href?: string) => void,
): void {
  const infoWindowRoot = document.querySelector(".gm-style-iw-d");
  const card = infoWindowRoot?.querySelector(`[data-listing-id="${listingId}"]`);
  const button = card?.querySelector("[data-map-details-btn]") as HTMLButtonElement | null;

  if (!button || button.dataset.bound === "true") {
    return;
  }

  button.dataset.bound = "true";
  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const href = button.getAttribute("data-listing-href") ?? undefined;
      onOpenDetails(listingId, href);
    },
    { once: true },
  );
}
