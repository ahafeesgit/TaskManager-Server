import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createUser(data: {
        email: string;
        password?: string;
        name?: string;
        role?: string;
        googleId?: string;
    }): Promise<User>;
}
