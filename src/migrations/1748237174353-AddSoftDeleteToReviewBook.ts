import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToReviewBook1748237174353 implements MigrationInterface {
    name = 'AddSoftDeleteToReviewBook1748237174353'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`review_book\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`review_book\` ADD \`deleted_at\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`review_book\` DROP COLUMN \`deleted_at\``);
        await queryRunner.query(`ALTER TABLE \`review_book\` DROP COLUMN \`updated_at\``);
    }

}
