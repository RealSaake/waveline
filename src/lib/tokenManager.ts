export class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getValidToken(): Promise<string | null> {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_token_expires_at');
    
    if (!token) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    if (expiresAt && Date.now() > (parseInt(expiresAt) - 5 * 60 * 1000)) {
      return await this.refreshToken();
    }

    return token;
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async performRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (!refreshToken) {
      console.log('No refresh token available, need to re-authenticate');
      this.clearTokens();
      return null;
    }

    try {
      const response = await fetch('/api/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
        if (data.expires_in) {
          const expiresAt = Date.now() + (data.expires_in * 1000);
          localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
        }

        console.log('Token refreshed successfully');
        return data.access_token;
      } else {
        console.error('Token refresh failed:', response.status);
        this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return null;
    }
  }

  clearTokens(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
  }
}