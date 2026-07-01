import { readThemeColors } from '../theme/read-theme-colors';

export const MARKER_PIN_SCALE = {
  default: 1.42,
  hovered: 1.58,
} as const;

export interface DomioMarkerContentOptions {
  pinElement: HTMLElement;
  accentColor: string;
  markerId: string;
  isHovered?: boolean;
}

export function wrapDomioMarkerContent({
  pinElement,
  accentColor,
  markerId,
  isHovered = false,
}: DomioMarkerContentOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'domio-map-marker';
  wrapper.setAttribute('data-marker-id', markerId);
  if (isHovered) {
    wrapper.classList.add('domio-map-marker--hovered');
  }

  const pinSlot = document.createElement('div');
  pinSlot.className = 'domio-map-marker__pin';
  pinSlot.appendChild(pinElement);

  const anchor = document.createElement('div');
  anchor.className = 'domio-map-marker__anchor';
  anchor.setAttribute('aria-hidden', 'true');

  const pulseRing = document.createElement('span');
  pulseRing.className = 'domio-map-marker__pulse-ring';
  pulseRing.style.setProperty('--domio-marker-accent', accentColor);

  const pulseCore = document.createElement('span');
  pulseCore.className = 'domio-map-marker__pulse-core';
  pulseCore.style.setProperty('--domio-marker-accent', accentColor);

  anchor.append(pulseRing, pulseCore);
  wrapper.append(pinSlot, anchor);

  return wrapper;
}

export function getDomioMarkerPinElement(markerContent: HTMLElement | null | undefined): HTMLElement {
  if (!markerContent) {
    return markerContent as unknown as HTMLElement;
  }
  return markerContent.querySelector<HTMLElement>('.domio-map-marker__pin') ?? markerContent;
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
    }

    .domio-map-marker__pin {
      transform: translateY(-14px);
      filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.28));
      margin-bottom: -2px;
      transition: transform 0.15s ease;
    }

    .domio-map-marker--hovered .domio-map-marker__pin {
      transform: translateY(-16px) scale(1.04);
    }

    .domio-map-marker__anchor {
      position: relative;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .domio-map-marker__pulse-core {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--domio-marker-accent, ${theme.primary});
      border: 2px solid ${theme.white};
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
      position: relative;
      z-index: 2;
    }

    .domio-map-marker__pulse-ring {
      position: absolute;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--domio-marker-accent, ${theme.primary});
      opacity: 0.45;
      animation: domio-marker-pulse 2.2s ease-out infinite;
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

    .domio-map-marker__pin.marker-bounce {
      animation: markerBounce 1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}
