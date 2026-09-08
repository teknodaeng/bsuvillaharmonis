export interface UserContext {
  id: string;
  username: string;
  name?: string | null;
  role: 'ADMIN' | 'NASABAH';
  is_active: number | boolean;
  nasabah_id?: string | null;
  nasabah?: any;
  [key: string]: any;
}

export type AppEnv = {
  Variables: {
    user: UserContext;
  };
};
