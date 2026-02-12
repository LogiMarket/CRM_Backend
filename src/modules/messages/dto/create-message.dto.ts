import {
  IsUUID,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';

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
  @IsEnum(['text', 'image', 'document', 'audio', 'video', 'sticker'])
  message_type?: string;

  @IsOptional()
  @IsString()
  media_id?: string;

  @IsOptional()
  @IsString()
  media_mime_type?: string;

  @IsOptional()
  @IsString()
  media_sha256?: string;

  @IsOptional()
  @IsString()
  media_filename?: string;

  @IsOptional()
  @IsString()
  media_caption?: string;

  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_from_whatsapp?: boolean;

  @IsOptional()
  @IsString()
  whatsapp_message_id?: string;
}
