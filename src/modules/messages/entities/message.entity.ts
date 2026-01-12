import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
@Index(['conversation_id'])
@Index(['sender_id'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({
    type: 'enum',
    enum: ['user', 'contact'],
  })
  sender_type: 'user' | 'contact';

  @Column({ type: 'uuid', nullable: true })
  sender_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'document', 'audio', 'video'],
    default: 'text',
  })
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';

  @Column({ type: 'boolean', default: false })
  is_from_whatsapp: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  whatsapp_message_id: string; // Twilio message SID

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Conversation, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.sent_messages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
