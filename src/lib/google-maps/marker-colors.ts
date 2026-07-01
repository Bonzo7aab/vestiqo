import { readThemeColors } from '../theme/read-theme-colors';

export interface MarkerColorSet {
  priority: {
    low: string;
    medium: string;
    high: string;
  };
  job: {
    glyphColor: string;
  };
  tender: {
    glyphColor: string;
  };
  selected: {
    background: string;
    borderColor: string;
    glyphColor: string;
  };
  default: {
    background: string;
    borderColor: string;
    glyphColor: string;
  };
  urgent: {
    background: string;
    borderColor: string;
    glyphColor: string;
  };
}

/** Marker colors from current CSS theme — call at runtime (client-side). */
export function getMarkerColors(): MarkerColorSet {
  const theme = readThemeColors();
  return {
    priority: {
      low: theme.success,
      medium: theme.primary,
      high: theme.destructive,
    },
    job: {
      glyphColor: theme.primary,
    },
    tender: {
      glyphColor: '#F97316',
    },
    selected: {
      background: theme.primary,
      borderColor: theme.primary,
      glyphColor: theme.white,
    },
    default: {
      background: theme.primary,
      borderColor: theme.white,
      glyphColor: theme.white,
    },
    urgent: {
      background: theme.destructive,
      borderColor: theme.white,
      glyphColor: theme.white,
    },
  };
}
