import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(createConversationDto: CreateConversationDto) {
    const conversation = this.conversationRepository.create(createConversationDto as any);
    return this.conversationRepository.save(conversation);
  }

  async findAll() {
    return this.conversationRepository.find({
      relations: ['contact', 'assigned_agent', 'messages'],
    });
  }

  async findOne(id: string) {
    return this.conversationRepository.findOne({
      where: { id },
      relations: ['contact', 'assigned_agent', 'messages'],
    });
  }

  async findByContact(contactId: string) {
    return this.conversationRepository.find({
      where: { contact_id: contactId },
      relations: ['assigned_agent'],
    });
  }

  async findByAssignedAgent(agentId: string) {
    return this.conversationRepository.find({
      where: { assigned_agent_id: agentId },
      relations: ['contact', 'assigned_agent', 'messages'],
      order: { updated_at: 'DESC' },
    });
  }

  async assignAgent(conversationId: string, agentId: string) {
    await this.conversationRepository.update(conversationId, {
      assigned_agent_id: agentId,
    });
    return this.findOne(conversationId);
  }

  async update(id: string, updateConversationDto: UpdateConversationDto) {
    const updateData = this.conversationRepository.create(updateConversationDto as any);
    await this.conversationRepository.update(id, updateData as any);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.conversationRepository.delete(id);
  }
}
