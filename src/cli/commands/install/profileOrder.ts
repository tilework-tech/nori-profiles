/**
 * Profile ordering utilities for the installer
 *
 * Profiles are displayed in a specific categorized order:
 * 1. Recommended profile (senior-swe)
 * 2. Additional known profiles (amol, product-manager)
 * 3. Custom profiles (any other profiles)
 *
 * This module ensures the selection index maps to the correct profile
 * based on display order, not array index order.
 */

export type Profile = {
  name: string;
  description: string;
};

/**
 * Known profiles that get special treatment in display order.
 * These profiles are displayed first in their specific categories.
 */
export const KNOWN_PROFILES = ["senior-swe", "amol", "product-manager"];

/**
 * The recommended profile displayed first.
 */
export const RECOMMENDED_PROFILE = "senior-swe";

/**
 * Additional profiles displayed after the recommended one.
 */
export const ADDITIONAL_PROFILES = ["amol", "product-manager"];

/**
 * Orders profiles for display in the installer.
 *
 * Display order:
 * 1. senior-swe (recommended)
 * 2. amol
 * 3. product-manager
 * 4+ Custom profiles (anything not in KNOWN_PROFILES)
 *
 * @param args - Configuration arguments
 * @param args.profiles - Array of profiles in any order
 *
 * @returns Profiles sorted in display order
 */
export const orderProfilesForDisplay = (args: {
  profiles: Array<Profile>;
}): Array<Profile> => {
  const { profiles } = args;

  const displayOrderedProfiles: Array<Profile> = [];

  // 1. Add recommended profile (senior-swe) first
  const recommendedProfile = profiles.find(
    (p) => p.name === RECOMMENDED_PROFILE,
  );
  if (recommendedProfile) {
    displayOrderedProfiles.push(recommendedProfile);
  }

  // 2. Add additional known profiles (amol, product-manager) in order
  for (const additionalName of ADDITIONAL_PROFILES) {
    const profile = profiles.find((p) => p.name === additionalName);
    if (profile) {
      displayOrderedProfiles.push(profile);
    }
  }

  // 3. Add custom profiles (anything not in KNOWN_PROFILES)
  const customProfiles = profiles.filter(
    (p) => !KNOWN_PROFILES.includes(p.name),
  );
  displayOrderedProfiles.push(...customProfiles);

  return displayOrderedProfiles;
};
