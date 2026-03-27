import fs from "node:fs";
import path from "node:path";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ApaleoTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

export interface ApaleoProperty {
  id: string;
  name: string;
  city?: string;
  countryCode?: string;
  addressLine1?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface ApaleoUnitGroup {
  id: string;
  propertyId: string;
  name: string;
  description?: string;
  maxPersons?: number;
  bedroomCount?: number;
  propertySizeSqm?: number;
  workspaceType?: "PRIVATE_OFFICE" | "STUDIO" | "MEETING_ROOM" | "HOME_OFFICE" | "HYBRID_SPACE";
  connectivity?: {
    declaredDownloadMbps: number;
    declaredUploadMbps: number;
    networkType?: "WIFI" | "WIRED" | "BOTH";
  };
  amenities?: Array<{
    category: string;
    name: string;
    quantity?: number;
  }>;
}

export interface ApaleoRatePlan {
  id: string;
  propertyId?: string;
  unitGroupId?: string;
  code?: string;
  name: string;
  currency?: string;
  pricePerDayCents?: number;
  cancellationPolicy?: "FLEXIBLE" | "MODERATE" | "STRICT";
}

export interface ApaleoReservation {
  id: string;
  status?: string;
  unitGroupId?: string;
  ratePlanId?: string;
  arrival?: string;
  departure?: string;
  adults?: number;
  totalGrossAmount?: {
    amount?: number;
    currency?: string;
  };
  booker?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface ApaleoReservationWebhook {
  accountCode?: string;
  propertyId?: string;
  topic?: string;
  eventType?: string;
  data?: {
    entityId?: string;
  };
}

export interface ApaleoAriPayload {
  accountCode?: string;
  propertyId?: string;
  ratePlanId?: string;
  unitGroupId?: string;
  updates?: Array<{
    from: string;
    to: string;
    availability?: number;
    price?: {
      amount: number;
      currency: string;
    };
  }>;
}

export interface ApaleoCredentials {
  apiBaseUrl: string;
  identityBaseUrl: string;
  clientId?: string | null;
  clientSecret?: string | null;
  accessToken?: string | null;
  redirectUri?: string | null;
  distributionBaseUrl?: string | null;
  webhookBaseUrl?: string | null;
  fixtureDir?: string | null;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function parseJsonResponse<T>(text: string): T {
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function readFixture<T>(fixtureDir: string, name: string): T {
  const fixturePath = path.join(fixtureDir, name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as T;
}

export class ApaleoClient {
  private readonly apiBaseUrl: string;
  private readonly identityBaseUrl: string;
  private readonly distributionBaseUrl: string;
  private readonly webhookBaseUrl: string;
  private readonly clientId?: string | null;
  private readonly clientSecret?: string | null;
  private readonly accessToken?: string | null;
  private readonly redirectUri?: string | null;
  private readonly fixtureDir?: string | null;

  constructor(credentials: ApaleoCredentials) {
    this.apiBaseUrl = normalizeBaseUrl(credentials.apiBaseUrl);
    this.identityBaseUrl = normalizeBaseUrl(credentials.identityBaseUrl);
    this.distributionBaseUrl = normalizeBaseUrl(
      credentials.distributionBaseUrl || "https://api.apaleo.com"
    );
    this.webhookBaseUrl = normalizeBaseUrl(
      credentials.webhookBaseUrl || "https://webhook.apaleo.com"
    );
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.accessToken = credentials.accessToken;
    this.redirectUri = credentials.redirectUri;
    this.fixtureDir = credentials.fixtureDir;
  }

  private async requestJson<T>(url: string, init: RequestInit = {}) {
    if (this.fixtureDir) {
      throw new Error("Fixture mode does not support arbitrary requestJson calls.");
    }

    const headers = new Headers(init.headers || {});
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (this.accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Apaleo request failed (${response.status}): ${text.slice(0, 500)}`);
    }

    return parseJsonResponse<T>(text);
  }

  private async postForm<T>(url: string, body: URLSearchParams) {
    if (this.fixtureDir) {
      if (url.endsWith("/connect/token")) {
        return readFixture<T>(this.fixtureDir, "token-response.json");
      }
      throw new Error("Fixture mode does not support this form endpoint.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Apaleo token request failed (${response.status}): ${text.slice(0, 500)}`);
    }

    return parseJsonResponse<T>(text);
  }

  async exchangeCodeForTokens(code: string) {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error("Apaleo OAuth clientId, clientSecret, and redirectUri are required.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
    });

    return this.postForm<ApaleoTokenResponse>(`${this.identityBaseUrl}/connect/token`, body);
  }

  async refreshAccessToken(refreshToken: string) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Apaleo OAuth clientId and clientSecret are required.");
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    return this.postForm<ApaleoTokenResponse>(`${this.identityBaseUrl}/connect/token`, body);
  }

  async listProperties() {
    if (this.fixtureDir) {
      return readFixture<ApaleoProperty[]>(this.fixtureDir, "properties.json");
    }

    return this.requestJson<ApaleoProperty[]>(`${this.apiBaseUrl}/inventory/v1/properties`);
  }

  async listUnitGroups() {
    if (this.fixtureDir) {
      return readFixture<ApaleoUnitGroup[]>(this.fixtureDir, "unit-groups.json");
    }

    return this.requestJson<ApaleoUnitGroup[]>(`${this.apiBaseUrl}/inventory/v1/unit-groups`);
  }

  async listRatePlans() {
    if (this.fixtureDir) {
      return readFixture<ApaleoRatePlan[]>(this.fixtureDir, "rate-plans.json");
    }

    return this.requestJson<ApaleoRatePlan[]>(`${this.apiBaseUrl}/rateplan/v1/rate-plans`);
  }

  async createBooking(payload: Record<string, JsonValue>) {
    if (this.fixtureDir) {
      return readFixture<Record<string, JsonValue>>(this.fixtureDir, "create-booking-response.json");
    }

    return this.requestJson<Record<string, JsonValue>>(
      `${this.distributionBaseUrl}/booking/v1/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  }

  async createWebhookSubscription(payload: Record<string, JsonValue>) {
    if (this.fixtureDir) {
      return readFixture<Record<string, JsonValue>>(
        this.fixtureDir,
        "webhook-subscription-response.json"
      );
    }

    return this.requestJson<Record<string, JsonValue>>(
      `${this.webhookBaseUrl}/v1/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  }

  async createAriSubscription(payload: Record<string, JsonValue>) {
    if (this.fixtureDir) {
      return readFixture<Record<string, JsonValue>>(this.fixtureDir, "ari-subscription-response.json");
    }

    return this.requestJson<Record<string, JsonValue>>(
      `${this.distributionBaseUrl}/channel/v1/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  }

  async getReservation(reservationId: string) {
    if (this.fixtureDir) {
      return readFixture<ApaleoReservation>(this.fixtureDir, "reservation-detail.json");
    }

    return this.requestJson<ApaleoReservation>(
      `${this.apiBaseUrl}/booking/v1/reservations/${encodeURIComponent(reservationId)}`
    );
  }

  async listReservations() {
    if (this.fixtureDir) {
      return readFixture<ApaleoReservation[]>(this.fixtureDir, "reservations.json");
    }

    return this.requestJson<ApaleoReservation[]>(`${this.apiBaseUrl}/booking/v1/reservations`);
  }

  async getAriSnapshot() {
    if (this.fixtureDir) {
      return readFixture<ApaleoAriPayload[]>(this.fixtureDir, "ari-snapshot.json");
    }

    throw new Error("Live ARI snapshot retrieval is not configured yet.");
  }
}
