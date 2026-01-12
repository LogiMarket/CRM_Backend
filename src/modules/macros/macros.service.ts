import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Macro } from './entities/macro.entity';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';

@Injectable()
export class MacrosService {
  constructor(
    @InjectRepository(Macro)
    private macroRepository: Repository<Macro>,
  ) {}

  async create(createMacroDto: CreateMacroDto) {
    return this.macroRepository.save(createMacroDto);
  }

  async findAll() {
    return this.macroRepository.find({
      where: { is_active: true },
      relations: ['created_by'],
    });
  }

  async findOne(id: string) {
    return this.macroRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });
  }

  async findByShortcut(shortcut: string) {
    return this.macroRepository.findOne({
      where: { shortcut },
    });
  }

  async findByUser(userId: string) {
    return this.macroRepository.find({
      where: { created_by_id: userId, is_active: true },
    });
  }

  async update(id: string, updateMacroDto: UpdateMacroDto) {
    await this.macroRepository.update(id, updateMacroDto);
    return this.findOne(id);
  }

  async incrementUsage(id: string) {
    await this.macroRepository.increment({ id }, 'usage_count', 1);
  }

  async remove(id: string) {
    await this.macroRepository.delete(id);
  }
}
