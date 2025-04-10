import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { CommonModule } from './common/common.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { CategoryModule } from './category/category.module';
import { BookModule } from './book/book.module';
import { Category } from './category/entities/category.entity';
import { SubCategory } from './category/entities/subcategory.entity';
import { Book } from './book/entities/book.entity';
import { DiscoverCategoryModule } from './discover-category/discover-category.module';
import { DiscoverCategory } from './discover-category/entities/discover-category.entity';
import { DiscoverSubCategory } from './discover-category/entities/discover-subcategory.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          User,
          Category,
          SubCategory,
          Book,
          DiscoverCategory,
          DiscoverSubCategory,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    AuthModule,
    UserModule,
    CommonModule,
    CategoryModule,
    BookModule,
    DiscoverCategoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
