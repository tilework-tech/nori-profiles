/**
 * API client for the Nori profile registry
 *
 * The registry is a profile registry for Nori profiles.
 * Read operations (search, metadata, download) are public.
 * Write operations (upload) require authentication.
 */

export const PROFILE_REGISTRY_URL = "https://registrar.tilework.tech";

/**
 * Profile metadata from the registry
 */
export type Profile = {
  id: string;
  name: string;
  description: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Profile metadata format (similar to npm packument)
 */
export type ProfileMetadata = {
  name: string;
  description?: string | null;
  "dist-tags": Record<string, string>;
  versions: Record<
    string,
    {
      name: string;
      version: string;
      dist?: {
        tarball?: string | null;
        shasum?: string | null;
      } | null;
    }
  >;
  time?: Record<string, string> | null;
  readme?: string | null;
};

export type SearchProfilesRequest = {
  query: string;
  limit?: number | null;
  offset?: number | null;
  registryUrl?: string | null;
  authToken?: string | null;
};

export type SearchProfilesOnRegistryRequest = {
  query: string;
  registryUrl: string;
  authToken?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export type GetProfileMetadataRequest = {
  profileName: string;
  registryUrl?: string | null;
  authToken?: string | null;
};

export type DownloadTarballRequest = {
  profileName: string;
  version?: string | null;
  registryUrl?: string | null;
  authToken?: string | null;
};

export type UploadProfileRequest = {
  profileName: string;
  version: string;
  archiveData: ArrayBuffer;
  description?: string | null;
  authToken: string;
  registryUrl?: string | null;
};

export type UploadProfileResponse = {
  name: string;
  version: string;
  description?: string | null;
  tarballSha: string;
  createdAt: string;
};

export const profileRegistryApi = {
  /**
   * Search for profiles in the registry
   * @param args - The search parameters
   *
   * @returns Array of matching profiles
   */
  searchProfiles: async (
    args: SearchProfilesRequest,
  ): Promise<Array<Profile>> => {
    const { query, limit, offset, registryUrl, authToken } = args;
    const baseUrl = registryUrl ?? PROFILE_REGISTRY_URL;

    const params = new URLSearchParams({ q: query });
    if (limit != null) {
      params.set("limit", limit.toString());
    }
    if (offset != null) {
      params.set("offset", offset.toString());
    }

    const url = `${baseUrl}/profiles/search?${params.toString()}`;

    const headers: Record<string, string> = {};
    if (authToken != null) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }))) as { error?: string };
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return (await response.json()) as Array<Profile>;
  },

  /**
   * Search for profiles on a specific registry
   * @param args - The search parameters including registry URL
   *
   * @returns Array of matching profiles
   */
  searchProfilesOnRegistry: async (
    args: SearchProfilesOnRegistryRequest,
  ): Promise<Array<Profile>> => {
    const { query, registryUrl, authToken, limit, offset } = args;

    const params = new URLSearchParams({ q: query });
    if (limit != null) {
      params.set("limit", limit.toString());
    }
    if (offset != null) {
      params.set("offset", offset.toString());
    }

    const url = `${registryUrl}/profiles/search?${params.toString()}`;

    const headers: Record<string, string> = {};
    if (authToken != null) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }))) as { error?: string };
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return (await response.json()) as Array<Profile>;
  },

  /**
   * Get the metadata for a profile
   * @param args - The request parameters
   *
   * @returns The profile metadata
   */
  getProfileMetadata: async (
    args: GetProfileMetadataRequest,
  ): Promise<ProfileMetadata> => {
    const { profileName, registryUrl, authToken } = args;
    const baseUrl = registryUrl ?? PROFILE_REGISTRY_URL;

    const url = `${baseUrl}/profiles/${profileName}`;

    const headers: Record<string, string> = {};
    if (authToken != null) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }))) as { error?: string };
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return (await response.json()) as ProfileMetadata;
  },

  /**
   * Download a tarball for a profile
   *
   * If no version is specified, the latest version is downloaded.
   * @param args - The download parameters
   *
   * @returns The tarball data as ArrayBuffer
   */
  downloadTarball: async (
    args: DownloadTarballRequest,
  ): Promise<ArrayBuffer> => {
    const { profileName, registryUrl, authToken } = args;
    const baseUrl = registryUrl ?? PROFILE_REGISTRY_URL;
    let { version } = args;

    // If no version specified, resolve latest from profile metadata
    if (version == null) {
      const profileMetadata = await profileRegistryApi.getProfileMetadata({
        profileName,
        registryUrl,
        authToken,
      });
      version = profileMetadata["dist-tags"].latest;

      if (version == null) {
        throw new Error(`No latest version found for profile: ${profileName}`);
      }
    }

    const tarballFilename = `${profileName}-${version}.tgz`;
    const url = `${baseUrl}/profiles/${profileName}/tarball/${tarballFilename}`;

    const headers: Record<string, string> = {};
    if (authToken != null) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }))) as { error?: string };
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return await response.arrayBuffer();
  },

  /**
   * Upload a profile to the registry
   * @param args - The upload parameters
   *
   * @returns The upload response with profile metadata
   */
  uploadProfile: async (
    args: UploadProfileRequest,
  ): Promise<UploadProfileResponse> => {
    const {
      profileName,
      version,
      archiveData,
      description,
      authToken,
      registryUrl,
    } = args;
    const baseUrl = registryUrl ?? PROFILE_REGISTRY_URL;

    const formData = new FormData();
    formData.append("archive", new Blob([archiveData]), `${profileName}.tgz`);
    formData.append("version", version);
    if (description != null) {
      formData.append("description", description);
    }

    const url = `${baseUrl}/profiles/${profileName}/profile`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }))) as { error?: string };
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    return (await response.json()) as UploadProfileResponse;
  },
};
