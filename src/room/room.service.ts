import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { Model } from 'mongoose';

@Injectable()
export class RoomService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) {}

  async create(createRoomDto: CreateRoomDto, userId: string): Promise<Room> {
    try {
      // Create the room with the authenticated user's ID
      const newRoom = await this.roomModel.create({
        ...createRoomDto,
        userId, // Add the authenticated user's ID
      });

      return newRoom;
    } catch (error) {
      console.error('Error creating room:', error.message);
      throw new Error('Database error while creating room');
    }
  }

  async findAll() {
    try {
      return await this.roomModel.find().exec();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw new Error('Database error');
    }
  }

  async findOne(id: string) {
    try {
      return await this.roomModel.findById(id).exec();
    } catch (error) {
      throw new Error('Room not found');
    }
  }

  async update(id: string, updateRoomDto: UpdateRoomDto, userId: string) {
    const room = await this.roomModel.findById(id);
    if (!room || room.userId.toString() !== userId) {
      throw new Error('Unauthorized');
    }
    return await this.roomModel.findByIdAndUpdate(id, updateRoomDto, {
      new: true,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} room`;
  }
}
