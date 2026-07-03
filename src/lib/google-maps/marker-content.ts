import { createMarkerGlyph } from './config';
import { readThemeColors } from '../theme/read-theme-colors';

export interface DomioTooltipMarkerOptions {
  categorySlug?: string;
  subcategoryLabel: string;
  postType?: 'job' | 'contest';
  backgroundColor: string;
  markerId: string;
  isHovered?: boolean;
}

export function createDomioTooltipMarkerContent({
  categorySlug,
  subcategoryLabel,
  postType = 'job',
  backgroundColor,
  markerId,
  isHovered = false,
}: DomioTooltipMarkerOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'domio-map-marker';
  wrapper.setAttribute('data-marker-id', markerId);
  if (isHovered) {
    wrapper.classList.add('domio-map-marker--hovered');
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'domio-map-marker__tooltip';
  tooltip.style.setProperty('--domio-marker-bg', backgroundColor);

  const iconSlot = document.createElement('span');
  iconSlot.className = 'domio-map-marker__icon';
  const glyph = createMarkerGlyph(postType, readThemeColors().white, categorySlug, 16);
  iconSlot.appendChild(glyph);

  const label = document.createElement('span');
  label.className = 'domio-map-marker__label';
  label.textContent = subcategoryLabel;
  label.title = subcategoryLabel;

  tooltip.append(iconSlot, label);

  const anchor = document.createElement('div');
  anchor.className = 'domio-map-marker__anchor';
  anchor.setAttribute('aria-hidden', 'true');
  anchor.setAttribute('data-marker-hit', 'anchor');

  const pulseRing = document.createElement('span');
  pulseRing.className = 'domio-map-marker__pulse-ring';
  pulseRing.style.setProperty('--domio-marker-accent', backgroundColor);

  const pulseCore = document.createElement('span');
  pulseCore.className = 'domio-map-marker__pulse-core';
  pulseCore.style.setProperty('--domio-marker-accent', backgroundColor);

  anchor.append(pulseRing, pulseCore);
  wrapper.append(tooltip, anchor);

  return wrapper;
}

export function getDomioMarkerPinElement(markerContent: HTMLElement | null | undefined): HTMLElement {
  if (!markerContent) {
    return markerContent as unknown as HTMLElement;
  }
  return markerContent.querySelector<HTMLElement>('.domio-map-marker__tooltip') ?? markerContent;
}

const DOMIO_MARKER_STYLE_ID = 'domio-marker-pulse-style';

export function ensureDomioMarkerStyles(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const existing = document.getElementById(DOMIO_MARKER_STYLE_ID);
  if (existing) {
    existing.remove();
  }

  const theme = readThemeColors();
  const style = document.createElement('style');
  style.id = DOMIO_MARKER_STYLE_ID;
  style.textContent = `
    .domio-map-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      pointer-events: auto;
      padding: 2px 10px 10px;
    }

    .domio-map-marker__tooltip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 220px;
      padding: 5px 10px 5px 7px;
      margin-bottom: 0;
      border-radius: 8px;
      background: var(--domio-marker-bg, ${theme.primary});
      color: ${theme.white};
      font-family: var(--font-inter, Inter, system-ui, sans-serif);
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.01em;
      white-space: nowrap;
      border: 1.5px solid rgba(255, 255, 255, 0.62);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.18),
        0 2px 8px rgba(15, 23, 42, 0.28);
    }

    .domio-map-marker--hovered .domio-map-marker__tooltip {
      border-color: rgba(255, 255, 255, 0.78);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.28),
        0 4px 12px rgba(15, 23, 42, 0.32);
    }

    .domio-map-marker__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    .domio-map-marker__icon svg {
      width: 16px !important;
      height: 16px !important;
      display: block;
    }

    .domio-map-marker__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .domio-map-marker__anchor {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: pointer;
    }

    .domio-map-marker__anchor::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
    }

    .domio-map-marker__pulse-core {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--domio-marker-accent, ${theme.primary});
      border: 2px solid ${theme.white};
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
      position: relative;
      z-index: 2;
      pointer-events: none;
    }

    .domio-map-marker__pulse-ring {
      position: absolute;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--domio-marker-accent, ${theme.primary});
      opacity: 0.45;
      animation: domio-marker-pulse 2.2s ease-out infinite;
      pointer-events: none;
    }

    @keyframes domio-marker-pulse {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      70% {
        transform: scale(3.2);
        opacity: 0;
      }
      100% {
        transform: scale(3.2);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
