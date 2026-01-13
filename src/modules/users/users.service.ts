import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      password_hash: hashedPassword,
      name: createUserDto.full_name,
      role_id: createUserDto.role_id,
      status: 'offline',
    });
    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role'],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  async findAgents(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role'],
      select: {
        id: true,
        name: true,
        email: true,
        role_id: true,
        status: true,
        created_at: true,
      },
    });
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findByEmailWithRole(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updateData: any = {};

    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.full_name !== undefined) {
      updateData.name = updateUserDto.full_name;
    }
    if (updateUserDto.role_id !== undefined) {
      updateData.role_id = updateUserDto.role_id;
    }

    await this.usersRepository.update(id, updateData);
    const updatedUser = await this.findOne(id);
    return updatedUser;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, {
      password_hash: hashedPassword,
    });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }
}
