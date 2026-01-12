import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Role> {
    return this.rolesRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async create(data: Partial<Role>): Promise<Role> {
    const role = this.rolesRepository.create(data);
    return this.rolesRepository.save(role);
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    await this.rolesRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.rolesRepository.update(id, { is_active: false });
  }

  async seedDefaultRoles(): Promise<void> {
    const existingRoles = await this.rolesRepository.count();
    if (existingRoles > 0) return;

    const defaultRoles = [
      {
        name: 'Administrador',
        description: 'Acceso completo al sistema',
        permissions: {
          conversations: { read: true, write: true, delete: true },
          contacts: { read: true, write: true, delete: true },
          users: { read: true, write: true, delete: true },
          orders: { read: true, write: true, delete: true },
          macros: { read: true, write: true, delete: true },
          settings: { read: true, write: true },
          reports: { read: true },
          whatsapp: { send: true, receive: true },
        },
      },
      {
        name: 'Agente',
        description: 'Acceso a conversaciones y contactos',
        permissions: {
          conversations: { read: true, write: true, delete: false },
          contacts: { read: true, write: true, delete: false },
          users: { read: false, write: false, delete: false },
          orders: { read: true, write: true, delete: false },
          macros: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          reports: { read: false },
          whatsapp: { send: true, receive: true },
        },
      },
      {
        name: 'Supervisor',
        description: 'Acceso a reportes y gestión de conversaciones',
        permissions: {
          conversations: { read: true, write: true, delete: true },
          contacts: { read: true, write: true, delete: false },
          users: { read: true, write: false, delete: false },
          orders: { read: true, write: true, delete: false },
          macros: { read: true, write: true, delete: true },
          settings: { read: true, write: false },
          reports: { read: true },
          whatsapp: { send: true, receive: true },
        },
      },
      {
        name: 'Usuario',
        description: 'Acceso solo lectura',
        permissions: {
          conversations: { read: true, write: false, delete: false },
          contacts: { read: true, write: false, delete: false },
          users: { read: false, write: false, delete: false },
          orders: { read: true, write: false, delete: false },
          macros: { read: true, write: false, delete: false },
          settings: { read: false, write: false },
          reports: { read: false },
          whatsapp: { send: false, receive: false },
        },
      },
    ];

    for (const roleData of defaultRoles) {
      await this.create(roleData);
    }
  }
}
