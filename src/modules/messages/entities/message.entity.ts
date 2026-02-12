import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'varchar', length: 50 })
  sender_type: 'user' | 'contact';

  @Column({ type: 'uuid', nullable: true })
  sender_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'text',
  })
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker';

  @Column({ type: 'varchar', length: 255, nullable: true })
  media_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  media_mime_type: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  media_sha256: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  media_filename: string;

  @Column({ type: 'text', nullable: true })
  media_caption: string;

  @Column({ type: 'text', nullable: true })
  media_url: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  is_from_whatsapp: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  whatsapp_message_id: string;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Conversation, (conv) => conv.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.sent_messages, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
