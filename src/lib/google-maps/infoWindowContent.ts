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

const INFO_WINDOW_CACHE_VERSION = "v3";
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
  accentBorder: string;
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
    accentBorder: `color-mix(in srgb, ${categoryColor} 38%, transparent)`,
    deadlineLabel,
    offerCount: job.applications ?? job.metrics?.applications ?? 0,
    detailHref: getListingDetailHref(job),
    urgent: Boolean(job.urgent),
    verified: Boolean(job.verified),
  };
}

function renderMetaRow(label: string, value: string, compact = false): string {
  const theme = readThemeColors();
  const fontSize = compact ? "11px" : "12px";
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:${fontSize};line-height:1.4;">
      <span style="color:${theme.mutedForeground};flex-shrink:0;">${label}</span>
      <span style="color:${theme.brandNavy};font-weight:500;text-align:right;">${value}</span>
    </div>
  `;
}

function renderDetailsButton(meta: ListingPreviewMeta, compact = false): string {
  const theme = readThemeColors();
  const padding = compact ? "8px 12px" : "9px 14px";
  const fontSize = compact ? "12px" : "13px";

  return `
    <button
      type="button"
      data-map-details-btn
      data-listing-href="${escapeHtmlAttribute(meta.detailHref)}"
      style="
        display:block;
        width:100%;
        margin-top:${compact ? "10px" : "12px"};
        padding:${padding};
        border:none;
        border-radius:8px;
        background:${theme.primary};
        color:${theme.white};
        font-size:${fontSize};
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
  const maxWidth = compact ? "248px" : "320px";
  const padding = compact ? "12px" : "14px";
  const titleSize = compact ? "13px" : "14px";

  return `
    <div
      class="info-window-content map-info-window"
      data-listing-id="${escapeHtmlAttribute(meta.id)}"
      style="width:100%;max-width:${maxWidth};"
    >
      <div style="
        padding:${padding};
        background:${theme.background};
        border:1px solid ${theme.border};
        border-left:3px solid ${meta.accentBorder};
        border-radius:12px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        box-shadow:0 2px 10px rgba(15,23,42,0.08);
      ">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          ${getContestMarkerIconSvg(meta.categoryColor, compact ? 12 : 14)}
          <span style="
            display:inline-flex;
            padding:2px 8px;
            font-size:${compact ? "10px" : "11px"};
            font-weight:600;
            border-radius:999px;
            background:${theme.card};
            color:${meta.categoryColor};
            border:1px solid ${theme.border};
          ">${safeCategory}</span>
          ${meta.urgent ? `
            <span style="
              display:inline-flex;
              padding:2px 8px;
              font-size:10px;
              font-weight:700;
              border-radius:999px;
              background:${theme.destructive};
              color:${theme.white};
              text-transform:uppercase;
            ">Pilne</span>
          ` : ""}
          ${meta.verified ? `
            <span style="display:inline-flex;color:${theme.primary};" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          ` : ""}
        </div>

        <h3 style="
          margin:0 0 6px;
          font-size:${titleSize};
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
          font-size:${compact ? "11px" : "12px"};
          color:${theme.mutedForeground};
          line-height:1.4;
          display:-webkit-box;
          -webkit-line-clamp:1;
          -webkit-box-orient:vertical;
          overflow:hidden;
        ">${safeCompany}</p>

        <div style="display:flex;flex-direction:column;gap:6px;">
          ${renderMetaRow("Lokalizacja", safeLocation, compact)}
          ${meta.deadlineLabel ? renderMetaRow("Termin składania", escapeHtml(meta.deadlineLabel), compact) : ""}
          ${renderMetaRow("Oferty", String(meta.offerCount), compact)}
        </div>

        ${includeDetailsButton ? renderDetailsButton(meta, compact) : ""}
      </div>
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
  onOpenDetails: (id: string) => void,
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

      const href = button.getAttribute("data-listing-href");
      const id =
        card?.getAttribute("data-listing-id") ||
        (href ? href.split("/").pop() ?? listingId : listingId);

      onOpenDetails(id);
    },
    { once: true },
  );
}
