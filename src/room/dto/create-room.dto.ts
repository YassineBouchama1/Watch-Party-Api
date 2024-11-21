import { IsString, IsArray, IsMongoId } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true }) // Validates each element in the array
  playList: string[];

 
}
