import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../decorators/roles.decorator';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body(ValidationPipe) createConversationDto: CreateConversationDto) {
    return this.conversationsService.create(createConversationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: any) {
    const user = request.user;
    const userRole = user?.role;
    // Si es agente, filtra solo conversaciones asignadas
    if (userRole === 'agent') {
      return this.conversationsService.findByAssignedAgent(user.id);
    }
    return this.conversationsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Get('contact/:contactId')
  @UseGuards(JwtAuthGuard)
  findByContact(@Param('contactId') contactId: string) {
    return this.conversationsService.findByContact(contactId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, updateConversationDto);
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard)
  assignAgent(
    @Param('id') id: string,
    @Body() body: { agent_id: string },
  ) {
    return this.conversationsService.assignAgent(id, body.agent_id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(id);
  }
}


