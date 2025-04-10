import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { AddBookToLibraryDto } from './dto/add-book-to-library.dto';
import { AddTagToLibraryDto } from './dto/add-tag-to-library.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { IsPublic } from '../auth/decorators/is-public.decorator';

@Controller('libraries')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@GetUser() user: User, @Body() createLibraryDto: CreateLibraryDto) {
    return this.libraryService.create(user.id, createLibraryDto);
  }

  @Get()
  @IsPublic()
  findAll(@Query('userId') userId?: string) {
    return this.libraryService.findAll(userId ? +userId : undefined);
  }

  @Get('user/:userId')
  @IsPublic()
  findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('requestingUserId') requestingUserId?: string,
  ) {
    return this.libraryService.findAllByUser(
      userId,
      requestingUserId ? +requestingUserId : undefined,
    );
  }

  @Get('subscribed')
  @UseGuards(JwtAuthGuard)
  findSubscribedLibraries(@GetUser() user: User) {
    return this.libraryService.findSubscribedLibraries(user.id);
  }

  @Get(':id')
  @IsPublic()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId?: string,
  ) {
    return this.libraryService.findOne(id, userId ? +userId : undefined);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() updateLibraryDto: UpdateLibraryDto,
  ) {
    return this.libraryService.update(id, user.id, updateLibraryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.libraryService.remove(id, user.id);
  }

  @Post(':id/books')
  @UseGuards(JwtAuthGuard)
  addBookToLibrary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() addBookToLibraryDto: AddBookToLibraryDto,
  ) {
    return this.libraryService.addBookToLibrary(
      id,
      user.id,
      addBookToLibraryDto,
    );
  }

  @Delete(':id/books/:bookId')
  @UseGuards(JwtAuthGuard)
  removeBookFromLibrary(
    @Param('id', ParseIntPipe) id: number,
    @Param('bookId', ParseIntPipe) bookId: number,
    @GetUser() user: User,
  ) {
    return this.libraryService.removeBookFromLibrary(id, bookId, user.id);
  }

  @Post(':id/tags')
  @UseGuards(JwtAuthGuard)
  addTagToLibrary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() addTagToLibraryDto: AddTagToLibraryDto,
  ) {
    return this.libraryService.addTagToLibrary(id, user.id, addTagToLibraryDto);
  }

  @Delete(':id/tags/:tagId')
  @UseGuards(JwtAuthGuard)
  removeTagFromLibrary(
    @Param('id', ParseIntPipe) id: number,
    @Param('tagId', ParseIntPipe) tagId: number,
    @GetUser() user: User,
  ) {
    return this.libraryService.removeTagFromLibrary(id, tagId, user.id);
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  subscribeToLibrary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.libraryService.subscribeToLibrary(id, user.id);
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribeFromLibrary(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.libraryService.unsubscribeFromLibrary(id, user.id);
  }

  @Get(':id/subscribers')
  @IsPublic()
  getLibrarySubscribers(@Param('id', ParseIntPipe) id: number) {
    return this.libraryService.getLibrarySubscribers(id);
  }
}
