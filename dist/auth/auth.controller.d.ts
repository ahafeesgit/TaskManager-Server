import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: {
        email: string;
        password: string;
        name?: string;
        role?: string;
    }): Promise<{
        name: string | null;
        id: string;
        email: string;
        password: string | null;
        googleId: string | null;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: string;
        };
    }>;
    getProfile(req: {
        user: any;
    }): any;
}
