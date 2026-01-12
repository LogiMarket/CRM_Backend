import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationTag } from './entities/conversation-tag.entity';
import { ConversationTagsService } from './conversation-tags.service';
import { ConversationTagsController } from './conversation-tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationTag])],
  providers: [ConversationTagsService],
  controllers: [ConversationTagsController],
  exports: [ConversationTagsService],
})
export class ConversationTagsModule {}
