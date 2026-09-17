// BSCrypto.Library — crypto-js helpers shared by Bunny AI Studio client + server.
//
// Used to keep plaintext prompt text out of the HTTP POST body: the browser
// encrypts the text with a static shared key and the matching API route
// decrypts it before calling the AI provider. This is obfuscation for the
// wire payload only (the key ships with the bundle) — it is NOT a security
// boundary, so never put real secrets behind it.

import CryptoJS from "crypto-js";

/** Static shared key used to hide Image Generator prompt text in transit. */
export const BS_IMAGE_GENERATOR_KEY = "image-generator-key";

/**
 * Base64 prefix crypto-js emits for passphrase AES payloads ("Salted__"),
 * used to detect already-encrypted text without changing the request shape.
 */
const BS_ENCRYPTED_PREFIX = "U2FsdGVkX1";

/** Encrypt plain text into a crypto-js AES (OpenSSL salt) base64 string. */
export function encryptBSText(
  plainText: string,
  key: string = BS_IMAGE_GENERATOR_KEY,
): string {
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

/** Decrypt a crypto-js AES payload, returning null when it is not decryptable. */
export function decryptBSText(
  cipherText: string,
  key: string = BS_IMAGE_GENERATOR_KEY,
): string | null {
  try {
    const decrypted = CryptoJS.AES.decrypt(cipherText, key).toString(
      CryptoJS.enc.Utf8,
    );
    return decrypted || null;
  } catch {
    return null;
  }
}

/** Check whether a value looks like a crypto-js AES payload from encryptBSText. */
export function isBSEncryptedText(value: string): boolean {
  return value.startsWith(BS_ENCRYPTED_PREFIX);
}
