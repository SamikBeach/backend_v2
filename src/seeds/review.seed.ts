import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { In, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Review } from '../review/entities/review.entity';
import { ReviewImage } from '../review/entities/review-image.entity';
import { ReviewBook } from '../review/entities/review-book.entity';
import { Comment } from '../review/entities/comment.entity';
import { ReviewLike } from '../review/entities/review-like.entity';
import { Book } from '../book/entities/book.entity';

interface SeedReview {
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
  const logger = new Logger('ReviewSeed');

  try {
    logger.log('리뷰 초기 데이터 생성 시작...');

    // 저장소 가져오기
    const reviewRepository = app.get<Repository<Review>>(
      getRepositoryToken(Review),
    );
    const reviewImageRepository = app.get<Repository<ReviewImage>>(
      getRepositoryToken(ReviewImage),
    );
    const reviewBookRepository = app.get<Repository<ReviewBook>>(
      getRepositoryToken(ReviewBook),
    );
    const commentRepository = app.get<Repository<Comment>>(
      getRepositoryToken(Comment),
    );
    const reviewLikeRepository = app.get<Repository<ReviewLike>>(
      getRepositoryToken(ReviewLike),
    );
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const bookRepository = app.get<Repository<Book>>(getRepositoryToken(Book));

    // 기존 데이터 확인
    const existingReviews = await reviewRepository.count();
    if (existingReviews > 0) {
      logger.log(
        `이미 ${existingReviews}개의 리뷰가 존재합니다. 시드 작업을 건너뜁니다.`,
      );
      await app.close();
      return;
    }

    // 기존 사용자 및 책 정보 가져오기
    const users = await userRepository.find();
    const books = await bookRepository.find();

    if (!users.length) {
      logger.error(
        '사용자 데이터가 없습니다. 먼저 사용자 시드 데이터를 생성해주세요.',
      );
      await app.close();
      return;
    }

    if (!books.length) {
      logger.error('책 데이터가 없습니다. 먼저 책 시드 데이터를 생성해주세요.');
      await app.close();
      return;
    }

    // 샘플 이미지 URL
    const sampleImages = [
      '/uploads/sample1.jpg',
      '/uploads/sample2.jpg',
      '/uploads/sample3.jpg',
      '/uploads/sample4.jpg',
      '/uploads/sample5.jpg',
    ];

    // 리뷰 샘플 데이터
    const reviews: SeedReview[] = [
      {
        content:
          '이 책은 정말 인상적이었습니다. 저자의 깊은 통찰력과 명확한 설명이 돋보였어요. 특히 두 번째 장은 제가 고민하던 문제에 대한 새로운 관점을 제시해 주었습니다. 다른 분들에게도 추천하고 싶은 책입니다.',
        type: 'review',
        bookIds: [1, 2],
        imageUrls: [sampleImages[0]],
        comments: [
          {
            content: '저도 이 책 정말 좋았어요! 특히 3장이 인상적이었습니다.',
            replies: [
              {
                content: '맞아요, 3장의 사례 연구가 특히 유익했어요.',
              },
            ],
          },
          {
            content: '다른 책도 추천해주실 수 있나요?',
          },
        ],
      },
      {
        content:
          '독서 모임에서 이 책을 함께 읽고 있는데, 여러분의 생각이 궁금합니다. 주인공의 선택에 대해 어떻게 생각하시나요? 저는 개인적으로 그의 결정이 상황을 고려할 때 불가피했다고 생각합니다.',
        type: 'discussion',
        bookIds: [3],
        comments: [
          {
            content:
              '저는 주인공이 좀 더 신중했어야 한다고 생각해요. 다른 선택지도 있었을 텐데요.',
          },
        ],
      },
      {
        content:
          '새로 나온 베스트셀러인데, 아직 읽어보신 분 계신가요? 리뷰가 좋던데 구매할지 고민 중입니다.',
        type: 'question',
        bookIds: [4],
        imageUrls: [sampleImages[1], sampleImages[2]],
      },
      {
        content:
          '이번 주말에 도서관에서 작가와의 만남 행사가 있어요! 함께 참석하실 분 계신가요? 작가의 새 책에 대한 이야기를 들을 수 있는 좋은 기회입니다.',
        type: 'meetup',
        bookIds: [5],
        imageUrls: [sampleImages[3]],
      },
      {
        content:
          '오랜만에 정말 감동적인 소설을 읽었습니다. 인물들의 심리 묘사가 너무 생생해서 밤새 읽게 되었어요. 결말에서는 눈물을 흘리기도 했습니다. 문학의 힘을 다시 한번 느낀 작품이었습니다.',
        type: 'general',
        bookIds: [6],
      },
      {
        content:
          '이 책의 번역이 너무 아쉬웠습니다. 원서의 느낌이 제대로 전달되지 않은 것 같아요. 다른 번역본이 나오길 기대합니다.',
        type: 'review',
        bookIds: [7],
      },
      {
        content:
          '자기계발서를 읽고 실천해보신 분들의 경험이 궁금합니다. 이 책에서 제안하는 방법을 따라해보니 실제로 효과가 있었나요?',
        type: 'question',
        bookIds: [8],
        comments: [
          {
            content:
              '저는 한 달 동안 실천해봤는데, 확실히 집중력이 좋아졌어요!',
            replies: [
              {
                content: '구체적으로 어떤 방법이 가장 효과적이었나요?',
              },
            ],
          },
        ],
      },
      // 추가 리뷰 데이터
      {
        content:
          '철학 입문서로 최고의 책입니다. 어려운 개념들을 쉽게 설명해주어 철학을 처음 접하는 사람도 부담 없이 읽을 수 있어요.',
        type: 'review',
        bookIds: [9, 10],
        imageUrls: [sampleImages[4]],
      },
      {
        content:
          '역사책인데도 소설처럼 재미있게 읽혔습니다. 사실에 기반하면서도 흥미진진한 서술방식이 인상적이었어요.',
        type: 'review',
        bookIds: [11],
      },
      {
        content:
          '과학 서적 추천해주세요! 천문학이나 물리학 관련 재미있는 교양서를 찾고 있습니다.',
        type: 'question',
        bookIds: [],
        comments: [
          {
            content:
              '칼 세이건의 "코스모스"는 어떠세요? 천문학 교양서로 최고입니다!',
          },
          {
            content: '리처드 도킨스의 "이기적 유전자"도 추천합니다.',
          },
        ],
      },
      {
        content:
          '이번 주 독서 모임에서 토론할 주제입니다: "현대 문학에서 기술의 역할". 관련 생각이나 추천 도서가 있으시면 공유해주세요.',
        type: 'discussion',
        bookIds: [12],
      },
      {
        content:
          '책을 읽고 메모하는 방법에 대해 공유합니다. 저는 색깔별로 형광펜을 사용해서 중요 개념, 인용구, 의문점 등을 구분해서 표시합니다. 여러분의 독서 메모 방법은 어떤가요?',
        type: 'general',
        imageUrls: [sampleImages[0], sampleImages[3]],
      },
      {
        content:
          '연말 독서 모임을 준비중입니다. 12월 20일 저녁 7시, 시내 북카페에서 올해의 베스트 책들을 나누는 시간을 가질 예정입니다. 참여 원하시는 분들은 댓글 남겨주세요!',
        type: 'meetup',
        bookIds: [],
      },
      {
        content:
          '이 책은 결말이 너무 실망스러웠습니다. 전반부의 탄탄한 스토리 전개가 후반부에서 너무 허무하게 마무리된 느낌이에요.',
        type: 'review',
        bookIds: [13],
      },
      {
        content:
          '자녀 교육에 관한 책을 찾고 있는데, 추천해주실 만한 책이 있을까요? 초등학생 자녀의 학습 습관을 기르는 데 도움이 될 만한 책이면 좋겠습니다.',
        type: 'question',
        bookIds: [],
      },
      {
        content:
          '요즘 많이 읽히는 자기계발서들이 실제로 도움이 될까요? 너무 뻔한 조언들만 반복하는 것 같아 회의적입니다. 여러분의 생각은 어떤가요?',
        type: 'discussion',
        bookIds: [14, 15],
      },
      {
        content:
          '올해의 베스트 책 5권을 소개합니다. 모두 2023년에 읽은 책 중 가장 인상 깊었던 작품들입니다. 각각의 책이 제게 어떤 영향을 주었는지 간략하게 적어봤어요.',
        type: 'general',
        bookIds: [16, 17, 18, 19, 20],
        imageUrls: [sampleImages[1]],
      },
      {
        content:
          '이 책의 주요 개념을 마인드맵으로 정리해봤습니다. 복잡한 이론들을 시각화하니 이해가 더 잘 되는 것 같아요.',
        type: 'review',
        bookIds: [21],
        imageUrls: [sampleImages[4]],
      },
    ];

    // 사용자별로 리뷰를 균등하게 배분하기 위한 준비
    const userEmails = [
      'user1@example.com',
      'user2@example.com',
      'user3@example.com',
      'google@example.com',
      'apple@example.com',
    ];
    const userMap = new Map();

    for (const user of users) {
      if (userEmails.includes(user.email)) {
        userMap.set(user.email, user);
      }
    }

    // 리뷰 생성
    for (const [index, reviewData] of reviews.entries()) {
      try {
        // 특정 사용자에게 리뷰 할당 (균등하게 분배)
        const userEmail = userEmails[index % userEmails.length];
        let authorUser = userMap.get(userEmail);

        // 해당 사용자가 없으면 랜덤 사용자 선택
        if (!authorUser) {
          authorUser = users[Math.floor(Math.random() * users.length)];
        }

        // 리뷰 생성
        const review = reviewRepository.create({
          content: reviewData.content,
          type: reviewData.type,
          authorId: authorUser.id,
        });

        // 리뷰 저장
        await reviewRepository.save(review);
        logger.log(
          `리뷰 ${index + 1} 생성 완료: ${review.id} (작성자: ${authorUser.email})`,
        );

        // 이미지 추가
        if (reviewData.imageUrls && reviewData.imageUrls.length > 0) {
          for (const imageUrl of reviewData.imageUrls) {
            const reviewImage = reviewImageRepository.create({
              url: imageUrl,
              reviewId: review.id,
            });
            await reviewImageRepository.save(reviewImage);
          }
          logger.log(
            `리뷰 ${review.id}에 이미지 ${reviewData.imageUrls.length}개 추가 완료`,
          );
        }

        // 책 연결
        if (reviewData.bookIds && reviewData.bookIds.length > 0) {
          // 존재하는 책 ID만 필터링
          const availableBooks = await bookRepository.find({
            where: { id: In(reviewData.bookIds) },
          });
          const selectedBookIds = availableBooks.map((book) => book.id);

          for (const bookId of selectedBookIds) {
            const reviewBook = reviewBookRepository.create({
              reviewId: review.id,
              bookId,
            });
            await reviewBookRepository.save(reviewBook);
          }
          logger.log(
            `리뷰 ${review.id}에 책 ${selectedBookIds.length}개 연결 완료`,
          );
        }

        // 댓글 추가
        if (reviewData.comments && reviewData.comments.length > 0) {
          for (const commentData of reviewData.comments) {
            // 랜덤 사용자 선택 (리뷰 작성자와 다른 사용자)
            const filteredUsers = users.filter(
              (user) => user.id !== authorUser.id,
            );
            const commentUser =
              filteredUsers[Math.floor(Math.random() * filteredUsers.length)];

            // 댓글 생성
            const comment = commentRepository.create({
              content: commentData.content,
              reviewId: review.id,
              authorId: commentUser.id,
            });
            await commentRepository.save(comment);

            // 대댓글 추가
            if (commentData.replies && commentData.replies.length > 0) {
              for (const replyData of commentData.replies) {
                // 다른 랜덤 사용자 선택
                const replyUser =
                  users[Math.floor(Math.random() * users.length)];

                const reply = commentRepository.create({
                  content: replyData.content,
                  reviewId: review.id,
                  authorId: replyUser.id,
                  parentCommentId: comment.id,
                });
                await commentRepository.save(reply);
              }
            }
          }

          // 댓글 수 업데이트
          const commentCount = await commentRepository.count({
            where: { reviewId: review.id },
          });
          await reviewRepository.update(review.id, { commentCount });
          logger.log(`리뷰 ${review.id}에 댓글 ${commentCount}개 추가 완료`);
        }

        // 좋아요 추가 (1~5개 랜덤)
        const likeCount = Math.floor(Math.random() * 5) + 1;
        const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
        const likeUsers = shuffledUsers.slice(0, likeCount);

        for (const likeUser of likeUsers) {
          const reviewLike = reviewLikeRepository.create({
            reviewId: review.id,
            userId: likeUser.id,
          });
          await reviewLikeRepository.save(reviewLike);
        }

        // 좋아요 수 업데이트
        const likesCount = await reviewLikeRepository.count({
          where: { reviewId: review.id },
        });
        await reviewRepository.update(review.id, { likeCount: likesCount });
        logger.log(`리뷰 ${review.id}에 좋아요 ${likesCount}개 추가 완료`);
      } catch (error) {
        logger.error(`리뷰 ${index + 1} 생성 중 오류: ${error.message}`);
      }
    }

    logger.log('리뷰 초기 데이터 생성 완료!');
  } catch (error) {
    logger.error(`리뷰 시드 중 오류 발생: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
