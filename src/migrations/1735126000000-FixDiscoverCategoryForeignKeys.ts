import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDiscoverCategoryForeignKeys1735126000000
  implements MigrationInterface
{
  name = 'FixDiscoverCategoryForeignKeys1735126000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. discover_category_id 컬럼 처리
    const hasDiscoverCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_category_id',
    );

    if (hasDiscoverCategoryColumn) {
      // 기존 데이터가 있다면 중간 테이블로 이동
      const hasData = await queryRunner.query(`
        SELECT COUNT(*) as count FROM book WHERE discover_category_id IS NOT NULL
      `);

      if (hasData[0].count > 0) {
        await queryRunner.query(`
          INSERT IGNORE INTO book_discover_category (book_id, discover_category_id, created_at, updated_at)
          SELECT id, discover_category_id, NOW(), NOW()
          FROM book 
          WHERE discover_category_id IS NOT NULL
        `);
      }

      // 외래 키 제약 조건 제거
      try {
        const foreignKeys = await queryRunner.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'book' 
          AND COLUMN_NAME = 'discover_category_id' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        for (const fk of foreignKeys) {
          // 외래 키 제약 조건 제거: ${fk.CONSTRAINT_NAME}
          await queryRunner.query(
            `ALTER TABLE book DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
          );
        }
      } catch (error) {
        // 외래 키 제약 조건 제거 중 오류 (무시 가능)
      }

      // 인덱스 제거 (있다면)
      try {
        await queryRunner.query(
          `ALTER TABLE book DROP INDEX IDX_book_discover_category_id`,
        );
      } catch (error) {
        // 인덱스 제거 중 오류 (무시 가능)
      }

      // 컬럼 삭제
      await queryRunner.dropColumn('book', 'discover_category_id');
      // discover_category_id 컬럼 삭제 완료
    }

    // 2. discover_sub_category_id 컬럼 처리
    const hasDiscoverSubCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_sub_category_id',
    );

    if (hasDiscoverSubCategoryColumn) {
      // 기존 서브카테고리 데이터 업데이트
      await queryRunner.query(`
        UPDATE book_discover_category bdc
        INNER JOIN book b ON bdc.book_id = b.id
        SET bdc.discover_sub_category_id = b.discover_sub_category_id
        WHERE b.discover_sub_category_id IS NOT NULL
        AND bdc.discover_sub_category_id IS NULL
      `);

      // 외래 키 제약 조건 제거
      try {
        const foreignKeys = await queryRunner.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'book' 
          AND COLUMN_NAME = 'discover_sub_category_id' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        for (const fk of foreignKeys) {
          // 외래 키 제약 조건 제거: ${fk.CONSTRAINT_NAME}
          await queryRunner.query(
            `ALTER TABLE book DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
          );
        }
      } catch (error) {
        // 외래 키 제약 조건 제거 중 오류 (무시 가능)
      }

      // 인덱스 제거 (있다면)
      try {
        await queryRunner.query(
          `ALTER TABLE book DROP INDEX IDX_book_discover_sub_category_id`,
        );
      } catch (error) {
        // 인덱스 제거 중 오류 (무시 가능)
      }

      // 컬럼 삭제
      await queryRunner.dropColumn('book', 'discover_sub_category_id');
      // discover_sub_category_id 컬럼 삭제 완료
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 시 컬럼 복원
    const hasDiscoverCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_category_id',
    );
    if (!hasDiscoverCategoryColumn) {
      await queryRunner.query(`
        ALTER TABLE book ADD COLUMN discover_category_id INT NULL
      `);

      // 데이터 복원
      await queryRunner.query(`
        UPDATE book b
        INNER JOIN book_discover_category bdc ON b.id = bdc.book_id
        SET b.discover_category_id = bdc.discover_category_id
      `);
    }

    const hasDiscoverSubCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_sub_category_id',
    );
    if (!hasDiscoverSubCategoryColumn) {
      await queryRunner.query(`
        ALTER TABLE book ADD COLUMN discover_sub_category_id INT NULL
      `);

      // 데이터 복원
      await queryRunner.query(`
        UPDATE book b
        INNER JOIN book_discover_category bdc ON b.id = bdc.book_id
        SET b.discover_sub_category_id = bdc.discover_sub_category_id
      `);
    }
  }
}
