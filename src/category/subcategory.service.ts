import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubCategory } from './entities/subcategory.entity';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  async findAll(): Promise<SubCategory[]> {
    return this.subCategoryRepository.find({
      relations: ['category'],
    });
  }

  async findOne(id: number): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }

    return subCategory;
  }

  async create(name: string, categoryId: number): Promise<SubCategory> {
    const subCategory = this.subCategoryRepository.create({
      name,
      category: { id: categoryId },
    });

    return this.subCategoryRepository.save(subCategory);
  }

  async update(id: number, name: string): Promise<SubCategory> {
    const subCategory = await this.findOne(id);
    subCategory.name = name;
    return this.subCategoryRepository.save(subCategory);
  }

  async remove(id: number): Promise<void> {
    const result = await this.subCategoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
  }
}
