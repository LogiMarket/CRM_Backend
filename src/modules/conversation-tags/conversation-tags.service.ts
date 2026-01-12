import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationTag } from './entities/conversation-tag.entity';
import { CreateConversationTagDto } from './dto/create-conversation-tag.dto';

@Injectable()
export class ConversationTagsService {
  constructor(
    @InjectRepository(ConversationTag)
    private tagRepository: Repository<ConversationTag>,
  ) {}

  async create(createTagDto: CreateConversationTagDto) {
    return this.tagRepository.save(createTagDto);
  }

  async findAll() {
    return this.tagRepository.find();
  }

  async findOne(id: string) {
    return this.tagRepository.findOne({
      where: { id },
    });
  }

  async findByConversation(conversationId: string) {
    return this.tagRepository.find({
      where: { conversation_id: conversationId },
    });
  }

  async remove(id: string) {
    await this.tagRepository.delete(id);
  }

  async removeByConversation(conversationId: string) {
    await this.tagRepository.delete({ conversation_id: conversationId });
  }
}
