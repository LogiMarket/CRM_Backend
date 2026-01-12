import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { ConversationTagsService } from './conversation-tags.service';
import { CreateConversationTagDto } from './dto/create-conversation-tag.dto';

@Controller('api/conversation-tags')
export class ConversationTagsController {
  constructor(
    private readonly conversationTagsService: ConversationTagsService,
  ) {}

  @Post()
  create(@Body(ValidationPipe) createTagDto: CreateConversationTagDto) {
    return this.conversationTagsService.create(createTagDto);
  }

  @Get()
  findAll() {
    return this.conversationTagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationTagsService.findOne(id);
  }

  @Get('conversation/:conversationId')
  findByConversation(@Param('conversationId') conversationId: string) {
    return this.conversationTagsService.findByConversation(conversationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conversationTagsService.remove(id);
  }
}
