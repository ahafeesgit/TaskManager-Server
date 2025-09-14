import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private usersService;
    private prisma;
    private jwtService;
    constructor(usersService: UsersService, prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<{
        name: string | null;
        id: string;
        email: string;
        googleId: string | null;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    login(email: string, password: string): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: string;
        };
    } | null>;
    register(data: {
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
}
