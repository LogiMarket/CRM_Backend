import { IsUUID, IsString } from 'class-validator';

export class CreateConversationTagDto {
  @IsUUID()
  conversation_id: string;

  @IsString()
  tag: string;
}
