import { buildWsseHeaderXml } from "@/lib/pms/siteminder-xml";

export interface SiteMinderCredentials {
  endpointUrl: string;
  username: string;
  password: string;
}

function normalizeEndpointUrl(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function buildSoapEnvelope(bodyXml: string, wsseHeaderXml: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext">
  <soapenv:Header>
    ${wsseHeaderXml}
  </soapenv:Header>
  <soapenv:Body>
    ${bodyXml}
  </soapenv:Body>
</soapenv:Envelope>`;
}

export class SiteMinderClient {
  private readonly endpointUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(credentials: SiteMinderCredentials) {
    this.endpointUrl = normalizeEndpointUrl(credentials.endpointUrl);
    this.username = credentials.username;
    this.password = credentials.password;
  }

  async sendSoapRequest(action: string, bodyXml: string) {
    const payload = buildSoapEnvelope(bodyXml, buildWsseHeaderXml(this.username, this.password));

    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: action,
      },
      body: payload,
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`SiteMinder request failed (${response.status}): ${text.slice(0, 500)}`);
    }

    return {
      status: response.status,
      body: text,
      request: payload,
      action,
    };
  }

  async uploadReservation(bodyXml: string) {
    return this.sendSoapRequest("OTA_HotelResNotifRQ", bodyXml);
  }

  async updateAvailability(bodyXml: string) {
    return this.sendSoapRequest("OTA_HotelAvailNotifRQ", bodyXml);
  }

  async updateRates(bodyXml: string) {
    return this.sendSoapRequest("OTA_HotelRateAmountNotifRQ", bodyXml);
  }
}
