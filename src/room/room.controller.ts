import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/common/types/user.types';

@Controller('room')
@UseGuards(AuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto, @Req() req: RequestWithUser) {
    console.log('create');
    try {
      return this.roomService.create(createRoomDto, req.userId);
    } catch (error) {
      throw new BadRequestException('Failed to create room');
    }
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    try {
      return this.roomService.findAll(req.userId);
    } catch (error) {
      throw new BadRequestException('Failed to fetch rooms');
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    try {
      return this.roomService.findOne(id); // id is a string
    } catch (error) {
      throw new BadRequestException('Failed to fetch room');
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return this.roomService.update(id, updateRoomDto, req.userId);
    } catch (error) {
      throw new BadRequestException('Failed to create room');
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return this.roomService.remove(id, req.userId);
    } catch (error) {
      throw new BadRequestException('Failed to create room');
    }
  }
}
