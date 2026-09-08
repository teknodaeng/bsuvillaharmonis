declare module 'bcryptjs' {
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
  export function hash(s: string, salt: number | string): Promise<string>;
  export function hashSync(s: string, salt?: number | string): string;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function getRounds(hash: string): number;
  export function getSalt(hash: string): string;

  export interface BcryptModule {
    genSalt: typeof genSalt;
    genSaltSync: typeof genSaltSync;
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
    getRounds: typeof getRounds;
    getSalt: typeof getSalt;
  }

  const bcrypt: BcryptModule;
  export default bcrypt;
}
