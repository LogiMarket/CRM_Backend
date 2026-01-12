import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { MacrosService } from './macros.service';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';

@Controller('api/macros')
export class MacrosController {
  constructor(private readonly macrosService: MacrosService) {}

  @Post()
  create(@Body(ValidationPipe) createMacroDto: CreateMacroDto) {
    return this.macrosService.create(createMacroDto);
  }

  @Get()
  findAll() {
    return this.macrosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.macrosService.findOne(id);
  }

  @Get('shortcut/:shortcut')
  findByShortcut(@Param('shortcut') shortcut: string) {
    return this.macrosService.findByShortcut(shortcut);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMacroDto: UpdateMacroDto,
  ) {
    return this.macrosService.update(id, updateMacroDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.macrosService.remove(id);
  }
}
