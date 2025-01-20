// src/utils/encryptor.ts
import CryptoJS from 'crypto-js';
import { Transform } from 'redux-persist';

const secretKey = 'your-secret-key';

export const encryptor = {
  in: (incomingState: any) => {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(incomingState), secretKey).toString();
      return encrypted;
    } catch (err) {
      console.error('Encryption failed', err);
      return incomingState;
    }
  },
  out: (outgoingState: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(outgoingState, secretKey);
      const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return decrypted;
    } catch (err) {
      console.error('Decryption failed', err);
      return outgoingState;
    }
  },
};

export function createEncryptor(): Transform<any, any> {
  return {
    in: encryptor.in,
    out: encryptor.out,
  };
}
