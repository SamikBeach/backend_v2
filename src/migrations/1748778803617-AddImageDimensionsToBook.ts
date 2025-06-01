import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageDimensionsToBook1748778803617
  implements MigrationInterface
{
  name = 'AddImageDimensionsToBook1748778803617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`book\` ADD \`cover_image_width\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`book\` ADD \`cover_image_height\` int NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`book\` DROP COLUMN \`cover_image_height\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`book\` DROP COLUMN \`cover_image_width\``,
    );
  }
}
