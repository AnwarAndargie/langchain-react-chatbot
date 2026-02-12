/** User returned from auth API */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
}

/** Response from login/register */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}
