export interface Visual {
  version: number;
  seed: string;
  archetype: 'rocky' | 'rocky_candidate' | 'gas_giant' | 'ice_giant' | 'unknown';
  palette: {
    base: string;
    secondary: string;
    accent: string;
    dark: string;
  };
  surface: {
    noise_scale: number;
    noise_octaves: number;
    noise_persistence: number;
    mountain_strength: number;
    ridge_sharpness: number;
    crater_density: number;
    crater_size: number;
    crater_depth: number;
    ocean_coverage: number;
    roughness: number;
  };
  atmosphere: {
    enabled: boolean;
    color: string;
    opacity: number;
    glow: number;
    clouds: number;
  };
}

export type HZStatus =
  | 'inside'
  | 'partially_inside'
  | 'outside'
  | 'too_hot'
  | 'too_cold'
  | 'unknown';

export interface Planet {
  id: string;
  name: string;
  host_star: string;
  radius_earth: number | null;
  mass_earth: number | null;
  density: number | null;
  eq_temp_k: number | null;
  insolation: number | null;
  semi_major_axis_au: number | null;
  orbital_period_days: number | null;
  eccentricity: number | null;
  inclination_deg: number | null;
  argument_periastron_deg: number | null;
  periastron_time_jd: number | null;
  star_temp_k: number | null;
  star_radius_solar: number | null;
  star_mass_solar: number | null;
  star_luminosity_log: number | null;
  star_spectral_type: string | null;
  discovery_year: number | null;
  discovery_method: string | null;
  esi: number;
  habitability_index: number;
  hz_status: HZStatus;
  data_completeness: number;
  visual?: Visual;
}

export interface SyncStatus {
  last_started_at: string | null;
  last_success_at: string | null;
  last_error: string;
  rows_affected: number;
  planets_total: number;
}
