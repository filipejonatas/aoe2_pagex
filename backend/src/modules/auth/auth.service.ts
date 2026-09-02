import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException('Email or username is already in use');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash: await hash(dto.password, 12),
      },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    return { user, accessToken: await this.sign(user.id, user.username) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      user: { id: user.id, email: user.email, username: user.username },
      accessToken: await this.sign(user.id, user.username),
    };
  }

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, username: true, createdAt: true, aoePlayer: true },
    });
  }

  private sign(sub: string, username: string) {
    return this.jwt.signAsync({ sub, username });
  }
}
