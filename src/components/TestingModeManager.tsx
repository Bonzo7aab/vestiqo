'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings, 
  TestTube2, 
  Users, 
  Shield, 
  Database, 
  Eye,
  AlertTriangle,
  Info,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { getDataSourceConfig } from '../lib/config/data-source';
import { getTestingFeatureFlagsAction } from '../lib/flagship/actions';
import {
  FLAGSHIP_FLAG_DESCRIPTIONS,
  FLAGSHIP_FLAG_LABELS,
  type FlagshipFlagKey,
  type TestingFeatureFlags,
} from '../lib/flagship/keys';

interface TestingModeManagerProps {
  onBack: () => void;
}

interface TestingSettings {
  betaMode: boolean;
  mockData: boolean;
  debugMode: boolean;
  analyticsTracking: boolean;
  errorLogging: boolean;
  userFeedbackCollection: boolean;
  performanceMonitoring: boolean;
}

const STORAGE_KEY = 'urbi-testing-settings';

const DEFAULT_SETTINGS: TestingSettings = {
  betaMode: true,
  mockData: true,
  debugMode: false,
  analyticsTracking: true,
  errorLogging: true,
  userFeedbackCollection: true,
  performanceMonitoring: true,
};

function parseStoredSettings(raw: string | null): TestingSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<TestingSettings> & {
      featureFlags?: unknown;
    };
    return {
      betaMode: parsed.betaMode ?? DEFAULT_SETTINGS.betaMode,
      mockData: parsed.mockData ?? DEFAULT_SETTINGS.mockData,
      debugMode: parsed.debugMode ?? DEFAULT_SETTINGS.debugMode,
      analyticsTracking: parsed.analyticsTracking ?? DEFAULT_SETTINGS.analyticsTracking,
      errorLogging: parsed.errorLogging ?? DEFAULT_SETTINGS.errorLogging,
      userFeedbackCollection:
        parsed.userFeedbackCollection ?? DEFAULT_SETTINGS.userFeedbackCollection,
      performanceMonitoring:
        parsed.performanceMonitoring ?? DEFAULT_SETTINGS.performanceMonitoring,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const TestingModeManager: React.FC<TestingModeManagerProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<TestingSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    return parseStoredSettings(localStorage.getItem(STORAGE_KEY));
  });

  const [featureFlags, setFeatureFlags] = useState<TestingFeatureFlags | null>(null);
  const [flagsEvaluatedAt, setFlagsEvaluatedAt] = useState<string | null>(null);
  const [flagsConfigured, setFlagsConfigured] = useState(true);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(true);

  const loadFeatureFlags = useCallback(async () => {
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const result = await getTestingFeatureFlagsAction();
      setFeatureFlags(result.flags);
      setFlagsEvaluatedAt(result.evaluatedAt);
      setFlagsConfigured(result.configured);
      if (result.error) setFlagsError(result.error);
    } catch (err) {
      setFlagsError(err instanceof Error ? err.message : 'Nie udało się pobrać flag');
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatureFlags();
  }, [loadFeatureFlags]);

  const [testingStats] = useState({
    activeTesters: 8,
    feedbackSubmissions: 23,
    bugsReported: 5,
    featuresRequested: 12,
    completedScenarios: 127,
    avgSessionTime: '24 min'
  });

  const persistSettings = (newSettings: TestingSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const updateSetting = (key: keyof TestingSettings, value: boolean) => {
    persistSettings({ ...settings, [key]: value });
    console.log(`Testing setting updated: ${key} = ${value}`);
  };

  const resetToDefaults = () => {
    persistSettings(DEFAULT_SETTINGS);
  };

  const enabledFlagCount =
    featureFlags === null ? 0 : Object.values(featureFlags).filter(Boolean).length;

  const exportLogs = () => {
    const logs = {
      settings,
      featureFlags,
      flagsEvaluatedAt,
      testingStats,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `urbi-testing-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={onBack} className="mb-2 hidden md:flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Powrót
              </Button>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Konfiguracja testów
              </h1>
              <p className="text-muted-foreground">
                Zarządzanie trybem beta i ustawieniami testowymi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={settings.betaMode ? "default" : "secondary"}
                className={settings.betaMode ? "bg-primary" : ""}
              >
                {settings.betaMode ? "BETA AKTYWNA" : "TRYB PRODUKCYJNY"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
            <TabsTrigger value="features">Feature Flags</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Beta Mode Alert */}
              <Alert className={settings.betaMode ? "border-primary bg-primary/5" : "border-warning bg-warning/5"}>
                <TestTube2 className="h-4 w-4" />
                <AlertDescription>
                  {settings.betaMode 
                    ? "Aplikacja działa w trybie BETA. Wszystkie dane są mockowane i bezpieczne do testowania."
                    : "UWAGA: Tryb produkcyjny wyłączony. Włącz go tylko po zakończeniu testów."
                  }
                </AlertDescription>
              </Alert>

              {/* Core Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Podstawowe ustawienia
                  </CardTitle>
                  <CardDescription>
                    Główne ustawienia trybu testowego i bezpieczeństwa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tryb BETA</Label>
                        <div className="text-sm text-muted-foreground">
                          Włącza tryb testowy z mock danymi
                        </div>
                      </div>
                      <Switch
                        checked={settings.betaMode}
                        onCheckedChange={(value) => updateSetting('betaMode', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Mock dane</Label>
                        <div className="text-sm text-muted-foreground">
                          Używa przykładowych danych zamiast prawdziwych
                        </div>
                      </div>
                      <Switch
                        checked={settings.mockData}
                        onCheckedChange={(value) => updateSetting('mockData', value)}
                      />
                    </div>

                    {/* Data Source Indicator */}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium">Źródło danych</Label>
                          <Badge variant={settings.mockData ? "secondary" : "default"} className="mt-1">
                            {settings.mockData ? "📦 Mock Data" : "🗄️ Database"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const config = getDataSourceConfig();
                            const sourceLabels: Record<string, string> = {
                              'localStorage': 'Local Storage',
                              'cookie': 'Cookie',
                              'env': 'Environment Variable',
                              'default': 'Default'
                            };
                            return sourceLabels[config.source] || config.source;
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tryb debug</Label>
                        <div className="text-sm text-muted-foreground">
                          Pokazuje dodatkowe informacje diagnostyczne
                        </div>
                      </div>
                      <Switch
                        checked={settings.debugMode}
                        onCheckedChange={(value) => updateSetting('debugMode', value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Collection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-info" />
                    Zbieranie danych
                  </CardTitle>
                  <CardDescription>
                    Ustawienia zbierania danych testowych i analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Analytics tracking</Label>
                        <div className="text-sm text-muted-foreground">
                          Śledzi zachowania użytkowników (anonimowo)
                        </div>
                      </div>
                      <Switch
                        checked={settings.analyticsTracking}
                        onCheckedChange={(value) => updateSetting('analyticsTracking', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Logowanie błędów</Label>
                        <div className="text-sm text-muted-foreground">
                          Automatycznie zapisuje błędy i problemy
                        </div>
                      </div>
                      <Switch
                        checked={settings.errorLogging}
                        onCheckedChange={(value) => updateSetting('errorLogging', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Zbieranie feedback&apos;u</Label>
                        <div className="text-sm text-muted-foreground">
                          Włącza widget feedback i zbieranie opinii
                        </div>
                      </div>
                      <Switch
                        checked={settings.userFeedbackCollection}
                        onCheckedChange={(value) => updateSetting('userFeedbackCollection', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Monitoring wydajności</Label>
                        <div className="text-sm text-muted-foreground">
                          Mierzy czasy ładowania i responsywność
                        </div>
                      </div>
                      <Switch
                        checked={settings.performanceMonitoring}
                        onCheckedChange={(value) => updateSetting('performanceMonitoring', value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feature Flags Tab — read-only from Cloudflare Flagship */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-success" />
                      Feature Flags (Cloudflare Flagship)
                    </CardTitle>
                    <CardDescription>
                      Wartości z serwera — zmiany w dashboardzie Cloudflare (Compute → Flagship)
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadFeatureFlags()}
                    disabled={flagsLoading}
                    className="shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${flagsLoading ? 'animate-spin' : ''}`} />
                    Odśwież
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Flagi nie są zapisywane w localStorage. Zarządzaj nimi w{' '}
                    <a
                      href="https://dash.cloudflare.com/?to=/:account/workers/flagship"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline"
                    >
                      Cloudflare Flagship
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </AlertDescription>
                </Alert>

                {!flagsConfigured && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Brak konfiguracji Flagship. Ustaw FLAGSHIP_APP_ID i CLOUDFLARE_FLAGSHIP_API_TOKEN
                      (patrz .env.example).
                    </AlertDescription>
                  </Alert>
                )}

                {flagsError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{flagsError}</AlertDescription>
                  </Alert>
                )}

                {flagsEvaluatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Ostatnia ewaluacja: {new Date(flagsEvaluatedAt).toLocaleString('pl-PL')}
                  </p>
                )}

                <div className="space-y-4">
                  {(Object.keys(FLAGSHIP_FLAG_LABELS) as FlagshipFlagKey[]).map((flagKey) => (
                    <div key={flagKey} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{FLAGSHIP_FLAG_LABELS[flagKey]}</Label>
                        <div className="text-sm text-muted-foreground">
                          {FLAGSHIP_FLAG_DESCRIPTIONS[flagKey]}
                        </div>
                        <code className="text-xs text-muted-foreground">{flagKey}</code>
                      </div>
                      {flagsLoading || featureFlags === null ? (
                        <Badge variant="secondary">Ładowanie…</Badge>
                      ) : (
                        <Badge variant={featureFlags[flagKey] ? 'default' : 'secondary'}>
                          {featureFlags[flagKey] ? 'Włączona' : 'Wyłączona'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktywni testerzy</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testingStats.activeTesters}</div>
                  <p className="text-xs text-muted-foreground">w ostatnim tygodniu</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Feedback</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testingStats.feedbackSubmissions}</div>
                  <p className="text-xs text-muted-foreground">opinii zebranych</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Zgłoszenia</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testingStats.bugsReported + testingStats.featuresRequested}</div>
                  <p className="text-xs text-muted-foreground">
                    {testingStats.bugsReported} błędów, {testingStats.featuresRequested} funkcji
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Status monitoringu</CardTitle>
                <CardDescription>
                  Aktualny status systemów monitorowania
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analytics tracking</span>
                    <Badge variant={settings.analyticsTracking ? "default" : "secondary"}>
                      {settings.analyticsTracking ? "Aktywny" : "Wyłączony"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error logging</span>
                    <Badge variant={settings.errorLogging ? "default" : "secondary"}>
                      {settings.errorLogging ? "Aktywny" : "Wyłączony"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance monitoring</span>
                    <Badge variant={settings.performanceMonitoring ? "default" : "secondary"}>
                      {settings.performanceMonitoring ? "Aktywny" : "Wyłączony"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Feedback collection</span>
                    <Badge variant={settings.userFeedbackCollection ? "default" : "secondary"}>
                      {settings.userFeedbackCollection ? "Aktywny" : "Wyłączony"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-warning" />
                    Export danych testowych
                  </CardTitle>
                  <CardDescription>
                    Eksportuj logi, ustawienia i dane z testów
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Export zawiera anonimowe dane testowe, ustawienia i podstawowe statystyki.
                        Nie zawiera danych osobowych ani wrażliwych informacji.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button onClick={exportLogs} className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Eksportuj dane testowe
                      </Button>
                      <Button variant="outline" onClick={resetToDefaults}>
                        Reset do domyślnych
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Podsumowanie konfiguracji</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Tryb BETA: <Badge variant={settings.betaMode ? "default" : "secondary"}>{settings.betaMode ? "Włączony" : "Wyłączony"}</Badge></div>
                    <div>Mock dane: <Badge variant={settings.mockData ? "default" : "secondary"}>{settings.mockData ? "Włączone" : "Wyłączone"}</Badge></div>
                    <div>Debug mode: <Badge variant={settings.debugMode ? "default" : "secondary"}>{settings.debugMode ? "Włączony" : "Wyłączony"}</Badge></div>
                    <div>Analytics: <Badge variant={settings.analyticsTracking ? "default" : "secondary"}>{settings.analyticsTracking ? "Aktywne" : "Wyłączone"}</Badge></div>
                    <div>
                      Feature flags (Flagship): {enabledFlagCount} z{' '}
                      {Object.keys(FLAGSHIP_FLAG_LABELS).length} włączonych
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};