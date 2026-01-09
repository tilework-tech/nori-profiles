/**
 * Tests for profile ordering in the installer
 *
 * Bug: Selecting profile #2 (amol) was loading "documenter" instead because
 * the selection logic used the original array index instead of display order.
 *
 * These tests verify that orderProfilesForDisplay correctly orders profiles
 * regardless of the input order.
 */
import { describe, it, expect } from "vitest";

import {
  orderProfilesForDisplay,
  KNOWN_PROFILES,
  RECOMMENDED_PROFILE,
  ADDITIONAL_PROFILES,
} from "./profileOrder.js";

describe("orderProfilesForDisplay", () => {
  it("should order profiles with senior-swe first, then amol, then product-manager", () => {
    // Arrange: Profiles in ALPHABETICAL order (not display order)
    const scrambledProfiles = [
      { name: "amol", description: "Amol's preferred settings" },
      { name: "product-manager", description: "PM profile" },
      { name: "senior-swe", description: "General purpose profile" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles: scrambledProfiles });

    // Assert: Display order should be: senior-swe, amol, product-manager
    expect(ordered.map((p) => p.name)).toEqual([
      "senior-swe",
      "amol",
      "product-manager",
    ]);
  });

  it("should place custom profiles after known profiles", () => {
    // Arrange: Custom profile at the start of the array
    const scrambledProfiles = [
      { name: "custom-profile", description: "A custom user profile" },
      { name: "senior-swe", description: "General purpose profile" },
      { name: "amol", description: "Amol's preferred settings" },
      { name: "product-manager", description: "PM profile" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles: scrambledProfiles });

    // Assert: custom-profile should be at position 4 (index 3)
    expect(ordered.map((p) => p.name)).toEqual([
      "senior-swe",
      "amol",
      "product-manager",
      "custom-profile",
    ]);
  });

  it("should handle multiple custom profiles in their original relative order", () => {
    // Arrange: Multiple custom profiles interspersed
    const scrambledProfiles = [
      { name: "documenter", description: "Documentation profile" },
      { name: "none", description: "Minimal profile" },
      { name: "senior-swe", description: "General purpose profile" },
      { name: "onboarding-wizard", description: "Wizard profile" },
      { name: "amol", description: "Amol's preferred settings" },
      { name: "product-manager", description: "PM profile" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles: scrambledProfiles });

    // Assert: Known profiles first, then custom profiles in original order
    expect(ordered.map((p) => p.name)).toEqual([
      "senior-swe",
      "amol",
      "product-manager",
      "documenter",
      "none",
      "onboarding-wizard",
    ]);
  });

  it("should handle missing known profiles gracefully", () => {
    // Arrange: Only senior-swe and custom profiles (no amol or product-manager)
    const profiles = [
      { name: "custom-profile", description: "Custom" },
      { name: "senior-swe", description: "General purpose profile" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles });

    // Assert: senior-swe first, then custom
    expect(ordered.map((p) => p.name)).toEqual([
      "senior-swe",
      "custom-profile",
    ]);
  });

  it("should handle only custom profiles (no known profiles)", () => {
    // Arrange: Only custom profiles
    const profiles = [
      { name: "custom-a", description: "Custom A" },
      { name: "custom-b", description: "Custom B" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles });

    // Assert: Custom profiles in original order
    expect(ordered.map((p) => p.name)).toEqual(["custom-a", "custom-b"]);
  });

  it("should handle empty profiles array", () => {
    // Act
    const ordered = orderProfilesForDisplay({ profiles: [] });

    // Assert
    expect(ordered).toEqual([]);
  });

  it("should preserve profile descriptions during ordering", () => {
    // Arrange
    const scrambledProfiles = [
      { name: "amol", description: "Amol's preferred settings" },
      { name: "senior-swe", description: "General purpose profile" },
    ];

    // Act
    const ordered = orderProfilesForDisplay({ profiles: scrambledProfiles });

    // Assert: Descriptions should be preserved
    expect(ordered[0]).toEqual({
      name: "senior-swe",
      description: "General purpose profile",
    });
    expect(ordered[1]).toEqual({
      name: "amol",
      description: "Amol's preferred settings",
    });
  });

  it("should return profile at index 1 as amol when user selects 2", () => {
    // This test simulates the exact bug scenario:
    // User sees: 1=senior-swe, 2=amol, 3=product-manager, 4=documenter
    // User selects "2" → index 1 → should get "amol"
    // Bug was: profiles array had documenter at index 1, so user got documenter

    // Arrange: Profiles returned from getAvailableProfiles in scrambled order
    const scrambledProfiles = [
      { name: "amol", description: "Amol's preferred settings" },
      { name: "documenter", description: "Documentation profile" },
      { name: "product-manager", description: "PM profile" },
      { name: "senior-swe", description: "General purpose profile" },
    ];

    // Act: Order the profiles for display
    const ordered = orderProfilesForDisplay({ profiles: scrambledProfiles });

    // Assert: User selection "2" → index 1 → should be "amol"
    const userSelection = 2;
    const selectedIndex = userSelection - 1;
    expect(ordered[selectedIndex].name).toBe("amol");
  });
});

describe("KNOWN_PROFILES constant", () => {
  it("should include senior-swe, amol, and product-manager", () => {
    expect(KNOWN_PROFILES).toContain("senior-swe");
    expect(KNOWN_PROFILES).toContain("amol");
    expect(KNOWN_PROFILES).toContain("product-manager");
  });
});

describe("RECOMMENDED_PROFILE constant", () => {
  it("should be senior-swe", () => {
    expect(RECOMMENDED_PROFILE).toBe("senior-swe");
  });
});

describe("ADDITIONAL_PROFILES constant", () => {
  it("should include amol and product-manager in that order", () => {
    expect(ADDITIONAL_PROFILES).toEqual(["amol", "product-manager"]);
  });
});
