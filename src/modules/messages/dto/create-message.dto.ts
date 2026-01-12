import { IsUUID, IsEnum, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  conversation_id: string;

  @IsEnum(['user', 'contact'])
  sender_type: string;

  @IsOptional()
  @IsUUID()
  sender_id?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'document', 'audio', 'video'])
  message_type?: string;

  @IsOptional()
  @IsBoolean()
  is_from_whatsapp?: boolean;

  @IsOptional()
  @IsString()
  whatsapp_message_id?: string;
}
