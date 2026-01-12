import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  contact_id: string;

  @IsOptional()
  @IsUUID()
  assigned_agent_id?: string;

  @IsOptional()
  @IsEnum(['active', 'paused', 'resolved'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
