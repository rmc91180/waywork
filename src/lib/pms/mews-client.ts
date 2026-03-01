type JsonRecord = Record<string, unknown>;

export interface MewsCredentials {
  apiBaseUrl: string;
  clientToken: string;
  connectionToken: string;
  accessToken?: string | null;
  enterpriseId?: string | null;
  clientName?: string | null;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

async function postJson(url: string, body: JsonRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Mews request failed (${response.status}): ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`
    );
  }

  return payload;
}

export class MewsClient {
  private readonly baseUrl: string;
  private readonly credentials: MewsCredentials;

  constructor(credentials: MewsCredentials) {
    this.credentials = credentials;
    this.baseUrl = normalizeBaseUrl(credentials.apiBaseUrl);
  }

  async channelManager(
    endpoint: string,
    payload: JsonRecord
  ): Promise<unknown> {
    const path = endpoint.replace(/^\/+/, "");
    const body: JsonRecord = {
      ClientToken: this.credentials.clientToken,
      ConnectionToken: this.credentials.connectionToken,
      Client: this.credentials.clientName || "WayWork PMS Sync/1.0",
      ...payload,
    };

    return postJson(`${this.baseUrl}/api/channelManager/v1/${path}`, body);
  }

  async connector(endpoint: string, payload: JsonRecord): Promise<unknown> {
    if (!this.credentials.accessToken || !this.credentials.enterpriseId) {
      throw new Error("Missing Mews Connector API credentials.");
    }

    const path = endpoint.replace(/^\/+/, "");
    const body: JsonRecord = {
      ClientToken: this.credentials.clientToken,
      AccessToken: this.credentials.accessToken,
      EnterpriseId: this.credentials.enterpriseId,
      Client: this.credentials.clientName || "WayWork PMS Sync/1.0",
      ...payload,
    };

    return postJson(`${this.baseUrl}/api/connector/v1/${path}`, body);
  }

  async processGroup(payload: JsonRecord) {
    return this.channelManager("processGroup", payload);
  }

  async requestAriUpdate(payload: JsonRecord) {
    return this.channelManager("requestAriUpdate", payload);
  }

  async processGroupConfirmation(payload: JsonRecord) {
    return this.channelManager("processGroupConfirmation", payload);
  }

  async updateAvailabilityConfirmation(payload: JsonRecord) {
    return this.channelManager("updateAvailabilityConfirmation", payload);
  }

  async updatePricesConfirmation(payload: JsonRecord) {
    return this.channelManager("updatePricesConfirmation", payload);
  }

  async updateRestrictionsConfirmation(payload: JsonRecord) {
    return this.channelManager("updateRestrictionsConfirmation", payload);
  }
}
