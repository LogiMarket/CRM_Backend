import { Controller, Post, Body, HttpCode, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { hash } from 'bcryptjs';

@ApiTags('Auth - Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private jwtService: JwtService,
    @Inject(UsersService) private usersService: UsersService,
  ) {}

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Registrarse',
    description: 'Crea una nueva cuenta de usuario y retorna un token JWT.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'agent@example.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'John Doe' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registro exitoso. Retorna usuario y JWT token.',
  })
  @ApiResponse({
    status: 400,
    description: 'El email ya está registrado',
  })
  async signup(@Body() body: { email: string; password: string; name?: string }) {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.usersService.findByEmail(body.email);
      if (existingUser) {
        throw new BadRequestException('El email ya está registrado');
      }

      // Hash password before saving
      const hashedPassword = await hash(body.password, 10);

      const user: User = await this.usersService.create({
        email: body.email,
        password: hashedPassword,
        name: body.name,
      });

      // Generar token JWT
      const token = this.jwtService.sign(
        { email: user.email, sub: user.id },
        { expiresIn: '7d' },
      );

      return {
        message: 'Usuario registrado exitosamente',
        access_token: token,
        token_type: 'Bearer',
        expires_in: '7d',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al registrar usuario');
    }
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica un usuario y retorna un token JWT válido por 7 días. ' +
      'Usa este token en el header Authorization: Bearer {token} para los demás endpoints.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'agent@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna JWT token.',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'string', example: '7d' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  async login(@Body() body: { email: string; password: string }) {
    try {
      // Buscar usuario por email
      const user: User = await this.usersService.findByEmail(body.email);
      if (!user) {
        throw new BadRequestException('Email o contraseña inválidos');
      }

      // Validar contraseña
      const isValidPassword = await this.usersService.validatePassword(user, body.password);
      if (!isValidPassword) {
        throw new BadRequestException('Email o contraseña inválidos');
      }

      // Generar token JWT
      const token = this.jwtService.sign(
        { email: user.email, sub: user.id },
        { expiresIn: '7d' },
      );

      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: '7d',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al iniciar sesión');
    }
  }

  @Post('test-token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generar token de prueba',
    description:
      'Genera un token JWT de prueba válido sin validar credenciales. Útil solo para testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token generado',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        message: {
          type: 'string',
          example: 'Usa este token en Authorization header: Bearer {token}',
        },
      },
    },
  })
  generateTestToken() {
    const token = this.jwtService.sign(
      { email: 'test@example.com', sub: 'test-user' },
      { expiresIn: '7d' },
    );

    return {
      access_token: token,
      message: 'Usa este token en el header Authorization: Bearer ' + token,
    };
  }
}
