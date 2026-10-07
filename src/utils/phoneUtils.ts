/**
 * Utility functions for clean phone number extraction, formatting, and dialing.
 * Ensures that no label text (like "Phone:", "Tel:") is passed to the mobile dialer as digits.
 */

export function extractCleanPhoneNumber(contactDetails?: string | null): string {
  if (!contactDetails) return "";
  const firstPart = contactDetails.split("|")[0] || "";
  // Strip leading labels like "Phone:", "Tel:", "Mobile:", "Ph:", "Contact:", etc.
  return firstPart.replace(/^(phone|tel|mobile|ph|contact|call)\s*[:\-]?\s*/i, "").trim();
}

export function getCleanTelUri(contactDetails?: string | null): string {
  const phone = extractCleanPhoneNumber(contactDetails);
  if (!phone) return "";
  // Retain only valid telecom characters (+ and digits 0-9)
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  return digitsOnly ? `tel:${digitsOnly}` : "";
}

export function extractSecondaryContact(contactDetails?: string | null): string {
  if (!contactDetails || !contactDetails.includes("|")) return "";
  return contactDetails.split("|").slice(1).join("|").trim();
}
