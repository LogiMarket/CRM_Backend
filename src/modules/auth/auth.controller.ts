import { Controller, Post, Get, Body, HttpCode, BadRequestException, Inject, UseGuards, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RolesService } from '../roles/roles.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth - Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private jwtService: JwtService,
    @Inject(UsersService) private usersService: UsersService,
    @Inject(RolesService) private rolesService: RolesService,
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

        // Rol por defecto: Agente
        const agentRole = await this.rolesService.findByName('Agente');

        const user: User = await this.usersService.create({
        email: body.email,
        password: body.password,
        full_name: body.name || body.email.split('@')[0],
          role_id: agentRole?.id || null,
      });

        // Cargar usuario con rol
      const userWithRole = await this.usersService.findByEmailWithRole(user.email);

        // Normalizar rol para JWT ('admin' | 'supervisor' | 'agent')
        const normalizeRole = (name?: string) => {
          const n = (name || '').toLowerCase();
          if (n.startsWith('admin')) return 'admin';
          if (n.startsWith('super')) return 'supervisor';
          if (n.startsWith('agente') || n.startsWith('agent')) return 'agent';
          return 'agent';
        };

        // Generar token JWT con rol
      const token = this.jwtService.sign(
        { 
          email: userWithRole.email, 
          sub: userWithRole.id,
            role: normalizeRole(userWithRole.role?.name),
        },
        { expiresIn: '7d' },
      );

      return {
        message: 'Usuario registrado exitosamente',
        access_token: token,
        token_type: 'Bearer',
        expires_in: '7d',
        user: {
          id: userWithRole.id,
          email: userWithRole.email,
          name: userWithRole.name,
          role: userWithRole.role?.name || null,
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
    description: 'Login exitoso. Retorna JWT token con información del usuario.',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'string', example: '7d' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', example: 'admin' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  async login(@Body() body: { email: string; password: string }) {
    try {
      // Buscar usuario por email con rol
      const user: User = await this.usersService.findByEmailWithRole(body.email);
      if (!user) {
        throw new BadRequestException('Email o contraseña inválidos');
      }

      // Validar contraseña
      const isValidPassword = await this.usersService.validatePassword(user, body.password);
      if (!isValidPassword) {
        throw new BadRequestException('Email o contraseña inválidos');
      }

      // Generar token JWT con información del rol
      const normalizeRole = (name?: string) => {
        const n = (name || '').toLowerCase();
        if (n.startsWith('admin')) return 'admin';
        if (n.startsWith('super')) return 'supervisor';
        if (n.startsWith('agente') || n.startsWith('agent')) return 'agent';
        return 'agent';
      };

      const token = this.jwtService.sign(
        { 
          email: user.email, 
          sub: user.id,
          role: normalizeRole(user.role?.name),
        },
        { expiresIn: '7d' },
      );

      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: '7d',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.name || null,
          role_id: user.role_id,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error al iniciar sesión');
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener información del usuario actual',
    description: 'Retorna la información del usuario autenticado basado en el JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        role_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o expirado',
  })
  async getMe(@Request() req) {
    // El usuario viene del JWT strategy
    const userId = req.user.sub;
    const user = await this.usersService.findByEmailWithRole(req.user.email);
    
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role?.name || null,
      role_id: user.role_id,
    };
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
      { email: 'test@example.com', sub: 'test-user', role: 'admin' },
      { expiresIn: '7d' },
    );

    return {
      access_token: token,
      message: 'Usa este token en el header Authorization: Bearer ' + token,
    };
  }
}
