import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';

@Entity('conversation_tags')
export class ConversationTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'varchar', length: 100 })
  tag: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Conversation, (conv) => conv.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
