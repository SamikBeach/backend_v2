import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class UpdateDiscoverCategoryRelations1735125000000
  implements MigrationInterface
{
  name = 'UpdateDiscoverCategoryRelations1735125000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. book_discover_category 테이블이 이미 존재하는지 확인
    const tableExists = await queryRunner.hasTable('book_discover_category');

    if (!tableExists) {
      // 테이블이 없는 경우에만 생성
      await queryRunner.createTable(
        new Table({
          name: 'book_discover_category',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'book_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'discover_category_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'discover_sub_category_id',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // 2. 외래 키 제약 조건 추가
      await queryRunner.createForeignKey(
        'book_discover_category',
        new TableForeignKey({
          columnNames: ['book_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'book',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'book_discover_category',
        new TableForeignKey({
          columnNames: ['discover_category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'discover_category',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'book_discover_category',
        new TableForeignKey({
          columnNames: ['discover_sub_category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'discover_subcategory',
          onDelete: 'CASCADE',
        }),
      );

      // 3. 인덱스 생성 (성능 최적화)
      await queryRunner.createIndex(
        'book_discover_category',
        new TableIndex({
          name: 'IDX_book_discover_category_book_id',
          columnNames: ['book_id'],
        }),
      );

      await queryRunner.createIndex(
        'book_discover_category',
        new TableIndex({
          name: 'IDX_book_discover_category_discover_category_id',
          columnNames: ['discover_category_id'],
        }),
      );

      await queryRunner.createIndex(
        'book_discover_category',
        new TableIndex({
          name: 'IDX_book_discover_category_discover_sub_category_id',
          columnNames: ['discover_sub_category_id'],
        }),
      );
    }

    // 4. 기존 데이터 마이그레이션 (만약 기존에 discover 관련 컬럼이 있었다면)
    // 예시: 기존에 book 테이블에 discover_category_id 컬럼이 있었다면
    const hasDiscoverCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_category_id',
    );
    if (hasDiscoverCategoryColumn) {
      // 기존 데이터를 새로운 중간 테이블로 이동
      await queryRunner.query(`
        INSERT INTO book_discover_category (book_id, discover_category_id, created_at, updated_at)
        SELECT id, discover_category_id, NOW(), NOW()
        FROM book 
        WHERE discover_category_id IS NOT NULL
      `);

      // 외래 키 제약 조건 제거 (컬럼 삭제 전에 필요)
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
          await queryRunner.query(
            `ALTER TABLE book DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
          );
        }
      } catch (error) {
        console.log(
          '외래 키 제약 조건 제거 중 오류 (무시 가능):',
          error.message,
        );
      }

      // 기존 컬럼 삭제
      await queryRunner.dropColumn('book', 'discover_category_id');
    }

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
      `);

      // 외래 키 제약 조건 제거 (컬럼 삭제 전에 필요)
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
          await queryRunner.query(
            `ALTER TABLE book DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
          );
        }
      } catch (error) {
        console.log(
          '외래 키 제약 조건 제거 중 오류 (무시 가능):',
          error.message,
        );
      }

      // 기존 컬럼 삭제
      await queryRunner.dropColumn('book', 'discover_sub_category_id');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 기존 컬럼 복원 (필요한 경우)
    const hasDiscoverCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_category_id',
    );
    if (!hasDiscoverCategoryColumn) {
      await queryRunner.addColumn(
        'book',
        new TableColumn({
          name: 'discover_category_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const hasDiscoverSubCategoryColumn = await queryRunner.hasColumn(
      'book',
      'discover_sub_category_id',
    );
    if (!hasDiscoverSubCategoryColumn) {
      await queryRunner.addColumn(
        'book',
        new TableColumn({
          name: 'discover_sub_category_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    // 2. 데이터 복원
    await queryRunner.query(`
      UPDATE book b
      INNER JOIN book_discover_category bdc ON b.id = bdc.book_id
      SET b.discover_category_id = bdc.discover_category_id,
          b.discover_sub_category_id = bdc.discover_sub_category_id
    `);

    // 3. 중간 테이블 삭제
    await queryRunner.dropTable('book_discover_category');
  }
}
