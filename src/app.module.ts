import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_GUARD } from '@nestjs/core'
import { RolesGuard } from './guards/roles.guard'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { RolesModule } from './modules/roles/roles.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { MessagesModule } from './modules/messages/messages.module'
import { OrdersModule } from './modules/orders/orders.module'
import { MacrosModule } from './modules/macros/macros.module'
import { ConversationTagsModule } from './modules/conversation-tags/conversation-tags.module'
import { WhatsappModule } from './modules/whatsapp/whatsapp.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        //  Prioriza Railway DATABASE_URL
        const databaseUrl = configService.get<string>('DATABASE_URL')

        const synchronize = configService.get<string>('DATABASE_SYNCHRONIZE') === 'true'
        const logging = configService.get<string>('DATABASE_LOGGING') === 'true'

        // Railway/Postgres administrado suele requerir SSL/TLS
        const sslConfig = { rejectUnauthorized: false as const }

        if (databaseUrl && databaseUrl.trim().length > 0) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize,
            logging,
            ssl: sslConfig,
            extra: { ssl: sslConfig },
          }
        }

        //  Fallback: variables separadas (por si aún las usas)
        const host = configService.get<string>('DATABASE_HOST')
        const port = parseInt(configService.get<string>('DATABASE_PORT') || '5432', 10)
        const username = configService.get<string>('DATABASE_USER')
        const password = configService.get<string>('DATABASE_PASSWORD')
        const database = configService.get<string>('DATABASE_NAME')

        return {
          type: 'postgres' as const,
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          logging,
          ssl: sslConfig,
          extra: { ssl: sslConfig },
        }
      },
    }),

    AuthModule,
    RolesModule,
    UsersModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    OrdersModule,
    MacrosModule,
    ConversationTagsModule,
    WhatsappModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
