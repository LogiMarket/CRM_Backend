import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('WhatsApp via Twilio')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  /**
   * Webhook for receiving messages from Twilio
   * Twilio sends form-encoded data, not JSON
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    await this.whatsappService.handleWebhook(body);
    return { success: true };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @HttpCode(200)
  async healthCheck() {
    return this.whatsappService.healthCheck();
  }

  /**
   * Send message via WhatsApp
   */
  @Post('send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async sendMessage(
    @Body() body: { phone_number: string; message: string },
  ) {
    return this.whatsappService.sendMessage(
      body.phone_number,
      body.message,
    );
  }

  /**
   * Send template message
   */
  @Post('send-template')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async sendTemplate(
    @Body()
    body: { phone_number: string; template_name: string; parameters?: string[] },
  ) {
    return this.whatsappService.sendTemplateMessage(
      body.phone_number,
      body.template_name,
      body.parameters,
    );
  }

  /**
   * Get message status
   */
  @Get('message-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async getMessageStatus(@Query('message_id') messageId: string) {
    return this.whatsappService.getMessageStatus(messageId);
  }

  /**
   * Get available phone numbers
   */
  @Get('phone-numbers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async getPhoneNumbers() {
    return this.whatsappService.getPhoneNumbers();
  }
}
