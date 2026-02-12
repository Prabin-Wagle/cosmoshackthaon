import axios, { AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-fallback-key';

if (!import.meta.env.VITE_ENCRYPTION_KEY) {
    console.warn("VITE_ENCRYPTION_KEY is not set! Encryption will not work correctly.");
}

const axiosClient = axios.create({
    baseURL: 'https://notelibraryapp.com',
});


axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response: AxiosResponse) => {


        if (response.data && response.data.encrypted === true && response.data.payload) {

            try {
                const encryptedBase64 = response.data.payload;

                const decodedString = atob(encryptedBase64);
                const parts = decodedString.split('::');

                if (parts.length !== 2) {
                    return response;
                }

                const iv = CryptoJS.enc.Base64.parse(btoa(parts[0]));
                const encryptedData = parts[1];



                const keyRaw = ENCRYPTION_KEY.substring(0, 32);
                const keyParsed = CryptoJS.enc.Utf8.parse(keyRaw);



                const bytes = CryptoJS.AES.decrypt(encryptedData, keyParsed, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });

                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

                if (!decryptedString) {
                    console.error("[Axios] Decryption Failed: Result is empty. KEY MISMATCH?");
                    return response;
                }


                response.data = JSON.parse(decryptedString);

            } catch (error) {
                console.error("[Axios] Decryption Exception:", error);
            }
        } else {
        }
        return response;
    },
    (error) => {
        console.error("[Axios] Network Error:", error);
        return Promise.reject(error);
    }
);

export default axiosClient;
