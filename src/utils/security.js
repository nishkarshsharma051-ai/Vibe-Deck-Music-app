import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';

/**
 * Cyber Security Utility Functions
 * Note: While hashing can be done on the frontend for learning or specific use cases 
 * (like generating a unique fingerprint), sensitive data like user passwords should 
 * ideally be hashed on a secure backend server before storing in a database.
 */

// ==========================================
// 1. SHA-256 Hashing (Fast, deterministic)
// Good for verifying data integrity, creating unique IDs from data.
// ==========================================
export const hashWithSHA256 = (data) => {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};

// ==========================================
// 2. Bcrypt Hashing (Slow, includes salt)
// Good for passwords (though normally done on backend). 
// The 'salt' ensures the same password hashes differently each time.
// ==========================================
export const hashPassword = (password) => {
  // 10 is the number of salt rounds. Higher is more secure but slower.
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
};

// Verify a password against a bcrypt hash
export const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

// ==========================================
// 3. AES Encryption (Two-way encryption)
// Good for encrypting data before storing in localStorage.
// ==========================================
const SECRET_KEY = "my-super-secret-key"; // In production, never hardcode this in frontend code!

export const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

export const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (error) {
    console.error("Failed to decrypt data", error);
    return null;
  }
};
