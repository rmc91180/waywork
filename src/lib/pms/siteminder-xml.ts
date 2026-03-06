import { XMLBuilder, XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: true,
  format: false,
});

export function parseSoapEnvelope(xml: string) {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const envelope = (parsed.Envelope || parsed.envelope || parsed["soap:Envelope"]) as
    | Record<string, unknown>
    | undefined;

  if (!envelope || typeof envelope !== "object") {
    throw new Error("Invalid SOAP payload: missing Envelope.");
  }

  const header = (envelope.Header || envelope.header || {}) as Record<string, unknown>;
  const body = (envelope.Body || envelope.body || {}) as Record<string, unknown>;

  return {
    envelope,
    header,
    body,
  };
}

export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

export function readAttr(record: unknown, key: string): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>)[`@_${key}`];
  return typeof value === "string" ? value.trim() : "";
}

export function readText(record: unknown, key: string): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export function extractWsseCredentials(header: Record<string, unknown>) {
  const security =
    (header.Security as Record<string, unknown> | undefined) ||
    (header.security as Record<string, unknown> | undefined) ||
    {};

  const usernameToken =
    (security.UsernameToken as Record<string, unknown> | undefined) ||
    (security.usernameToken as Record<string, unknown> | undefined) ||
    {};

  return {
    username: readText(usernameToken, "Username") || readText(usernameToken, "username"),
    password: readText(usernameToken, "Password") || readText(usernameToken, "password"),
  };
}

export function buildSoapResponse(input: {
  rootName: string;
  success: boolean;
  echoToken?: string;
  timestamp?: string;
  code?: string;
  message?: string;
}) {
  const timestamp = input.timestamp || new Date().toISOString();
  const payload = {
    "soapenv:Envelope": {
      "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
      "@_xmlns:ota": "http://www.opentravel.org/OTA/2003/05",
      "soapenv:Body": {
        [`ota:${input.rootName}`]: {
          "@_Version": "1.0",
          "@_TimeStamp": timestamp,
          "@_EchoToken": input.echoToken || undefined,
          "ota:Success": input.success ? "" : undefined,
          "ota:Errors": input.success
            ? undefined
            : {
                "ota:Error": {
                  "@_Type": "3",
                  "@_Code": input.code || "400",
                  "#text": input.message || "Request could not be processed.",
                },
              },
        },
      },
    },
  };

  return `<?xml version="1.0" encoding="UTF-8"?>${builder.build(payload)}`;
}

export function buildWsseHeaderXml(username: string, password: string) {
  const escapedUsername = escapeXml(username);
  const escapedPassword = escapeXml(password);

  return `<wsse:Security><wsse:UsernameToken><wsse:Username>${escapedUsername}</wsse:Username><wsse:Password>${escapedPassword}</wsse:Password></wsse:UsernameToken></wsse:Security>`;
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
