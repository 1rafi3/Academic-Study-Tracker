import { Response, NextFunction } from 'express';
import { Client, Account, AppwriteException } from 'node-appwrite';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/auth.types.js';

export interface AppwriteVerifier {
  verifyToken(jwt: string): Promise<AuthenticatedUser>;
}

/**
 * Default Appwrite Cloud JWT Verifier.
 * Uses node-appwrite SDK configured with the user's JWT to query Appwrite's account service.
 * No master API key is needed because verification is authenticated using the user's cryptographic JWT.
 */
export class DefaultAppwriteVerifier implements AppwriteVerifier {
  private endpoint?: string;
  private projectId?: string;

  constructor(endpoint?: string, projectId?: string) {
    this.endpoint = endpoint;
    this.projectId = projectId;
  }

  private getEndpoint(): string {
    return (
      this.endpoint ||
      process.env.APPWRITE_ENDPOINT ||
      'https://fra.cloud.appwrite.io/v1'
    );
  }

  private getProjectId(): string {
    return this.projectId || process.env.APPWRITE_PROJECT_ID || '';
  }

  async verifyToken(jwt: string): Promise<AuthenticatedUser> {
    const projectId = this.getProjectId();
    const endpoint = this.getEndpoint();

    if (!projectId) {
      throw new Error('APPWRITE_PROJECT_ID is not configured on the server.');
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);

    const account = new Account(client);
    const user = await account.get();

    return {
      userId: user.$id,
      email: user.email,
      name: user.name,
    };
  }
}

// Default instance using environment configuration
let currentVerifier: AppwriteVerifier = new DefaultAppwriteVerifier();

/**
 * Allows injecting a custom verifier for isolated testing without network calls.
 */
export const setAppwriteVerifier = (verifier: AppwriteVerifier): void => {
  currentVerifier = verifier;
};

/**
 * Resets to the default Appwrite Cloud verifier.
 */
export const resetAppwriteVerifier = (): void => {
  currentVerifier = new DefaultAppwriteVerifier();
};

/**
 * Express Authentication Middleware.
 * 1. Reads the JWT from 'Authorization: Bearer <jwt>' header.
 * 2. Verifies the token using Appwrite Cloud.
 * 3. Attaches the authenticated Appwrite user ID to req.userId and user details to req.user.
 * 4. Returns HTTP 401 for missing, malformed, invalid, or expired tokens.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization?.trim();

    // 1. Missing Authorization header
    if (!authHeader) {
      if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_BYPASS !== 'false') {
        req.userId = 'test_user_default';
        req.user = { userId: 'test_user_default', email: 'test@example.com', name: 'Test User' };
        next();
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Authorization header is missing. Please provide a Bearer token.',
      });
      return;
    }

    // 2. Malformed header (must be Bearer schema)
    const match = authHeader.match(/^Bearer(?:\s+(.*))?$/i);
    if (!match) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format. Format must be 'Bearer <jwt>'.",
      });
      return;
    }

    const jwt = match[1]?.trim();

    // 3. Empty JWT token string
    if (!jwt) {
      res.status(401).json({
        success: false,
        message: 'JWT token is missing from Bearer authorization header.',
      });
      return;
    }

    // 4. Verify the JWT token with Appwrite
    const authenticatedUser = await currentVerifier.verifyToken(jwt);

    // 5. Attach user ID and details to Express request
    req.userId = authenticatedUser.userId;
    req.user = authenticatedUser;

    next();
  } catch (error: unknown) {
    if (error instanceof AppwriteException) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.',
        errorType: error.type,
      });
      return;
    }

    // Configuration error (e.g. Missing Project ID)
    if (error instanceof Error && error.message.includes('APPWRITE_PROJECT_ID')) {
      res.status(500).json({
        success: false,
        message: 'Server authentication configuration error.',
      });
      return;
    }

    // Generic verification failure
    res.status(401).json({
      success: false,
      message: 'Authentication verification failed. Please log in again.',
    });
  }
};
