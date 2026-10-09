/**
 * Utility functions for clean phone number extraction, formatting, and dialing.
 * Ensures that no label text, prefix codes, or extra digits are passed to the mobile dialer.
 */

export function extractCleanPhoneNumber(contactDetails?: string | null): string {
  if (!contactDetails) return "";
  const firstPart = contactDetails.split("|")[0] || "";

  // Strip leading labels like "Phone:", "Tel:", "Mobile:", "Ph:", "Contact:", "Mob:", "Cell:", etc.
  let cleaned = firstPart
    .replace(/^(phone|tel|mobile|mob|cell|ph|contact|call|client\s*phone|no|ph\.no)\s*[:\-.]?\s*/i, "")
    .trim();

  // If there are words or text before the phone number (e.g. "Customer 9876543210" or "User: Chetan 9876543210"),
  // isolate the phone number portion:
  const match = cleaned.match(/(?:\+?\d{1,4}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/);
  if (match) {
    cleaned = match[0].trim();
  }

  return cleaned;
}

export function getCleanTelUri(contactDetails?: string | null): string {
  const phone = extractCleanPhoneNumber(contactDetails);
  if (!phone) return "";

  // Retain only valid telecom characters (+ and digits 0-9)
  let raw = phone.replace(/[^\d+]/g, "");

  // Fix: When opened on mobile dialers, additional digits before the entered actual phone number
  // frequently occur when:
  // 1. A 10-digit number (e.g. standard Indian mobile 9876543210) has a country code prefix without "+": 919876543210 (12 digits)
  //    Mobile dialers do not know 91 is a country code unless there is a +, so it treats 91 as extra prefix digits.
  // 2. A 10-digit number has a trunk "0" prefix: 09876543210 (11 digits) -> strip 0
  // 3. A 10-digit number has "+91": +919876543210 (13 chars) -> strip +91 so local dialer opens pure 10-digit entered number
  if (raw.startsWith("+91") && raw.length === 13) {
    raw = raw.slice(3);
  } else if (raw.startsWith("91") && raw.length === 12) {
    raw = raw.slice(2);
  } else if (raw.startsWith("0") && raw.length === 11) {
    raw = raw.slice(1);
  } else if (raw.startsWith("+")) {
    raw = raw.slice(1);
  }

  // Pure digits only
  const digitsOnly = raw.replace(/\D/g, "");
  return digitsOnly ? `tel:${digitsOnly}` : "";
}

export function extractSecondaryContact(contactDetails?: string | null): string {
  if (!contactDetails || !contactDetails.includes("|")) return "";
  return contactDetails.split("|").slice(1).join("|").trim();
}
