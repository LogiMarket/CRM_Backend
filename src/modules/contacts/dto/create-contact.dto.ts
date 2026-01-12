import { IsString, IsPhoneNumber, IsOptional, IsUrl } from 'class-validator';

export class CreateContactDto {
  @IsPhoneNumber(null)
  phone_number: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  avatar_url?: string;
}
