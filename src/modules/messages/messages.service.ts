import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async create(createMessageDto: CreateMessageDto) {
    const message = this.messageRepository.create(createMessageDto as any);
    return this.messageRepository.save(message);
  }

  async findAll() {
    return this.messageRepository.find({
      relations: ['conversation', 'sender'],
    });
  }

  async findOne(id: string) {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['conversation', 'sender'],
    });
  }

  async findByConversation(conversationId: string) {
    return this.messageRepository.find({
      where: { conversation_id: conversationId },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });
  }

  async update(id: string, updateMessageDto: UpdateMessageDto) {
    const updateData = this.messageRepository.create(updateMessageDto as any);
    await this.messageRepository.update(id, updateData as any);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.messageRepository.delete(id);
  }
}
