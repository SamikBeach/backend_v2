import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Repository, getRepository } from 'typeorm';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Book } from '../book/entities/book.entity';
import { Post } from '../post/entities/post.entity';
import { PostImage } from '../post/entities/post-image.entity';
import { PostBook } from '../post/entities/post-book.entity';
import { Comment } from '../post/entities/comment.entity';
import { PostLike } from '../post/entities/post-like.entity';

interface SeedPost {
  content: string;
  type: 'general' | 'discussion' | 'review' | 'question' | 'meetup';
  bookIds?: number[];
  imageUrls?: string[];
  comments?: SeedComment[];
}

interface SeedComment {
  content: string;
  replies?: SeedReply[];
}

interface SeedReply {
  content: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('PostSeed');

  // 레포지토리 가져오기
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));
  const postRepository = app.get<Repository<Post>>(getRepositoryToken(Post));
  const postImageRepository = app.get<Repository<PostImage>>(
    getRepositoryToken(PostImage),
  );
  const postBookRepository = app.get<Repository<PostBook>>(
    getRepositoryToken(PostBook),
  );
  const commentRepository = app.get<Repository<Comment>>(
    getRepositoryToken(Comment),
  );
  const postLikeRepository = app.get<Repository<PostLike>>(
    getRepositoryToken(PostLike),
  );

  // 기존 데이터 확인
  const existingPosts = await postRepository.count();
  if (existingPosts > 0) {
    logger.log(
      `이미 ${existingPosts}개의 게시물이 존재합니다. 시드 작업을 건너뜁니다.`,
    );
    await app.close();
    return;
  }

  try {
    logger.log('게시물 데이터 초기화 시작...');

    // 사용자 목록 가져오기 (시드 데이터용)
    const users = await userRepository.find({ take: 5 });
    if (users.length === 0) {
      logger.error(
        '사용자 데이터가 없습니다. 먼저 user.seed.ts를 실행해주세요.',
      );
      await app.close();
      return;
    }

    // 책 목록 가져오기 (시드 데이터용)
    const books = await bookRepository.find({ take: 20 });
    if (books.length === 0) {
      logger.error('책 데이터가 없습니다. 먼저 book.seed.ts를 실행해주세요.');
      await app.close();
      return;
    }

    // 게시물 시드 데이터
    const posts: SeedPost[] = [
      {
        content:
          '안녕하세요! 고전산책에 오신 것을 환영합니다. 여러분의 관심사를 공유해주세요.',
        type: 'general',
        comments: [
          {
            content: '반갑습니다! 저는 철학 분야에 관심이 많아요.',
            replies: [
              {
                content: '철학 좋죠! 니체나 칸트에 관심 있으신가요?',
              },
            ],
          },
          {
            content: '저는 문학을 좋아해요. 특히 러시아 문학이 좋습니다.',
          },
        ],
      },
      {
        content:
          '요즘 읽고 있는 책을 소개합니다. 칸트의 『순수이성비판』을 읽고 있는데, 정말 난해하지만 매력적인 책입니다. 함께 토론해보면 좋을 것 같아요.',
        type: 'discussion',
        bookIds: [1, 2], // 실제 책 ID로 대체됨
        imageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
        comments: [
          {
            content: '저도 읽고 있어요! 어떤 부분이 가장 인상적이셨나요?',
          },
        ],
      },
      {
        content:
          '헤르만 헤세의 『데미안』을 읽고 나서 인생의 방향이 바뀌었어요. 정말 추천하고 싶은 책입니다. 여러분은 어떤 책이 인생의 전환점이 되었나요?',
        type: 'review',
        bookIds: [3], // 실제 책 ID로 대체됨
        comments: [
          {
            content:
              '저는 니체의 『차라투스트라는 이렇게 말했다』가 큰 영향을 주었어요.',
            replies: [
              {
                content:
                  '니체의 작품은 정말 강렬하죠. 저도 큰 감명을 받았습니다.',
              },
            ],
          },
        ],
      },
      {
        content:
          '고전 철학 입문을 위한 가장 좋은 책이 무엇일까요? 초보자도 이해하기 쉬운 책을 추천해주세요.',
        type: 'question',
        comments: [
          {
            content: '버트런드 러셀의 『서양철학사』가 좋은 입문서입니다.',
          },
          {
            content:
              '플라톤의 『소크라테스의 변명』부터 시작해보는 것도 좋을 것 같아요.',
          },
        ],
      },
      {
        content:
          '다음 주 토요일에 서울 광화문에서 독서 모임을 진행합니다. 관심 있으신 분들은 댓글 남겨주세요!',
        type: 'meetup',
        comments: [
          {
            content: '참여하고 싶어요! 어떤 책을 읽을 예정인가요?',
            replies: [
              {
                content:
                  '이번에는 플라톤의 『국가』를 읽을 예정입니다. 많은 참여 부탁드려요!',
              },
            ],
          },
        ],
      },
    ];

    // 게시물 생성 및 관련 데이터 추가
    for (const [index, postData] of posts.entries()) {
      const user = users[index % users.length];

      // 실제 책 ID로 대체
      const selectedBookIds = postData.bookIds
        ? postData.bookIds.map((_, i) => books[(index + i) % books.length].id)
        : [];

      // 게시물 생성
      const post = postRepository.create({
        content: postData.content,
        type: postData.type,
        authorId: user.id,
      });

      await postRepository.save(post);
      logger.log(`게시물 ${index + 1} 생성 완료: ${post.id}`);

      // 이미지 추가
      if (postData.imageUrls && postData.imageUrls.length > 0) {
        for (const imageUrl of postData.imageUrls) {
          const postImage = postImageRepository.create({
            url: imageUrl,
            postId: post.id,
          });
          await postImageRepository.save(postImage);
        }
        logger.log(
          `게시물 ${post.id}에 이미지 ${postData.imageUrls.length}개 추가 완료`,
        );
      }

      // 책 연결
      if (selectedBookIds.length > 0) {
        for (const bookId of selectedBookIds) {
          const postBook = postBookRepository.create({
            postId: post.id,
            bookId: bookId,
          });
          await postBookRepository.save(postBook);
        }
        logger.log(
          `게시물 ${post.id}에 책 ${selectedBookIds.length}개 연결 완료`,
        );
      }

      // 댓글 추가
      if (postData.comments && postData.comments.length > 0) {
        for (const [commentIndex, commentData] of postData.comments.entries()) {
          const commentAuthor =
            users[(index + commentIndex + 1) % users.length];

          const comment = commentRepository.create({
            content: commentData.content,
            postId: post.id,
            authorId: commentAuthor.id,
          });

          await commentRepository.save(comment);

          // 대댓글 추가
          if (commentData.replies && commentData.replies.length > 0) {
            for (const [
              replyIndex,
              replyData,
            ] of commentData.replies.entries()) {
              const replyAuthor =
                users[(index + commentIndex + replyIndex + 2) % users.length];

              const reply = commentRepository.create({
                content: replyData.content,
                postId: post.id,
                authorId: replyAuthor.id,
                parentCommentId: comment.id,
              });

              await commentRepository.save(reply);
            }
          }
        }

        // 댓글 수 업데이트
        const commentCount = await commentRepository.count({
          where: { postId: post.id },
        });
        await postRepository.update(post.id, { commentCount });
        logger.log(`게시물 ${post.id}에 댓글 ${commentCount}개 추가 완료`);
      }

      // 좋아요 추가 (일부 게시물에만)
      if (index % 2 === 0) {
        const likesCount = Math.floor(Math.random() * 5) + 1; // 1~5개의 좋아요
        for (let i = 0; i < likesCount; i++) {
          const likeUser = users[(index + i + 1) % users.length];

          const postLike = postLikeRepository.create({
            postId: post.id,
            userId: likeUser.id,
          });

          await postLikeRepository.save(postLike);
        }

        // 좋아요 수 업데이트
        await postRepository.update(post.id, { likeCount: likesCount });
        logger.log(`게시물 ${post.id}에 좋아요 ${likesCount}개 추가 완료`);
      }
    }

    logger.log('게시물 데이터 초기화 완료!');
  } catch (error) {
    logger.error(`게시물 데이터 초기화 중 오류: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
