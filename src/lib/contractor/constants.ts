import { DEFAULT_CITY, WARSAW_DISTRICTS } from '../config/warsawDistricts';

export const POLISH_VOIVODESHIPS = [
  'dolnośląskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'łódzkie',
  'małopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'śląskie',
  'świętokrzyskie',
  'warmińsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
] as const;

export type PolishVoivodeship = (typeof POLISH_VOIVODESHIPS)[number];

export type ServiceAreaScope = 'whole_voivodeship' | 'selected_cities';

export interface ContractorServiceAreaSettings {
  voivodeship: PolishVoivodeship;
  scope: ServiceAreaScope;
  cities: string[];
  districts: string[];
}

export const DEFAULT_SERVICE_AREA: ContractorServiceAreaSettings = {
  voivodeship: 'mazowieckie',
  scope: 'whole_voivodeship',
  cities: [],
  districts: [],
};

/** Major cities per voivodeship for the service-area multi-select. */
export const CITIES_BY_VOIVODESHIP: Record<PolishVoivodeship, readonly string[]> = {
  dolnośląskie: ['Wrocław', 'Legnica', 'Wałbrzych', 'Jelenia Góra'],
  'kujawsko-pomorskie': ['Bydgoszcz', 'Toruń', 'Włocławek', 'Grudziądz'],
  lubelskie: ['Lublin', 'Zamość', 'Chełm', 'Biała Podlaska'],
  lubuskie: ['Zielona Góra', 'Gorzów Wielkopolski'],
  łódzkie: ['Łódź', 'Piotrków Trybunalski', 'Pabianice', 'Skierniewice'],
  małopolskie: ['Kraków', 'Tarnów', 'Nowy Sącz', 'Oświęcim'],
  mazowieckie: [
    'Warszawa',
    'Radom',
    'Płock',
    'Siedlce',
    'Ostrołęka',
    'Pruszków',
    'Legionowo',
    'Otwock',
  ],
  opolskie: ['Opole', 'Kędzierzyn-Koźle', 'Nysa'],
  podkarpackie: ['Rzeszów', 'Przemyśl', 'Stalowa Wola', 'Tarnobrzeg'],
  podlaskie: ['Białystok', 'Suwałki', 'Łomża'],
  pomorskie: ['Gdańsk', 'Gdynia', 'Sopot', 'Słupsk', 'Tczew'],
  śląskie: ['Katowice', 'Częstochowa', 'Sosnowiec', 'Gliwice', 'Zabrze', 'Bytom'],
  świętokrzyskie: ['Kielce', 'Starachowice', 'Ostrowiec Świętokrzyski'],
  'warmińsko-mazurskie': ['Olsztyn', 'Elbląg', 'Ełk'],
  wielkopolskie: ['Poznań', 'Kalisz', 'Konin', 'Piła', 'Leszno'],
  zachodniopomorskie: ['Szczecin', 'Koszalin', 'Stargard', 'Kołobrzeg'],
};

export { WARSAW_DISTRICTS, DEFAULT_CITY };

export type ContractorVatStatus = 'active_vat' | 'vat_exempt';

export const VAT_STATUS_OPTIONS: { value: ContractorVatStatus; label: string }[] = [
  { value: 'active_vat', label: 'Czynny podatnik VAT (stawki 8% / 23%)' },
  { value: 'vat_exempt', label: 'Zwolniony z VAT (faktura bez VAT)' },
];

export interface ProfessionalQualificationOption {
  id: string;
  label: string;
}

export interface ProfessionalQualificationGroup {
  title: string;
  options: ProfessionalQualificationOption[];
}

export const PROFESSIONAL_QUALIFICATION_GROUPS: ProfessionalQualificationGroup[] = [
  {
    title: 'Ogólnobudowlane i Konstrukcyjne',
    options: [
      { id: 'building_exec_unlimited', label: 'Uprawnienia budowlane wykonawcze (bez ograniczeń)' },
      { id: 'building_exec_limited', label: 'Uprawnienia budowlane wykonawcze (w ograniczonym zakresie)' },
      { id: 'building_design', label: 'Uprawnienia budowlane projektowe' },
      { id: 'scaffolding_installer', label: 'Uprawnienia do montażu rusztowań (Montażysta rusztowań)' },
    ],
  },
  {
    title: 'Elektryczne (SEP Grupa G1)',
    options: [
      { id: 'sep_g1_operation', label: 'Uprawnienia SEP G1 (Elektryczne) – Eksploatacja (E)' },
      { id: 'sep_g1_supervision', label: 'Uprawnienia SEP G1 (Elektryczne) – Dozór (D)' },
      { id: 'electrical_measurements', label: 'Uprawnienia do wykonywania pomiarów elektrycznych' },
    ],
  },
  {
    title: 'Cieplne i Sanitarne (SEP Grupa G2)',
    options: [
      { id: 'sep_g2_operation', label: 'Uprawnienia SEP G2 (Cieplne) – Eksploatacja (E)' },
      { id: 'sep_g2_supervision', label: 'Uprawnienia SEP G2 (Cieplne) – Dozór (D)' },
    ],
  },
  {
    title: 'Gazowe (SEP Grupa G3)',
    options: [
      { id: 'sep_g3_operation', label: 'Uprawnienia SEP G3 (Gazowe) – Eksploatacja (E)' },
      { id: 'sep_g3_supervision', label: 'Uprawnienia SEP G3 (Gazowe) – Dozór (D)' },
      { id: 'gas_inspections', label: 'Uprawnienia do okresowych przeglądów instalacji gazowych' },
    ],
  },
  {
    title: 'Prace Wysokościowe',
    options: [
      { id: 'height_rope_access', label: 'Uprawnienia do prac na wysokościach (Dostęp linowy / Alpinizm)' },
      { id: 'height_building_access', label: 'Uprawnienia do prac na wysokościach (Dostęp budowlany)' },
    ],
  },
  {
    title: 'Bezpieczeństwo i PPOŻ',
    options: [
      { id: 'fire_systems', label: 'Uprawnienia do przeglądów i konserwacji systemów PPOŻ (SAP, oddymianie)' },
      { id: 'emergency_lighting', label: 'Uprawnienia do konserwacji oświetlenia awaryjnego i ewakuacyjnego' },
      { id: 'extinguisher_hydrant', label: 'Uprawnienia do legalizacji gaśnic i hydrantów' },
    ],
  },
  {
    title: 'Dozór Techniczny (UDT) i Specjalistyczne',
    options: [
      { id: 'udt_elevators', label: 'Uprawnienia UDT – Konserwacja dźwigów osobowych i towarowych (Windy)' },
      { id: 'udt_platforms', label: 'Uprawnienia UDT – Konserwacja podestów ruchomych i podnośników' },
      { id: 'f_gas', label: 'Certyfikat F-Gaz (Klimatyzacja i Pompy ciepła)' },
      { id: 'chimney_master', label: 'Dyplom Mistrza Kominiarskiego (Przeglądy przewodów kominowych)' },
      { id: 'energy_certificate', label: 'Uprawnienia do sporządzania świadectw charakterystyki energetycznej' },
    ],
  },
];

export const ALL_PROFESSIONAL_QUALIFICATION_IDS = PROFESSIONAL_QUALIFICATION_GROUPS.flatMap(g =>
  g.options.map(o => o.id),
);

const PROFESSIONAL_QUALIFICATION_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  PROFESSIONAL_QUALIFICATION_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.id, option.label]),
  ),
);

export function professionalQualificationLabel(id: string): string {
  return PROFESSIONAL_QUALIFICATION_LABEL_BY_ID[id] ?? id;
}

export function parseProfessionalLicenseTypes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(ALL_PROFESSIONAL_QUALIFICATION_IDS);
  return raw.filter((id): id is string => typeof id === 'string' && allowed.has(id));
}
