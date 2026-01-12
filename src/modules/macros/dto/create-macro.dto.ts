import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateMacroDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  shortcut: string;

  @IsUUID()
  created_by_id: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
