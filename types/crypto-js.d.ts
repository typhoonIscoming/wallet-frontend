declare module 'crypto-js' {
	export interface WordArray {
		toString(encoder?: any): string;
		words: number[];
		sigBytes: number;
	}

	export interface CipherParams {
		ciphertext: WordArray;
		key?: WordArray;
		iv?: WordArray;
		salt?: WordArray;
		algorithm?: any;
		mode?: any;
		padding?: any;
		blockSize?: number;
		formatter?: any;
	}

	export const AES: {
		encrypt(message: string, key: string): CipherParams;
		decrypt(ciphertext: string | CipherParams, key: string): WordArray;
	};

	export const SHA256: {
		(message: string): WordArray;
		encrypt(message: string): WordArray;
	};

	export namespace enc {
		const Utf8: any;
		const Hex: any;
		const Base64: any;
	}
}
