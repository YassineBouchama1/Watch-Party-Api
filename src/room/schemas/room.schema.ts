import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';


export type RoomDocument = HydratedDocument<Room>;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  playList: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // @Prop({default:null})
  // startAt:Date | null
}

export const RoomSchema = SchemaFactory.createForClass(Room);
