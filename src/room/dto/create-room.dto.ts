import { IsString, IsArray, IsMongoId } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  RoomName: string;

  @IsArray()
  @IsString({ each: true }) // Validates each element in the array
  playList: string[];

  @IsMongoId()
  userId: string;
}
