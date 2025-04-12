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
import { LibraryModule } from './library/library.module';
import { Library } from './library/entities/library.entity';
import { LibraryBook } from './library/entities/library-book.entity';
import { LibraryTag } from './library/entities/library-tag.entity';
import { LibrarySubscription } from './library/entities/library-subscription.entity';
import { LibraryUpdateHistory } from './library/entities/library-update-history.entity';
import { TagModule } from './tag/tag.module';
import { Tag } from './library/entities/tag.entity';
import { PostModule } from './post/post.module';
import { Post } from './post/entities/post.entity';
import { PostImage } from './post/entities/post-image.entity';
import { PostBook } from './post/entities/post-book.entity';
import { PostLike } from './post/entities/post-like.entity';
import { Comment } from './post/entities/comment.entity';
import { SearchModule } from './search/search.module';
import { SearchLog, PopularSearch, RecentSearch } from './search/search.entity';
import { NotificationModule } from './notification/notification.module';
import { Notification } from './notification/entities/notification.entity';

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
          Library,
          LibraryBook,
          LibraryTag,
          LibrarySubscription,
          LibraryUpdateHistory,
          Tag,
          Post,
          PostImage,
          PostBook,
          PostLike,
          Comment,
          SearchLog,
          PopularSearch,
          RecentSearch,
          Notification,
        ],
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    AuthModule,
    UserModule,
    CommonModule,
    CategoryModule,
    BookModule,
    DiscoverCategoryModule,
    LibraryModule,
    TagModule,
    PostModule,
    SearchModule,
    NotificationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
