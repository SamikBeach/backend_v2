import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBookDescriptionToText1748863893970
  implements MigrationInterface
{
  name = 'UpdateBookDescriptionToText1748863893970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`book\` DROP COLUMN \`description\``);
    await queryRunner.query(
      `ALTER TABLE \`book\` ADD \`description\` text NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`book\` DROP COLUMN \`description\``);
    await queryRunner.query(
      `ALTER TABLE \`book\` ADD \`description\` varchar(255) NOT NULL`,
    );
  }
}
