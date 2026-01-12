import { IsUUID, IsEnum, IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  order_number: string;

  @IsUUID()
  contact_id: string;

  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
